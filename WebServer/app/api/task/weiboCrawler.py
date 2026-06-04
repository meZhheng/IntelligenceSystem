from flask import request, Response, stream_with_context, jsonify, g
import networkx as nx
from app.models_spider import WeiboUser, WeiboRelation, WeiboUserImage, WeiboPost, WeiboInteraction, WeiboDetectResult
from app.api.auth.auth import token_auth

from app.extensions import db
from app.api import bp
from sqlalchemy import union_all, select, or_, func, tuple_, distinct, and_, desc

from app.models import Task, Model
from app.api.errors import bad_request, error_response
from Proofreading.aijiaodui import text_check, get_access_token
from WeiboSpider.weibo_spider.spider import Spider, config_util, datetime_util, _get_config, logger
from werkzeug.exceptions import InternalServerError
from WeiboSpider.weibo_spider.user import User
from WeiboSpider.weibo_spider.weibo import Weibo

import math
import json
from typing import List
from WeiboSpider.weibo_spider.interaction import Interaction
from datetime import datetime, timezone

from WeiboSpider.weibo_spider.parser.index_parser import IndexParser
from WeiboSpider.weibo_spider.parser.search_parser import WeiboUserSearchParser

def save_interactions(interactions: List[Interaction], base_cfg, weibo_id: str, interaction_type: str):
    """
    将 List[Interaction] 保存到 WeiboInteraction 表中，同时同步关系到 WeiboRelation，并更新 WeiboPost 中对应的计数字段。

    :param interactions: 抓取到的交互列表，每个元素是 Interaction 对象
    :param base_cfg: 基础配置，包含cookie等信息，用于User ID解析
    :param weibo_id: 被交互的微博ID（对应 WeiboPost 表的主键）
    :param interaction_type: 交互类型，取值为 'like', 'retweet' 或 'comment'
    """

    objs_to_insert = []  # 待批量插入的 WeiboInteraction 对象列表
    relations_to_insert = []  # 待批量插入的 WeiboRelation 关系对象列表

    # 根据 weibo_id 从数据库查询对应的微博帖文对象
    post = db.session.query(WeiboPost).get(weibo_id)
    if post is None:
        # 若不存在该微博帖文，抛出异常，阻止继续操作
        raise ValueError(f"WeiboPost {weibo_id} 不存在，无法保存交互记录")

    # 查询已有的关系，筛选 source_id=帖主id，relation_type=当前交互类型
    # 并将已有的关系用 (source_id, target_id, relation_type) 组成的tuple存入set，方便快速查重
    existing_keys = {
        (r.source_id, r.target_id, r.relation_type)
        for r in db.session.query(WeiboRelation)
                         .filter_by(source_id=post.user_id,
                                    relation_type=interaction_type)
                         .all()
    }
    new_keys = set()  # 本次操作准备插入的关系集合，防止重复插入

    # 遍历传入的每条交互记录
    for inter in interactions:
        raw_id = inter.user_id.strip()  # 去除空白字符

        # 解析用户ID
        if raw_id.isdigit():
            uid = int(raw_id)  # 如果本身是纯数字，直接转int
        else:
            # 否则通过IndexParser来解析真实用户ID
            parser = IndexParser(base_cfg['cookie'], raw_id)
            uid = parser._get_user_id()
            # 如果解析结果不是数字，跳过该条交互
            if not str(uid).isdigit():
                continue
            uid = int(uid)

        # 确保该用户在WeiboUser表中存在，否则新增一个不可见用户
        user = db.session.query(WeiboUser).get(uid)
        if user is None:
            user = WeiboUser(
                id=uid,
                username=inter.username or f"user_{uid}",  # 没用户名用默认
                is_visible=False,
            )
            db.session.add(user)

        # 检查 WeiboInteraction 表是否已有相同交互记录，避免重复插入
        exists = db.session.query(WeiboInteraction).filter_by(
            source_post_id=weibo_id,
            user_id=uid,
            interaction_type=interaction_type,
            publish_time=inter.publish_time
        ).first()
        if exists:
            continue  # 已存在则跳过

        # 构造新的交互对象
        obj = WeiboInteraction(
            user_id=uid,
            username=inter.username,
            interaction_type=interaction_type,
            content=inter.content or '',
            like_num=int(inter.like_num or 0),
            source=inter.source or '',
            publish_time=inter.publish_time,
            is_hot=False,
            source_post_id=weibo_id
        )
        objs_to_insert.append(obj)  # 加入待插入列表

        # 构造微博关系表WeiboRelation的记录 key
        # 这里source_id是微博帖主id，target_id是互动用户id，关系类型即交互类型
        key = (str(post.user_id), str(uid), interaction_type)
        # 如果该关系已存在或本轮准备插入中，则跳过
        if key in existing_keys or key in new_keys:
            continue

        # 新关系，加入待插入列表及new_keys集合
        relations_to_insert.append(
            WeiboRelation(source_id=str(post.user_id),
                          target_id=str(uid),
                          relation_type=interaction_type)
        )
        new_keys.add(key)

    # 批量插入所有交互数据，减少数据库开销
    if objs_to_insert:
        db.session.bulk_save_objects(objs_to_insert)

    # 批量插入所有新的微博关系
    if relations_to_insert:
        db.session.bulk_save_objects(relations_to_insert)

    # 统计当前微博帖文该交互类型的总数，用于更新WeiboPost表对应字段
    total_count = db.session.query(WeiboInteraction).filter_by(
        source_post_id=weibo_id,
        interaction_type=interaction_type
    ).count()

    # 映射交互类型到WeiboPost模型的字段名
    field_map = {
        'like': 'up_num',
        'retweet': 'retweet_num',
        'comment': 'comment_num'
    }
    # 如果数据库中计数大于当前帖文字段值，则更新帖文中的计数
    if total_count > getattr(post, field_map[interaction_type]):
        setattr(post, field_map[interaction_type], total_count)

    # 提交所有改动，确保事务原子性
    db.session.commit()


