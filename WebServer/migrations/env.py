import logging
from logging.config import fileConfig

from flask import current_app
from alembic import context

# Alembic配置对象，用于访问alembic.ini中的配置项
config = context.config

# 解析配置文件中的日志设置，初始化日志配置
fileConfig(config.config_file_name)
logger = logging.getLogger('alembic.env')


def get_engine():
    """
    获取SQLAlchemy数据库引擎实例。

    兼容不同版本Flask-Migrate：
    - 尝试调用 get_engine() 方法（新版）
    - 失败后退回直接访问 engine 属性（旧版）
    """
    try:
        return current_app.extensions['migrate'].db.get_engine()
    except (TypeError, AttributeError):
        return current_app.extensions['migrate'].db.engine


def get_engine_url():
    """
    获取数据库连接URL字符串。

    - 调用 get_engine() 获取engine实例
    - 取engine.url，转换成字符串形式
    - 解决url中 '%' 被格式化字符串解析问题，将 '%' 替换成 '%%'
    """
    try:
        return get_engine().url.render_as_string(hide_password=False).replace('%', '%%')
    except AttributeError:
        return str(get_engine().url).replace('%', '%%')


# 动态设置Alembic的SQLAlchemy连接URL为当前应用的数据库连接
config.set_main_option('sqlalchemy.url', get_engine_url())


def get_target_metadatas():
    """
    获取所有绑定的SQLAlchemy元数据对象列表。

    Flask-Migrate支持多数据库绑定，db.metadatas保存所有绑定元数据。
    """
    migrate_ext = current_app.extensions['migrate']
    dbobj = migrate_ext.db
    return list(dbobj.metadatas.values())


def run_migrations_offline():
    """
    离线模式运行迁移。

    离线模式无需数据库连接，生成纯SQL迁移脚本。
    """
    url = config.get_main_option('sqlalchemy.url')
    context.configure(
        url=url,
        target_metadata=get_target_metadatas(),
        literal_binds=True,           # 将绑定参数内联到SQL中
        compare_type=True,            # 启用类型变化检测
        compare_server_default=True   # 启用默认值变化检测
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """
    在线模式运行迁移。

    在线模式连接数据库，直接应用迁移变更。
    """

    def process_revision_directives(context, revision, directives):
        """
        钩子函数：在自动生成迁移脚本时调用。
        如果无架构变化，取消生成脚本，并打印提示日志。
        """
        if getattr(config.cmd_opts, 'autogenerate', False):
            script = directives[0]
            if script.upgrade_ops.is_empty():
                directives[:] = []
                logger.info('No changes in schema detected.')

    # 从Flask-Migrate配置中获取参数
    conf_args = current_app.extensions['migrate'].configure_args

    # 如果没有配置process_revision_directives，则设置为自定义函数
    if conf_args.get('process_revision_directives') is None:
        conf_args['process_revision_directives'] = process_revision_directives

    connectable = get_engine()
    with connectable.connect() as connection:
        # 移除conf_args中重复或不必要的参数，避免冲突
        conf_args.pop('compare_type', None)
        conf_args.pop('compare_server_default', None)

        # 配置alembic context
        context.configure(
            connection=connection,
            target_metadata=get_target_metadatas(),
            **conf_args
        )

        with context.begin_transaction():
            context.run_migrations()


# 根据运行模式执行对应迁移函数
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
