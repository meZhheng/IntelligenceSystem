from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify, Response, stream_with_context, current_app
)
from app.models import ApplicationGroup, get_dataset_type, application_group_datasets, DataBase, Dataset, Model, ApplicationResult, TASK_TYPES, get_dataset_type_info, DatasetType, remove_prefix_from_url
from app.api.auth.auth import token_auth
from app.extensions import db
from app.api import bp
from sqlalchemy import union_all, select, or_, func, tuple_, distinct
from sqlalchemy.orm import load_only
from sqlalchemy.exc import IntegrityError
from collections import defaultdict
from functools import reduce
from app.api.errors import bad_request, error_response
import json
import math

from .scripts.get_dataset_stats import *
from .scripts.get_analysis_stats import *
from app.models import Permission

def update_result(group_id, dataset_id, model_id, data_id, data):
    # 查询数据库中是否存在对应 group_id、dataset_id、model_id、data_id 的 ApplicationResult 记录
    object = ApplicationResult.query.filter_by(
        group_id=group_id,
        dataset_id=dataset_id,
        model_id=model_id,
        data_id=data_id
    ).first()

    # 如果该记录存在，更新其 result 字段为传入的新 data
    if object is not None:
        object.result = data
    else: 
        # 如果不存在该记录，则新建一个 ApplicationResult 实例
        object = ApplicationResult(
            group_id=group_id,
            dataset_id=dataset_id,
            model_id=model_id,
            data_id=data_id,
            result=data
        )
        # 将新建的记录加入数据库会话等待提交
        db.session.add(object)

    # 提交数据库事务，保存更新或新增的结果
    db.session.commit()


@bp.route('/application/groups', methods=['GET'])
@token_auth.login_required
def get_app_groups():
    # 查询所有默认的应用组，default=True 表示系统内置的默认组
    default_groups = ApplicationGroup.query.filter_by(default=True).all()

    # 查询当前用户创建的非默认应用组，user_id 与当前登录用户匹配且 default=False
    app_groups = ApplicationGroup.query.filter_by(
        user_id=g.current_user.id,
        default=False
    ).all()

    # 返回两个应用组列表，均转换为字典形式以便前端处理
    return jsonify({
        'default': [group.to_dict() for group in default_groups],
        'app': [group.to_dict() for group in app_groups]
    })


@bp.route('/application/groups/<int:group_id>', methods=['POST'])
@token_auth.login_required
def get_single_group(group_id):
    # 查询指定 id 的应用组，限制条件为该组必须属于当前用户或为默认组
    group = ApplicationGroup.query.filter(
        ApplicationGroup.id == group_id,
        or_(
            ApplicationGroup.user_id == g.current_user.id,
            ApplicationGroup.default == True
        )
    ).first()

    # 如果未找到或无权限访问该应用组，则返回错误提示
    if not group:
        return bad_request('应用组不存在或没有权限查看该应用组')

    # 返回查询到的应用组信息，转换为字典格式
    return jsonify(group.to_dict())


@bp.route('/application/groups/create', methods=['POST'])
@token_auth.login_required
def create_app_groups():
    """创建新的应用组接口"""
    data = request.get_json() or {}

    # 必填字段校验
    required_fields = ['name', 'dataset_ids', 'default', 'task_type']
    errors = {}

    for field in required_fields:
        if field not in data:
            errors[field] = '必填字段缺失'

    # 验证 task_type 是否在预定义的任务类型枚举中
    if 'task_type' in data:
        if data['task_type'] not in TASK_TYPES.__members__:
            errors['task_type'] = '无效的任务类型'

    # 验证 dataset_ids 类型及非空
    if not isinstance(data.get('dataset_ids'), list):
        errors['dataset_ids'] = '必须为非空数组'
    elif len(data['dataset_ids']) == 0:
        errors['dataset_ids'] = '至少需要一个数据集'

    # 若 default 为 True，用户必须具备管理员权限
    if data.get('default') and not g.current_user.can(Permission.ADMIN):
        errors['default'] = '需要管理员权限'

    # 应用组名称唯一性检查，防止重复名称
    existing = ApplicationGroup.query.filter_by(
        name=data['name'],
        user_id=g.current_user.id
    ).first()
    if existing:
        errors['name'] = '应用组名称已存在'

    # 验证所有传入的数据集 ID 是否有效（是否存在于数据库）
    datasets = Dataset.query.filter(Dataset.id.in_(data['dataset_ids'])).all()
    if len(datasets) != len(data['dataset_ids']):
        errors['dataset_ids'] = '包含无效的数据集ID'

    # 如果存在任何校验错误，返回错误信息
    if errors:
        return bad_request('数据不合法')

    try:
        # 创建新的 ApplicationGroup 实例
        group = ApplicationGroup(
            user_id=g.current_user.id,
            name=data['name'],
            default=data['default'],
            task_type=data['task_type'],
        )

        # 将对应数据集关联到该应用组
        group.datasets.extend(datasets)

        # 将新应用组添加到数据库会话并提交
        db.session.add(group)
        db.session.commit()
    except IntegrityError as e:
        # 捕获数据库约束冲突异常，回滚事务并返回错误
        db.session.rollback()
        return bad_request('数据库约束冲突，请检查输入数据')
    except Exception as e:
        # 捕获其他异常，回滚事务并返回服务器错误
        db.session.rollback()
        return bad_request('服务器内部错误')

    # 返回创建成功的应用组信息
    return jsonify(group.to_dict())


