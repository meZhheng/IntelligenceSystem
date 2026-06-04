from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify, Response, stream_with_context, current_app
)
from app.models import ApplicationGroup, get_dataset_type, application_group_datasets, DataBase, Dataset, Model, ApplicationResult, TASK_TYPES, get_dataset_type_info, DatasetType
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

@bp.route('/application/groups/emotion/analyze', methods=['POST'])
@token_auth.login_required
def get_analyze_results_emotion(group_id = 10):
    """
    分析应用组情感分析结果
    ---
    swagger: "2.0"
    tags:
      - Application Group - Emotion
    parameters:
      - name: group_id
        in: path
        type: integer
        required: false
        default: 10
        description: 应用组ID（固定为10）
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              mode:
                type: string
                enum: [overall_stats, trend_line]
                description: 分析模式，可选 overall_stats（整体统计）或 trend_line（趋势线分析）
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
        description: 情感分析结果
        content:
          application/json:
            schema:
              type: object
              properties:
                response:
                  type: object
                  description: 分析结果（整体统计或趋势线数据）
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

    assert group_id == 10
    current_app.logger.info("===== 已进入group_id==10 情感分析 =====")
    if mode == 'trend_line':
            response = get_merged_trend_line_sentiment_analysis(group_id, dataset_ids, model_ids)
    if mode == 'overall_stats':
        response = get_overall_sentiment_analysis(group_id, dataset_ids, model_ids)

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



@bp.route('/application/groups/emotion/status', methods=['GET'])
@token_auth.login_required
def get_group_status_emotion(group_id = 10):
    """
    获取应用组情感分析状态
    ---
    swagger: "2.0"
    tags:
      - Application Group - Emotion
    parameters:
      - name: group_id
        in: path
        type: integer
        required: false
        default: 10
        description: 应用组ID（固定为10）
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

    assert group_id == 10

    
    model_id = [18]
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



@bp.route('/application/groups/emotion/RollingText', methods=['GET'])
def get_rolling_text_sentiment():
    """
    获取情感分析滚动文本（正负面示例）
    ---
    swagger: "2.0"
    tags:
      - Application Group - Emotion
    responses:
      200:
        description: 返回最新的正面/负面情感文本
        content:
          application/json:
            schema:
              type: object
              properties:
                text_pos:
                  type: array
                  items:
                    type: string
                  description: 正面情感文本列表（最多20条）
                text_neg:
                  type: array
                  items:
                    type: string
                  description: 负面情感文本列表（最多20条）
    """
    # 查询指定 group_id=10，dataset_id=15，model_id=18 的最新 200 条结果
    results_query = ApplicationResult.query.filter(
                ApplicationResult.group_id == 10,
                ApplicationResult.dataset_id == 15,
                ApplicationResult.model_id == 18
            ).limit(200)
    results = results_query.all()

    # 用于存储结果中的 data_id，避免重复
    data_ids = {res.to_dict()['data_id'] for res in results}

    # 分别存储正面和负面的文本列表
    res_text_pos = []
    res_text_neg = []

    # 遍历结果，根据情感标签分配文本
    for res in results:
        item = res.to_dict()
        data_id = item['data_id']
        raw = item['result'][0]

        text = ''
        if 'text' in raw.keys():
            text = raw['text']
        
        if 'sentiment' in raw.keys():
            pred = raw['sentiment']
        
        # 负面情感文本加入负面列表
        if pred == '负面' and len(text) > 0:
            res_text_neg.append(text)
        # 正面情感文本加入正面列表
        if pred == '正面' and len(text) > 0:
            res_text_pos.append(text)

        # 如果正负面文本各收集超过20条，提前退出循环
        if len(res_text_pos) > 20 and len(res_text_neg) > 20:
            break

    current_app.logger.info(f"=====Get Rolling Text======{len(res_text_neg)}={len(res_text_pos)}")

    # 返回情感正面和负面文本列表
    return jsonify({
        'text_pos': res_text_pos,
        'text_neg': res_text_neg
    })
