from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify
)
from app.models import Model, ModelCheckpoint, MODEL_TYPES, Task, Dataset, ApplicationGroup, CheckpointResult, get_dataset_type
from app.api.auth.auth import token_auth

from app.extensions import db
from app.api import bp
from sqlalchemy import union_all, select, or_, func, tuple_, distinct

from app.utils.systeminfo import get_gpu_info, get_cpu_count
from app.api.errors import bad_request, error_response
from sqlalchemy.orm.exc import NoResultFound
from sqlalchemy import or_, and_, func
import json

# 获取指定任务类型及数据集字段匹配的模型列表接口
@bp.route('/models', methods=['POST'])
@token_auth.login_required  # 需要token认证
def get_models_by_type():
    # 从请求体获取数据集ID
    dataset_id = request.json.get('dataset_id')
    if not dataset_id:
        # 若未提供 dataset_id，则返回400错误
        return jsonify({'message': 'dataset_id is required'}), 400
    try:
        # 查询对应数据集，若不存在则自动抛出404异常
        dataset = Dataset.query.get_or_404(dataset_id)
    except NoResultFound:
        # 捕获查询无结果异常，返回404错误
        return jsonify({'message': 'Dataset not found'}), 404
    
    # 获取请求中的分组ID
    group_id = request.json.get('group_id')
    if not group_id:
        # group_id缺失时返回400错误
        return jsonify({'message': 'group_id is required'}), 400
    try:
        # 查询对应应用分组
        group = ApplicationGroup.query.get_or_404(group_id)
    except NoResultFound:
        # 分组不存在，返回404
        return jsonify({'message': 'Group not found'}), 404
    
    # 获取任务类型参数（如文本分类、图像识别等）
    task_type = request.json.get('task_type')

    # 获取数据集有效字段，转换成集合方便操作（默认空集合）
    dataset_fields = set(dataset.valid_fields or [])

    # 过滤所有满足任务类型的模型
    available_models = []
    all_models = Model.query.filter_by(task_type=task_type).all()
    for model in all_models:
        instance = model.get_instance()  # 实例化模型对象
        if not instance:
            # 如果实例化失败（无效模型），跳过
            continue
        # 获取模型所需字段列表，默认至少需要"text"
        required_fields = set(instance.get_required_fields() or ['text'])
        # 判断模型所需字段是否全部包含在数据集字段中
        if required_fields.issubset(dataset_fields):
            # 满足条件则加入可用模型列表
            available_models.append(model)

    # 返回满足字段需求的模型列表（转字典方便前端处理）
    return jsonify([m.to_dict() for m in available_models])

# 获取用户共享或自己拥有的模型列表（带分页）
@bp.route('/models', methods=['GET'])
@token_auth.login_required
def get_models():
    # 获取分页参数，默认为第1页，每页10条
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    # 查询当前用户拥有或公开共享的模型检查点（Checkpoint）
    query = ModelCheckpoint.query.filter(
      or_(ModelCheckpoint.shared == True, ModelCheckpoint.user_id == g.current_user.id)
    )

    # 使用模型检查点类的分页转换工具，返回带分页信息的json数据
    return jsonify(ModelCheckpoint.to_collection_dict(
      query, page, per_page, 'api.get_models'
    ))

# 获取所有可训练的基准模型列表
@bp.route('/models/base_models', methods=['GET'])
@token_auth.login_required
def get_base_models():
    # 查询所有标记为trainable的基准模型
    base_models = Model.query.filter_by(trainable=True).all()
    # 返回模型字典列表
    return jsonify([model.to_dict() for model in base_models])

