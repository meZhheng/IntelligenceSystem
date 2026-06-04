from flask import request, Response, stream_with_context, jsonify, g, current_app
from app.models import Evaluation, Model, Dataset, get_dataset_type
from app.models_spider import AccountDetectResult, WeiboUser
from app.api.auth.auth import token_auth
import uuid
from app.extensions import db
from app.api import bp
from app.api.errors import bad_request, error_response
import json, time
from deep_learning.illegal.user_role import User_role
# app/utils/evaluation.py

from sklearn.metrics import accuracy_score, recall_score, classification_report, confusion_matrix
from typing import List, Dict, Any
import traceback
from sqlalchemy import or_


def compute_evaluation(
    predictions: List[int],
    labels: List[int],
    class_names: List[str]
) -> Dict[str, Any]:
    """
    计算模型评估指标函数
    输入参数：
      - predictions: 模型预测的标签列表（整数编码）
      - labels:      真实的标签列表
      - class_names: 类别名称列表，索引对应标签编号

    返回值：一个字典，包含以下部分：
      - overview:      总览指标，如准确率、召回率和样本总数
      - classification: 各类别的详细分类报告，包括precision、recall、f1-score、support
      - confusion:     混淆矩阵，以三元组形式表示 [真实类别索引, 预测类别索引, 数量]
    """

    # 样本总数
    total = len(labels)

    # 1. 计算总览指标
    acc = accuracy_score(labels, predictions)  # 准确率
    rec = recall_score(labels, predictions, average='macro', zero_division=0)  # 宏平均召回率，zero_division=0表示除零时返回0

    overview = {
        '准确率': f'{acc * 100:.1f}%',  # 格式化为百分比字符串，保留1位小数
        '召回率': f'{rec * 100:.1f}%',
        '总样本数': f'{total:,}'  # 千分位格式化样本数量
    }

    # 2. 生成详细的分类报告字典，包含每个类别的precision、recall、f1-score和support
    report_dict = classification_report(
        labels, predictions,
        labels=list(range(len(class_names))),  # 指定标签索引范围
        target_names=class_names,
        output_dict=True, zero_division=0
    )

    classification = []
    for cls in class_names:
        stats = report_dict.get(cls, {})
        classification.append({
            'class': cls,
            'precision': f"{stats.get('precision', 0):.2f}",  # 精确率，保留两位小数
            'recall':    f"{stats.get('recall', 0):.2f}",     # 召回率
            'f1_score':  f"{stats.get('f1-score', 0):.2f}",   # F1分数
            'support':   f"{int(stats.get('support', 0)):,}"  # 支持样本数，千分位格式
        })

    # 3. 计算混淆矩阵
    cm = confusion_matrix(labels, predictions, labels=list(range(len(class_names))))
    confusion = []
    # 遍历矩阵，将非零元素以三元组形式收集，方便前端展示或存储
    for i in range(len(class_names)):
        for j in range(len(class_names)):
            confusion.append([i, j, int(cm[i, j])])

    # 返回结构化的评估结果字典
    return {
        'overview': overview,
        'classification': classification,
        'confusion': confusion
    }


@bp.route('/evaluate/tasks', methods=['GET'])
@token_auth.login_required
def getEvaluationTasks():
    """
    获取所有评估任务接口，受token认证保护
    返回所有Evaluation数据库表中的任务信息列表
    """
    tasks = Evaluation.query.all()

    # 使用模型的to_dict方法转换为json序列化格式
    return jsonify([task.to_dict() for task in tasks])


@bp.route('/evaluate/detail/<int:task_id>', methods=['GET'])
@token_auth.login_required
def get_single_task(task_id):
    """
    获取单个评估任务详情接口，受token认证保护
    根据任务ID查询对应Evaluation任务，并返回其详细信息
    """
    task = Evaluation.query.filter_by(id=task_id).first()

    return jsonify(task.to_dict())


