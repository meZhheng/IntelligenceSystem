from flask import Blueprint

# 创建一个名为 'media' 的蓝图（Blueprint），
# __name__ 用于告诉 Flask 该蓝图所在的模块位置，
# 方便后续静态文件和模板路径的定位
bp = Blueprint('media', __name__)

# 导入该蓝图下的路由处理模块 distributors.py 中的 serve_image 函数，
# 以便注册对应的路由处理函数到该蓝图中
from .distributors import serve_image
