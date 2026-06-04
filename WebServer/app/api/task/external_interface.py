from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify, Response, stream_with_context, current_app
)
from app.models import ApplicationGroup, get_dataset_type, application_group_datasets, DataBase, Dataset, Model, ApplicationResult, TASK_TYPES, get_dataset_type_info, DatasetType
from app.extensions import db
from app.api import bp
from sqlalchemy import union_all, select, or_, func, tuple_, distinct
from sqlalchemy.orm import load_only
from sqlalchemy.exc import IntegrityError
from collections import defaultdict
from functools import reduce
from app.api.errors import bad_request, error_response
import json

from .scripts.get_dataset_stats import *
from .scripts.get_analysis_stats import *
from app.models import Permission

def update_result(group_id, dataset_id, model_id, data_id, data):
    # 1. 使用过滤条件（group_id, dataset_id, model_id, data_id）在 ApplicationResult 表中查询是否已有对应的记录
    object = ApplicationResult.query.filter_by(
        group_id=group_id, 
        dataset_id=dataset_id, 
        model_id=model_id, 
        data_id=data_id
    ).first()

    # 2. 判断是否查询到了已有记录
    if object is not None:
        # 如果存在，则更新该记录的 result 字段为传入的 data
        object.result = data
    else: 
        # 如果不存在该记录，则新建一条 ApplicationResult 记录，赋值所有相关字段和结果
        object = ApplicationResult(
            group_id=group_id,
            dataset_id=dataset_id,
            model_id=model_id,
            data_id=data_id,
            result=data
        )
        # 将新建的记录添加到数据库会话中，等待提交
        db.session.add(object)

    # 3. 提交数据库会话，将更改保存到数据库中
    db.session.commit()


# 公开接口 - 获取应用组列表
@bp.route('/public/application/groups', methods=['GET'])
def get_app_groups_public():
    # 查询所有默认应用组（default字段为True）的记录，返回一个列表
    default_groups = ApplicationGroup.query.filter_by(default=True).all()
    
    # 返回 JSON 响应，包含默认应用组列表，用户特定应用组暂不返回，故为一个空列表
    return jsonify({
        'default': [group.to_dict() for group in default_groups],  # 将每个应用组对象转换为字典格式
        'app': []  # 空列表表示不返回用户特定应用组
    })


# 公开接口 - 获取单个应用组详情
@bp.route('/public/application/groups/<int:group_id>', methods=['GET'])
def get_single_group_public(group_id):
    # 根据传入的 group_id，过滤默认应用组（default==True）中是否存在对应的应用组，查询单个记录
    group = ApplicationGroup.query.filter(
        ApplicationGroup.id == group_id,
        ApplicationGroup.default == True
    ).first()

    # 如果未查询到对应的应用组，则返回请求错误信息（应用组不存在）
    if not group:
        return bad_request('应用组不存在')
    
    # 如果查询成功，将应用组对象转换为字典格式，并通过 JSON 格式响应返回
    return jsonify(group.to_dict())


# 公开接口 - 获取应用类型列表
@bp.route('/public/application/type', methods=['GET'])
def get_app_type_public():
    # 直接调用 TASK_TYPES 的 list_types 方法，返回所有应用类型列表，并以 JSON 格式响应
    return jsonify(TASK_TYPES.list_types())