@bp.route('/crawling', methods=['POST'])
@token_auth.login_required
def weiboCrawler():
    """
    爬取微博用户关系网络
    ---
    swagger: "2.0"
    tags:
      - Weibo - Crawling
    summary: 初始化爬虫并流式返回日志及用户信息
    description: >
      接收前端传入的 `uid` 和 `config` 参数，启动微博关系爬取。
      该接口为长连接，使用流式响应不断推送爬取日志和数据。
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              uid:
                type: string
                description: 目标微博用户ID
                example: "1234567890"
              config:
                type: object
                description: 爬虫配置参数（可选）
                example:
                  cookie: "your_weibo_cookie"
                  since_date: "2022-01-01"
    responses:
      200:
        description: 流式返回日志和用户信息
        content:
          text/plain:
            schema:
              type: string
      400:
        description: 缺少 uid 参数
        content:
          text/plain:
            schema:
              type: string
      500:
        description: 初始化爬虫失败
        content:
          text/plain:
            schema:
              type: string
    """
    try:
        # 强制解析前端JSON数据
        data = request.get_json(force=True)
        uid = data.get('uid')  # 目标微博用户ID
        user_cfg = data.get('config', {})  # 额外爬虫配置参数，默认为空字典
        
        # 如果没有传入uid，返回400错误
        if not uid:
            return Response('缺少 uid 参数\n', status=400, mimetype='text/plain')

        # —— 先查询数据库，看是否已经有该用户且可见
        existing = WeiboUser.query.filter_by(id=uid, is_visible=True).first()
        if existing:
            # 如果用户已存在，直接返回用户信息，避免重复爬取
            return jsonify({
                'exists': True,
                'user': existing.to_dict()
            })

        # 获取默认配置并合并前端传入配置
        base_cfg = _get_config()
        for key, val in user_cfg.items():
            base_cfg[key] = val
        base_cfg['user_id_list'] = [uid]  # 只爬取该uid对应用户
        config_util.validate_config(base_cfg)  # 验证配置合法性

        # 初始化爬虫实例
        spider = Spider(base_cfg)

        # 生成器函数，流式推送日志和数据给客户端
        def generate():
            yield f"开始爬取用户 {uid} 的关系网络......\n"
            try:
                # spider.start() 是一个迭代器，不断产生爬取的内容
                for item in spider.start():
                    # 出错时返回格式为 {'error': code, 'message': 'xxx'}
                    if isinstance(item, dict) and 'error' in item:
                        err = {
                            'error': item['error'],
                            'message': item.get('message', '')
                        }
                        yield "ERROR:" + json.dumps(err, ensure_ascii=False) + "\n"
                        break  # 出错直接结束生成器

                    # 如果item是用户对象，处理并存库
                    if isinstance(item, User):
                        user = item
                        user_data = {
                            'id': int(user.id),
                            'username': user.nickname,
                            'gender': user.gender,
                            'location': user.location,
                            'birthday': user.birthday,
                            'description': user.description,
                            'verified_reason': user.verified_reason,
                            'talent': user.talent,
                            'education': user.education,
                            'work': user.work,
                            'weibo_num': user.weibo_num,
                            'following': user.following,
                            'followers': user.followers,
                            'last_crawled': datetime.now(timezone.utc),
                            'is_visible': True,
                        }
                        # 合并（插入或更新）数据库用户记录
                        wuser = WeiboUser(**user_data)
                        db.session.merge(wuser)
                        db.session.commit()
                        # 推送用户简单信息给前端
                        yield str(user)

                    elif isinstance(item, list):
                        # item 是该页爬取到的关系列表（粉丝或关注）
                        # 1) 持久化到数据库
                        for rel in item:
                            raw_uid = rel['uid']
                            # 解析uid，支持数字和自定义域名情况
                            if not raw_uid.isdigit():
                                parser = IndexParser(base_cfg['cookie'], raw_uid)
                                real_uid = parser._get_user_id()
                                if not real_uid.isdigit():
                                    continue
                            else:
                                real_uid = raw_uid

                            # 构造微博关系对象
                            wrel = WeiboRelation(
                                source_id=uid if rel['relation']=='following' else real_uid,
                                target_id=real_uid if rel['relation']=='following' else uid,
                            )

                            # 确保关系另一端用户存在，不存在则新增，默认不可见
                            urel = WeiboUser.query.get(real_uid)
                            if not urel:
                                urel = WeiboUser(
                                    id=real_uid,
                                    username=rel['nickname'],
                                    followers=rel['followers_count'],
                                    is_visible=False,
                                )
                                db.session.add(urel)
                            # 合并关系对象（新增或更新）
                            db.session.merge(wrel)

                        db.session.commit()
                        # 2) 推送本页关系信息给前端，逐条yield字符串
                        for rel in item:
                            yield f"获取到用户：{rel['uid']}，关系：{'关注' if rel['relation'] == 'following' else '粉丝'}\n"

                    elif isinstance(item, WeiboUserImage):
                        # 处理爬虫配置参数或图片对象（这里示例打印到后台日志）
                        print(item.to_dict())

                    else:
                        # 其他类型，直接转字符串推送
                        yield str(item) + '\n'

                yield 'STREAM_END\n'  # 爬取结束标识

            except InternalServerError:
                # 服务器内部错误，继续抛出，由Flask统一捕获结束请求
                raise

            except Exception as e:
                # 其他异常捕获，记录日志并推送错误信息
                logger.exception(e)
                yield f"Error: {e}\n"

        # 返回流式响应，边生成边推送内容
        return Response(
            stream_with_context(generate()),
            mimetype='text/plain'
        )
    
    except Exception as e:
        # 初始化爬虫失败异常捕获，记录日志并返回500错误
        logger.exception(e)
        return Response(f"初始化爬虫失败: {e}\n", status=500, mimetype='text/plain')

