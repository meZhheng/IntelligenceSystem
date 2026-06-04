from flask import jsonify, Blueprint
from werkzeug.http import HTTP_STATUS_CODES  # HTTP状态码及默认描述字典
from app import db  # 数据库实例

# 创建名为 'errors' 的蓝图，用于统一处理错误响应
bp = Blueprint('errors', __name__)

def error_response(status_code, message=None):
    '''
    生成标准化的错误响应JSON。
    参数:
        status_code: HTTP状态码，如400、404、500等
        message: 可选，自定义错误信息
    返回:
        Flask响应对象，包含错误信息及状态码
    '''
    # 默认错误信息取自HTTP_STATUS_CODES字典，找不到则使用"Unknown error"
    payload = {'error': HTTP_STATUS_CODES.get(status_code, 'Unknown error')}
    if message:
        payload['message'] = message  # 添加自定义错误信息
    response = jsonify(payload)  # 转成JSON响应
    response.status_code = status_code  # 设置HTTP状态码
    return response

def bad_request(message):
    '''快速返回400错误（错误请求）及自定义信息'''
    return error_response(400, message)

# 注册404错误处理函数
@bp.app_errorhandler(404)
def not_found_error(error):
    # 返回404错误响应，使用默认错误信息
    return error_response(404)

# 注册500错误处理函数
@bp.app_errorhandler(500)
def internal_error(error):
    db.session.rollback()  # 发生服务器错误时回滚数据库事务，防止数据不一致
    return error_response(500)  # 返回500错误响应