@bp.route('/application/type', methods=['POST'])
@token_auth.login_required
def get_app_type():
    # 返回所有任务类型的列表，供前端选择使用
    return jsonify(TASK_TYPES.list_types())


@bp.route('/application/groups/<int:group_id>/result', methods=['POST'])
@token_auth.login_required
def get_group_result(group_id):
    """
    获取应用组推理结果
    ---
    swagger: "2.0"
    tags:
      - Application
    summary: 查询指定 group_id 关联的所有推理结果
    parameters:
      - in: path
        name: group_id
        required: true
        schema:
          type: integer
        description: 应用组 ID
    responses:
      200:
        description: 成功返回推理结果列表
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                example: {"group_id": 1, "dataset_id": 2, "data_id": 3, "model_id": 1, "result": {"label": "fake"}}
      404:
        description: 未找到结果
    """
    # 查询指定 group_id 关联的所有结果记录
    results = ApplicationResult.query.filter_by(group_id=group_id).all()

    # 返回结果记录的列表，转换为字典格式
    return jsonify([result.to_dict() for result in results])


@bp.route('/application/groups/SingleResult', methods=['POST'])
@token_auth.login_required
def get_single_result():
    """
    获取单条推理结果
    ---
    swagger: "2.0"
    tags:
      - Application
    summary: 查询单条结果记录
    description: 基于 group_id、dataset_id、data_id 和 model_id 精确匹配结果
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              group_id:
                type: integer
              dataset_id:
                type: integer
              data_id:
                type: integer
              model_id:
                type: integer
            required:
              - group_id
              - dataset_id
              - data_id
              - model_id
    responses:
      200:
        description: 成功返回单条结果或 None
        content:
          application/json:
            schema:
              type: object
              nullable: true
              example: {"group_id": 1, "dataset_id": 2, "data_id": 3, "model_id": 1, "result": {"label": "fake"}}
      404:
        description: 未找到记录
    """
    # 从请求 JSON 中获取各个查询参数
    payload = request.get_json()
    group_id = payload.get('group_id', None)
    dataset_id = payload.get('dataset_id', None)
    data_id = payload.get('data_id', None)
    model_id = payload.get('model_id', None)

    # 查询单条结果记录，基于所有四个参数匹配
    result = ApplicationResult.query.filter_by(
        group_id=group_id,
        dataset_id=dataset_id,
        data_id=data_id,
        model_id=model_id
    ).first()

    # 返回查询到的记录或 None（转换为 JSON）
    return jsonify(result.to_dict() if result else None)

@bp.route('/application/groups/<int:group_id>/data', methods=['POST'])
@token_auth.login_required
def get_group_data(group_id):
    # 查询指定 ID 的应用组
    group = ApplicationGroup.query.filter_by(id=group_id).first()

    # 若应用组不存在，返回空字典（或可返回 404 视项目风格）
    if not group:
        return jsonify({'items': [], '_meta': {'page': 1, 'per_page': 10, 'total_pages': 0, 'total_items': 0}, '_links': {'self': None, 'next': None, 'prev': None}})

    payload = request.get_json()
    select_dataset_ids = payload.get('dataset_ids', None)
    select_dataset_type = payload.get('dataset_type', None)

    # 将数据集根据类型分组，过滤不在选中列表中的数据集
    grouped_datasets = defaultdict(list)
    for dataset in group.datasets:
        if select_dataset_ids and dataset.id not in select_dataset_ids:
            continue
        grouped_datasets[dataset.dataset_type].append(dataset.id)

    # 收集每个模型对应的 SQLAlchemy Query 对象
    queries = []
    for dataset_type, dataset_ids in grouped_datasets.items():
        dataset_model = get_dataset_type(dataset_type)  # 获取对应数据模型类
        if not dataset_model:
            continue
        # 基础查询，按 dataset_id 过滤
        q = db.session.query(dataset_model).filter(dataset_model.dataset_id.in_(dataset_ids))

        # 如果调用端希望只返回 propagation 的顶层评论（parent_id 为 None），
        # 这里在 model 层尽量做过滤（若 model 有 parent_id 属性）
        if select_dataset_type and select_dataset_type == DatasetType.PROPAGATION.name:
            if hasattr(dataset_model, 'parent_id'):
                q = q.filter(dataset_model.parent_id == None)

        queries.append(q)

    # 如果没有任何查询，返回空分页结构
    if not queries:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        return jsonify({
            'items': [],
            '_meta': {'page': page, 'per_page': per_page, 'total_pages': 0, 'total_items': 0},
            '_links': {
                'self': remove_prefix_from_url(url_for('api.get_group_data', page=page, per_page=per_page, group_id=group_id)),
                'next': None,
                'prev': None
            }
        })

    # 合并所有子查询（仍可用 union_all 获取所有行）
    combined_query = reduce(lambda q1, q2: q1.union_all(q2), queries)

    # 把合并后的结果拉到 Python 层（返回模型实例列表），然后统一排序（置顶优先 -> updated_at 降序）
    try:
        all_items = combined_query.all()
    except Exception as e:
        # 若 union_all 在某些场景不可直接 all()，可先尝试使用 `combined_query.with_entities(...).all()` 或降级处理
        # 为简洁这里直接抛出异常，按需要捕获并返回合适的错误
        current_app.logger.exception("combined_query.all() failed: %s", e)
        return jsonify({'message': 'query failed'}), 500

    # 额外的 dataset_type 层过滤（如果前面没有在 model query 层过滤到）
    if select_dataset_type and select_dataset_type == DatasetType.PROPAGATION.name:
        all_items = [it for it in all_items if getattr(it, 'parent_id', None) is None]

    # 按 is_pinned（True -> 前面），然后按 updated_at（最新优先）排序
    # 注意：确保模型都有 is_pinned 和 updated_at 字段；使用 getattr 以防少数模型缺失
    def sort_key(it):
        # is_pinned True -> 0, False -> 1  （这样 True 会排在前面）
        pinned_flag = 0 if getattr(it, 'is_pinned', False) else 1
        # updated_at 有可能为 None，兜底为最早时间
        updated = getattr(it, 'updated_at', None) or datetime.fromtimestamp(0, timezone.utc)
        # 取时间戳并取负号以便降序（最新在前）
        ts = -updated.timestamp()
        return (pinned_flag, ts)

    all_items.sort(key=sort_key)

    # 分页（在 Python 层）
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    total_items = len(all_items)
    total_pages = math.ceil(total_items / per_page) if per_page > 0 else 0

    start = (page - 1) * per_page
    end = start + per_page
    page_items = all_items[start:end]

    # 构造与原来相同结构的返回数据
    data = {
        'items': [item.to_dict(dataset_type=select_dataset_type) for item in page_items],
        '_meta': {
            'page': page,
            'per_page': per_page,
            'total_pages': total_pages,
            'total_items': total_items
        },
        '_links': {
            'self': remove_prefix_from_url(url_for('api.get_group_data', page=page, per_page=per_page, group_id=group_id)),
            'next': remove_prefix_from_url(url_for('api.get_group_data', page=page + 1, per_page=per_page, group_id=group_id)) if page < total_pages else None,
            'prev': remove_prefix_from_url(url_for('api.get_group_data', page=page - 1, per_page=per_page, group_id=group_id)) if page > 1 else None
        }
    }

    return jsonify(data)

