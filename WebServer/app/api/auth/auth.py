from flask import g, jsonify
from flask_httpauth import HTTPBasicAuth, HTTPTokenAuth  # 基础认证和Token认证
from app.models import User
from app.api.errors import error_response
from app.extensions import db

# 创建基本认证对象，用于用户名+密码认证
basic_auth = HTTPBasicAuth()

# 创建Token认证对象，用于基于Token的认证
token_auth = HTTPTokenAuth()

@basic_auth.verify_password
def verify_password(username, password):
    '''
    基本认证的验证函数
    参数:
        username: 用户名
        password: 密码
    功能:
        根据用户名查找用户，验证密码是否正确
        如果认证成功，将用户对象赋给g.current_user，供后续使用
    返回:
        True/False表示认证是否成功
    '''
    user = User.query.filter_by(username=username).first()
    if user is None or not user.check_password(password):
        return False
    g.current_user = user
    # 强制分配新 token
    g.current_user.get_token(force_new=True)
    db.session.commit()
    return True

@basic_auth.error_handler
def unauthorized():
    '''
    基本认证失败时的错误处理函数
    返回JSON格式的错误提示，并设置HTTP状态码为402（非标准，可改为401）
    '''
    response = jsonify({'status': 402, 'message': '用户名或密码不正确'})
    response.status_code = 402
    return response

@token_auth.verify_token
def verify_token(token):
    '''
    Token认证的验证函数
    参数:
        token: 请求中携带的Token字符串
    功能:
        调用User模型的check_token方法验证token有效性
        如果token有效，将对应用户赋给g.current_user
    返回:
        True/False表示token是否有效
    '''
    g.current_user = User.check_token(token) if token else None
    return g.current_user is not None

@token_auth.error_handler
def token_auth_error():
    '''
    Token认证失败时的错误处理函数
    统一调用自定义错误响应返回401未授权错误
    '''
    return error_response(401)
