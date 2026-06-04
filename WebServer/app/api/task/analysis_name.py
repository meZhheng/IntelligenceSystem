from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify, Response, stream_with_context, current_app
)
from app.models import ApplicationGroup, get_dataset_type, application_group_datasets, DataBase, Dataset, Model, ApplicationResult, TASK_TYPES, get_dataset_type_info, DatasetType, Permission
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

from .scripts.get_dataset_stats import *
from .scripts.get_analysis_stats import *



@bp.route('/application/groups/name/analyze', methods=['POST'])
@token_auth.login_required
def get_analyze_results_name(group_id = 13):
    """
    分析应用组违法违规账号检测结果
    ---
    swagger: "2.0"
    tags:
      - Application Group - Illegal Account Detection
    parameters:
      - name: group_id
        in: path
        type: integer
        required: false
        default: 13
        description: 应用组ID（固定为13）
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              mode:
                type: string
                enum: [overall_stats]
                description: 分析模式，目前仅支持 overall_stats（整体统计）
              model_ids:
                type: array
                items:
                  type: integer
                description: 模型ID列表
              dataset_ids:
                type: array
                items:
                  type: integer
                description: 数据集ID列表
    responses:
      200:
        description: 违法违规账号检测分析结果
        content:
          application/json:
            schema:
              type: object
              properties:
                response:
                  type: object
                  description: 分析结果（整体统计）
                total:
                  type: integer
                  description: 数据总条数
                unprocessed:
                  type: integer
                  description: 未处理数据条数
                progress:
                  type: integer
                  description: 处理进度百分比（0-100）
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

    assert group_id == 13
    current_app.logger.info("===== 已进入group_id==13 违法违规账号检测 =====")
    if mode == 'overall_stats':
        response = get_overall_name_analysis(group_id, dataset_ids, model_ids)
        # pass

    current_app.logger.info("获取分析结果")


    total_count = 0
    for dataset_id in dataset_ids:
        dataset = Dataset.query.filter_by(id = dataset_id).first()
        dataset_type = get_dataset_type(dataset.dataset_type)
        total_count += dataset_type.query.filter_by(dataset_id=dataset.id).count()
    
    processed_count = 0
    for model_id in model_ids:
        for dataset_id in dataset_ids:
            processed_count += (
            db.session.query(
                func.count(
                    func.distinct(func.concat(ApplicationResult.dataset_id, '-', ApplicationResult.data_id))
                )
            )
            .filter_by(group_id=group_id)
            .filter(ApplicationResult.model_id == model_id)
            .filter(ApplicationResult.dataset_id == dataset_id)
            .scalar()
        )
    
    current_app.logger.info("获取处理进度")

    # 返回分析结果 JSON
    return jsonify({
        'response': response,
        'total': total_count,                                                                  # 数据总条数
        'unprocessed': max(total_count - processed_count, 0),                                  # 未处理数据条数
        'progress': min(int(processed_count * 100 / total_count), 100) if total_count else 0,  # 处理进度百分比
    })



@bp.route('/application/groups/name/status', methods=['GET'])
@token_auth.login_required
def get_group_status_name(group_id = 13):
    """
    获取应用组违法违规账号检测状态
    ---
    swagger: "2.0"
    tags:
      - Application Group - Illegal Account Detection
    parameters:
      - name: group_id
        in: path
        type: integer
        required: false
        default: 13
        description: 应用组ID（固定为13）
    responses:
      200:
        description: 应用组状态信息
        content:
          application/json:
            schema:
              type: object
              properties:
                checked:
                  type: boolean
                  description: 是否处于处理中状态
                total:
                  type: integer
                  description: 数据总条数
                unprocessed:
                  type: integer
                  description: 未处理数据条数
                progress:
                  type: integer
                  description: 处理进度百分比（0-100）
                available_models:
                  type: array
                  items:
                    type: object
                  description: 可用模型列表
                current_model:
                  type: array
                  items:
                    type: integer
                  description: 当前选中的模型ID列表
                available_datasets:
                  type: array
                  items:
                    type: object
                  description: 应用组下的所有数据集
                current_dataset:
                  type: array
                  items:
                    type: integer
                  description: 当前选中的数据集ID列表
    """
    # 查询指定 group_id 的应用组
    group = ApplicationGroup.query.filter_by(id=group_id).first()

    # 如果应用组不存在，直接返回空字典
    if not group:
        return {}

    assert group_id == 13

    
    model_id = [114, 124, 125, 126]
    available_models = Model.query.filter(Model.id.in_(model_id) ).all()
    
    model_selected = group.model_selected if group.model_selected else []
    dataset_selected = group.dataset_selected if group.dataset_selected else []

    current_app.logger.info("获取初始选中模型与数据集")


    # 返回当前组状态，包括处理进度、可用模型、已选模型及数据集等信息
    return jsonify({
        'checked': group.status == ApplicationGroup.Status.inProcessing,  # 是否处于处理中状态
        'total': 0,                                                           # 数据总条数
        'unprocessed': 0,                                                     # 未处理数据条数
        'progress': 0,                                                        # 处理进度百分比
        'available_models': [model.to_dict() for model in available_models],        # 可用模型列表
        'current_model': model_selected,                                       # 当前选中的模型列表
        'available_datasets': [dataset.to_dict() for dataset in group.datasets],    # 应用组下所有数据集
        'current_dataset': dataset_selected,                                   # 当前选中的数据集列表
    })




@bp.route('/application/groups/name/checkGroupStatus', methods=['POST'])
@token_auth.login_required
def check_group_status_name(group_id = 13):
    """
    检查违法违规账号检测任务状态，并在必要时启动后台处理任务
    ---
    swagger: "2.0"
    tags:
      - Application Group - Illegal Account Detection
    parameters:
      - name: group_id
        in: path
        type: integer
        required: false
        default: 13
        description: 应用组ID（固定为13）
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
                description: 模型ID列表
              dataset_ids:
                type: array
                items:
                  type: integer
                description: 数据集ID列表
    responses:
      200:
        description: 检测任务执行状态
        content:
          application/json:
            schema:
              type: object
              properties:
                status:
                  type: string
                  enum: [processing, finished, error]
                  description: 当前任务状态
                total:
                  type: integer
                  description: 平均数据总条数（按模型均分）
                unprocessed:
                  type: integer
                  description: 未处理数据条数
                progress:
                  type: integer
                  description: 处理进度百分比（0-100）
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