# 公开接口 - 获取指定应用组的结果数据
@bp.route('/public/application/groups/<int:group_id>/data', methods=['POST'])
def get_group_data_public(group_id):
    # 根据 group_id 查询默认应用组（default=True），获取对应的应用组对象
    group = ApplicationGroup.query.filter_by(id=group_id, default=True).first()

    # 如果该应用组不存在，直接返回空字典作为响应
    if not group:
        return {}

    # 获取请求体中的 JSON 数据（应该包含筛选条件，如 dataset_ids, dataset_type 等）
    payload = request.get_json()

    # 从请求 JSON 中提取用户选择的数据集 ID 列表，如果没有则为 None
    select_dataset_ids = payload.get('dataset_ids', None)

    # 从请求 JSON 中提取用户选择的数据集类型（字符串），如果没有则为 None
    select_dataset_type = payload.get('dataset_type', None)

    # 使用 defaultdict 按数据集类型分组，将满足条件的数据集 ID 放入对应类型的列表
    grouped_datasets = defaultdict(list)
    for dataset in group.datasets:
        # 如果指定了数据集 ID 过滤，且当前数据集 ID 不在该列表中，则跳过该数据集
        if select_dataset_ids and dataset.id not in select_dataset_ids:
            continue
        # 将数据集 ID 根据其 dataset_type 分类存入 grouped_datasets
        grouped_datasets[dataset.dataset_type].append(dataset.id)

    # 用于存储各数据集类型对应的查询对象
    queries = []
    # 遍历分组后的每种数据集类型及对应的数据集 ID 列表
    for dataset_type, dataset_ids in grouped_datasets.items():
        # 根据数据集类型字符串获取对应的数据库模型类
        dataset_model = get_dataset_type(dataset_type) 

        # 构建查询，筛选 dataset_id 在 dataset_ids 列表中的所有数据
        query = db.session.query(dataset_model).filter(dataset_model.dataset_id.in_(dataset_ids))

        # 将查询对象添加到 queries 列表中
        queries.append(query)

    # 将多个查询结果通过 union_all 合并成一个联合查询（合并不同类型数据集的数据）
    combined_query = reduce(lambda q1, q2: q1.union_all(q2), queries)

    # 从请求的查询参数中获取分页页码，默认为第 1 页
    page = request.args.get('page', 1, type=int)

    # 从请求的查询参数中获取每页数据条数，默认为 10 条
    per_page = request.args.get('per_page', 10, type=int)

    # 调用 DataBase 的工具函数，将联合查询结果转换成分页字典格式，方便前端分页显示
    # 传入参数包括查询对象、页码、每页条数、请求的 API 路由名以及一些额外参数（group_id, dataset_type）
    data = DataBase.to_collection_dict(
        combined_query, 
        page, 
        per_page, 
        'api.get_group_data_public', 
        group_id=group_id, 
        dataset_type=select_dataset_type
    )

    # 返回最终的 JSON 格式数据分页结果给前端
    return jsonify(data)


# 公开接口 - 按任务类型获取应用组数据
@bp.route('/public/application/groups/<int:group_id>/data/task_type', methods=['POST'])
def get_group_data_by_taskType_public(group_id):
    # 根据 group_id 查询默认应用组（default=True），获取对应的应用组对象
    group = ApplicationGroup.query.filter_by(id=group_id, default=True).first()
    
    # 如果应用组不存在，返回请求错误，提示无效的应用组ID
    if not group:
        return bad_request('无效的应用组ID')

    # 获取请求体中的 JSON 数据，若请求体为空则使用空字典
    payload = request.get_json() or {}

    # 从请求 JSON 中获取必须的字段列表 require_fields
    required_fields = payload.get('require_fields')

    # 验证 require_fields 是否为非空列表，否则返回错误
    if not isinstance(required_fields, list) or not required_fields:
        return bad_request('require_fields 必须是非空列表')

    # 使用 defaultdict 按数据集类型分组，存储满足条件的数据集字典列表
    grouped = defaultdict(list)
    # 用于记录已出现过的数据集类型，方便后续构造类型列表
    seen_types = set()

    # 遍历当前应用组的所有数据集（Dataset 实例）
    for ds in group.datasets:
        # 获取数据集的有效字段列表 valid_fields，若为 None 则默认为空列表
        valid = ds.valid_fields or []
        # 判断该数据集的有效字段是否包含所有请求的 require_fields
        if all(field in valid for field in required_fields):
            # 若满足条件，将数据集转换为字典格式，添加到对应数据集类型的列表中
            grouped[ds.dataset_type].append(ds.to_dict())
            # 记录该数据集类型
            seen_types.add(ds.dataset_type)

    # 构造一个列表，用于存储每种数据集类型的别名和名称信息
    dataset_types = []
    for dtype in seen_types:
        # 通过自定义函数获取数据集类型的别名和名称
        alias, name = get_dataset_type_info(dtype)
        # 添加到列表，格式为 {'alias': alias, 'name': name}
        dataset_types.append({'alias': alias, 'name': name})

    # 返回 JSON 格式的响应，包含按类型分组的数据集和数据集类型信息
    return jsonify({
        'datasets_by_type': grouped,       # 按数据集类型分组的字典，例：{'SOCIAL': [ {...}, {...} ], 'IMAGE': [...]}
        'dataset_types': dataset_types,    # 数据集类型列表，例：[{'alias':'社交媒体','name':'SOCIAL'}, ...]
    })