@bp.route('/crawling/search', methods=['GET'])
@token_auth.login_required
def search_seed():
    """
    搜索可见微博用户
    ---
    swagger: "2.0"
    tags:
      - Weibo - Crawling
    summary: 搜索微博用户（分页 + 关键词）
    parameters:
      - name: page
        in: query
        schema:
          type: integer
          default: 1
        description: 页码
      - name: pageSize
        in: query
        schema:
          type: integer
          default: 10
        description: 每页数量
      - name: q
        in: query
        schema:
          type: string
        description: 搜索关键词（模糊匹配 username/id/描述等字段）
    responses:
      200:
        description: 分页用户数据
        content:
          application/json:
            schema:
              type: object
              properties:
                items:
                  type: array
                  items:
                    type: object
                    properties:
                      id: {type: string, example: "123456789"}
                      username: {type: string, example: "张三"}
                      followers: {type: integer, example: 1024}
                total: {type: integer, example: 200}
                page: {type: integer, example: 1}
                per_page: {type: integer, example: 10}
    """
    # 获取分页参数，默认值
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('pageSize', 10, type=int)
    # 获取并去除关键词两端空白
    keyword = request.args.get('q', '', type=str).strip()

    # 基础查询条件：只查可见用户
    query = WeiboUser.query.filter(
        WeiboUser.is_visible == True,
    )

    # 如果有关键词，则对多个字段做模糊匹配
    if keyword:
        query = query.filter(
            or_(
                WeiboUser.username.ilike(f'%{keyword}%'),
                WeiboUser.id.ilike(f'%{keyword}%'),
                WeiboUser.description.ilike(f'%{keyword}%'),
                WeiboUser.location.ilike(f'%{keyword}%'),
                WeiboUser.education.ilike(f'%{keyword}%'),
                WeiboUser.work.ilike(f'%{keyword}%'),
                WeiboUser.verified_reason.ilike(f'%{keyword}%'),
            )
        )

    # 返回分页结果，默认按最近爬取时间降序排序
    return jsonify(WeiboUser.to_collection_dict(
        query.order_by(WeiboUser.last_crawled.desc()), page, per_page, 'api.search_seed'
    ))


@bp.route('/crawling/search/<int:user_id>', methods=['GET'])
@token_auth.login_required
def search_seed_by_id(user_id):
    """
    查询微博用户关系网络
    ---
    swagger: "2.0"
    tags:
      - Weibo - Crawling
    summary: 查询微博用户的多层关注/粉丝关系图
    parameters:
      - name: uid
        in: path
        required: true
        schema:
          type: string
        description: 微博用户ID
      - name: k
        in: query
        schema:
          type: integer
          default: 1
          minimum: 1
          maximum: 3
        description: 关系层数（最大3）
      - name: refresh
        in: query
        schema:
          type: boolean
          default: false
        description: 是否刷新缓存的关系图布局
    responses:
      200:
        description: 图结构数据
        content:
          application/json:
            schema:
              type: object
              properties:
                nodes:
                  type: array
                  items:
                    type: object
                    properties:
                      id: {type: string, example: "123456"}
                      name: {type: string, example: "张三"}
                      symbolSize: {type: number, example: 25}
                      category: {type: string, example: "群组1"}
                links:
                  type: array
                  items:
                    type: object
                    properties:
                      source: {type: string, example: "123456"}
                      target: {type: string, example: "654321"}
                      type: {type: string, example: "follow"}
                node_categories:
                  type: array
                  items:
                    type: object
                    properties:
                      name: {type: string}
                edge_categories:
                  type: array
                  items:
                    type: object
                    properties:
                      name: {type: string}
      400:
        description: 参数错误
        content:
          application/json:
            schema:
              type: object
              properties:
                error: {type: string, example: "参数 k 必须为正整数"}
    """
    user = (
        WeiboUser.query
        .filter_by(id=user_id, is_visible=True)
        .first_or_404(description=f"User {user_id} not found or not visible")
    )

    # 返回该用户的完整字典信息
    return jsonify(user.to_dict())


# 对数映射函数：log(f+1)/log(max+1)
def log_scale(f: int, max_followers=5e7, min_size=8, max_size=50):
    """
    根据粉丝数 f，使用对数比例映射到一个大小区间[min_size, max_size]。
    避免粉丝数极端差异导致的大小不均匀。
    """
    ratio = math.log10(f + 1) / math.log10(max_followers + 1)
    return min_size + ratio * (max_size - min_size)


