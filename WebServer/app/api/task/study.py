from flask import (
    Blueprint, flash, g, redirect, request, session, url_for, jsonify, current_app
)
from flask_caching import Cache
from ..auth.auth import token_auth  # 导入基于token的认证装饰器
from app.api.errors import bad_request, error_response  # 导入错误响应辅助函数
from app.extensions import db, cache  # 导入数据库实例
from app.models import User  # 导入用户模型
from app.api import bp  # 导入蓝图实例
from app.utils.decorator import admin_required
from sqlalchemy import or_  # 导入or_函数，暂时未用
import pandas as pd  # 用于Excel文件读取
from werkzeug.utils import secure_filename  # 用于处理上传文件的安全文件名
import os  # 用于文件路径操作
from sqlalchemy.exc import SQLAlchemyError  # 数据库异常捕获
from app.models import HvsmScore, Role, remove_prefix_from_url  # 导入HvsmScore模型
from sqlalchemy import func, desc
from sqlalchemy.orm import aliased

# @cache.cached(timeout=60, query_string=True)
@bp.route('/study/students', methods=['GET'])
@token_auth.login_required
@admin_required
def get_students():
    """
    获取学生列表
    ---
    swagger: "2.0"
    tags:
      - Student
    summary: 获取学生列表
    description: |
      分页查询学生用户及其最新成绩。支持用户名搜索。

    parameters:
      - name: page
        in: query
        type: integer
        required: false
        default: 1
        description: 页码
      - name: per_page
        in: query
        type: integer
        required: false
        default: 10
        description: 每页数量
      - name: search
        in: query
        type: string
        required: false
        description: 按用户名模糊搜索

    responses:
      200:
        description: 返回学生分页列表
        schema:
          type: object
          properties:
            items:
              type: array
              items:
                type: object
                properties:
                  id:
                    type: integer
                  username:
                    type: string
                  score:
                    type: string
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
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page',
                 request.args.get('pageSize', 10, type=int),
                 type=int)
    search = request.args.get('search', '', type=str)

    # --- 1. 子查询：每个 username 的最新分数 ---
    subq = (
        db.session.query(
            HvsmScore.username.label('uname'),
            HvsmScore.score.label('latest_score'),
            func.row_number().over(
                partition_by=HvsmScore.username,
                order_by=desc(HvsmScore.create_time)
            ).label('rn')
        )
        .subquery()
    )
    latest = aliased(subq, name='latest')

    # --- 2. 主查询：过滤学生 + 搜索 + join 最新分数 ---
    query = (
      db.session.query(
        User.id, User.role_id, User.username, latest.c.latest_score
      )
      .join(User.role)  # 用 join+filter 替代 .has()
      .filter(Role.slug == 'student')
      .outerjoin(latest, (User.username == latest.c.uname) & (latest.c.rn == 1))
    )
    if search:
        # 如果要支持前缀、模糊可考虑 trigram index 或全文检索
        query = query.filter(User.username.ilike(f'%{search}%'))

    # --- 3. 分页 ---
    resources = query.paginate(page=page, per_page=per_page, error_out=True, max_per_page=100)

    # --- 4. 构建返回字典 ---
    items = [
        {
            'id': uid,
            'username': uname,
            'role': Role.query.get_or_404(role_id).slug,
            'score': score if score is not None else '暂无记录'
        }
        for uid, role_id, uname, score in resources.items
    ]
    data = {
        'items': items,
        '_meta': {
            'page': page,
            'per_page': per_page,
            'total_pages': resources.pages,
            'total_items': resources.total
        },
        '_links': {
            'self':    remove_prefix_from_url(url_for('api.get_students', page=page, per_page=per_page, search=search)),
            'next':    remove_prefix_from_url(url_for('api.get_students', page=page+1, per_page=per_page, search=search)) if resources.has_next else None,
            'prev':    remove_prefix_from_url(url_for('api.get_students', page=page-1, per_page=per_page, search=search)) if resources.has_prev else None,
        }
    }
    return jsonify(data)

@bp.route('/study/students', methods=['POST'])
@token_auth.login_required
@admin_required
def add_student():
    """
    新增学生
    ---
    swagger: "2.0"
    tags:
      - Student
    summary: 新增学生
    description: |
      创建一个新的学生账号。用户名必须唯一。

    consumes:
      - application/json

    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - username
            - password
          properties:
            username:
              type: string
            password:
              type: string

    responses:
      200:
        description: 创建成功
        schema:
          type: object
          properties:
            message:
              type: string
              example: 用户创建成功
      400:
        description: 参数错误或用户名已存在
    """
    data = request.get_json() or {}

    # 校验必填字段：用户名和密码必须提供
    if 'username' not in data or 'password' not in data:
        return bad_request('必须提供用户名和密码')
    
    # 检查用户名是否已存在
    if User.query.filter_by(username=data['username']).first():
        return bad_request('用户名已存在')

    # 创建用户对象并用传入数据初始化
    user = User()
    user.from_dict(data, new_user=True)

    # 添加并提交数据库
    db.session.add(user)
    db.session.commit()
    
    # 返回成功提示
    return jsonify({'message': '用户创建成功'})

@bp.route('/study/students/<int:id>', methods=['PUT'])
@token_auth.login_required
@admin_required
def reset_password(id):
    """
    重置学生密码
    ---
    swagger: "2.0"
    tags:
      - Student
    summary: 重置学生密码
    description: |
      通过用户 ID 重置学生账号的密码。

    parameters:
      - name: id
        in: path
        type: integer
        required: true
        description: 学生ID
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - password
          properties:
            password:
              type: string

    responses:
      200:
        description: 重置成功
      404:
        description: 学生不存在
    """
    # 根据ID获取用户，找不到则返回404
    user = User.query.get_or_404(id)

    data = request.get_json() or {}
    # 校验必须提供密码字段
    if 'password' not in data:
        return bad_request('必须提供新的密码')

    # 设置用户新密码并提交
    user.set_password(data['password'])
    db.session.commit()
    
    return jsonify({'message': '密码重置成功'})

@bp.route('/study/students/batch_random', methods=['POST'])
@token_auth.login_required
@admin_required
def batch_generate_students():
    """
    批量生成学生账号
    ---
    swagger: "2.0"
    tags:
      - Student
    summary: 批量生成学生账号
    description: |
      系统自动生成若干学生账号，命名规则为 student0001, student0002 …  
      默认密码取自系统配置，默认为 `123456`。

    consumes:
      - application/json

    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            count:
              type: integer
              description: 生成账号数量 (1~500)

    responses:
      200:
        description: 生成成功
        schema:
          type: object
          properties:
            message:
              type: string
            default_password:
              type: string
            usernames:
              type: array
              items:
                type: string
      400:
        description: 参数错误
    """
    data = request.get_json() or {}
    count = data.get('count', 0)

    # 校验生成数量：必须是1~500之间整数
    if not isinstance(count, int) or count < 1 or count > 500:
        return bad_request('生成数量应为 1~500 之间的整数')

    # 从配置获取默认密码，默认为'123456'
    default_password = current_app.config.get('DEFAULT_STUDENT_PASSWORD', '123456')

    # 查询所有已存在的用户名以"student"开头的用户，找出最大编号
    existing = User.query.filter(User.username.like('student%')).all()
    existing_numbers = []
    for u in existing:
        suffix = u.username.replace('student', '')  # 去除前缀
        if suffix.isdigit():
            existing_numbers.append(int(suffix))
    next_id = max(existing_numbers + [0]) + 1  # 下一编号起点

    created_users = []
    # 循环生成用户，用户名格式为 student0001，student0002 ...
    for i in range(count):
        username = f'student{str(next_id + i).zfill(4)}'
        if User.query.filter_by(username=username).first():
            continue  # 理论上不会重复，防止意外

        user = User()
        user.from_dict({'username': username, 'password': default_password}, new_user=True)

        db.session.add(user)
        created_users.append(username)

    db.session.commit()
    
    # 返回生成的用户名列表及默认密码
    return jsonify({
        'message': f'成功生成 {len(created_users)} 个学生账号',
        'default_password': default_password,
        'usernames': created_users
    })

@bp.route('/study/students/import_excel', methods=['POST'])
@token_auth.login_required
@admin_required
def import_students_from_excel():
    """
    从 Excel 批量导入学生
    ---
    swagger: "2.0"
    tags:
      - Student
    summary: 从 Excel 批量导入学生
    description: |
      上传 Excel 文件批量导入学生账号。  
      默认使用 `用户名` / `username` / `学号` 列作为用户名，密码默认为用户名。

    consumes:
      - multipart/form-data

    parameters:
      - name: file
        in: formData
        type: file
        required: true
        description: Excel 文件（.xls 或 .xlsx）

    responses:
      200:
        description: 导入成功
        schema:
          type: object
          properties:
            message:
              type: string
            created_count:
              type: integer
            skipped_count:
              type: integer
      400:
        description: 文件错误或格式不支持
    """
    # 检查上传文件是否存在
    if 'file' not in request.files:
        return bad_request('请上传一个 Excel 文件')

    file = request.files['file']
    # 文件名不能为空
    if file.filename == '':
        return bad_request('上传文件无效')

    # 安全处理文件名并获取扩展名
    filename = secure_filename(file.filename)
    ext = os.path.splitext(filename)[1].lower()
    # 仅支持xls和xlsx格式
    if ext not in ('.xls', '.xlsx'):
        return bad_request('请上传 .xls 或 .xlsx 格式的文件')

    # 读取Excel文件，所有列均转为字符串
    try:
        df = pd.read_excel(file, dtype=str)
    except Exception as e:
        return bad_request(f'无法读取 Excel 文件: {str(e)}')

    # 尝试自动识别用户名所在列，优先使用常见列名
    possible_keys = ['用户名', 'username', '学号']
    username_column = next((col for col in possible_keys if col in df.columns), df.columns[0])

    # 清洗用户名数据：去除空字符串和空值，取唯一值列表
    usernames = df[username_column].astype(str).str.strip()
    usernames = usernames[usernames != ''].dropna().unique().tolist()

    # 批量查询已存在的用户名，避免重复导入
    with db.session.no_autoflush:
        existing_usernames = set(
            u[0] for u in db.session.query(User.username)
                .filter(User.username.in_(usernames))
                .with_entities(User.username)
                .all()
        )
    db.session.commit()  # 解除查询时可能的锁

    new_users = []
    skipped = []

    # 遍历所有用户名，跳过已存在，创建新用户
    for name in usernames:
        if name in existing_usernames:
            skipped.append(name)
            continue
        # 这里可加用户名合法性校验
        user = User()
        user.from_dict({'username': name, 'password': name}, new_user=True)
        new_users.append(user)

    try:
        if new_users:
            # 打印调试新用户字典
            for user in new_users:
                print(user.to_dict())
            # 批量保存新用户对象
            db.session.bulk_save_objects(new_users)
            db.session.commit()

    except SQLAlchemyError as e:
        # 出错回滚事务
        db.session.rollback()
        return bad_request(f'数据库错误: {str(e)}')

    # 返回导入结果信息
    return jsonify({
        'message': f'成功导入 {len(new_users)} 个学生账号',
        'created_count': len(new_users),
        'skipped_count': len(skipped),
    })

@bp.route('/study/students/<int:id>', methods=['DELETE'])
@token_auth.login_required
@admin_required
def delete_student(id):
    """
    删除学生账号
    ---
    swagger: "2.0"
    tags:
      - Student
    summary: 删除学生账号
    description: |
      根据 ID 删除学生账号。管理员账号不可删除。

    parameters:
      - name: id
        in: path
        type: integer
        required: true
        description: 学生ID

    responses:
      200:
        description: 删除成功
        schema:
          type: object
          properties:
            message:
              type: string
      404:
        description: 学生不存在
      400:
        description: 尝试删除管理员账号
    """
    # 根据ID查询用户，找不到返回404
    user = User.query.get_or_404(id)

    # 不允许删除管理员账号
    if user.role and user.role.slug == 'administrator':
        return bad_request('不能删除管理员账号')

    # 删除用户并提交
    db.session.delete(user)
    db.session.commit()
    
    # 返回删除成功信息
    return jsonify({'message': f'用户 {user.username} 已删除'})