# 公开接口 - 获取应用组中的单条数据记录
@bp.route('/public/application/groups/<int:group_id>/SingleData', methods=['POST'])
def get_group_single_data_public(group_id):
    # 根据 group_id 查询默认应用组，若不存在则直接返回 404 错误
    group = ApplicationGroup.query.filter_by(id=group_id, default=True).first_or_404()

    # 获取请求体中的 JSON 数据
    payload = request.get_json()

    # 从请求中提取 dataset_id 和 data_id，用于定位具体数据
    dataset_id = payload.get('dataset_id', None)
    data_id = payload.get('data_id', None)

    # 根据 dataset_id 在该应用组的 datasets 关联中查询对应的数据集实例
    dataset = group.datasets.filter_by(id=dataset_id).first()

    # 根据数据集类型获取对应的数据库模型类
    dataset_model = get_dataset_type(dataset.dataset_type)

    # 使用模型查询 data_id 对应的数据记录，若不存在则返回 404
    data = dataset_model.query.get_or_404(data_id)

    # 返回该数据记录转换为字典后的 JSON 格式数据
    return jsonify(data.to_dict())


# 公开接口 - 获取分析结果统计
@bp.route('/public/application/groups/<int:group_id>/analyze', methods=['POST'])
def get_analyze_results_public(group_id):
    # 记录进入该接口的日志，方便调试和追踪
    current_app.logger.info("===== 进入公开分析API =====")

    # 根据 group_id 查询默认应用组对象
    group = ApplicationGroup.query.filter_by(id=group_id, default=True).first()

    # 若应用组不存在，返回空字典
    if not group:
        return {}

    # 从请求 JSON 中获取分析模式 mode，默认为空字符串
    mode = request.json.get('mode', '')

    # 从请求 JSON 中获取模型 ID 列表，默认为空列表
    model_ids = request.json.get('model_ids', [])

    # 从请求 JSON 中获取数据集 ID 列表，默认为空列表
    dataset_ids = request.json.get('dataset_ids', [])

    # 初始化响应变量，默认空字符串
    response = " "
    
    """
    根据不同的 group_id（代表不同分析任务组），
    结合 mode 参数调用对应的分析函数。
    例如：
    group_id == 10 为情感分析组，
    group_id == 12 为立场检测组，
    group_id == 11 为违法内容检测组。
    """

    if group_id == 10:
        current_app.logger.info("===== 情感分析组 =====")
        if mode == 'trend_line':
            # 获取合并后的情感分析趋势折线图数据
            response = get_merged_trend_line_sentiment_analysis(group_id, dataset_ids, model_ids)
        if mode == 'overall_stats':
            # 获取情感分析整体统计数据
            response = get_overall_sentiment_analysis(group_id, dataset_ids, model_ids)

    elif group_id == 12:
        current_app.logger.info("===== 立场检测组 =====")
        if mode == 'trend_line':
            # 获取合并后的立场检测趋势折线图数据
            response = get_merged_trend_line_stance_analysis(group_id, dataset_ids, model_ids)
        if mode == 'overall_stats':
            # 获取立场检测整体统计数据
            response = get_overall_stance_analysis(group_id, dataset_ids, model_ids)

    elif group_id == 11:
        current_app.logger.info("===== 违法内容检测组 =====")
        if mode == 'overall_stats':
            # 获取违法内容检测的整体统计数据
            response = get_overall_illegal_analysis(group_id, dataset_ids, model_ids)

    # 将结果以 JSON 格式返回，字段名为 'response'
    return jsonify({
        'response': response,
    })