@bp.route('/crawling/relations/<uid>', methods=['GET'])
@token_auth.login_required
def get_relations(uid):
    """
    根据微博用户uid，查询其关系网络的多层关注/粉丝节点，
    并生成适合图形展示的节点和边数据，返回前端。

    参数：
    - uid: 根节点用户ID
    - k: 深度层数，默认为1，最大3

    返回json格式的图结构数据，包括 nodes、links 以及类别信息。
    """

    # 每层最大关系查询限制，防止查询量过大
    k_limits = {
        0: 200,
        1: 100,
        2: 50
    }
    
    # 获取参数 k，限制在1到3之间，错误则返回400
    try:
        k = max(1, min(int(request.args.get('k', 1)), 3))
    except ValueError:
        return jsonify({"error": "参数 k 必须为正整数"}), 400

    # 查询根节点用户，找不到自动404
    root: WeiboUser = WeiboUser.query.get_or_404(uid)

    # 是否刷新缓存布局，默认False
    refresh = request.args.get('refresh', 'false') == 'true'
    if refresh:
        root.graph_computed_at = None
        root.graph_layout = None

    # 如果没有爬取时间，默认设置为当前UTC时间
    if not root.last_crawled:
        root.last_crawled = datetime.now(timezone.utc)

    # 如果已有缓存布局且是最新的，直接返回缓存的 graph_layout
    if root.graph_layout and root.graph_computed_at and root.graph_computed_at > root.last_crawled:
        return jsonify(root.graph_layout)

    # 重新从数据库获取root，确保数据最新
    root = WeiboUser.query.get_or_404(uid)
    root_id = uid

    # BFS初始化，visited保存已访问节点，frontier保存当前层节点
    visited     = {root_id}
    frontier    = {root_id}
    # parent_map记录每个节点的父节点，根节点父自己
    parent_map  = {root_id: root_id}
    edges       = []  # 用于存储边信息

    # 按层遍历关系图
    for layer in range(k):
        if not frontier:
            break  # 没有更多节点可扩展时退出

        # 查询当前层节点相关的关系
        rels = (
            WeiboRelation.query
            .filter(
                or_(
                    WeiboRelation.source_id.in_(frontier),
                    WeiboRelation.target_id.in_(frontier)
                )
            )
            .limit(k_limits[layer])
        )

        next_frontier = set()  # 下一层节点集合
        for r in rels:
            s, t = r.source_id, r.target_id
            relation_type = r.relation_type
            # 边类型判定，关注关系区分方向
            if relation_type == "follow":
                edge_type = "follow" if s in frontier else "fan"
            else:
                edge_type = relation_type

            # 添加边数据
            edges.append({
                "source": s,
                "target": t,
                "type": edge_type
            })

            # BFS扩展逻辑，更新访问集合和父节点映射
            if s in frontier and t not in visited:
                visited.add(t)
                next_frontier.add(t)
                parent_map[t] = s
            if t in frontier and s not in visited:
                visited.add(s)
                next_frontier.add(s)
                parent_map[s] = t

        frontier = next_frontier

    # 构造节点列表，附带大小、类别等属性
    nodes = []
    categories = set()

    for nid in visited:
        sid = str(nid)
        parent_id = parent_map.get(nid, root_id)
        # 取父节点用户名作为类别名
        parent_user = WeiboUser.query.get(parent_id)
        parent_name = parent_user.username if parent_user else str(parent_id)

        # 查询当前节点用户信息，优先取可见用户
        user = WeiboUser.query.filter_by(id=nid, is_visible=True).first()
        if user:
            name = user.username or sid
            size = round(log_scale(user.followers), 1)
            val  = round(math.log10(user.followers + 1) / math.log10(5e4) or 0, 2)
            category = name if val > 0.3 else parent_name
        else:
            # 不可见用户的处理
            tmp_user = WeiboUser.query.filter_by(id=nid, is_visible=False).first()
            if tmp_user:
                tmp_followers = tmp_user.followers or 0
                name = tmp_user.username or sid
                size = max(round(log_scale(tmp_followers) / math.log10(5e3), 1), 9)
                val  = round(math.log10(tmp_followers + 1) / math.log10(5e4) or 0, 2)
            else:
                # 缺失用户信息时使用默认值
                name = sid
                size = 8
                val  = 0

            category = parent_name

        nodes.append({
            "id": sid,
            "name": name,
            "symbolSize": size,  # 用于图形节点大小
            "value": val,        # 可能用于颜色映射等
            "category": category
        })
        categories.add(category)

    # 构造图，添加节点和边，用 networkx 计算布局坐标
    G = nx.Graph()
    for n in nodes:
        G.add_node(n["id"])
    for e in edges:
        G.add_edge(e["source"], e["target"])

    # spring_layout 力导向布局，k 控制斥力距离，迭代次数和随机种子固定，保证稳定结果
    pos = nx.spring_layout(G, k=0.2, iterations=80, seed=42)

    # 归一化布局坐标到 [0,1] 区间，中心点可调
    alpha = 0.3        # 推散强度（未用到，可用于调节布局）
    cx, cy = 0.5, 0.5  # 画布中心点

    for n in nodes:
        x, y = pos[n["id"]]  # spring_layout坐标，范围大致[-1,1]
        x_norm = (x + 1) / 2  # 映射到[0,1]
        y_norm = (y + 1) / 2

        n["x_norm"] = cx + (x_norm - cx)
        n["y_norm"] = cy + (y_norm - cy)

    # 构造节点类别列表和边类别列表，用于前端图例
    categories_list = [{"name": c} for c in categories]
    relation_types = ["follow", "fan", "like", "retweet", "comment"]
    edge_categories_list = [{"name": t} for t in relation_types]

    # 缓存生成的图布局到用户表，提升后续访问性能
    try:
        root.graph_layout = {
            "nodes": nodes,
            "links": edges,
            "node_categories": categories_list,
            "edge_categories": edge_categories_list
        }
        root.graph_computed_at = datetime.now(timezone.utc)
        db.session.commit()
    except Exception as e:
        print(e)
        db.session.rollback()

    # 返回图数据给前端
    return jsonify({
        "nodes": nodes,
        "links": edges,
        "node_categories": categories_list,
        "edge_categories": edge_categories_list
    })


@bp.route('/crawling/blogs/<int:uid>', methods=['POST'])
@token_auth.login_required
def get_blogs(uid):
    """
    根据用户ID(uid)启动微博博文爬取，支持传入配置(config)参数，
    爬取过程中通过流式响应实时返回日志和微博内容。

    主要步骤：
    1. 解析请求体中的配置参数。
    2. 查询该用户数据库中最新一条微博发布时间，作为 since_date 配置传入，避免重复爬取。
    3. 初始化爬虫，启动爬取。
    4. 通过 generator 实时产出爬取日志和微博数据，存库并推送给前端。
    5. 爬取完成后更新用户的最后爬取时间字段。
    """

    # 1. 获取前端传入的配置字典，默认为空字典
    data = request.get_json(force=True) or {}
    user_cfg = data.get('config', {})

    # 查询该用户已有微博，找最新一条发布时间，作为 since_date 限制
    latest_post = (
        WeiboPost.query
        .filter_by(user_id=uid)
        .order_by(WeiboPost.publish_time.desc())
        .first()
    )

    if latest_post and latest_post.publish_time:
        # 处理发布时间，兼容字符串和 datetime 类型
        if isinstance(latest_post.publish_time, str):
            since = latest_post.publish_time.split(' ')[0]  # 只保留日期部分
        else:
            since = latest_post.publish_time.date().isoformat()

        # 把 since_date 传入爬虫配置，限定只爬这个日期之后的微博
        # user_cfg['since_date'] = since

    # 2. 加载默认配置并合并前端传入配置
    base_cfg = _get_config()
    for key, val in user_cfg.items():
        base_cfg[key] = val

    # 设置爬取用户ID列表，只爬这个用户
    base_cfg['user_id_list'] = [uid]

    # 配置校验，抛异常则返回错误
    config_util.validate_config(base_cfg)

    # 3. 初始化爬虫实例
    spider = Spider(base_cfg)

    # 4. 定义生成器函数，实现流式爬取和日志返回
    def generate():
        try:
            # 爬虫 yield 日志或数据项
            for item in spider.crawl_posts():
                # 如果返回错误字典，则抛出异常终止请求
                if isinstance(item, dict) and 'error' in item:
                    raise InternalServerError(item['message'])

                # 爬取到的微博对象
                if isinstance(item, Weibo):
                    weibo = item
                    weibo.user_id = uid
                    weibo_data = {
                        'id': weibo.id,
                        'user_id': weibo.user_id,
                        'content': weibo.content,
                        'article_url': weibo.article_url,
                        'original_pictures': weibo.original_pictures,
                        'retweet_pictures': weibo.retweet_pictures,
                        'original_id': weibo.original,
                        'video_url': weibo.video_url,
                        'publish_place': weibo.publish_place,
                        'publish_time': weibo.publish_time,
                        'publish_tool': weibo.publish_tool,
                        'up_num': weibo.up_num,
                        'retweet_num': weibo.retweet_num,
                        'comment_num': weibo.comment_num,
                    }
                    # 保存或更新数据库中的微博数据
                    wpost = WeiboPost(**weibo_data)
                    db.session.merge(wpost)
                    db.session.commit()

                    # 以字符串形式推送给前端（可以根据需要修改为json）
                    yield str(weibo)

                else:
                    # 爬虫产出的普通日志字符串
                    yield str(item) + '\n'
            
            # 爬取完成，更新用户最后爬取时间
            user = WeiboUser.query.filter(WeiboUser.id==uid).first()
            user.last_crawled_wblogs = datetime.now(timezone.utc)

            db.session.commit()

            # 爬取结束标志
            yield 'STREAM_END\n'

        except InternalServerError:
            # 交给外层统一处理
            raise
        except Exception as e:
            # 其他异常封装成500错误抛出
            raise InternalServerError(str(e))

    # 5. 返回流式响应，前端可以边接收边处理爬取结果和日志
    return Response(
        stream_with_context(generate()),
        mimetype='text/plain'
    )


