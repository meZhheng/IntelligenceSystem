from flask import jsonify, g, Blueprint, request, current_app, url_for
from app import db
from ..auth.auth import token_auth
from app.api.errors import bad_request, error_response
from app.utils.decorator import admin_required
from app.models import User, Message, Task
from app.api import bp

# 创建任务接口
@bp.route('/task/create', methods=['POST'])
@token_auth.login_required  # 需要token认证
def create_task():
    '''创建任务'''
    data = request.get_json()
    if not data:
        # 如果请求体为空，返回错误
        return bad_request('You must post JSON data.')
    
    # 获取并验证任务类型参数
    task_type = data.get('type')
    if task_type is None:
        return bad_request('Missing required parameter: type')
    try:
        task_type = int(task_type)
    except ValueError:
        return bad_request('Type must be an integer')
    if task_type not in (0, 1):
        # 仅支持0（推理）和1（训练）两种任务类型
        return bad_request('Invalid type. Supported values: 0 (inference), 1 (train)')

    # 检查当前用户是否已有同名运行中任务
    if g.current_user.get_task_in_progress(data.get('name')):
        return bad_request('Task with the same exists, please select a different task name')
    else:
        # 通过用户接口将任务添加到后台任务队列，传入必要参数
        g.current_user.launch_task(
            name = data.get('name'), 
            description = data.get('description'),
            task_type = task_type,
            kwargs={'user_id': g.current_user.id, 'dataset': data.get('dataset'), 'model': data.get('model')}
        )
        # 返回任务启动提示
        return jsonify(message='正在启动任务')

# 删除任务接口
@bp.route('/task/delete', methods=['POST'])
@token_auth.login_required
def delete_task():
    '''删除任务'''
    data = request.get_json()
    if not data:
        return bad_request('传递参数错误：格式不正确')
    
    # 获取任务ID参数
    task_id = data.get('task_id')
    if task_id is None:
        return bad_request('传递参数错误：缺少任务ID')
    
    # 查询当前用户拥有的对应任务
    task = Task.query.filter_by(id=task_id, user_id=g.current_user.id).first()
    if task:
        # 仅允许删除已完成、失败或取消状态的任务
        if task.status in [Task.Status.finished, Task.Status.failed, Task.Status.canceled]:
            db.session.delete(task)
            db.session.commit()
        else:
            # 正在运行的任务禁止删除
            return bad_request('任务正在运行，无法删除')
    
    # 返回成功响应
    return jsonify({
        'code': 200,
        'message': '删除成功'
    })
    
# 发送私信接口
@bp.route('/messages/', methods=['POST'])
@token_auth.login_required
def create_message():
    '''给其它用户发送私信'''
    data = request.get_json()
    if not data:
        return bad_request('You must post JSON data.')
    # 验证消息内容和接收者ID参数
    if 'body' not in data or not data.get('body'):
        return bad_request('Body is required.')
    if 'recipient_id' not in data or not data.get('recipient_id'):
        return bad_request('Recipient id is required.')

    # 查询接收者用户，若不存在则404
    user = User.query.get_or_404(int(data.get('recipient_id')))
    # 禁止给自己发私信
    if g.current_user == user:
        return bad_request('You cannot send private message to yourself.')
    # 如果发送者被接收者拉黑，则禁止发送
    if user.is_blocking(g.current_user):
        return bad_request('You are in the blacklist of {}'.format(user.name if user.name else user.username))

    # 创建消息对象并赋值发送者与接收者
    message = Message()
    message.from_dict(data)
    message.sender = g.current_user
    message.recipient = user
    db.session.add(message)
    # 给接收者发送未读消息通知（数量更新）
    user.add_notification('unread_messages_count',
                          user.new_recived_messages())
    db.session.commit()
    # 构造响应，包含新私信的详细信息
    response = jsonify(message.to_dict())
    response.status_code = 201
    # HTTP协议要求201响应包含新资源URL，放在Location头部
    response.headers['Location'] = url_for('api.get_message', id=message.id)
    return response

# 获取当前用户的私信列表，支持分页
@bp.route('/messages/', methods=['GET'])
@token_auth.login_required
def get_messages():
    '''返回私信集合，分页'''
    page = request.args.get('page', 1, type=int)
    # 获取分页大小，最大不超过100，默认取配置值
    per_page = min(
        request.args.get(
            'per_page', current_app.config['MESSAGES_PER_PAGE'], type=int), 100)
    # 使用模型方法分页获取数据，并返回分页结果
    data = Message.to_collection_dict(
        Message.query.order_by(Message.timestamp.desc()), page, per_page,
        'api.get_messages')
    return jsonify(data)

# 获取指定私信详情
@bp.route('/messages/<int:id>', methods=['GET'])
@token_auth.login_required
def get_message(id):
    '''返回单个私信'''
    message = Message.query.get_or_404(id)
    return jsonify(message.to_dict())

# 修改指定私信内容，只有发送者可修改
@bp.route('/messages/<int:id>', methods=['PUT'])
@token_auth.login_required
def update_message(id):
    '''修改单个私信'''
    message = Message.query.get_or_404(id)
    # 权限检查，非发送者禁止修改
    if g.current_user != message.sender:
        return error_response(403)
    data = request.get_json()
    if not data:
        return bad_request('You must post JSON data.')
    if 'body' not in data or not data.get('body'):
        return bad_request('Body is required.')
    # 更新消息内容
    message.from_dict(data)
    db.session.commit()
    return jsonify(message.to_dict())

# 删除指定私信，只有发送者可删除
@bp.route('/messages/<int:id>', methods=['DELETE'])
@token_auth.login_required
def delete_message(id):
    '''删除单个私信'''
    message = Message.query.get_or_404(id)
    # 权限检查
    if g.current_user != message.sender:
        return error_response(403)
    db.session.delete(message)
    # 删除后更新接收者未读消息通知计数
    message.recipient.add_notification('unread_messages_count',
                                       message.recipient.new_recived_messages())
    db.session.commit()
    # 返回204无内容响应
    return '', 204