@bp.route('/application/groups/<int:group_id>/data/task_type', methods=['POST'])
@token_auth.login_required
def get_group_data_by_taskType(group_id):
    # 查询指定 id 的应用组
    group = ApplicationGroup.query.get(group_id)
    if not group:
        return bad_request('Invalid group id')

    # 获取请求中传入的 required_fields，必须是非空列表
    payload = request.get_json() or {}
    required_fields = payload.get('require_fields')
    if not isinstance(required_fields, list) or not required_fields:
        return bad_request('Invalid required_fields, expected non-empty list')

    # 按数据集类型分组存储满足条件的数据集信息
    grouped = defaultdict(list)
    seen_types = set()

    # 遍历应用组关联的所有数据集
    for ds in group.datasets:  # ds 是 Dataset 实例
        valid = ds.valid_fields or []
        # 仅当数据集的 valid_fields 包含所有 required_fields 时，才加入结果
        if all(field in valid for field in required_fields):
            grouped[ds.dataset_type].append(ds.to_dict())
            seen_types.add(ds.dataset_type)

    # 构造数据集类型列表，包含别名和名称
    dataset_types = []
    for dtype in seen_types:
        alias, name = get_dataset_type_info(dtype)
        dataset_types.append({'alias': alias, 'name': name})

    # 返回分组后的数据集信息和数据集类型列表
    return jsonify({
        'datasets_by_type': grouped,       # 例如 {'SOCIAL': [{...}, {...}], 'IMAGE': [...]}
        'dataset_types': dataset_types,    # 例如 [{'alias':'社交媒体','name':'SOCIAL'}, ...]
    })


@bp.route('/application/groups/<int:group_id>/SingleData', methods=['POST'])
@token_auth.login_required
def get_group_single_data(group_id):
    # 根据 group_id 查询应用组，找不到时返回 404 错误
    group = ApplicationGroup.query.get_or_404(group_id)

    # 从请求 JSON 中获取 dataset_id 和 data_id
    payload = request.get_json()
    dataset_id = payload.get('dataset_id', None)
    data_id = payload.get('data_id', None)

    # 在该应用组关联的数据集中查找指定 dataset_id 的数据集
    dataset = group.datasets.filter_by(id=dataset_id).first()
    # 根据数据集类型获取对应的数据模型类
    dataset_model = get_dataset_type(dataset.dataset_type)

    # 根据 data_id 查询对应数据，找不到时返回 404 错误
    data = dataset_model.query.get_or_404(data_id)

    # 返回该数据的字典表示，转换为 JSON 响应
    return jsonify(data.to_dict())