@bp.route('/crawling/likes/<int:uid>', methods=['POST'])
@token_auth.login_required
def get_blogs_likes(uid):
    """
    根据用户ID(uid)，遍历该用户所有微博，爬取每条微博的点赞交互，
    并实时以流的形式返回爬取进度日志。

    流程：
    1. 解析并合并前端传入的爬虫配置。
    2. 初始化爬虫实例。
    3. 查询该用户所有微博。
    4. 针对每条微博，判断是否需要继续爬取点赞关系，
       若需要则调用爬虫接口获取点赞列表，保存到数据库。
    5. 实时推送当前微博处理状态给前端。
    """

    def generate():
        # 1. 解析请求中的配置参数
        data = request.get_json(force=True) or {}
        user_cfg = data.get('config', {})           # 用户爬取相关配置
        crawl_cfg = data.get('crawlingConfig', {})  # 额外爬取控制参数，比如每条微博最大爬取点赞数等

        # 加载默认配置并合并前端传入配置
        base_cfg = _get_config()
        for key, val in user_cfg.items():
            base_cfg[key] = val

        # 限定爬取的用户ID列表为单个 uid
        base_cfg['user_id_list'] = [uid]

        # 校验配置有效性，异常会自动抛出
        config_util.validate_config(base_cfg)

        # 2. 初始化爬虫实例
        spider = Spider(base_cfg)

        # 3. 查询该用户所有微博列表
        wblogs = WeiboPost.query.filter(WeiboPost.user_id == uid).all()
        if not wblogs:
            # 如果没有微博，直接返回错误信息
            yield json.dumps({'type': 'error', 'message': 'No weibo posts found'}) + '\n'
            return

        # 4. 依次处理每条微博
        for index, wblog in enumerate(wblogs, start=1):
            up_num = wblog.up_num  # 微博记录的点赞总数阈值
            # 查询已抓取的该微博点赞交互数
            up_relations_num = WeiboInteraction.query.filter_by(
                source_post_id=wblog.id,
                interaction_type='like'
            ).count()

            # 判断是否需要继续爬取点赞数据
            # 限制为抓取数小于点赞数，且小于爬取配置中允许的最大点赞抓取数（like_per_blog * 10）
            if up_relations_num < up_num and up_relations_num < crawl_cfg.get('like_per_blog', 0) * 10:
                # 爬取这条微博的点赞列表，save_interactions函数负责入库和关系同步
                for interactions in spider.get_weibo_relation_likes(wblog.id):
                    save_interactions(interactions, base_cfg, wblog.id, 'like')

            # 5. 产出当前微博爬取进度日志，推送给前端
            log = {
                'type': 'like',
                'weibo_id': wblog.id,
                'current_index': index,
                'total_count': len(wblogs),
            }
            yield json.dumps(log) + '\n'

    # 以流式响应返回日志，mimetype text/plain 支持前端实时接收并展示
    return Response(stream_with_context(generate()), mimetype='text/plain')


@bp.route('/crawling/forwards/<int:uid>', methods=['POST'])
@token_auth.login_required
def get_blogs_forwards(uid):
    """
    爬取指定用户(uid)所有微博的转发关系（retweet），
    并实时流式返回爬取进度日志。

    流程：
    1. 解析前端传入的配置并合并。
    2. 初始化爬虫实例。
    3. 查询该用户所有微博。
    4. 针对每条微博，判断是否需要继续爬取转发数据，
       若需要则调用爬虫接口获取转发列表，保存到数据库。
    5. 实时推送当前微博处理状态给前端。
    """
    def generate():
        # 1. 解析请求中的配置参数
        data = request.get_json(force=True) or {}
        user_cfg = data.get('config', {})
        crawl_cfg = data.get('crawlingConfig', {})

        # 加载默认配置并合并用户配置
        base_cfg = _get_config()
        for key, val in user_cfg.items():
            base_cfg[key] = val
        base_cfg['user_id_list'] = [uid]

        # 校验配置合法性
        config_util.validate_config(base_cfg)

        # 2. 初始化爬虫实例
        spider = Spider(base_cfg)

        # 3. 查询该用户所有微博
        wblogs = WeiboPost.query.filter(WeiboPost.user_id == uid).all()
        if not wblogs:
            # 如果无微博，返回错误消息
            yield json.dumps({'type': 'error', 'message': 'No weibo posts found'}) + '\n'
            return

        # 4. 依次处理每条微博的转发数据
        for index, wblog in enumerate(wblogs, start=1):
            retweet_num = wblog.retweet_num  # 微博记录的转发总数阈值
            # 查询已抓取的转发交互数
            retweet_relations_num = WeiboInteraction.query.filter_by(
                source_post_id=wblog.id,
                interaction_type='retweet'
            ).count()

            # 判断是否需要继续爬取转发关系数据
            # 限制为抓取数小于转发数，且小于配置的最大抓取量(forwrd_per_blog * 10)
            if retweet_relations_num < retweet_num and retweet_relations_num < crawl_cfg.get('forwrd_per_blog', 0) * 10:
                # 调用爬虫接口抓取转发列表并保存数据库
                for interactions in spider.get_weibo_relation_forwards(wblog.id):
                    save_interactions(interactions, base_cfg, wblog.id, 'retweet')

            # 5. 返回当前微博处理进度日志
            log = {
                'type': 'forward',
                'weibo_id': wblog.id,
                'current_index': index,
                'total_count': len(wblogs),
            }
            yield json.dumps(log) + '\n'

    # 以流式响应返回日志，mimetype text/plain 方便前端实时接收
    return Response(stream_with_context(generate()), mimetype='text/plain')