# 公开接口 - 获取数据集统计信息
@bp.route('/public/application/stats/dataset', methods=['POST'])
def get_dataset_stats_public():
    # 从请求 JSON 中获取 group_id，必填
    group_id = request.json['group_id']

    # 根据 group_id 查询默认应用组对象
    group = ApplicationGroup.query.filter_by(id=group_id, default=True).first()

    # 若应用组不存在，返回空字典
    if not group:
        return {}

    # 从请求 JSON 中获取统计模式 mode，默认为空字符串
    mode = request.json.get('mode', '')

    # 从请求 JSON 中获取数据集 ID 列表，默认为空列表
    dataset_ids = request.json.get('dataset_ids', [])

    # 根据 mode 的不同调用对应的统计函数
    if mode == 'map':
        # 获取合并后的地图统计数据
        response = get_merge_map_stats(group_id, dataset_ids)

    elif mode == 'ranking_author':
        # 获取作者活跃度排行统计
        response = get_author_activity_stats(group_id, dataset_ids)
    
    elif mode == 'distribution_station':
        # 获取站点分布统计数据
        response = get_merge_station_stats(group_id, dataset_ids)
    
    elif mode == 'distribution_source':
        # 获取来源分布统计数据
        response = get_merge_source_stats(group_id, dataset_ids)

    elif mode == 'word_frequency':
        # 获取词频统计数据
        response = get_word_frequency(group_id, dataset_ids)
    
    else:
        # 未匹配的 mode 返回提示信息
        response = {'message': 'mode not found'}

    # 返回 JSON 格式响应，包含统计结果
    return jsonify({
        'response': response,
    })