@bp.route('/application/inference_item', methods=['POST'])
@token_auth.login_required
def inference_item():
    """
    单次推理接口
    ---
    swagger: "2.0"
    tags:
      - Application
    summary: 使用指定模型对数据集中的单个数据项进行推理
    description: 根据传入的 group_id、dataset_id、data_id 和 model_id，调用模型推理并更新结果
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              group_id:
                type: integer
                description: 应用组 ID
              dataset_id:
                type: integer
                description: 数据集 ID
              data_id:
                type: integer
                description: 数据项 ID
              model_id:
                type: integer
                default: 1
                description: 模型 ID（默认为 1）
            required:
              - group_id
              - dataset_id
              - data_id
    responses:
      200:
        description: 推理成功
        content:
          application/json:
            schema:
              type: object
              properties:
                result:
                  type: string
                  example: success
      404:
        description: 资源未找到
    """
    # 获取请求体 JSON 数据
    payload = request.get_json()

    group_id = payload.get('group_id', None)
    dataset_id = payload.get('dataset_id', None)
    data_id = payload.get('data_id', None)
    model_id = payload.get('model_id', 1)  # 默认模型id为1

    # 查询应用组，数据集和数据项，均找不到时返回 404
    group = ApplicationGroup.query.get_or_404(group_id)
    dataset = group.datasets.filter_by(id=dataset_id).first()

    dataset_type = get_dataset_type(dataset.dataset_type)
    data = dataset_type.query.get_or_404(data_id)

    # 查询模型实例
    model = Model.query.get_or_404(model_id)

    # 实例化模型，调用预测接口，传入数据的字典形式
    model_class = model.get_instance()
    model_instance = model_class()
    result = model_instance.predict(data.to_dict())

    # 更新结果到数据库
    update_result(group_id, dataset_id, model_id, data_id, result)

    # 返回成功提示
    return jsonify({'result': 'success'})


@bp.route('/application/inference_streaming', methods=['POST'])
@token_auth.login_required
def inference_streaming():
    """
    流式推理接口
    ---
    swagger: "2.0"
    tags:
      - Application
    summary: 使用指定模型对数据项进行流式推理
    description: 返回流式响应，逐步推送模型预测结果
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              group_id:
                type: integer
              dataset_id:
                type: integer
              data_id:
                type: integer
              model_id:
                type: integer
                default: 1
    responses:
      200:
        description: 成功返回流式推理结果
        content:
          application/json:
            schema:
              type: string
              example: '{"token": "..."}'
      404:
        description: 资源未找到
    """
    # 获取请求体 JSON 数据
    payload = request.get_json()

    group_id = payload.get('group_id', None)
    dataset_id = payload.get('dataset_id', None)
    data_id = payload.get('data_id', None)
    model_id = payload.get('model_id', 1)  # 默认模型id为1

    # 查询应用组和数据集
    group = ApplicationGroup.query.get_or_404(group_id)
    dataset = group.datasets.filter_by(id=dataset_id).first()

    # 根据数据集类型获取对应数据模型，并查询数据项
    dataset_type = get_dataset_type(dataset.dataset_type)
    data = dataset_type.query.get_or_404(data_id)

    # 查询模型
    model = Model.query.get_or_404(model_id)

    # 实例化模型
    model_class = model.get_instance()
    model_instance = model_class()

    # 返回流式响应，流式传递模型预测生成的数据
    return Response(
        stream_with_context(
            predict_streaming_wrapper(
                model_instance, data, group_id, dataset_id, model_id, data_id
            )
        ),
        content_type='application/json'
    )

@bp.route('/application/groups/<int:group_id>/<int:dataset_id>/result', methods=['POST'])
@token_auth.login_required
def get_group_dataset_result(group_id, dataset_id):
    # 查询指定 group_id 和 dataset_id 关联的所有结果记录
    results = ApplicationResult.query.filter_by(
        group_id=group_id, 
        dataset_id=dataset_id
    ).all()

    # 返回结果列表，转换为字典形式
    return jsonify([result.to_dict() for result in results])


def predict_streaming_wrapper(model_instance, data, group_id, dataset_id, model_id, data_id):
    """
    包装模型的流式预测生成器，根据每个 chunk 的 status 字段处理输出：
      - status 为 'reasoning' 或 'streaming' 时，直接原样输出，继续流式传输
      - status 为 'success' 时，将结果存入数据库，并结束流输出
      - status 为 'failed' 时，输出错误信息并结束流输出
      - 其他情况，直接输出 chunk 原始内容
    """
    for chunk in model_instance.predict_stream(data.to_dict()):
        try:
            # 尝试解析 JSON
            obj = json.loads(chunk)
        except Exception as e:
            # 解析失败，说明不是合法 JSON，直接输出原始 chunk
            yield chunk
            continue

        status = obj.get('status')
        if status in ['reasoning', 'streaming']:
            # 持续流式输出
            yield chunk
        elif status == 'success':
            # 构造存储数据结构，包含思考过程、答案和推理内容
            stored_data = {
                'data': {
                    'thinking': obj.get('thinking'),
                    'answer': obj.get('answer_content'),
                    'reasoning': obj.get('reasoning_content'),
                }
            }
            # 存入数据库
            update_result(group_id, dataset_id, model_id, data_id, stored_data)
            # 结束流式输出
            break
        elif status == 'failed':
            # 出错时直接输出错误信息并终止流
            yield chunk
            break
        else:
            # 其他未知状态，直接输出原始 chunk
            yield chunk


