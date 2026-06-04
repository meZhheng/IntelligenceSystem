#!/usr/bin/env python3
# -*- coding: utf-8 -*-
''' Create instance of these flask extensions '''

# 导入跨域资源共享插件 CORS，方便解决浏览器的跨域请求限制问题
from flask_cors import CORS

# 导入 Flask 的数据库操作扩展 SQLAlchemy
from flask_sqlalchemy import SQLAlchemy

# 导入数据库迁移工具 Flask-Migrate，用于管理数据库版本和迁移
from flask_migrate import Migrate

# 导入 SQLAlchemy 的 MetaData，用于自定义数据库表的命名规范
from sqlalchemy import MetaData

# 初始化跨域插件实例，后续在 Flask app 中调用 cors.init_app(app) 即可启用跨域
cors = CORS()


# 定义数据库表的命名规范，避免数据库中自动生成的索引、约束等名称不统一或难以识别
naming_convention = {
    "ix": 'ix_%(column_0_label)s',  # 索引名 ix_列名
    "uq": "uq_%(table_name)s_%(column_0_name)s",  # 唯一约束 uq_表名_列名
    "ck": "ck_%(table_name)s_%(column_0_name)s",  # 检查约束 ck_表名_列名
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",  # 外键约束 fk_表名_列名_关联表名
    "pk": "pk_%(table_name)s"  # 主键约束 pk_表名
}

# 创建 SQLAlchemy 数据库实例，传入自定义的 MetaData 以使用上述命名规范
db = SQLAlchemy(metadata=MetaData(naming_convention=naming_convention))

# 创建 Flask-Migrate 实例，用于数据库版本迁移管理
# 参数 render_as_batch=True 主要用于兼容 SQLite 的批量迁移（因为 SQLite 对某些操作支持有限）
migrate = Migrate(render_as_batch=True)

from flask_caching import Cache

# 只实例化，不传 app
cache = Cache()
