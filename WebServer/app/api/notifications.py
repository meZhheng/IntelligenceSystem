from flask import jsonify, g, Blueprint
from app.api.auth.auth import token_auth  # Token认证装饰器，保护接口
from app.api.errors import error_response  # 自定义错误响应函数
from app.models import Notification  # 通知模型

# 创建一个名为 'notifications' 的蓝图，挂载路径为根路径 '/'
bp = Blueprint('notifications', __name__, url_prefix='/')

# 定义路由：GET 请求，路径为 /notifications/<int:id>
@bp.route('/notifications/<int:id>', methods=['GET'])
@token_auth.login_required  # 该接口需要token认证登录后访问
def get_notification(id):
    '''获取指定id的用户通知'''
    # 根据通知id查询数据库，找不到则自动返回404错误
    notification = Notification.query.get_or_404(id)
    
    # 权限校验：当前用户必须是该通知所属用户，否则403禁止访问
    if g.current_user != notification.user:
        return error_response(403)
    
    # 将通知对象转换成字典（序列化）
    data = notification.to_dict()
    # 返回json格式的通知数据给客户端
    return jsonify(data)