@bp.route('/application/groups/<int:group_id>/analyze', methods=['POST'])
@token_auth.login_required
def get_analyze_results(group_id):
    """
    分析结果接口
    ---
    swagger: "2.0"
    tags:
      - Intelligent Analysis
    summary: 获取智能检测分析结果
    description: 
      根据 group_id 和分析模式，返回对应的分析结果：
        - group_id==10：情感分析（趋势线/总体统计）
        - group_id==12：立场分析（趋势线/总体统计）
        - group_id==11：非法内容（总体统计）
    parameters:
      - in: path
        name: group_id
        required: true
        schema:
          type: integer
        description: 应用组 ID
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              mode:
                type: string
                enum: [trend_line, overall_stats]
                description: 分析模式
              model_ids:
                type: array
                items:
                  type: integer
                description: 模型 ID 列表
              dataset_ids:
                type: array
                items:
                  type: integer
                description: 数据集 ID 列表
    responses:
      200:
        description: 成功返回分析结果
        content:
          application/json:
            schema:
              type: object
              properties:
                response:
                  type: object
    """
    current_app.logger.info("===== 已进入API =====")
    # 查询指定应用组
    group = ApplicationGroup.query.filter_by(id=group_id).first()
    if not group:
        return {}

    # 获取请求 JSON 中的分析模式和模型ID、数据集ID列表
    mode = request.json.get('mode', '')
    model_ids = request.json.get('model_ids', [])
    dataset_ids = request.json.get('dataset_ids', [])
    response = " "

    """
    根据 group_id 调用不同分析函数：
      - group_id==10：情感分析趋势线和总体统计
      - group_id==12：立场分析趋势线和总体统计
      - group_id==11：非法内容总体统计
    """
    if group_id == 10:
        current_app.logger.info("===== 已进入group_id==10 =====")
        if mode == 'trend_line':
            response = get_merged_trend_line_sentiment_analysis(group_id, dataset_ids, model_ids)
        if mode == 'overall_stats':
            response = get_overall_sentiment_analysis(group_id, dataset_ids, model_ids)
    elif group_id == 12:
        current_app.logger.info("===== 已进入group_id==12 =====")
        if mode == 'trend_line':
            response = get_merged_trend_line_stance_analysis(group_id, dataset_ids, model_ids)
        if mode == 'overall_stats':
            response = get_overall_stance_analysis(group_id, dataset_ids, model_ids)
    elif group_id == 11:
        current_app.logger.info("===== 已进入group_id==11 =====")
        if mode == 'overall_stats':
            response = get_overall_illegal_analysis(group_id, dataset_ids, model_ids)

    current_app.logger.info("获取分析结果")

    # 返回分析结果 JSON
    return jsonify({
        'response': response,
    })

@bp.route('/application/groups/<int:group_id>/checkGroupStatus', methods=['POST'])
@token_auth.login_required
def check_group_status(group_id):
    """
    检查应用组处理状态
    ---
    swagger: "2.0"
    tags:
      - Intelligent Analysis
    summary: 检查应用组中任务的处理进度
    description: 
      统计每个模型的数据总量、已处理量，并启动后台任务处理未处理数据。
    parameters:
      - in: path
        name: group_id
        required: true
        schema:
          type: integer
        description: 应用组 ID
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              model_list:
                type: array
                items:
                  type: integer
                description: 模型 ID 列表
              dataset_ids:
                type: array
                items:
                  type: integer
                description: 数据集 ID 列表
    responses:
      200:
        description: 返回当前组的任务状态
        content:
          application/json:
            schema:
              type: object
              properties:
                status:
                  type: string
                  enum: [processing, finished, error]
                total:
                  type: integer
                unprocessed:
                  type: integer
                progress:
                  type: integer
                  description: 已处理百分比
    """
    # 根据 group_id 查询应用组，找不到时返回 404 错误
    group = ApplicationGroup.query.get_or_404(group_id)

    # 获取请求体 JSON 数据
    payload = request.get_json()

    # 从请求体获取模型列表和数据集列表
    model_list = payload.get('model_list', None)
    dataset_list = payload.get('dataset_ids', None)

    current_app.logger.info(f"check for{model_list}" )
    current_app.logger.info(f"check for{dataset_list}" )
    
    total_data = []      # 记录每个模型对应的数据总量
    processed_data = []  # 记录每个模型已处理的数据量

    # 遍历所有模型 id，统计对应的数据处理状态
    for model_id in model_list:
        total_data_model = 0      # 当前模型的数据总量统计
        processed_data_model = 0  # 当前模型的已处理数据统计
        data_unprocessed = {}     # 存储该模型未处理的数据，按数据集 id 分组

        # 遍历请求传入的数据集列表（注意这里 dataset 是对象，不是 id）
        for dataset_id in dataset_list:

            # 从id获取dataset对象
            dataset = Dataset.query.filter_by(id = dataset_id).first()

            # 仅对数据类型为 SOCIAL 的数据集进行处理，跳过其他类型
            if dataset.dataset_type != DatasetType.SOCIAL.name and dataset.dataset_type != DatasetType.ILLEGAL_ACCOUNT_DETECTION.name:
                continue
            
            # 查询当前模型、应用组、数据集对应的已处理数据 id 列表
            processed_data_ids = ApplicationResult.query \
                .filter_by(group_id=group_id, dataset_id=dataset.id, model_id=model_id) \
                .with_entities(ApplicationResult.data_id) \
                .all()
            processed_data_ids = [row[0] for row in processed_data_ids]  # 转换成纯 id 列表

            # 根据数据集类型获取对应的数据模型类
            dataset_type = get_dataset_type(dataset.dataset_type)

            # 统计该数据集总数据量
            count_total = dataset_type.query.filter_by(dataset_id=dataset.id).count()
            # 已处理数据量为 processed_data_ids 长度
            count_processed = len(processed_data_ids)

            # 如果总数据量大于已处理数据量，且当前用户具备管理员权限
            if count_total > count_processed and g.current_user.can(Permission.ADMIN):
                # 查询未处理数据项，按发布时间升序排序（可选用于任务启动时处理）
                unprocessed = dataset_type.query \
                    .filter_by(dataset_id=dataset.id) \
                    .filter(~dataset_type.id.in_(processed_data_ids)) \
                    .order_by(dataset_type.publish_time.asc()) \
                    .all()
                
                data_unprocessed[dataset.id] = unprocessed

            # 累计当前模型下所有数据集的数据总量和已处理数据量
            total_data_model += count_total
            processed_data_model += count_processed

        # 构造任务名称，包含模型别名
        task_name = '自动监测分析, 使用模型：{}'.format(Model.query.get(model_id).alias)

        # 如果有未处理数据且当前用户没有正在进行的同名任务，则启动新任务
        if data_unprocessed and not g.current_user.get_task_in_progress(task_name):
            task_description = task_name
            task_type = 0

            # 启动后台任务，传入必要参数
            g.current_user.launch_task(
                name=task_name, 
                description=task_description,
                task_type=task_type,
                kwargs={
                    'user_id': g.current_user.id, 
                    'datasets': data_unprocessed, 
                    'model_id': model_id,
                    'store_result': True,
                    'group_id': group_id,
                    'total': total_data_model - processed_data_model
                }
            )

        # 记录当前模型的数据统计
        total_data.append(total_data_model)
        processed_data.append(processed_data_model)

    # 汇总所有模型的数据总量和已处理量
    total_count = sum(total_data)
    processed_count = sum(processed_data)

    # 根据统计结果判断整体状态
    if total_count > processed_count:
        status = 'processing'   # 仍有未处理数据
    elif total_count == processed_count:
        status = 'finished'     # 全部处理完成
    else:
        status = 'error'        # 统计异常，处理数超过总数

    # 返回当前状态、平均总量、未处理数量及处理进度百分比
    return jsonify({
        'status': status,
        'total': total_count / len(model_list) if model_list else 0,
        'unprocessed': total_count - processed_count,
        'progress': int(processed_count * 100 / total_count) if total_count else 0,
    })