# 获取所有可训练的基准模型列表
@bp.route('/models/<int:model_id>/trainsets', methods=['GET'])
@token_auth.login_required
def get_trainsets(model_id):
    # 查询所有标记为trainable的基准模型
    base_model = Model.query.filter_by(trainable=True, id=model_id).first()
    if not base_model:
        return error_response(404, '当前模型不存在')
    
    model_instance = base_model.get_instance()
    # 1. 获取原本的必需字段列表
    required_fields = model_instance.get_required_fields()  # e.g. ['text']

    # 2. 强制确保 'label' 在里面
    if 'label' not in required_fields:
        required_fields.append('label')

    # 2. 为每个字段都生成一个 JSON_CONTAINS(...) == 1 的子条件
    field_conditions = [
        func.json_contains(
            Dataset.valid_fields,
            json.dumps([field])    # 必须是 JSON 数组形式，单元素数组
        ) == 1
        for field in required_fields
    ]

    # 3. 把 owner / shared 的 OR 条件，与 dataset_type、is_deleted，以及上面的所有 field_conditions 用 AND 串起来
    trainsets = (
        Dataset.query
        .filter(
            # 拥有者 或 共享
            or_(
                Dataset.user_id == g.current_user.id,
                Dataset.shared == True
            ),
            # 类型必须是 SOCIAL
            Dataset.dataset_type == 'SOCIAL',
            # 所有 required_fields 都要命中
            and_(*field_conditions),
            # 排除逻辑删除
            Dataset.is_deleted == False,
        )
        .all()
    )

    # 返回模型字典列表
    return jsonify([trainset.to_dict() for trainset in trainsets])

# 获取当前系统可用的硬件设备信息（GPU、CPU）
@bp.route('/models/available_devices', methods=['GET'])
@token_auth.login_required
def get_available_devices():
    # 调用系统信息工具获取GPU设备列表和CPU核心数
    return jsonify({
        'gpu_devices': get_gpu_info(),
        'cpu_count': get_cpu_count(),
    })

# 创建新模型训练任务接口
@bp.route('/models/create', methods=['POST'])
@token_auth.login_required
def create_model():
    """
    创建新模型训练任务
    ---
    swagger: "2.0"
    tags:
      - Model
    summary: 创建新模型训练任务
    description: |
      根据用户提供的模型检查点配置和训练超参数，
      创建一个新的模型训练任务并异步执行。

    consumes:
      - application/json

    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            checkpoint:
              type: object
              description: 模型检查点配置
            hyperparameters:
              type: object
              description: 训练超参数设置

    responses:
      200:
        description: 训练任务创建成功，返回 checkpoint ID
        schema:
          type: integer
      400:
        description: 创建任务失败
    """
    # 获取请求的JSON负载
    payload = request.get_json()

    # 从负载中解析checkpoint配置
    checkpoint_setting = payload.get('checkpoint')

    # 新建模型检查点对象并用传入参数填充
    checkpoint = ModelCheckpoint()
    checkpoint.from_dict(checkpoint_setting)

    checkpoint.user = g.current_user  # 关联当前用户

    # 获取训练超参数
    hyperparameters = payload.get('hyperparameters')

    # 将checkpoint添加到数据库会话并刷新，以生成ID
    db.session.add(checkpoint)
    db.session.flush()  # 生成checkpoint.id

    # 构造任务名称和标签
    task_name = '在基准模型 {} 上训练新模型'.format(Model.query.get(checkpoint.model_id).alias)
    task_tag = 'auto:train:{}'.format(checkpoint.id)
    
    # 通过当前用户接口发起异步训练任务
    task = g.current_user.launch_task(
        name=task_name, 
        description=task_name,
        task_type=1,  # 假设1代表训练任务
        tag=task_tag,
        kwargs={'checkpoint_id': checkpoint.id, 'hyperparameters': hyperparameters}
    )

    if task:
        # 任务创建成功，提交数据库事务
        db.session.commit()
        return jsonify(checkpoint.id)
    else:
        # 任务创建失败，回滚事务
        db.session.rollback()
        return bad_request('创建任务失败')