@bp.route('/evaluate/run', methods=['POST'])
@token_auth.login_required
def start_evaluation():
    """
    启动评估任务接口，受token认证保护
    请求体需包含：
      - files: 校验码（checksum）
      - task_id: 任务ID

    验证参数后，异步启动模型测试，使用流式响应返回评估进度及结果。
    """

    payload = request.get_json()
    checksums = payload.get('files')
    task_id   = payload.get('task_id')

    # 基本参数校验，缺少返回错误
    if not checksums or not task_id:
        return bad_request('文件校验错误')

    task = Evaluation.query.get(task_id)
    # 任务不存在或校验码不匹配，拒绝请求
    if task is None or checksums != task.checksum:
        return bad_request('文件校验错误')

    def generate():
        # 初始化阶段，返回启动进度消息
        yield json.dumps({'progress': 0, 'message': '已启动评估，正在加载模型…'}) + '\n'
        try:
            model_id = task.model_id
            model_class = Model.query.get_or_404(model_id)  # 获取对应模型类
            model_instance = model_class.get_instance()     # 获取模型实例化方法

            model = model_instance()  # 实例化模型对象
            total_steps = model.get_total_steps()  # 获取模型评估总步数

            # 测试模型，逐步生成输出，支持迭代返回
            for output in model.test_model():
                if isinstance(output, int):
                    # 当前步骤为整数，计算进度并发送进度消息
                    progress = int(output / total_steps * 100)
                    chunk = {
                        'progress': progress,
                        'message': f'正在执行第 {output} 步，共 {total_steps} 步'
                    }
                    yield json.dumps(chunk) + '\n'
                
                else:
                    # 最终输出为 (predictions, labels) 元组，开始计算评估指标
                    predictions, labels = output
                    current_app.logger.info(predictions[:50])
                    current_app.logger.info(labels[:50])
                    # getattr 取不到属性时，返回一个 lambda；再调用它即可拿到默认列表
                    class_names = getattr(
                        model,
                        'get_class_names',
                        lambda: ['合法和不敏感信息', '违法违规敏感信息']
                    )()
                    metrics = compute_evaluation(predictions, labels, class_names)
                    print(metrics)

                    # 更新任务的评估结果字段
                    task.metrics = metrics

                    # 返回完成消息及指标数据
                    yield json.dumps({
                        'progress': 100,
                        'message': '测试完成',
                        'metrics': metrics
                    }) + '\n'

            # 标记任务为完成并提交数据库事务
            task.completed = True
            db.session.commit()

        except Exception as e:
            # 发生异常时：
            # 1) 记录详细错误日志（包括堆栈信息）
            current_app.logger.exception("评估过程出错")

            # 2) 将错误信息以流式方式发送给前端
            tb = traceback.format_exc()
            yield json.dumps({
                'progress': -1,
                'message': '评估失败',
                'error': str(e),
                'traceback': tb
            }) + '\n'

    # 返回响应，内容为逐步推送的 NDJSON 格式（newline delimited JSON）
    return Response(
        stream_with_context(generate()),
        mimetype='application/x-ndjson'
    )

@bp.route('/evaluate/offline/AvaiableDataset', methods=['GET'])
@token_auth.login_required
def fetch_offline_datasets():
    datasets = Dataset.query.filter(
        or_(Dataset.shared == True, Dataset.user_id == g.current_user.id),
        Dataset.dataset_type == 'ACCOUNT_ROLE_RECOGNITION'
    ).all()

    return jsonify([dataset.to_dict() for dataset in datasets])