@bp.route('/application/stats/dataset', methods=['POST'])
@token_auth.login_required
def get_dataset_stats():
    """
    数据集统计分析
    ---
    swagger: "2.0"
    tags:
      - Intelligent Analysis
    summary: 获取数据集的多维度统计信息
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              group_id:
                type: integer
                description: 应用组 ID
              mode:
                type: string
                enum: [map, ranking_author, distribution_station, distribution_source, word_frequency]
              dataset_ids:
                type: array
                items:
                  type: integer
                description: 数据集 ID 列表
    responses:
      200:
        description: 成功返回统计结果
        content:
          application/json:
            schema:
              type: object
              properties:
                response:
                  type: object
    """
    # 从请求中获取 group_id，查询对应应用组
    group_id = request.json['group_id']
    group = ApplicationGroup.query.filter_by(id=group_id).first()
    if not group:
        return {}

    # 获取分析模式和数据集 ID 列表
    mode = request.json.get('mode', '')
    dataset_ids = request.json.get('dataset_ids', [])

    # 根据不同的 mode 调用对应的统计分析函数
    if mode == 'map':
        response = get_merge_map_stats(group_id, dataset_ids)

    elif mode == 'ranking_author':
        response = get_author_activity_stats(group_id, dataset_ids)
    
    elif mode == 'distribution_station':
        response = get_merge_station_stats(group_id, dataset_ids)
    
    elif mode == 'distribution_source':
        response = get_merge_source_stats(group_id, dataset_ids)

    elif mode == 'word_frequency':
        response = get_word_frequency(group_id, dataset_ids)
    
    else:
        # 若传入未知的 mode，返回提示信息
        response = {'message': 'mode not found'}

    # 返回统计分析结果
    return jsonify({
        'response': response,
    })


