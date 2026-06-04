from flask import Blueprint

# 创建名为 'api' 的蓝图，用于管理所有API相关路由
# __name__用于定位蓝图所在模块，方便静态文件或模板查找
bp = Blueprint('api', __name__)

# 导入API各模块，导入后这些模块中的路由函数会自动注册到该蓝图
# 认证相关模块，包括身份验证、令牌管理、用户管理
from app.api.auth import auth, tokens, user

# 任务相关模块，涵盖数据集管理、外部接口、管理员操作、模型管理、应用管理、校对、微博爬虫、学习模块、HVSM（某业务模块）
from app.api.task import datasets, external_interface, manager, models, application, proofread, weiboCrawler, study, hvsm, large_screen

# 额外的功能模块，包括通知、错误处理、定时任务状态
from app.api import notifications, errors, scheduler

# 评测模块接口
from evaluation import interface

# 测试总体分析接口分离
from app.api.task import analysis_illegal, analysis_emotion, analysis_stance, analysis_name