# 获取指定模型检查点的详细信息
@bp.route('/models/<string:model_id>/detail', methods=['GET'])
@token_auth.login_required
def get_model_detail(model_id):
    """
    获取模型权重详情
    ---
    swagger: "2.0"
    tags:
      - Model
    summary: 获取模型检查点详情
    description: 根据模型检查点 ID 查询并返回详细信息

    parameters:
      - name: model_id
        in: path
        type: string
        required: true
        description: 模型检查点ID

    responses:
      200:
        description: 模型检查点信息
        schema:
          type: object
      404:
        description: 模型检查点不存在
    """
    # 通过模型检查点ID查询对应记录，若无则404
    checkpoint = ModelCheckpoint.query.get_or_404(model_id)
    
    # 返回模型检查点字典数据
    return jsonify(checkpoint.to_dict())

# 查询指定模型检查点训练任务的当前状态及进度
@bp.route('/models/<string:model_id>/status', methods=['GET'])
@token_auth.login_required
def get_model_status(model_id):
    """
    查询模型训练任务状态
    ---
    swagger: "2.0"
    tags:
      - Model
    summary: 查询模型训练任务状态
    description: |
      返回指定模型检查点对应训练任务的当前状态、进度和结果。
      如果任务已完成，会更新模型检查点状态。

    parameters:
      - name: model_id
        in: path
        type: string
        required: true
        description: 模型检查点ID

    responses:
      200:
        description: 返回训练状态和进度
        schema:
          type: object
          properties:
            status:
              type: string
            progress:
              type: number
              format: float
            result:
              type: object
      404:
        description: 模型检查点或任务不存在
    """
    # 查询模型检查点对象
    checkpoint = ModelCheckpoint.query.get_or_404(model_id)
    # 查询当前用户对应的训练任务
    task: Task = Task.query.filter_by(user_id=g.current_user.id, tag='auto:train:{}'.format(checkpoint.id)).first()
    if not task:
        # 如果任务不存在，返回404
        return error_response(404)

    if checkpoint.complete and task:
        # 如果模型训练完成且任务存在，直接返回完成状态和结果
        return jsonify({'status': 'complete', 'progress': task.get_progress(), 'result': task.result})
    
    # 否则查询任务当前状态和进度
    status = task.get_status()
    progress = task.get_progress()
    if status == Task.Status.finished:
        # 如果任务已完成，更新checkpoint状态并提交
        checkpoint.complete = True
        db.session.commit()

        return jsonify({'status': 'complete', 'progress': progress, 'result': task.result})
    
    # 返回当前状态和进度及结果
    return jsonify({'status': status.name, 'progress': progress, 'result': task.result})
    
# 获取当前用户的模型使用配额或限制
@bp.route('/models/limit', methods=['GET'])
@token_auth.login_required
def get_model_limit():
    # 返回当前用户剩余的模型使用参数余额（如调用次数、额度等）
    return jsonify(g.current_user.get_model_param_balance())

# 获取指定模型检查点可用的数据集列表（筛选满足字段要求的数据集）
@bp.route('/models/test_checkpoint/available_datasets', methods=['POST'])
@token_auth.login_required
def get_test_checkpoint_available_datasets():
    payload = request.get_json()
    checkpoint_id = payload.get('checkpoint_id')
    checkpoint = ModelCheckpoint.query.get_or_404(checkpoint_id)

    # 实例化模型类，获取模型所需字段列表
    model_cls = checkpoint.model.get_instance()
    required_fields = model_cls.get_required_fields()  # 例如 ['text', 'label', ...]
    # 强制确保 'label' 在里面
    if 'label' not in required_fields:
        required_fields.append('label')

    # 查询当前用户所有数据集
    all_datasets = Dataset.query.filter_by(user_id=g.current_user.id).all()

    # 过滤出包含所有必需字段的数据集
    available = []
    for ds in all_datasets:
        # 假设 valid_fields 是列表，若为JSON字符串则SQLAlchemy会自动解析
        dataset_fields = ds.valid_fields  
        if set(required_fields).issubset(set(dataset_fields)):
            available.append(ds)

    # 返回符合要求的数据集字典列表
    return jsonify([dataset.to_dict() for dataset in available])