@bp.route('/application/groups/<int:group_id>/status', methods=['GET'])
@token_auth.login_required
def get_group_status(group_id):
    """
    获取应用组状态
    ---
    swagger: "2.0"
    tags:
      - Intelligent Analysis
    summary: 获取应用组的处理进度和配置信息
    parameters:
      - in: path
        name: group_id
        required: true
        schema:
          type: integer
        description: 应用组 ID
    responses:
      200:
        description: 返回应用组的处理状态
        content:
          application/json:
            schema:
              type: object
              properties:
                checked:
                  type: boolean
                  description: 是否处于处理中
                total:
                  type: integer
                unprocessed:
                  type: integer
                progress:
                  type: integer
                  description: 进度百分比
                available_models:
                  type: array
                  items:
                    type: object
                  description: 可用模型列表
                current_model:
                  type: array
                  items:
                    type: integer
                  description: 当前选中的模型
                available_datasets:
                  type: array
                  items:
                    type: object
                  description: 可用数据集
                current_dataset:
                  type: array
                  items:
                    type: integer
                  description: 当前选中的数据集
    """
    # 查询指定 group_id 的应用组
    group = ApplicationGroup.query.filter_by(id=group_id).first()

    # 如果应用组不存在，直接返回空字典
    if not group:
        return {}

    total_count = 0       # 应用组中所有相关数据的总条数
    processed_count = 0   # 已处理的数据条数

    if group.datasets.count():
        # 按数据集类型对数据集进行分组，形成字典，key 为 dataset_type，value 是对应数据集 id 列表
        grouped_datasets = defaultdict(list)
        for dataset in group.datasets:
            # 可选：针对特定 group_id 过滤某些数据集
            # if group_id in (10, 12) and dataset.id not in (13, 15):
            #     continue
            current_app.logger.info(dataset.id)
            grouped_datasets[dataset.dataset_type].append(dataset.id)

        queries = []
        dataset_types = set()

        # 遍历所有分组，构造各类型数据的查询语句
        for dataset_type, dataset_ids in grouped_datasets.items():
            # 只处理数据类型为 SOCIAL 的数据
            if dataset_type != DatasetType.SOCIAL.name:
                continue

            # 根据数据类型获取对应的 ORM 模型类
            dataset_model = get_dataset_type(dataset_type) 
            dataset_types.add(dataset_type)

            # 查询所有属于这些数据集 id 的数据条目
            query = db.session.query(dataset_model).filter(dataset_model.dataset_id.in_(dataset_ids))
            queries.append(query)

        # 将多个查询合并为一个联合查询
        combined_query = reduce(lambda q1, q2: q1.union_all(q2), queries)

        # 统计总数据条数
        total_count = combined_query.count()

        # 针对不同 group_id，指定可用的模型 ID 并查询对应模型
        if group_id == 10:
            model_id = 18
            available_models = Model.query.filter(Model.id == model_id).all()
        if group_id == 12:
            model_id = 15
            available_models = Model.query.filter(Model.id == model_id).all()
        if group_id == 11:
            model_id = [104, 105, 111]
            available_models = Model.query.filter(Model.id.in_(model_id) ).all()
        
        # 这里可以扩展成按任务类型获取模型：
        # else:
        #     available_models = Model.query.filter(Model.task_type.in_(dataset_types)).all()

        # 获取当前应用组选中的模型列表，若未选中则默认为空列表
        model_selected = group.model_selected if group.model_selected else []


        # 统计数据条数改为dataset_selected的条数
        if group.id == 11:
            dataset_selected = group.dataset_selected if group.dataset_selected else []
            items_num = 0
            for dataset_id in dataset_selected:
                dataset = Dataset.query.filter_by(id = dataset_id).first()
                dataset_type = get_dataset_type(dataset.dataset_type)
                items_num = dataset_type.query.filter_by(dataset_id=dataset.id).count()
           
            total_count = items_num

        current_app.logger.info("获取选择模型")

        # 获取当前应用组选中的数据集列表，若未选中则默认为空列表
        dataset_selected = group.dataset_selected if group.dataset_selected else []

        # 查询该应用组和模型下已处理的数据条数（通过唯一的 dataset_id + data_id 组合计数）
        processed_count = (
            db.session.query(
                func.count(
                    func.distinct(func.concat(ApplicationResult.dataset_id, '-', ApplicationResult.data_id))
                )
            )
            .filter_by(group_id=group_id)
            # .filter(ApplicationResult.model_id == model_id)
            .filter(ApplicationResult.model_id == model_selected[0])
            .filter(ApplicationResult.dataset_id == dataset_selected[0])
            .scalar()
        )
    else:
        # 如果应用组没有数据集，返回提示信息
        return jsonify({'message': 'Group is empty'}), 200

    # 返回当前组状态，包括处理进度、可用模型、已选模型及数据集等信息
    return jsonify({
        'checked': group.status == ApplicationGroup.Status.inProcessing,  # 是否处于处理中状态
        'total': total_count,                                             # 数据总条数
        'unprocessed': total_count - processed_count,                     # 未处理数据条数
        'progress': int(processed_count * 100 / total_count) if total_count else 0,  # 处理进度百分比
        'available_models': [model.to_dict() for model in available_models],        # 可用模型列表
        'current_model': model_selected,                                       # 当前选中的模型列表
        'available_datasets': [dataset.to_dict() for dataset in group.datasets],    # 应用组下所有数据集
        'current_dataset': dataset_selected,                                   # 当前选中的数据集列表
    })


