import logging
from logging.handlers import RotatingFileHandler
import os
from flask import Flask
from config import CombinedConfig
from redis import Redis
import rq
import rq_dashboard
from app.extensions import cors, db, migrate, cache
from app.api import bp as api_bp
from app.media import bp as media_bp
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.executors.pool import ThreadPoolExecutor
import atexit
import pytz
from sqlalchemy import inspect

# 导入微博相关模型，确保模型声明了 __bind_key__ = 'weibo'，方便多数据库绑定
from app.models_spider import *  # 包含 Weibo 数据模型定义
from app.event_listen import *   # 导入事件监听器（如更新威胁指数等）

# api文档
from flasgger import Swagger

def _as_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in {'1', 'true', 'on', 'yes'}
    return bool(value)


def _should_start_scheduler(app):
    if not _as_bool(app.config.get('RUN_SCHEDULER', True)):
        return False
    if _as_bool(app.config.get('SCHEDULER_MASTER', False)):
        return True
    return os.environ.get('FLASK_ENV') != 'production' and os.environ.get('WERKZEUG_RUN_MAIN') == 'true'


def create_app(config_class=CombinedConfig):
    # Flask 应用工厂函数，创建并配置 Flask app 实例
    app = Flask(__name__, instance_relative_config=True)
    if os.environ.get("FLASK_ENV") != "production":
        from dotenv import load_dotenv
        load_dotenv()

    # 配置 Flask 应用核心设置
    configure_app(app, config_class)
    # 注册蓝图（路由分组）
    configure_blueprints(app)
    # 初始化各种 Flask 扩展，如数据库，跨域等
    configure_extensions(app)
    # 配置日志系统
    configure_logging(app)
    # 配置数据库，创建表，初始化数据
    configure_database(app)
    # 配置数据库备用session，增强性能
    configure_db_session(app)
    # 配置redis缓存，增强性能
    configure_cache(app)
    # 配置api文档
    configure_apidocs(app)

    # 仅在主进程 / 指定主机上启动 scheduler，避免在多 worker 中重复运行
    if _should_start_scheduler(app):
        jobstores = {
            'default': SQLAlchemyJobStore(
                url=app.config['SQLALCHEMY_DATABASE_URI'],
                engine_options={
                    'pool_pre_ping': True,
                    'pool_recycle': 3600,
                }
            )
        }
        executors = {'default': ThreadPoolExecutor(10)}
        job_defaults = {'coalesce': False, 'max_instances': 1}

        scheduler = BackgroundScheduler(jobstores=jobstores, executors=executors,
                                        job_defaults=job_defaults,
                                        timezone=pytz.timezone('Asia/Shanghai'))

        # 注入模块级 APP 并注册 job（不要传 app 到 args）
        from app.schedules import scheduler_tasks
        scheduler_tasks.register_jobs(app, scheduler)

        from app.services.scheduler_monitor import register_scheduler_listeners
        register_scheduler_listeners(scheduler, app)

        scheduler.start()
        app.logger.info("已启动定时任务调度器")
        atexit.register(lambda: scheduler.shutdown(wait=False))
        app.scheduler = scheduler
    
    from scripts import export_articles
    export_articles.register_cli(app)

    return app

def configure_app(app: Flask, config_class):
    # 从配置类加载配置
    app.config.from_object(config_class)
    # 关闭路由严格斜杠匹配，允许末尾有或无斜杠访问同一路由
    app.url_map.strict_slashes = False
    # 初始化 Redis 连接，供 RQ 异步任务队列使用
    app.redis = Redis.from_url(app.config['RQ_DASHBOARD_REDIS_URL'])
    # 创建名为 'model-tasks' 的任务队列，超时时间设为 36000 秒（10小时）
    app.task_queue = rq.Queue('model-tasks', connection=app.redis, default_timeout=36000)

def configure_blueprints(app: Flask):
    # 配置 rq_dashboard 面板，监控和管理 RQ 任务队列
    app.config.from_object(rq_dashboard.default_settings)
    rq_dashboard.web.setup_rq_connection(app)
    app.register_blueprint(rq_dashboard.blueprint, url_prefix="/rq")

    # 注册业务 API 蓝图，所有接口前缀为 /api
    app.register_blueprint(api_bp, url_prefix='/api')
    # 注册静态资源蓝图，挂载路径为 /static
    app.register_blueprint(media_bp, url_prefix='/static')

def configure_extensions(app):
    '''Configures the extensions.'''
    # 启用跨域资源共享（CORS）
    cors.init_app(app)
    # 初始化 SQLAlchemy 数据库实例
    db.init_app(app)
    # 初始化数据库迁移插件
    migrate.init_app(app, db)

def configure_logging(app):
    '''Configure Logging.'''
    # 仅在非调试、非测试环境下启用日志记录
    if not app.debug and not app.testing:
        if app.config['LOG_TO_STDOUT']:
            # 日志输出到标准输出流（适合容器化部署）
            stream_handler = logging.StreamHandler()
            stream_handler.setLevel(logging.INFO)
            app.logger.addHandler(stream_handler)
        else:
            # 日志输出到文件，文件大小达到10KB时轮转，最多保留10个备份文件
            if not os.path.exists('logs'):
                os.mkdir('logs')
            file_handler = RotatingFileHandler('logs/system.log',
                                               maxBytes=10240, backupCount=10)
            file_handler.setFormatter(logging.Formatter(
                '%(asctime)s %(levelname)s: %(message)s '
                '[in %(pathname)s:%(lineno)d]'))
            file_handler.setLevel(logging.INFO)
            app.logger.addHandler(file_handler)

        # 设置日志级别为 INFO
        app.logger.setLevel(logging.INFO)
        app.logger.info('Flask API Startup')  # 记录启动日志

def configure_database(app):
    # Flask 上下文环境下执行数据库初始化操作
    with app.app_context():
        # 导入主业务模型（Model 和 Evaluation）
        from app.models import Role, User, Model, Evaluation, SocialDetectionResult

        # 初始化插入业务模型数据和任务数据
        Role.insert_roles()
        User.insert_users()
        Model.insert_models()
        Evaluation.insert_tasks()

        db.create_all()

        # 针对微博业务的模型表创建，绑定到多数据库的 weibo 数据库
        db.create_all(bind_key='weibo')

def configure_db_session(app):
    with app.app_context():
        # 创建数据库会话
        from sqlalchemy.orm import sessionmaker
        app.write_session = sessionmaker(db.get_engine(app, bind='weibo'))

def configure_cache(app):
    cache.init_app(app)

def configure_apidocs(app):
    swagger_config = {
        "headers": [],
        "specs": [
            {
                "endpoint": 'apispec_1',
                "route": '/apispec_1.json',
                "rule_filter": lambda rule: True,
                "model_filter": lambda tag: True,
            }
        ],
        "static_url_path": "/flasgger_static",
        "swagger_ui": True,
        "specs_route": "/apidocs/",
        # 关键：把 auth 明确设为 {}（或其它 JSON-able 值）
        "auth": {}
    }

    Swagger(app, config=swagger_config)