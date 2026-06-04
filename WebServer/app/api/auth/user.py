from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify, current_app
)
from werkzeug.security import check_password_hash
from app.api.errors import bad_request, error_response
from app.models import User, Task, Notification, Role
from app.models_spider import WeiboUser
from app.extensions import db
from app.api.auth.auth import token_auth
from app.api import bp
from datetime import datetime, timedelta, timezone
from sqlalchemy.exc import SQLAlchemyError
from app.utils.decorator import admin_required

@bp.route('/users', methods=['GET'])
def get_users():
    '''分页返回用户列表'''
    page = request.args.get('page', 1, type=int)  # 页码，默认1
    per_page = request.args.get('per_page', 10, type=int)  # 每页条数，默认10
    # 调用User模型的分页序列化方法
    data = User.to_collection_dict(User.query, page, per_page, 'api.get_users')
    return jsonify(data)


@bp.route('/users/<int:id>', methods=['GET'])
def get_user(id):
    '''返回指定ID的用户信息'''
    user = User.query.get_or_404(id)  # 找不到返回404
    return jsonify(user.to_dict())

@bp.route('/auth/register', methods=['POST'])
def register():
    '''注册新用户（支持邀请码验证）'''
    SINGLE_USE_INVITE = False

    data = request.get_json()
    if not data:
        return bad_request('You must post JSON data.')

    message = {}

    # 基本字段校验
    if 'username' not in data or not data.get('username', None):
        message['username'] = 'Please provide a valid username.'
    if 'password' not in data or not data.get('password', None):
        message['password'] = 'Please provide a valid password.'

    # 邀请码校验（前端会提交不带 '-' 的 16 位或带 '-' 的格式）
    raw_invite = data.get('inviteCode', '')
    if not raw_invite:
        message['inviteCode'] = '邀请码不能为空。'
    else:
        # 规范化：去除非字母数字、转大写
        code_clean = ''.join(ch for ch in str(raw_invite).upper() if ch.isalnum())
        if len(code_clean) != 16 or not code_clean.isalnum():
            message['inviteCode'] = '邀请码格式不正确，需为 16 位大写字母或数字。'
        else:
            # 生成带 '-' 的形式与原始（无 -）两种 key 兼容查询
            code_dash = '-'.join([code_clean[i:i+4] for i in range(0, 16, 4)])
            code_plain = code_clean  # 保留备用

    # 检查用户名是否已被注册
    if 'username' in data and data.get('username'):
        if User.query.filter_by(username=data.get('username')).first():
            message['username'] = 'Please use a different username.'

    if message:
        return bad_request(message)

    # 检查 Redis 中是否存在该邀请码
    r = current_app.redis
    # 优先使用带 dash 的 key（因为生成时我们用的是带 dash 的 key）
    code_key_dash = f"invite:code:{code_dash}"
    code_key_plain = f"invite:code:{code_plain}"

    try:
        owner = r.get(code_key_dash)
        used_key = code_key_dash
        if not owner:
            # 尝试不带 dash 的 key（兼容性）
            owner = r.get(code_key_plain)
            used_key = code_key_plain

        if not owner:
            return bad_request({'inviteCode': '邀请码无效或已过期。'})

        # redis 返回 bytes，转 str
        try:
            owner_user_id = owner.decode() if isinstance(owner, (bytes, bytearray)) else str(owner)
        except Exception:
            owner_user_id = str(owner)

        # TTL 检查（可选），若 TTL<=0 则视为过期
        ttl = r.ttl(used_key)
        if ttl is None:
            ttl = -2
        if ttl <= 0:
            return bad_request({'inviteCode': '邀请码已过期。'})

    except Exception as e:
        current_app.logger.exception("检查邀请码时 Redis 异常")
        return bad_request({'inviteCode': '无法验证邀请码，请稍后重试。'})

    # 到此邀请码有效，执行用户创建流程
    try:
        # 去除 inviteCode 字段传入 user.from_dict，避免未知字段问题
        user_payload = {k: v for k, v in data.items() if k != 'inviteCode'}
        user = User()
        user.from_dict(user_payload, new_user=True)

        # 如果 User 模型支持 invited_by 字段尝试写入
        if hasattr(user, 'invited_by'):
            try:
                # 尝试将 owner_user_id 转换为整数（如果适用）
                user.invited_by = int(owner_user_id) if str(owner_user_id).isdigit() else owner_user_id
            except Exception:
                user.invited_by = owner_user_id

        db.session.add(user)
        db.session.commit()

        # 如果配置为单次使用，则删除邀请码相关的 redis 键（invite:code:... 与 invite:user:owner)
        if SINGLE_USE_INVITE:
            try:
                user_key = f"invite:user:{owner_user_id}"
                pipe = r.pipeline()
                pipe.delete(used_key)
                pipe.delete(user_key)
                pipe.execute()
            except Exception:
                # 不能因为删除失败而影响注册结果，记录日志即可
                current_app.logger.exception("尝试删除已使用的邀请码时发生错误")

        # 返回创建成功的用户信息，状态码201
        response = jsonify(user.to_dict())
        response.status_code = 201
        response.headers['Location'] = url_for('api.get_user', id=user.id)
        return response

    except SQLAlchemyError as e:
        current_app.logger.exception("数据库错误，创建用户失败")
        db.session.rollback()
        return bad_request({'database': '创建用户失败，请稍后重试。'})
    except Exception as e:
        current_app.logger.exception("注册时发生未处理的异常")
        # 回滚以防部分提交
        try:
            db.session.rollback()
        except Exception:
            pass
        return bad_request({'error': '注册失败，请稍后重试。'})