# 批量获取指定数据ID在某模型检查点下的推理结果
@bp.route('/models/test_checkpoint/batchAnalyzeResults', methods=['POST'])
@token_auth.login_required
def get_test_checkpoint_batchAnalyzeResults():
    """
    批量获取模型推理结果
    ---
    swagger: "2.0"
    tags:
      - Model
    summary: 批量获取模型推理结果
    description: |
      根据指定的 checkpoint、数据集和数据 ID 列表，批量获取预测结果。

    consumes:
      - application/json

    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - checkpoint_id
            - dataset_id
            - data_ids
          properties:
            checkpoint_id:
              type: string
            dataset_id:
              type: integer
            data_ids:
              type: array
              items:
                type: integer

    responses:
      200:
        description: 返回 data_id -> 结果 的映射
        schema:
          type: object
          properties:
            results:
              type: object
              additionalProperties: true
      400:
        description: 参数错误，data_ids 必须为列表
    """
    payload = request.get_json()
    checkpoint_id = payload.get('checkpoint_id')
    dataset_id = payload.get('dataset_id')
    data_ids = payload.get('data_ids', [])

    # 确保 data_ids 是列表格式
    if not isinstance(data_ids, list):
        return jsonify({'error': 'data_ids must be a list'}), 400

    # 从数据库查询指定数据集、模型检查点和数据ID的结果记录
    rows = (
        CheckpointResult.query
        .filter_by(dataset_id=dataset_id, checkpoint_id=checkpoint_id)
        .filter(CheckpointResult.data_id.in_(data_ids))
        .all()
    )

    # 构建 data_id -> 结果 的字典映射
    results_map = {row.data_id: row.result for row in rows}

    # 返回结果映射，格式如 { "results": { "data_id1": result1, ... } }
    return jsonify({'results': results_map})

# 单条数据的模型推理及结果保存接口
@bp.route('/models/test_checkpoint/analyzeSingle', methods=['POST'])
@token_auth.login_required
def test_checkpoint_analyzeSingle():
    """
    单条数据模型推理
    ---
    swagger: "2.0"
    tags:
      - Model
    summary: 单条数据模型推理
    description: |
      对指定数据集中的单条数据进行模型推理，并保存结果。
      返回预测结果。

    consumes:
      - application/json

    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - checkpoint_id
            - dataset_id
            - data_id
          properties:
            checkpoint_id:
              type: string
              description: 模型检查点ID
            dataset_id:
              type: integer
              description: 数据集ID
            data_id:
              type: integer
              description: 数据记录ID

    responses:
      200:
        description: 返回预测结果
        schema:
          type: object
      404:
        description: 数据集、数据或模型检查点不存在
    """
    payload = request.get_json()
    checkpoint_id = payload.get('checkpoint_id')
    dataset_id = payload.get('dataset_id')
    data_id = payload.get('data_id')

    # 查询对应数据集及数据实体
    dataset = Dataset.query.get_or_404(dataset_id)
    dataset_cls = get_dataset_type(dataset.dataset_type)  # 例如 SocialMediaDataset 类
    data = dataset_cls.query.filter_by(dataset_id=dataset_id, id=data_id).first()

    checkpoint = ModelCheckpoint.query.get_or_404(checkpoint_id)

    # 实例化模型并执行预测
    model_cls = checkpoint.model.get_instance()
    model_instance = model_cls(load_path=checkpoint.checkpoint_path)

    result = model_instance.predict(data.to_dict())
    # 将模型原始预测结果转换成标准格式
    result = model_cls.convert_result(result)

    # 创建并保存预测结果记录
    checkpoint_result = CheckpointResult(
        dataset_id=dataset_id,
        checkpoint_id=checkpoint_id,
        data_id=data_id,
        result=result
    )

    db.session.add(checkpoint_result)
    db.session.commit()

    # 返回预测结果
    return jsonify(result)