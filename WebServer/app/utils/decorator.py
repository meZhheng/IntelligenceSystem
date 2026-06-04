from functools import wraps
from flask import g
from app.api.errors import error_response
from app.models import Permission

def permission_required(permission):
    '''
    装饰器工厂，用于检查用户是否具备指定权限。
    参数:
        permission: 需要检查的权限标识（通常是Permission类中的常量）
    返回:
        一个装饰器函数，用于装饰视图函数
    '''
    def decorator(f):
        @wraps(f)  # 保留被装饰函数的元信息（如函数名、docstring）
        def decorated_function(*args, **kwargs):
            # g.current_user由认证中间件设置，代表当前登录用户对象
            # 调用用户对象的can(permission)方法判断权限
            if not g.current_user.can(permission):
                # 权限不足，返回403错误响应
                return error_response(403)
            # 有权限，继续调用被装饰的视图函数
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def admin_required(f):
    '''
    专门检查管理员权限的装饰器，等价于调用permission_required(Permission.ADMIN)
    方便直接使用@admin_required装饰需要管理员权限的视图函数
    '''
    return permission_required(Permission.ADMIN)(f)

def super_admin_required(f):
    '''
    专门检查超级管理员权限的装饰器，等价于调用permission_required(Permission.SUPER_ADMIN)
    方便直接使用@super_admin_required装饰需要超级管理员权限的视图函数
    '''
    return permission_required(Permission.SUPER_ADMIN)(f)