@bp.route('/crawling/comments/<int:uid>', methods=['POST'])
@token_auth.login_required
def get_blogs_comment(uid):
    """
    爬取指定用户(uid)所有微博的评论关系（comment），
    并实时流式返回爬取进度日志。

    流程与转发类似，只是改为抓取评论数据。
    """
    def generate():
        # 1. 解析请求配置
        data = request.get_json(force=True) or {}
        user_cfg = data.get('config', {})
        crawl_cfg = data.get('crawlingConfig', {})

        # 加载默认配置并合并
        base_cfg = _get_config()
        for key, val in user_cfg.items():
            base_cfg[key] = val
        base_cfg['user_id_list'] = [uid]

        # 配置校验
        config_util.validate_config(base_cfg)

        # 2. 初始化爬虫
        spider = Spider(base_cfg)

        # 3. 查询该用户所有微博
        wblogs = WeiboPost.query.filter(WeiboPost.user_id == uid).all()
        if not wblogs:
            # 无微博，返回错误消息
            yield json.dumps({'type': 'error', 'message': 'No weibo posts found'}) + '\n'
            return

        # 4. 逐条处理微博评论爬取
        for index, wblog in enumerate(wblogs, start=1):
            comment_num = wblog.comment_num  # 微博记录的评论总数阈值
            # 已抓取评论数
            comment_relations_num = WeiboInteraction.query.filter_by(
                source_post_id=wblog.id,
                interaction_type='comment'
            ).count()

            # 判断是否继续爬取评论数据
            if comment_relations_num < comment_num and comment_relations_num < crawl_cfg.get('comment_per_blog', 0) * 10:
                # 爬取评论列表并保存数据库
                for interactions in spider.get_weibo_relation_comment(wblog.id):
                    save_interactions(interactions, base_cfg, wblog.id, 'comment')

            # 5. 返回当前微博处理日志
            log = {
                'type': 'comment',
                'weibo_id': wblog.id,
                'current_index': index,
                'total_count': len(wblogs),
            }
            yield json.dumps(log) + '\n'

    # 流式返回日志
    return Response(stream_with_context(generate()), mimetype='text/plain')

@bp.route('/weibo/wblogs/interaction', methods=['POST'])
@token_auth.login_required
def get_blog_interactions():
    # 从请求的 JSON 数据中获取参数
    payload = request.get_json()
    # 获取分页页码，默认值为1
    page = payload.get('page', 1)
    # 获取交互类型（如点赞、评论等）
    type = payload.get('type')
    # 获取对应微博ID
    weibo_id = payload.get('weibo_id')

    # 参数校验：微博ID不能为空，否则返回400错误和提示信息
    if weibo_id is None:
        return jsonify({"message": "weibo_id 必填"}), 400
    # 参数校验：交互类型不能为空，否则返回400错误和提示信息
    if type is None:
        return jsonify({"message": "type 必填"}), 400
    
    # 查询数据库中所有与指定微博ID和交互类型匹配的交互记录
    query = WeiboInteraction.query.filter_by(source_post_id=weibo_id, interaction_type=type)

    # 返回分页格式的交互微博数据，默认每页10条，调用 WeiboPost.to_collection_dict 进行序列化
    return jsonify(WeiboPost.to_collection_dict(query, page, 10, 'api.get_blog_interactions'))


@bp.route('/search/wblogs/<int:user_id>', methods=['GET'])
@token_auth.login_required
def get_user_wblogs(user_id):
    """
    获取指定用户的微博分页列表
    """
    # 从查询参数获取分页页码，默认1
    page = request.args.get('page', 1, type=int)
    # 从查询参数获取每页数量，默认20
    per_page = request.args.get('per_page', 20, type=int)

    # 查询数据库中该用户发布的所有微博
    query = WeiboPost.query.filter_by(user_id=user_id)

    # 返回分页微博数据，按照发布时间倒序排序，调用 WeiboPost.to_collection_dict 进行序列化
    # 同时传入 user_id，方便序列化时关联用户信息
    return jsonify(WeiboPost.to_collection_dict(
        query.order_by(WeiboPost.publish_time.desc()),
        page,
        per_page,
        endpoint='api.get_user_wblogs',
        user_id=user_id
    ))