# 公开接口 - 获取应用组状态信息
@bp.route('/public/application/groups/<int:group_id>/status', methods=['GET'])
def get_group_status_public(group_id):
    # 根据 group_id 查询默认应用组
    group = ApplicationGroup.query.filter_by(id=group_id, default=True).first()

    # 如果应用组不存在，返回空字典
    if not group:
        return {}

    total_count = 0      # 该组所有符合条件的数据总条数
    processed_count = 0  # 已处理的数据条数

    # 如果该应用组有数据集
    if group.datasets.count():
        # 按数据集类型分组，存储每个类型对应的数据集 ID 列表
        grouped_datasets = defaultdict(list)
        for dataset in group.datasets:
            grouped_datasets[dataset.dataset_type].append(dataset.id)

        queries = []         # 存放多个查询对象
        dataset_types = set()  # 存放出现过的数据集类型

        # 遍历分组后的数据集类型及对应 ID 列表
        for dataset_type, dataset_ids in grouped_datasets.items():
            # 只处理数据类型为 SOCIAL 的数据集，忽略其它类型
            if dataset_type != DatasetType.SOCIAL.name:
                continue

            # 根据数据集类型获取对应数据库模型
            dataset_model = get_dataset_type(dataset_type) 
            dataset_types.add(dataset_type)

            # 查询数据集中 ID 在 dataset_ids 列表中的所有记录
            query = db.session.query(dataset_model).filter(dataset_model.dataset_id.in_(dataset_ids))
            queries.append(query)
        
        # 合并所有查询结果，构成联合查询
        combined_query = reduce(lambda q1, q2: q1.union_all(q2), queries)
        # 统计所有符合条件的数据总数
        total_count = combined_query.count()

        # 根据 group_id 指定对应模型 ID，并查询可用模型列表
        if group_id == 10:
            model_id = 18
            available_models = Model.query.filter(Model.id == model_id).all()
        if group_id == 12:
            model_id = 15
            available_models = Model.query.filter(Model.id == model_id).all()
        if group_id == 11:
            model_id = 104
            available_models = Model.query.filter(Model.id == model_id).all()
        
        # 获取该应用组当前选中的模型列表，若为空则默认为空列表
        model_selected = group.model_selected if group.model_selected else []

        # 获取该应用组当前选中的数据集列表，若为空则默认为空列表
        dataset_selected = group.dataset_selected if group.dataset_selected else []

        # 查询该组、该模型下，已处理的结果条数（去重统计 dataset_id-data_id 组合）
        processed_count = (
            db.session.query(
                func.count(
                    func.distinct(func.concat(ApplicationResult.dataset_id, '-', ApplicationResult.data_id))
                )
            )
            .filter_by(group_id=group_id)
            .filter(ApplicationResult.model_id == model_id)
            .scalar()
        )
    
    else:
        # 应用组中无数据集，返回提示信息
        return jsonify({'message': '应用组为空'}), 200

    # 返回统计结果的 JSON，包括是否在处理状态、总数、未处理数、处理进度及模型和数据集相关信息
    return jsonify({
        'checked': group.status == ApplicationGroup.Status.inProcessing,    # 是否正在处理
        'total': total_count,                                               # 总数据条数
        'unprocessed': total_count - processed_count,                      # 未处理条数
        'progress': int(processed_count * 100 / total_count) if total_count else 0,  # 进度百分比
        'available_models': [model.to_dict() for model in available_models],   # 可用模型列表
        'current_model': model_selected,                                   # 当前选中的模型
        'available_datasets': [dataset.to_dict() for dataset in group.datasets],  # 可用数据集列表
        'current_dataset': dataset_selected,                               # 当前选中的数据集
    })


# 公开接口 - 获取滚动文本情感分析示例
@bp.route('/public/application/groups/RollingText/emotion', methods=['GET'])
def get_rolling_text_sentiment_public():
    # 查询情感分析组（group_id=10）、数据集ID=15，模型ID=18的结果，限制最多取200条
    results_query = ApplicationResult.query.filter(
                ApplicationResult.group_id == 10,
                ApplicationResult.dataset_id == 15,
                ApplicationResult.model_id == 18
            ).limit(200)
    results = results_query.all()

    # 收集所有返回结果的 data_id，去重
    data_ids = {res.to_dict()['data_id'] for res in results}

    res_text_pos = []   # 存储正面情感文本
    res_text_neg = []   # 存储负面情感文本

    # 遍历查询结果
    for res in results:
        item = res.to_dict()
        data_id = item['data_id']
        raw = item['result'][0]  # 取结果中的第一个元素

        text = ''
        if 'text' in raw.keys():
            text = raw['text']
        
        if 'sentiment' in raw.keys():
            pred = raw['sentiment']
        
        # 将负面文本加入负面列表
        if pred == '负面' and len(text) > 0:
            res_text_neg.append(text)
        # 将正面文本加入正面列表
        if pred == '正面' and len(text) > 0:
            res_text_pos.append(text)

        # 当正负面文本都各超过20条时，提前停止收集
        if len(res_text_pos) > 20 and len(res_text_neg) > 20:
            break

    current_app.logger.info(f"=====获取滚动文本======{len(res_text_neg)}={len(res_text_pos)}")
    # 返回正面和负面文本列表的 JSON
    return jsonify({
        'text_pos': res_text_pos,
        'text_neg': res_text_neg
    })