@bp.route('/users/<int:id>', methods=['PUT'])
def update_user(id):
    '''更新指定用户信息'''
    user = User.query.get_or_404(id)
    data = request.get_json()
    if not data:
        return bad_request('You must post JSON data.')

    message = {}
    # 验证用户名有效性及唯一性
    if 'username' in data and not data.get('username', None):
        message['username'] = 'Please provide a valid username.'
    if 'username' in data and data['username'] != user.username and User.query.filter_by(username=data['username']).first():
        message['username'] = 'Please use a different username.'
    if message:
        return bad_request(message)

    # 用请求数据更新用户对象
    user.from_dict(data, new_user=False)
    db.session.commit()
    return jsonify(user.to_dict())


@bp.route('/users/<int:id>', methods=['DELETE'])
def delete_user(id):
    '''删除用户，暂未实现'''
    pass


@bp.route('/users/<int:id>/tasks/', methods=['GET'])
@token_auth.login_required
def get_user_tasks_in_progress(id):
    '''获取指定用户所有正在进行中的任务（训练和推理）'''
    user = User.query.get_or_404(id)
    # 权限校验，保证只能访问自己的任务
    if g.current_user != user:
        return error_response(403)
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', current_app.config['TASKS_PER_PAGE'], type=int), 100)

    # 查询该用户所有未完成的推理任务
    inference_tasks = Task.to_collection_dict(
        Task.query.filter_by(user=user, type=False).order_by(Task.timestamp.asc()), 
        page, per_page, 'api.get_user_tasks_in_progress', id=id)

    # 查询该用户所有未完成的训练任务
    train_tasks = Task.to_collection_dict(
        Task.query.filter_by(user=user, type=True).order_by(Task.timestamp.asc()), 
        page, per_page, 'api.get_user_tasks_in_progress', id=id)

    return jsonify({'inference': inference_tasks, 'train': train_tasks})


@bp.route('/users/<int:id>/notifications/', methods=['GET'])
@token_auth.login_required
def get_user_notifications(id):
    '''获取指定用户自上次请求以来的新通知'''
    user = User.query.get_or_404(id)
    if g.current_user != user:
        return error_response(403)
    # since参数是时间戳，默认0.0表示获取所有通知
    since = request.args.get('since', 0.0, type=float)
    notifications = user.notifications.filter(
        Notification.timestamp > since).order_by(Notification.timestamp.asc())
    # 序列化通知列表为JSON数组返回
    return jsonify([n.to_dict() for n in notifications])

@bp.route('/user/quota/dataset', methods=['GET'])
@token_auth.login_required
def get_user_dataset_quota():
    user: User = g.current_user
    if not user:
        return error_response(404, '没有找到当前用户')
    
    return jsonify(
        user.get_dataset_upload_quota()
    )

@bp.route('/user/quota/checkpoint', methods=['GET'])
@token_auth.login_required
def get_user_checkpoint_quota():
    user: User = g.current_user
    if not user:
        return error_response(404, '没有找到当前用户')
    
    return jsonify(
        user.get_model_param_quota()
    )

@bp.route('/user/alert/threat-accounts', methods=['GET'])
@token_auth.login_required
def get_user_alert_threat_accounts():
    user: User = g.current_user
    if not user:
        return error_response(404, '没有找到当前用户')
    
    count = (
        WeiboUser.query
        .filter(
            WeiboUser.is_visible.is_(True),
            WeiboUser.threat_index != 0,
            WeiboUser.threat_index.isnot(None)
        )
        .count()
    )
    
    return jsonify({
        'threat_account_count': count,
        'updated_at': datetime.now(timezone.utc),
    })

@bp.route('/auth/user/<int:id>/changeRole', methods=['POST'])
@token_auth.login_required
@admin_required
def change_user_role(id):
    """
    更改用户角色（仅管理员/超级管理员可操作）
    """

    data = request.get_json() or {}
    action = data.get('action')  # 'upgrade' or 'downgrade'
    target_slug = data.get('target')  # 目标角色 slug

    if not action or not target_slug:
        return jsonify({'message': '缺少必要参数'}), 400

    # 当前操作人
    current_user = g.current_user
    current_role_slug = current_user.role.slug if current_user.role else None

    # 目标用户
    user = User.query.get_or_404(id)
    current_target_slug = user.role.slug if user.role else None

    # 权限变更规则字典
    role_change_rules = {
        "superadministrator": {
            "upgrade": {
                "student": "administrator",
                "mentor": "administrator"
            },
            "downgrade": {
                "administrator": ["student", "mentor"]
            }
        },
        "administrator": {
            "upgrade": {
                "student": "mentor"
            },
            "downgrade": {
                "mentor": "student"
            }
        }
    }

    # 获取当前用户角色的规则
    rules = role_change_rules.get(current_role_slug, {})
    valid_targets = rules.get(action, {})

    allowed = False
    if isinstance(valid_targets, dict):
        # 精确映射：如 student -> mentor
        expected = valid_targets.get(current_target_slug)
        if expected:
            if isinstance(expected, list) and target_slug in expected:
                allowed = True
            elif isinstance(expected, str) and target_slug == expected:
                allowed = True
    elif isinstance(valid_targets, list):
        # 直接列出可变更的目标列表
        if target_slug in valid_targets:
            allowed = True

    if not allowed:
        return jsonify({'message': '无权限进行该操作'}), 403

    # 查找目标角色
    target_role = Role.query.filter_by(slug=target_slug).first()
    if not target_role:
        return jsonify({'message': f'目标角色 {target_slug} 不存在'}), 404

    # 更新角色
    user.role = target_role
    db.session.add(user)
    db.session.commit()

    return jsonify({
        'message': f'用户 {user.username} 的角色已更改为 {target_role.name}',
        'new_role': target_role.slug
    }), 200