@bp.route('/evaluate/offline/detect/<int:dataset_id>', methods=['GET'])
@token_auth.login_required
def detect_offline_datasets(dataset_id):
    # 1. 清除旧数据（用写 Session）
    WriteSession = current_app.write_session
    with WriteSession() as write_sess:
        write_sess.query(AccountDetectResult)\
                  .filter_by(task_type='offline')\
                  .delete()
        write_sess.commit()

    dataset = Dataset.query.filter_by(id=dataset_id).first_or_404()
    DataModel = get_dataset_type(dataset.dataset_type)

    # 2. 用主 Session 流式读取
    BATCH_SIZE = 500
    read_query = (DataModel.query
                  .with_entities(
                      DataModel.username,
                      DataModel.num_followers,
                      DataModel.num_blogs,
                      DataModel.auth_type
                  )
                  .filter(DataModel.dataset_id == dataset_id)
                  .yield_per(BATCH_SIZE)
                  .enable_eagerloads(False))

    processed = 0

    def generate():
        nonlocal processed
        detector = User_role()
        buffer = []

        # 每次开启一个新的写事务
        write_sess = WriteSession()

        try:
            for row in read_query:
                result = detector.predict(row._asdict())
                buffer.append({
                    'username': row.username or '未知用户',
                    'num_followers': row.num_followers,
                    'num_blogs': row.num_blogs,
                    'auth_type': row.auth_type or '未知',
                    'label': result.get('data', '未知'),
                    'task_type': 'offline'
                })
                processed += 1

                if len(buffer) >= BATCH_SIZE:
                    write_sess.bulk_insert_mappings(AccountDetectResult, buffer)
                    write_sess.commit()
                    buffer.clear()
                    yield f"data: {json.dumps({'processed': processed})}\n\n"

            # 写入剩余
            if buffer:
                write_sess.bulk_insert_mappings(AccountDetectResult, buffer)
                write_sess.commit()

            yield f"data: {json.dumps({'processed': processed})}\n\n"

        finally:
            write_sess.close()

    return Response(stream_with_context(generate()),
                    content_type='text/event-stream')

@bp.route('/evaluate/online/detect', methods=['GET'])
@token_auth.login_required
def detect_online_datasets():
    # 1. 清除旧数据（用写 Session）
    WriteSession = current_app.write_session
    with WriteSession() as write_sess:
        write_sess.query(AccountDetectResult)\
                  .filter_by(task_type='online')\
                  .delete()
        write_sess.commit()

    # 2. 用主 Session 流式读取
    BATCH_SIZE = 1000
    read_query = (WeiboUser.query
                  .with_entities(
                      WeiboUser.username,
                      WeiboUser.followers,
                      WeiboUser.weibo_num,
                      WeiboUser.verified_reason
                  )
                  .yield_per(BATCH_SIZE)
                  .enable_eagerloads(False))

    processed = 0
    total = read_query.count()
    def generate():
        nonlocal processed
        detector = User_role()
        buffer = []

        # 每次开启一个新的写事务
        write_sess = WriteSession()

        try:
            yield f"data: {json.dumps({'processed': processed, 'total': total})}\n\n"

            for row in read_query:
                result = detector.predict_online(row._asdict())
                buffer.append({
                    'username': row.username or '未知用户',
                    'num_followers': row.followers or 0,
                    'num_blogs': row.weibo_num or 0,
                    'auth_type': row.verified_reason or '未知',
                    'label': result.get('data', '未知'),
                    'task_type': 'online'
                })
                processed += 1

                if len(buffer) >= BATCH_SIZE:
                    write_sess.bulk_insert_mappings(AccountDetectResult, buffer)
                    write_sess.commit()
                    buffer.clear()
                    yield f"data: {json.dumps({'processed': processed, 'total': total})}\n\n"

            # 写入剩余
            if buffer:
                write_sess.bulk_insert_mappings(AccountDetectResult, buffer)
                write_sess.commit()

            yield f"data: {json.dumps({'processed': processed, 'total': total})}\n\n"

        finally:
            write_sess.close()

    return Response(stream_with_context(generate()),
                    content_type='text/event-stream')


from deep_learning.illegal.bert import Bert_gender_discrimination
import torch

@bp.route('evaluate/offline/detect2', methods=['GET'])
@token_auth.login_required
def detect_offline_datasets_2():
    model = Bert_gender_discrimination()
    
    def generate():
        try:
            yield 'data: {"status": "started"}\n\n'
            for chunk in model.test_model():
                yield f"data: {json.dumps({'total': chunk[0], 'processed': chunk[1]})}\n\n"
        except Exception as e:
            yield f'data: {json.dumps({"status":"error","msg":str(e)})}\n\n'
        finally:
            yield 'data: {"status": "finished"}\n\n'

        
    return Response(stream_with_context(generate()),
        content_type='text/event-stream',
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
    })