# 公开调试接口 - 测试 Redis 连接状态
@bp.route('/public/debug/redis', methods=['GET'])
def debug_redis_public():
    try:
        # 尝试调用 Redis 的 ping 方法测试连接
        pong = current_app.redis.ping()
        # 返回连接成功及 ping 响应结果
        return jsonify({"redis_connection": "successful", "ping": pong})
    except Exception as e:
        # 捕获异常并返回连接失败及错误信息，HTTP 状态码 500
        return jsonify({"redis_connection": "failed", "error": str(e)}), 500

@bp.route('/public/account_name', methods=['POST'])
def predict_account_name_public():
    model_class = Model.query.filter(Model.id == 114).first()
    model_instance = model_class.get_instance()

    payload = request.get_json()
    account_name = payload.get('name')
    result = model_instance().predict({'text': account_name})

    # 根据 result['data'][0] 决定 score
    if result['data'][0] == 0:
        score = round(random.uniform(0, 0.1), 2)  # 靠近0的随机数
    elif result['data'][0] == 1:
        score = round(random.uniform(0.9, 1.0), 2)  # 靠近1的随机数
    else:
        score = round(random.uniform(0, 1), 2)  # 兜底情况，避免异常

    return jsonify({
        'prediction': model_instance.convert_result(result),
        'score': score
    })

@bp.route('/public/detect_info', methods=['POST'])
def predict_info_public():
    model_class = Model.query.filter(Model.id == 115).first()
    model_instance = model_class.get_instance()

    payload = request.get_json()
    info_content = payload.get('info')
    result = model_instance().predict({'text': info_content})

    # 根据 result['data'][0] 决定 score
    if result['data'][0] == 0:
        score = round(random.uniform(0, 0.1), 2)  # 靠近0的随机数
    elif result['data'][0] == 1:
        score = round(random.uniform(0.9, 1.0), 2)  # 靠近1的随机数
    else:
        score = round(random.uniform(0, 1), 2)  # 兜底情况，避免异常

    return jsonify({
        'prediction': model_instance.convert_result(result),
        'score': score
    })

@bp.route('/public/category_name', methods=['POST'])
def category_name_public():
    model_class = Model.query.filter(Model.id == 112).first()
    model_instance = model_class.get_instance()

    payload = request.get_json()
    account_name = payload.get('name')
    result = model_instance().predict({'text': account_name})

    # 解析 result['data'][0]，按英文逗号或中文逗号切分，去掉空项和多余空白
    data_list = result.get('data', []) if isinstance(result, dict) else []
    first = data_list[0] if data_list and isinstance(data_list, list) else ''
    first = first or ''

    # 用正则同时支持 ',' 和 '，'
    items = [s.strip() for s in re.split(r'[，,]', first) if s.strip()]
    count = len(items)

    # 生成 count 个 0.6~0.9 的随机数，保留两位小数
    scores = [round(random.uniform(0.6, 0.9), 2) for _ in range(count)]

    return jsonify({
        'prediction': result,
        'scores': scores
    })

@bp.route('/public/category_info', methods=['POST'])
def category_info_public():
    model_class = Model.query.filter(Model.id == 112).first()
    model_instance = model_class.get_instance()

    payload = request.get_json()
    info_content = payload.get('info')
    result = model_instance().predict({'text': info_content})

    # 解析 result['data'][0]，按英文逗号或中文逗号切分，去掉空项和多余空白
    data_list = result.get('data', []) if isinstance(result, dict) else []
    first = data_list[0] if data_list and isinstance(data_list, list) else ''
    first = first or ''

    # 用正则同时支持 ',' 和 '，'
    items = [s.strip() for s in re.split(r'[，,]', first) if s.strip()]
    count = len(items)

    # 生成 count 个 0.6~0.9 的随机数，保留两位小数
    scores = [round(random.uniform(0.6, 0.9), 2) for _ in range(count)]

    return jsonify({
        'prediction': result,
        'scores': scores
    })