@bp.route('/crawling/query_user', methods=['POST'])
@token_auth.login_required
def query_weibo_user():
    # 获取请求的 JSON 体，如果为空则使用空字典
    payload = request.get_json() or {}

    # 获取搜索关键词 query
    query = payload.get('q')
    # 校验搜索关键词是否存在，不存在则返回错误提示
    if not query:
        return bad_request('No query provided')
    
    # 获取 cookie，用于爬取微博用户数据
    cookie = payload.get('cookie')
    # 校验 cookie 是否存在，不存在则返回错误提示
    if not cookie:
        return bad_request('No cookie provided')
    
    # 使用微博用户搜索解析器，传入 cookie 初始化
    parser = WeiboUserSearchParser(cookie)
    # 使用解析器搜索微博用户，返回用户列表
    users = parser.search_user(query)

    # 如果没有搜索到用户，返回空列表
    if not users:
        return jsonify([])

    # 2. 从搜索结果中提取所有用户id（uid），转换为整数列表
    uids = [int(u['id']) for u in users if 'id' in u]

    # 3. 批量查询数据库，找出这些uid中已存在且可见的微博用户id集合
    existing = {
        str(u.id) for u in
        WeiboUser.query
            .with_entities(WeiboUser.id)
            .filter(WeiboUser.id.in_(uids), WeiboUser.is_visible)
            .all()
    }

    # 4. 给搜索结果中的每个用户字典增加 'exists' 字段，表示该用户是否已存在数据库
    for u in users:
        uid_str = str(u.get('id', ''))
        u['exists'] = uid_str in existing

    # 返回带有 exists 标识的微博用户列表
    return jsonify(users)


# 定义一个路由，处理微博博文的检测结果查询，使用 POST 请求方式
@bp.route('/weibo/blog/detect/result', methods=['POST'])
@token_auth.login_required  # 需要登录认证装饰器，确保调用者有权限
def fetch_weibo_blog_detect_result():
    """
    查询微博博文检测结果
    ---
    swagger: "2.0"
    tags:
      - Weibo Detection
    summary: 查询微博博文检测结果
    description: |
      根据微博ID查询该博文的立场、情感和违规检测结果。
      如果某个任务没有结果，则返回 null。

    consumes:
      - application/json

    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - postId
          properties:
            postId:
              type: integer
              description: 微博博文ID

    responses:
      200:
        description: 返回检测结果
        schema:
          type: object
          properties:
            stance:
              type: object
              description: 立场检测结果
            sentiment:
              type: object
              description: 情感分析结果
            violations:
              type: object
              description: 违规检测结果
      404:
        description: 微博博文未找到
    """
    # 从请求体中解析 JSON 数据
    payload = request.get_json()
    # 获取前端传入的微博博文ID（postId）
    weibo_id = payload.get('postId')

    # 从 WeiboDetectResult 表中查询该微博对应的立场检测结果
    stance_result = WeiboDetectResult.query.filter_by(
        weibo_id=weibo_id, 
        task_type=WeiboDetectResult.DetectType.STANCE  # 任务类型为立场检测
    ).first()

    # 查询情感分析检测结果
    sentiment_result = WeiboDetectResult.query.filter_by(
        weibo_id=weibo_id, 
        task_type=WeiboDetectResult.DetectType.SENTIMENT  # 任务类型为情感检测
    ).first()

    # 查询违规检测结果
    violation_result = WeiboDetectResult.query.filter_by(
        weibo_id=weibo_id, 
        task_type=WeiboDetectResult.DetectType.VIOLATION  # 任务类型为违规检测
    ).first()

    # 返回 JSON 格式的响应，分别包含立场、情感和违规检测的结果字段
    # 若某个任务没有结果，则返回 None
    return jsonify({
        'stance': stance_result.result if stance_result else None,
        'sentiment': sentiment_result.result if sentiment_result else None,
        'violations': violation_result.result if violation_result else None,
    })


# 引入立场检测模型
from deep_learning.stance.stance_llm import Stance_LLM

# 定义立场检测接口，处理 POST 请求
@bp.route('/weibo/blog/detect/stance', methods=['POST'])
@token_auth.login_required  # 登录认证装饰器
def detect_weibo_blog_stance():
    """
    微博博文立场检测
    ---
    swagger: "2.0"
    tags:
      - Weibo Detection
    summary: 微博博文立场检测
    description: |
      对指定微博文本进行立场分析，并保存检测结果。

    consumes:
      - application/json

    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - postId
          properties:
            postId:
              type: integer
              description: 微博博文ID

    responses:
      200:
        description: 立场预测结果
        schema:
          type: object
          properties:
            stance:
              type: string
              description: 预测立场（如支持/反对/中立等）
      404:
        description: 微博博文未找到
    """
    # 解析请求体中的 JSON 数据
    payload = request.get_json()
    # 提取前端传入的微博博文ID
    weibo_id = payload.get('postId')

    # 根据 weibo_id 查询微博内容，如果未找到则返回 404
    blog = WeiboPost.query.get_or_404(weibo_id)
    
    # 实例化立场检测模型
    model = Stance_LLM()

    # 使用模型对微博文本进行立场预测
    result = model.predict({'text': blog.content})

    # 构建并保存检测结果对象（包含博文ID、任务类型、结果和时间戳）
    weibo_result = WeiboDetectResult(
        weibo_id=weibo_id,
        task_type=WeiboDetectResult.DetectType.STANCE,
        result=result,
        timestamp=datetime.now(timezone.utc)
    )

    # 使用 merge 可自动插入或更新（若存在则更新）
    db.session.merge(weibo_result)
    db.session.commit()

    # 将预测结果以 JSON 格式返回
    return jsonify(result)

# 引入情感分析模型
from deep_learning.sentiment.sentiment_llm import Sentiment_LLM

# 定义情感分析接口，处理 POST 请求
@bp.route('/weibo/blog/detect/sentiment', methods=['POST'])
@token_auth.login_required
def detect_weibo_blog_sentiment():
    """
    微博博文情感分析
    ---
    swagger: "2.0"
    tags:
      - Weibo Detection
    summary: 微博博文情感分析
    description: |
      对指定微博文本进行情感分析，并保存结果。

    consumes:
      - application/json

    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - postId
          properties:
            postId:
              type: integer
              description: 微博博文ID

    responses:
      200:
        description: 情感分析预测结果
        schema:
          type: object
          properties:
            sentiment:
              type: string
              description: 情感类别（正面/负面/中性）
      404:
        description: 微博博文未找到
    """
    # 解析请求体中的 JSON 数据
    payload = request.get_json()
    # 提取微博博文ID
    weibo_id = payload.get('postId')

    # 查询对应微博内容，未找到则返回 404
    blog = WeiboPost.query.get_or_404(weibo_id)
    
    # 实例化情感分析模型
    model = Sentiment_LLM()

    # 调用模型预测微博文本的情感结果
    result = model.predict({'text': blog.content})

    # 构建情感分析检测结果记录
    weibo_result = WeiboDetectResult(
        weibo_id=weibo_id,
        task_type=WeiboDetectResult.DetectType.SENTIMENT,
        result=result,
        timestamp=datetime.now(timezone.utc)
    )

    # 合并到数据库（存在则更新）
    db.session.merge(weibo_result)
    db.session.commit()

    # 返回预测结果
    return jsonify(result)