@bp.route('/application/groups/<int:group_id>/status', methods=['POST'])
@token_auth.login_required
def set_group_status(group_id):
    """
    设置应用组状态
    ---
    swagger: "2.0"
    tags:
      - Intelligent Analysis
    summary: 更新应用组的运行状态、选中模型和数据集
    parameters:
      - in: path
        name: group_id
        required: true
        schema:
          type: integer
        description: 应用组 ID
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              checked:
                type: boolean
                description: 是否开启处理中状态
              model_selected:
                type: array
                items:
                  type: integer
                description: 选中的模型 ID 列表
              dataset_selected:
                type: array
                items:
                  type: integer
                description: 选中的数据集 ID 列表
    responses:
      200:
        description: 成功更新状态
        content:
          application/json:
            schema:
              type: object
              properties:
                status:
                  type: integer
                  example: 200
    """
    # 查询当前登录用户拥有权限的指定 group_id 的应用组
    group = ApplicationGroup.query.filter_by(id=group_id, user_id=g.current_user.id).first()

    # 不存在或无权限时返回错误
    if not group:
        return bad_request('应用组不存在或没有权限')

    # 获取前端传入的开关状态，转换为枚举值赋值给 group.status
    newStatus = request.json.get('checked')
    group.status = ApplicationGroup.Status.inProcessing if newStatus else ApplicationGroup.Status.inPause

    # 获取请求中的选中模型列表
    model_selected = request.json.get('model_selected', [])

    # 确保模型列表为 list 类型，否则返回错误
    if not isinstance(model_selected, list):
        return jsonify({"error": "model_selected must be a list"}), 400

    # 查询所有有效模型 ID，确保前端提交的模型 ID 合法
    valid_model_ids = {m.id for m in Model.query.options(load_only(Model.id)).filter(Model.id.in_(model_selected)).all()}

    current_app.logger.info(f"有效模型：{valid_model_ids}")

    # 过滤非法模型 ID，只保留合法的
    filtered_model_selected = [m_id for m_id in model_selected if m_id in valid_model_ids]

    current_app.logger.info(f"更新选择的模型：{filtered_model_selected}")

    # 更新 group 的 model_selected 字段，若没有合法选项则保持原值
    group.model_selected = filtered_model_selected if filtered_model_selected else group.model_selected

    # 获取请求中的选中数据集列表
    dataset_selected = request.json.get('dataset_selected', [])

    # 确保数据集列表为 list 类型，否则返回错误
    if not isinstance(dataset_selected, list):
        return jsonify({"error": "dataset_selected must be a list"}), 400

    # 查询所有有效数据集 ID，确保提交合法
    valid_dataset_ids = {
        d.id for d in Dataset.query.options(load_only(Dataset.id)).filter(Dataset.id.in_(dataset_selected)).all()
    }

    # 过滤非法数据集 ID，只保留合法的
    filtered_dataset_selected = [d_id for d_id in dataset_selected if d_id in valid_dataset_ids]

    # 更新 group 的 dataset_selected 字段，若没有合法选项则保持原值
    group.dataset_selected = filtered_dataset_selected if filtered_dataset_selected else group.dataset_selected

    # 提交数据库变更
    db.session.commit()

    # 返回成功状态
    return jsonify({
        'status': 200,
    })

@bp.route('/application/groups/<int:group_id>/AvaiableDataset', methods=['GET'])
@token_auth.login_required
def get_avaiable_datasets(group_id):
    # 根据 group_id 查询应用组，找不到时返回 404
    group = ApplicationGroup.query.get_or_404(group_id)

    # 1) 获取当前应用组已关联的数据集 id 列表，用于排除
    except_dataset_ids = [d.id for d in group.datasets]

    # 2) 查询所有可用数据集，条件是共享数据集或者当前用户创建的数据集
    all_datasets = Dataset.query.filter(
        or_(Dataset.shared == True,
            Dataset.user_id == g.current_user.id)
    ).all()

    # 3) 从中间关联表中查询本组对每个数据集的 task_type 配置，构成映射字典
    rows = db.session.query(
        application_group_datasets.c.dataset_id,
        application_group_datasets.c.task_type
    ).filter(
        application_group_datasets.c.group_id == group_id
    ).all()
    task_type_map = { ds_id: tt for ds_id, tt in rows }

    # 4) 构造要返回给前端的数据集列表，
    # 并在每个数据集字典中加上对应的 task_type（如果没有则为 None）
    datasets_out = []
    for ds in all_datasets:
        d = ds.to_dict()
        d['task_type'] = task_type_map.get(ds.id)
        datasets_out.append(d)

    # 5) 计算该组现有数据集的 dataset_type，保持唯一集合后转成前端需要的格式
    dataset_type = {
        get_dataset_type_info(ds.dataset_type)
        for ds in group.datasets
    }
    dataset_type = [
        {'alias': alias, 'name': name}
        for alias, name in dataset_type
    ]

    # 返回数据集列表、排除列表和数据集类型信息
    return jsonify({
        'datasets': datasets_out,
        'except': except_dataset_ids,
        'dataset_type': dataset_type,
    })


@bp.route('/application/groups/<int:group_id>/ImportDataset', methods=['POST'])
@token_auth.login_required
def import_datasets(group_id):
    # 获取请求体 JSON 数据
    data = request.get_json()

    # 从请求体获取要导入的数据集 id 列表
    dataset_ids = data.get('dataset_ids')

    # 查询当前登录用户有权限的应用组
    group = ApplicationGroup.query.filter_by(id=group_id).first()
    if group is None:
        # 组不存在或没有权限，返回错误
        return bad_request("应用组不存在或没有权限")
    
    # 遍历所有请求导入的数据集 id
    for dataset_id in dataset_ids:
      # 查询该数据集是否存在
      dataset = Dataset.query.get(dataset_id)
      
      if dataset is None:
        # 不存在则跳过
        continue
        
      # 如果该数据集尚未关联到应用组，添加关联
      if dataset not in group.datasets:
        group.datasets.append(dataset)
    
    # 提交数据库修改
    db.session.commit()

    # 返回操作成功信息
    return jsonify({
        'status': 200,
        'message': '成功将数据集添加到当前应用组',
    })


@bp.route('/debug/redis')
def debug_redis():
    # 测试 Redis 连接是否成功
    try:
      pong = current_app.redis.ping()
      return jsonify({"redis_connection": "successful", "ping": pong})
    except Exception as e:
      # 连接失败返回错误信息
      return jsonify({"redis_connection": "failed", "error": str(e)}), 500