# 引入违规检测模型（支持 12 类分类）
from deep_learning.illegal.llm import LLM_12_class

# 定义违规检测接口，处理 POST 请求
@bp.route('/weibo/blog/detect/violations', methods=['POST'])
@token_auth.login_required
def detect_weibo_blog_violation():
    """
    微博博文违规内容检测
    ---
    swagger: "2.0"
    tags:
      - Weibo Detection
    summary: 微博博文违规内容检测
    description: |
      对微博文本进行违规内容检测（12 类分类），并保存检测结果。

    consumes:
      - application/json

    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - postId
          properties:
            postId:
              type: integer
              description: 微博博文ID

    responses:
      200:
        description: 违规检测结果
        schema:
          type: object
          properties:
            violations:
              type: object
              description: 每类违规的预测结果
      404:
        description: 微博博文未找到
    """
    # 解析 JSON 请求数据
    payload = request.get_json()
    # 获取微博ID
    weibo_id = payload.get('postId')

    # 查询微博内容，未找到则返回 404
    blog = WeiboPost.query.get_or_404(weibo_id)

    # 实例化 12 类违规检测模型
    model = LLM_12_class()

    # 对微博文本进行违规内容预测
    result = model.predict({'text': blog.content})

    # 构造并保存违规检测结果
    weibo_result = WeiboDetectResult(
        weibo_id=weibo_id,
        task_type=WeiboDetectResult.DetectType.VIOLATION,
        result=result,
        timestamp=datetime.now(timezone.utc)
    )

    # 保存或更新结果记录
    db.session.merge(weibo_result)
    db.session.commit()

    # 返回检测结果
    return jsonify(result)

@bp.route('/weibo/blog/interactions', methods=['POST'])
@token_auth.login_required
def fetch_weibo_interactions():
    # 从请求体中获取 JSON 数据
    payload = request.get_json()

    # 提取筛选参数
    user_id = payload.get('user_id')              # 必填：用户 ID
    type_ = payload.get('type')                   # 可选：交互类型，如 'comment'、'like'
    start_date = payload.get('start_date')        # 可选：起始日期（格式：YYYY-MM-DD）
    end_date = payload.get('end_date')            # 可选：结束日期（格式：YYYY-MM-DD）
    search_text = payload.get('search_text')      # 可选：用于内容模糊搜索
    page = int(payload.get('page', 1))            # 可选：页码，默认为 1
    page_size = int(payload.get('page_size', 10)) # 可选：每页条数，默认为 10

    # 参数校验：user_id 为必填字段
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    
    # 构造基础查询条件：用户 ID 必须匹配
    filters = [WeiboInteraction.user_id == user_id]

    # 若指定了交互类型，加入过滤条件
    if type_:
        filters.append(WeiboInteraction.interaction_type == type_)

    # 若指定了起止时间，则按发布时间范围过滤
    if start_date and end_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            end = datetime.strptime(end_date, "%Y-%m-%d")
            filters.append(and_(
                WeiboInteraction.publish_time >= start,
                WeiboInteraction.publish_time <= end
            ))
        except Exception as e:
            return jsonify({'error': f'invalid date range: {e}'}), 400

    # 若指定了搜索关键词，模糊匹配微博内容
    if search_text:
        filters.append(WeiboInteraction.content.ilike(f'%{search_text}%'))

    # 构造最终查询对象，按发布时间倒序排序
    query = WeiboInteraction.query.filter(*filters).order_by(
        WeiboInteraction.publish_time.desc()
    )

    # 返回分页后的结果，使用统一的 to_collection_dict 序列化格式
    return jsonify(WeiboInteraction.to_collection_dict(
        query, page, page_size, 'api.fetch_weibo_interactions'
    ))

@bp.route('/weibo/users/top-threats', methods=['POST'])
@token_auth.login_required
def fetch_top_threat_users():
    """
    微博高风险用户排行榜
    ---
    swagger: "2.0"
    tags:
      - Weibo Detection
    summary: 微博高风险用户排行榜
    description: |
      返回系统内按威胁指数 (threat_index) 排序的高风险用户列表，支持分页。

    consumes:
      - application/json

    parameters:
      - in: body
        name: body
        required: false
        schema:
          type: object
          properties:
            page:
              type: integer
              default: 1
              description: 页码
            per_page:
              type: integer
              default: 10
              description: 每页条数

    responses:
      200:
        description: 返回高风险用户分页列表
        schema:
          type: object
          properties:
            items:
              type: array
              items:
                type: object
                description: WeiboUser.to_dict() 返回的用户信息
            _meta:
              type: object
              properties:
                page:
                  type: integer
                per_page:
                  type: integer
                total_pages:
                  type: integer
                total_items:
                  type: integer
            _links:
              type: object
              properties:
                self:
                  type: string
                next:
                  type: string
                prev:
                  type: string
      400:
        description: 请求参数无效
    """
    # 获取请求体中的参数，若为空则使用默认值
    data = request.get_json() or {}
    try:
        page     = int(data.get('page', 1))        # 获取页码，默认1
        per_page = int(data.get('per_page', 10))   # 获取每页条数，默认10
    except ValueError:
        return bad_request('page and per_page must be integers')

    # 构造查询：
    # - 只选择 is_visible = True 的用户（用户是公开状态）
    # - 按照 threat_index（威胁指数）降序排序
    # - 若威胁指数相同，则按微博数量降序排
    query = WeiboUser.query \
        .filter(WeiboUser.is_visible == True) \
        .order_by(
            WeiboUser.threat_index.desc(),
            WeiboUser.weibo_num.desc()
        )

    # 将查询结果分页并序列化为统一格式返回
    collection = WeiboUser.to_collection_dict(
        query, page, per_page,
        endpoint='api.fetch_top_threat_users'
    )
    return jsonify(collection)