import base64
from datetime import datetime, timedelta, timezone
from hashlib import md5
import json
from time import time
from werkzeug.security import generate_password_hash, check_password_hash
from flask import url_for, current_app
from app import db
import os
import enum
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import class_mapper
from sqlalchemy.inspection import inspect
import random
from typing import List, Dict, Optional
from sqlalchemy.orm import backref
from sqlalchemy import select
from app.model_registry import MODEL_INSTANCE, MODEL_TYPES
from sqlalchemy import desc, UniqueConstraint
from sqlalchemy.orm import Session

def remove_prefix_from_url(url, prefix='/api/'):
    """
    移除URL中的指定前缀，默认前缀为 '/api/'。
    例如：'/api/users' -> 'users'
    
    参数:
        url (str): 需要处理的完整URL字符串。
        prefix (str): 需要移除的前缀字符串，默认 '/api/'。

    返回:
        str: 移除前缀后的URL字符串，如果url不以prefix开头，则返回原url。
    """
    if url.startswith(prefix):
        return url[len(prefix):]
    return url

class PaginatedAPIMixin(object):
    """
    分页API混入类，提供静态方法用于将数据库查询结果分页并转换成适合前端的JSON格式。

    主要方法:
        to_collection_dict: 将SQLAlchemy查询对象分页，并生成包含分页元信息和链接的字典。
    """

    @staticmethod
    def to_collection_dict(query, page, per_page, endpoint, **kwargs):
        """
        将传入的查询对象执行分页查询，返回包含分页结果和分页导航链接的字典。

        参数:
            query (BaseQuery): SQLAlchemy查询对象。
            page (int): 当前页码。
            per_page (int): 每页显示的记录数。
            endpoint (str): Flask路由的endpoint名称，用于生成分页导航链接。
            **kwargs: 额外参数，传递给url_for以生成完整URL。

        返回:
            dict: 包含分页数据和分页相关信息的字典，结构包含:
                - items: 当前页的数据列表（每个数据调用 to_dict() 方法转换为字典）
                - _meta: 分页元数据，包括当前页、每页数量、总页数和总记录数
                - _links: 分页导航链接，包括当前页(self)、下一页(next)、上一页(prev)

        备注:
            - 如果当前请求的页码超出范围或无资源，query.paginate会抛出404错误，
              由Flask的404错误处理器自动捕获并返回JSON格式错误响应。
            - 当传入参数kwargs中包含'dataset_type'且为'DatasetType.PROPAGATION'时，
              额外过滤query，使其只返回顶层的PropagationComment（parent_id为None）。
        """
        dataset_type = kwargs.get('dataset_type', None)
        if dataset_type and dataset_type == DatasetType.PROPAGATION.name:
            # 只选择顶层评论，parent_id为None的评论
            query = query.filter(PropagationComment.parent_id == None)
        
        # required_fileds = kwargs.get('required_fileds', None)
        # class_names = kwargs.get('class_names', None)

        # 执行分页查询
        resources = query.paginate(page=page, per_page=per_page, error_out=True, max_per_page=100)
        # 构造返回数据字典
        data = {
            'items': [item.to_dict(**kwargs) for item in resources.items],  # 当前页的资源列表，转换成字典形式
            '_meta': {
                'page': page,  # 当前页码
                'per_page': per_page,  # 每页条数
                'total_pages': resources.pages,  # 总页数
                'total_items': resources.total  # 总条目数
            },
            '_links': {
                # 当前页的资源URL，去除/api/前缀
                'self': remove_prefix_from_url(
                    url_for(endpoint, page=page, per_page=per_page, **kwargs)),
                # 下一页URL，如果有下一页则返回对应链接，否则为None
                'next': remove_prefix_from_url(
                    url_for(endpoint, page=page + 1, per_page=per_page, **kwargs)) if resources.has_next else None,
                # 上一页URL，如果有上一页则返回对应链接，否则为None
                'prev': remove_prefix_from_url(
                    url_for(endpoint, page=page - 1, per_page=per_page, **kwargs)) if resources.has_prev else None
            }
        }
        return data


class Permission:
    '''
    权限认证中的各种操作，每种权限对应一个二进制位（bit）。
    这样可以通过位运算高效地管理多个权限。

    权限示例（按二进制位从低到高）：
    BROWSE: 0b00000001，十六进制为 0x01，表示浏览权限
    INFER:  0b00000010，十六进制为 0x02，表示推理权限
    MANAGE: 0b00000100，十六进制为 0x04，表示管理权限
    ADMIN:  0b10000000，十六进制为 0x80，表示网站管理员权限（最高位）

    中间的第4、5、6、7位（0b00001000 到 0b01000000）预留给将来可能新增的权限操作。
    '''

    # 浏览权限
    BROWSE = 0x01
    # 推理权限
    INFER = 0x02
    # 管理权限
    MANAGE = 0x04
    # 管理网站的权限(对应管理员角色)
    ADMIN = 0x80

    # 新增：超级管理员特权位（比 ADMIN 更高的特殊位，可用于极少数检查）
    SUPER_ADMIN = 0x100  # 256


class Role(PaginatedAPIMixin, db.Model):
    """
    角色模型，继承自SQLAlchemy模型和分页混入类。
    代表系统中一个角色，其拥有的权限由一个整数的二进制位表示。

    属性：
        id: 角色ID，主键
        slug: 角色标识符，唯一字符串
        name: 角色名称，用于显示
        default: 是否为新用户默认角色
        permissions: 角色权限，整数表示，二进制每个位表示一种权限
        users: 关联的用户列表
        max_dataset_uploads: 该角色允许上传的数据集最大条数限制
        max_model_param_size: 该角色允许保存的模型参数大小，单位GB
    """

    __tablename__ = 'roles'
    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(255), unique=True)
    name = db.Column(db.String(255))  # 角色名称
    default = db.Column(db.Boolean, default=False, index=True)  # 是否默认角色
    permissions = db.Column(db.Integer)  # 权限的位掩码整数
    users = db.relationship('User', backref='role', lazy='dynamic')  # 与用户的反向关联

    # 允许上传的数据集最大条数（默认100000条）
    max_dataset_uploads = db.Column(db.Integer, default=100000)
    # 允许保存的模型参数大小（单位GB，默认10GB）
    max_model_param_size = db.Column(db.Integer, default=10)

    def __init__(self, **kwargs):
        """
        构造函数，如果权限未设置，则默认为0（无权限）。
        """
        super(Role, self).__init__(**kwargs)
        if self.permissions is None:
            self.permissions = 0

    @staticmethod
    def insert_roles():
        """
        初始化系统中的角色及其权限（用于部署或升级时调用）。

        角色设定（slug -> (中文名, (权限位集合))）：
        - shutup:            黑名单，只能浏览（BROWSE）
        - student:           学员，浏览 + 推理（BROWSE, INFER）
        - mentor:            导师，浏览 + 推理 + 管理（BROWSE, INFER, MANAGE）
        - administrator:     管理员（原 admin），降级为管理级：BROWSE, INFER, MANAGE, ADMIN
        - superadministrator:超级管理员，系统最高权限，包含 ADMIN 与 SUPER_ADMIN

        注意：如果你希望保留原来的 administrator 拥有 ADMIN 位，请相应调整此处。
        """
        roles = {
            'shutup': ('黑名单', (Permission.BROWSE,)),
            'student': ('学员', (Permission.BROWSE, Permission.INFER,)),
            'mentor': ('导师', (Permission.BROWSE, Permission.INFER, Permission.MANAGE,)),
            # 原来的 administrator 不再包含 ADMIN 位（被降级为管理级）
            'administrator': ('管理员', (Permission.BROWSE, Permission.INFER, Permission.MANAGE, Permission.ADMIN,)),
            # 新增：超级管理员，权限最高，包含 ADMIN 和 SUPER_ADMIN
            'superadministrator': ('超级管理员', (
                Permission.BROWSE,
                Permission.INFER,
                Permission.MANAGE,
                Permission.ADMIN,        # 保留原来的 ADMIN 检查兼容性
                Permission.SUPER_ADMIN,  # 新增最高级别位
            )),
        }
        default_role = 'student'  # 默认角色

        for r in roles:
            role = Role.query.filter_by(slug=r).first()
            if role is None:
                role = Role(slug=r, name=roles[r][0])
            # 重置权限（清空）
            role.reset_permissions()
            # 赋予权限（迭代添加）
            for perm in roles[r][1]:
                role.add_permission(perm)
            # 设置默认角色标记
            role.default = (role.slug == default_role)
            # 更新名称（以防需要）
            role.name = roles[r][0]
            db.session.add(role)
        db.session.commit()

    def reset_permissions(self):
        """
        重置权限，清空所有权限位（置为0）。
        """
        self.permissions = 0

    def has_permission(self, perm):
        """
        判断当前角色是否拥有指定权限。

        参数:
            perm (int): 权限值（一个二进制位）。

        返回:
            bool: 是否拥有该权限。
        """
        return self.permissions & perm == perm

    def add_permission(self, perm):
        """
        给角色添加权限，如果之前没有则新增。

        参数:
            perm (int): 需要添加的权限。
        """
        if not self.has_permission(perm):
            self.permissions += perm

    def remove_permission(self, perm):
        """
        移除角色的指定权限。

        参数:
            perm (int): 需要移除的权限。
        """
        if self.has_permission(perm):
            self.permissions -= perm

    def __str__(self):
        return self.name

    def __repr__(self):
        return '<Role {}>'.format(self.name)

    
class User(PaginatedAPIMixin, db.Model):
    # 用户ID，主键
    id = db.Column(db.Integer, primary_key=True)
    # 用户名，唯一且可索引
    username = db.Column(db.String(64), index=True, unique=True)
    # 密码哈希值，使用Werkzeug生成，长度为256以适配更强加密算法
    password_hash = db.Column(db.String(256))
    # 角色ID，关联到 Role 表的主键
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'))
    # 用户token，用于身份验证，唯一且可索引
    token = db.Column(db.String(32), index=True, unique=True)
    # token的过期时间（含时区信息）
    token_expiration = db.Column(db.DateTime(timezone=True))
    # 与任务表的关系，一个用户可有多个任务
    tasks = db.relationship('Task', backref='user', lazy='dynamic')
    # 与通知表的关系，一个用户可有多个通知；设置级联删除
    notifications = db.relationship('Notification', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    # 用户上次查看私信的时间
    last_messages_read_time = db.Column(db.DateTime)

    # 与Profile的一对一关系，反向绑定，支持级联删除
    profile = db.relationship('Profile', uselist=False, back_populates='user',
        cascade='all, delete-orphan')

    def __repr__(self):
        return '<User {}>'.format(self.username)

    def set_password(self, password):
        # 设置用户密码（加密存储）
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        # 检查密码是否匹配
        return check_password_hash(self.password_hash, password)

    def to_dict(self, include_role=False):
        # 返回用户的基本信息字典
        # latest_score = HvsmScore.query.filter_by(username=self.username)\
        #                 .order_by(desc(HvsmScore.create_time))\
        #                 .first()

        data = {
            'id': self.id,
            'username': self.username,
            # 'score': latest_score.score if latest_score else '暂无记录',
        }

        # 是否包含角色ID信息
        if include_role:
            data['role'] = self.role_id

        return data

    def from_dict(self, data, new_user=False):
        # 从字典设置用户信息，通常用于API创建或更新用户
        for field in ['username']:
            if field in data:
                setattr(self, field, data[field])

        if new_user and 'password' in data:
            self.set_password(data['password'])

            # 新建用户时自动分配角色（管理员或默认角色）
            if self.role is None:
                if self.username in current_app.config['ADMINS']:
                    self.role = Role.query.filter_by(slug='administrator').first()
                else:
                    self.role = Role.query.filter_by(default=True).first()

    def get_token(self, expires_in=30, force_new=False):
        """
        获取或生成用户的token
        参数:
            expires_in: token有效期，单位为天
            force_new: 是否强制生成新token
        """
        now = datetime.now(timezone.utc)
        if not force_new and self.token and self.token_expiration.replace(tzinfo=timezone.utc) > now + timedelta(seconds=1):
            return self.token

        # 强制生成新token
        self.token = base64.b64encode(os.urandom(24)).decode('utf-8')
        self.token_expiration = now + timedelta(days=expires_in)
        db.session.add(self)
        return self.token


    def revoke_token(self):
        # 撤销当前token，使其立即过期
        self.token_expiration = datetime.now(timezone.utc) - timedelta(seconds=1)

    @staticmethod
    def check_token(token, refresh=False, expires_in=30):
        """
        根据token查找用户并校验有效性
        参数:
            token: 请求中的token
            refresh: 是否在每次验证成功后刷新过期时间
            expires_in: 刷新后的有效期，单位为天
        """
        user = User.query.filter_by(token=token).first()
        if user is None or user.token_expiration.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            return None

        if refresh:
            user.token_expiration = datetime.now(timezone.utc) + timedelta(days=expires_in)
            db.session.add(user)

        return user

    def can(self, perm):
        '''检查用户是否具有某个权限'''
        return self.role is not None and self.role.has_permission(perm)

    def is_administrator(self):
        '''判断用户是否为管理员'''
        return self.can(Permission.ADMIN)

    def get_task_in_progress(self, name):
        '''
        获取指定任务名的正在运行的任务（如果存在）
        若任务已失败或完成，标记为complete=True，并返回None
        '''
        task = Task.query.filter_by(name=name, user=self, complete=False).first()
        if task is not None:
            if task.status in [Task.Status.failed, Task.Status.finished]:
                task.complete = True
                db.session.commit()
                return None
        return task

    def launch_task(self, name, description, task_type, tag=None, *args, **kwargs):
        '''
        用户启动一个新任务，并创建Task记录
        task_type: 0 表示推理任务，1 表示训练任务
        '''
        task_name = 'inference' if task_type == 0 else 'train'
        # 提交到RQ队列中执行后台任务
        rq_job = current_app.task_queue.enqueue('app.utils.tasks.' + task_name, *args, **kwargs)

        # 创建数据库中的任务记录
        task = Task(id=rq_job.get_id(), name=name, description=description, user_id=self.id, type=task_type, tag=tag)
        db.session.add(task)
        db.session.commit()
        return task

    def add_notification(self, name, data):
        '''
        给用户添加一个通知，重复名称的通知会被先删除再添加
        '''
        self.notifications.filter_by(name=name).delete()
        n = Notification(name=name, payload_json=json.dumps(data), user=self)
        db.session.add(n)
        return n

    def new_recived_messages(self):
        '''
        返回用户未读私信的数量（基于最后一次阅读时间）
        '''
        last_read_time = self.last_messages_read_time or datetime(1900, 1, 1)
        return Message.query.filter_by(recipient=self).filter(Message.timestamp > last_read_time).count()

    def uploaded_datasets_count(self) -> int:
        '''
        获取当前用户已上传的数据条数（不同数据集类型分开统计再汇总）
        '''
        datasets = Dataset.query.filter_by(user_id=self.id).all()
        count = 0
        for dataset in datasets:
            count += get_dataset_type(dataset.dataset_type).query.filter_by(dataset_id=dataset.id).count()
        return count

    def used_model_param_size(self) -> int:
        '''
        获取当前用户已使用的模型参数总大小（单位 MB）
        '''
        checkpoints = ModelCheckpoint.query.filter_by(user_id=self.id).all()
        size = 0
        for checkpoint in checkpoints:
            size += checkpoint.size
        return size

    def get_dataset_upload_balance(self) -> int:
        '''
        获取当前用户可上传数据的剩余额度
        返回字典包括已用条数和剩余条数
        '''
        max_uploads = self.role.max_dataset_uploads if self.role and self.role.max_dataset_uploads is not None else 0
        used = self.uploaded_datasets_count()
        return {
            'used': used,
            'balance': max_uploads - used
        }

    def get_model_param_balance(self) -> int:
        '''
        获取当前用户可使用的模型参数存储空间（单位 MB）
        返回字典包括已用空间和剩余额度
        '''
        max_size = self.role.max_model_param_size if self.role and self.role.max_model_param_size is not None else 0
        max_size = max_size * 1024 * 1024  # 转换为 MB
        used = self.used_model_param_size()
        return {
            'used': used,
            'balance': max_size - used
        }
    
    def get_dataset_upload_quota(self) -> int:
        '''
        获取当前用户可上传数据的剩余额度
        返回字典包括已用条数和剩余条数
        '''
        max_uploads = self.role.max_dataset_uploads if self.role and self.role.max_dataset_uploads is not None else 0
        used = self.uploaded_datasets_count()
        return {
            'used_bytes': used,
            'limit_bytes': max_uploads,
            'updated_at': datetime.now(timezone.utc)
        }

    def get_model_param_quota(self) -> int:
        '''
        获取当前用户可使用的模型参数存储空间（单位 MB）
        返回字典包括已用空间和剩余额度
        '''
        max_size = self.role.max_model_param_size if self.role and self.role.max_model_param_size is not None else 0
        max_size = max_size * 1024 * 1024  # 转换为 MB
        used = self.used_model_param_size()
        return {
            'used_bytes': used,
            'limit_bytes': max_size,
            'updated_at': datetime.now(timezone.utc)
        }
    
    @staticmethod
    def insert_users():
        """
        初始化系统内置用户。
        当前插入：
        - 超级管理员：gfdxzzxy_root / Gfdxzzxy@123
        """
        username = "gfdxzzxy_root"
        password = "Gfdxzzxy@123"

        # 检查是否已存在
        user = User.query.filter_by(username=username).first()
        if user is None:
            # 获取超级管理员角色
            role = Role.query.filter_by(slug="superadministrator").first()
            if role is None:
                raise RuntimeError("请先执行 Role.insert_roles()，以创建 superadministrator 角色")

            user = User(username=username, role=role)
            user.set_password(password)
            db.session.add(user)
            db.session.commit()
            print(f"用户 {username} 已创建，角色为超级管理员")
        else:
            print(f"用户 {username} 已存在，跳过创建")

    
class Profile(db.Model):
    """
    用户扩展信息的基类 Profile，使用 SQLAlchemy 的多态继承功能实现学生/教师等不同用户类型的扩展信息。

    表名：
        profiles

    字段：
        user_id: 与 User 表关联的外键，主键，同时作为一对一关系的标识
        type: 多态标识字段，标识具体子类（如 'student'、'teacher'）

    说明：
        - 这是一个抽象的父类，不直接用于实例化。
        - 子类通过 `polymorphic_identity` 标识具体类型。
        - 子类会继承该表，并存储在同一个表中（单表继承），或通过主键一对一方式链接（joined-table inheritance，本例为后者）。
    """

    __tablename__ = 'profiles'

    # 与 User 的一对一外键关系，主键
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), primary_key=True)

    # 多态继承的标识字段，指明具体是 student / teacher / 其他类型
    type = db.Column(db.String(20))

    __mapper_args__ = {
        'polymorphic_on': type,                # 指定用于区分子类类型的字段
        'polymorphic_identity': 'base_profile' # 父类的类型标识
    }

    # 与 User 的反向绑定，uselist=False 表示一对一关系
    user = db.relationship('User', back_populates='profile')


class StudentProfile(Profile):
    """
    学生扩展信息表，继承自 Profile。

    表结构与 Profile 形成 joined-table inheritance，通过 user_id 建立一对一关系。
    """

    __mapper_args__ = {
        'polymorphic_identity': 'student'  # 标识类型为学生
    }

    # 再次声明主键并设置级联删除（确保删除 profile 时也删除 student 扩展信息）
    user_id = db.Column(db.Integer, db.ForeignKey('profiles.user_id', ondelete='CASCADE'), primary_key=True)

    # 学号，非空字段
    student_no = db.Column(db.String(32), nullable=False)

    # 年级信息，例如 "2021级"
    grade = db.Column(db.String(16))


class TeacherProfile(Profile):
    """
    教师扩展信息表，继承自 Profile。

    用于保存教师身份的补充信息，例如职称。
    """

    __mapper_args__ = {
        'polymorphic_identity': 'teacher'  # 标识类型为教师
    }

    # 主键 user_id，连接到 profiles.user_id，支持级联删除
    user_id = db.Column(db.Integer, db.ForeignKey('profiles.user_id', ondelete='CASCADE'), primary_key=True)

    # 教师职称字段，例如 "教授"、"讲师"
    title = db.Column(db.String(64))


class Task(PaginatedAPIMixin, db.Model):
    """
    表名：
        tasks

    描述：
        表示后台异步任务，如推理、训练等，任务调度由 RQ（Redis Queue）支持。

    说明：
        - 使用 RQ 的 job_id 作为主键，方便通过 RQ 获取任务状态。
        - 提供实时进度（progress）和状态（status）的方法。
        - 支持任务结果存储、类型区分、用户归属等。
    """

    __tablename__ = 'tasks'

    class Status(enum.Enum):
        """
        表示任务状态的枚举类，对应 RQ 的任务状态。

        每种状态配有中文描述，方便前端或日志展示。
        """
        # 任务已入队，等待执行
        queued = '排队中'
        # 任务执行完毕
        finished = '已完成' 
        # 执行中出现错误或超时失败
        failed = '任务失败'
        # 任务正在执行中
        started = '进行中'
        # 任务等待依赖完成，暂时不执行
        deferred = '正在准备依赖文件'
        # 等待调度执行（定时）
        scheduled = '等待开始定时任务'
        # 任务由于 worker 被停止而中止
        stopped = '暂停中'
        # 手动取消任务
        canceled = '任务取消'

    # 使用 RQ 生成的 job_id（UUID），而非整数主键
    id = db.Column(db.String(36), primary_key=True)

    # 任务名（如：模型训练、推理等），可索引
    name = db.Column(db.String(128), index=True)

    # 任务描述（展示信息）
    description = db.Column(db.String(128))

    # 所属用户ID，外键
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    # 当前任务状态，默认值为排队中
    status = db.Column(db.Enum(Status), default=Status.queued)

    # 创建时间，默认为当前 UTC 时间
    timestamp = db.Column(db.DateTime, index=True, default=lambda: datetime.now(timezone.utc))

    # 是否已标记为完成
    complete = db.Column(db.Boolean, default=False)

    # 任务类型：0 表示推理任务（inference），1 表示训练任务（train）
    type = db.Column(db.Boolean, default=False)

    # 任务的最终结果（JSON 格式保存），例如推理输出
    result = db.Column(db.JSON)

    # 任务标签（可选），用于业务内部标识或筛选
    tag = db.Column(db.String(64), nullable=True)

    def __repr__(self):
        return '<Task {}>'.format(self.id)

    def get_progress(self):
        """
        实时获取任务进度（百分比），由 RQ job 元信息中维护。

        若无法获取任务，则视为100%（兼容已完成或异常情况）。
        """
        try:
            # 根据 task.id 从 Redis 中取出 RQ 的任务对象
            rq_job = current_app.task_queue.fetch_job(self.id)
        except Exception:
            rq_job = None

        return rq_job.meta.get('progress', 0) if rq_job is not None else 100

    def get_status(self):
        """
        实时获取任务状态，返回 Task.Status 的枚举值。

        若无法获取任务（如已被清理），默认为 finished。
        每次查询也会同步数据库中的 status 字段。
        """
        try:
            rq_job = current_app.task_queue.fetch_job(self.id)
        except Exception:
            rq_job = None
        
        if rq_job is not None:
            # RQ返回的状态为字符串，如 'queued'、'started'
            status = rq_job.get_status()
            # 映射为 Task.Status 枚举成员
            self.status = self.Status[status]
            db.session.commit()
            return self.status
        else:
            return self.Status.finished

    def to_dict(self, **kwargs):
        """
        将任务对象序列化为字典，便于 API 输出或前端展示。

        包括：基本信息、状态、进度、结果、创建时间等。
        """
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'progress': self.get_progress(),  # 返回任务进度百分比
            'complete': self.complete,
            'status': self.get_status().name,  # 状态名字符串，例如 'queued'
            'timestamp': self.timestamp,
            'result': self.result,
            '_links': {
                # 构造用户的URL链接，便于前端跳转
                'user_url': url_for('api.get_user', id=self.user.id)
            }
        }

        return data

    
class Notification(db.Model):  # 不需要分页
    """
    表名：
        notifications

    描述：
        用于记录系统通知，例如：推理完成、模型训练完成、系统提示等。
        每个通知绑定到特定用户。

    注意：
        不需要分页，因为通常每个用户的通知数量有限。
    """

    __tablename__ = 'notifications'

    # 主键 ID，自增
    id = db.Column(db.Integer, primary_key=True)

    # 通知名称（自定义字符串，用于类型区分），可索引
    name = db.Column(db.String(128), index=True)

    # 所属用户外键
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    # 通知生成的时间戳（浮点数形式，单位：秒），默认为当前时间
    timestamp = db.Column(db.Float, index=True, default=time)

    # 通知携带的数据体（JSON 字符串）
    payload_json = db.Column(db.Text)

    def __repr__(self):
        return '<Notification {}>'.format(self.id)

    def get_data(self):
        """将 payload_json 字符串反序列化为 Python 对象（字典）"""
        return json.loads(str(self.payload_json))

    def to_dict(self, **kwargs):
        """序列化为字典，供 API 返回"""
        data = {
            'id': self.id,
            'name': self.name,
            'user': {
                'id': self.user.id,
                'username': self.user.username,
                'name': self.user.name,
                'avatar': self.user.avatar(128)  # 生成头像地址
            },
            'timestamp': self.timestamp,
            'payload': self.get_data(),  # JSON 数据
            '_links': {
                'self': url_for('api.get_notification', id=self.id),
                'user_url': url_for('api.get_user', id=self.user_id)
            }
        }
        return data

    def from_dict(self, data):
        """从字典中提取字段赋值（当前仅使用 body、timestamp）"""
        for field in ['body', 'timestamp']:
            if field in data:
                setattr(self, field, data[field])


class Message(PaginatedAPIMixin, db.Model):
    """
    表名：
        messages

    描述：
        存储用户之间发送的私信内容。

    字段：
        - body: 消息正文
        - timestamp: 发送时间
        - sender_id/recipient_id: 发送者和接收者
    """

    __tablename__ = 'messages'

    # 主键 ID
    id = db.Column(db.Integer, primary_key=True)

    # 消息正文内容
    body = db.Column(db.Text)

    # 消息发送时间，默认使用带时区的当前时间
    timestamp = db.Column(db.DateTime, index=True, default=lambda: datetime.now(timezone.utc))

    # 发送者外键
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    # 接收者外键
    recipient_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    def __repr__(self):
        return '<Message {}>'.format(self.id)

    def to_dict(self, **kwargs):
        """序列化消息为字典，包含发送者和接收者信息"""
        data = {
            'id': self.id,
            'body': self.body,
            'timestamp': self.timestamp,
            'sender': self.sender.to_dict(),      # sender 是 User 的关系字段
            'recipient': self.recipient.to_dict(),
            '_links': {
                'self': url_for('api.get_message', id=self.id),
                'sender_url': url_for('api.get_user', id=self.sender_id),
                'recipient_url': url_for('api.get_user', id=self.recipient_id)
            }
        }
        return data

    def from_dict(self, data):
        """从字典中更新字段值"""
        for field in ['body', 'timestamp']:
            if field in data:
                setattr(self, field, data[field])


# 中间表：存储任务组和数据集之间的关联关系
application_group_datasets = db.Table(
    'application_group_datasets',

    # 任务组 ID，联合主键，外键指向 application_group 表
    db.Column('group_id', db.Integer, db.ForeignKey('application_group.id'), primary_key=True),

    # 数据集 ID，联合主键，外键指向 datasets 表
    db.Column('dataset_id', db.Integer, db.ForeignKey('datasets.id'), primary_key=True),

    # 数据集在任务组中最后一次更新的时间（默认当前时间）
    db.Column('last_update', db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)),

    # 最后一次分析时间（例如：传播图分析完成时间）
    db.Column('last_analysis', db.DateTime(timezone=True)),

    # 存储分析任务类型的元数据（可选）
    db.Column('task_type', db.JSON, nullable=True),
)


class ApplicationGroup(db.Model):
    """
    表名：
        application_group

    描述：
        表示一个用户发起的“分析任务组”，可以绑定多个数据集，并指定所选模型、任务类型等。
        用于统一管理某一批次的模型调用任务（如：一次性对多个数据集执行多个模型推理）。

    状态说明：
        - inPause：任务组处于闲置或等待状态；
        - inProcessing：有任务正在运行中。
    """
    __tablename__ = 'application_group'

    class Status(enum.Enum):
        inPause = '暂停中'
        inProcessing = '进行中' 

    # 主键 ID
    id = db.Column(db.Integer, primary_key=True)

    # 任务组名称
    name = db.Column(db.String(128), index=True)

    # 所属用户 ID（外键）
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    # 多对多关系：一个任务组可以绑定多个数据集，使用中间表 `application_group_datasets`
    datasets = db.relationship(
        'Dataset', 
        secondary=application_group_datasets, 
        backref=db.backref('application_group', lazy='dynamic'),
        lazy='dynamic'
    )

    # 当前任务组状态（默认暂停）
    status = db.Column(db.Enum(Status), default=Status.inPause)

    # 用户在该组中选中的模型（JSON 格式存储）
    model_selected = db.Column(db.JSON)

    # 用户选中的数据集配置（如预设数据子集等）
    dataset_selected = db.Column(db.JSON)

    # 是否为用户的默认组
    default = db.Column(db.Boolean, default=False)

    # 当前任务组执行的任务类型（如“推理”、“传播分析”等）
    task_type = db.Column(db.String(64))

    def to_dict(self, **kwargs):
        """
        将任务组对象序列化为 dict，返回任务组基本信息和其关联的数据集列表，
        并附带中间表中的 dataset_id ↔ task_type 额外信息。
        """
        # 查询中间表中当前组对应的数据集及其任务类型信息
        stmt = (
            select(
                application_group_datasets.c.dataset_id,
                application_group_datasets.c.task_type
            )
            .where(application_group_datasets.c.group_id == self.id)
        )
        assoc_rows = {row.dataset_id: row.task_type for row in db.session.execute(stmt)}

        data = {
            'id': self.id,
            'name': self.name,
            'default': self.default,
            'task_type': self.task_type,
            'datasets': []
        }

        # 遍历当前组绑定的数据集
        for ds in self.datasets:
            data['datasets'].append({
                'id': ds.id,
                'name': ds.name,
                'task_type': assoc_rows.get(ds.id)  # 中间表中记录的每个数据集的任务类型（可能为空）
            })

        return data


class ApplicationResult(db.Model):
    """
    表名：
        application_results

    描述：
        用于记录某一“任务组”中，某个数据项使用某个模型（或模型快照）推理/分析得到的最终结果。

    特点：
        - 每个记录唯一标识：group_id + dataset_id + data_id + model_id
        - 结果存储为 JSON，可用于显示/可视化/结果评估。
    """
    __tablename__ = 'application_results'

    # 主键 ID
    id = db.Column(db.Integer, primary_key=True)

    # 所属任务组 ID
    group_id = db.Column(db.Integer, db.ForeignKey('application_group.id'), nullable=False)

    # 所属数据集 ID
    dataset_id = db.Column(db.Integer, db.ForeignKey('datasets.id'), nullable=False)

    # 对应数据项的唯一标识（如：评论 ID、文本 ID）
    data_id = db.Column(db.Integer, nullable=False)

    # 使用的模型 ID
    model_id = db.Column(db.Integer, db.ForeignKey('models.id'), nullable=False)

    # 推理或分析结果（JSON 格式存储）
    result = db.Column(db.JSON, nullable=False)

    # 结果生成时间
    timestamp = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self, **kwargs):
        """序列化为 dict，供前端展示或导出"""
        return {
            'group': self.group_id,
            'dataset': self.dataset_id,
            'dataset_id': self.dataset_id,
            'data_id': self.data_id,
            'model': self.model_id,
            'result': self.result,
            'timestamp': self.timestamp
        }


class CheckpointResult(db.Model):
    """
    表名：
        checkpoint_results

    描述：
        存储模型“检查点”在某一数据项上的中间推理结果。
        通常用于训练过程中的评估或调试（而非最终应用结果）。

    特点：
        - 与 ApplicationResult 类似，但模型 ID 替换为 checkpoint_id。
        - 记录的结果也为 JSON 格式。
    """
    __tablename__ = 'checkpoint_results'

    # 主键 ID
    id = db.Column(db.Integer, primary_key=True)

    # 所属数据集 ID
    dataset_id = db.Column(db.Integer, db.ForeignKey('datasets.id'), nullable=False)

    # 数据项 ID（与上表含义相同）
    data_id = db.Column(db.Integer, nullable=False)

    # 使用的模型检查点 ID
    checkpoint_id = db.Column(db.Integer, db.ForeignKey('model_checkpoints.id'), nullable=False)

    # 推理/中间结果（JSON 格式）
    result = db.Column(db.JSON, nullable=False)

    # 结果生成时间
    timestamp = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self, **kwargs):
        """序列化为 dict，方便展示或记录"""
        return {
            'dataset': self.dataset_id,
            'data_id': self.data_id,
            'checkpoint_id': self.checkpoint_id,
            'result': self.result,
            'timestamp': self.timestamp
        }


class DatasetStats(db.Model):
    """
    表名：
        dataset_stats

    描述：
        存储模型在某个数据集下执行某类任务（mode）所产生的统计结果（如准确率、F1 等），
        结果以 JSON 格式存储，通常用于评估与展示。
    """
    __tablename__ = 'dataset_stats'

    # 主键
    id = db.Column(db.Integer, primary_key=True)

    # 所属任务组（与 ApplicationGroup 关联）
    group_id = db.Column(db.Integer, db.ForeignKey('application_group.id'), nullable=False)

    # 所属数据集
    dataset_id = db.Column(db.Integer, db.ForeignKey('datasets.id'), nullable=False)

    # 所使用的模型
    model_id = db.Column(db.Integer, db.ForeignKey('models.id'), nullable=False)

    # 模式类型，例如："inference"、"evaluation" 等
    mode = db.Column(db.String(64), nullable=False)

    # 模型输出的统计数据（如：准确率、召回率、混淆矩阵等）
    data = db.Column(db.JSON, nullable=False)

    # 统计生成时间
    timestamp = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self, **kwargs):
        """序列化为 dict 格式"""
        return {
            'group': self.group_id,
            'dataset': self.dataset_id,
            'data': self.data,
            'model': self.model_id,
            'mode': self.mode,
            'timestamp': self.timestamp
        }


class Dataset(PaginatedAPIMixin, db.Model):
    """
    表名：
        datasets

    描述：
        存储系统中的所有数据集信息，包括用户上传的、共享的数据集、数据集类型等。
    """
    __tablename__ = 'datasets'
    __table_args__ = (
        UniqueConstraint('user_id', 'name', name='uq_user_dataset_user_name'),
    )

    # 主键
    id = db.Column(db.Integer, primary_key=True)

    # 数据集名称（唯一）
    name = db.Column(db.String(128), nullable=False)

    # 数据集描述
    description = db.Column(db.String(256))

    # 数据集类型（如 'PROPAGATION'、'TWEET' 等字符串）
    dataset_type = db.Column(db.String(64))

    # 上传用户 ID（外键）
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    # 是否设置为共享数据集（其他用户可见）
    shared = db.Column(db.Boolean, default=False)

    # 创建时间
    created_time = db.Column(db.DateTime, default=datetime.now(timezone.utc))

    # 最后更新时间
    updated_time = db.Column(db.DateTime, default=datetime.now(timezone.utc))

    # 可用字段定义（如字段名、含义等，以 JSON 存储）
    valid_fields = db.Column(db.JSON)

    # 是否被逻辑删除（用于隐藏但不删除）
    is_deleted = db.Column(db.Boolean, default=False)

    def to_dict(self, **kwargs):
        """
        序列化为 dict 格式，同时附带该数据集下的数据量统计
        """
        # 获取对应表中的数据条数
        count_query = get_dataset_type(self.dataset_type).query.filter_by(dataset_id=self.id)
        if self.dataset_type == DatasetType.PROPAGATION.name:
            count_query = count_query.filter(PropagationComment.parent_id == None)
        total_data = count_query.count()

        data = {
            'value': self.id,
            'label': self.name,
            'description': self.description,
            'type': DatasetType[self.dataset_type].alias,  # 获取中文/可读名
            'type_name': self.dataset_type,
            'created_time': self.created_time.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_time': self.updated_time.strftime('%Y-%m-%d %H:%M:%S'),
            'total_data': total_data,
            'valid_fields': self.valid_fields,
            'shared': self.shared,
        }

        return data


class TASK_TYPES(enum.Enum):
    """
    枚举类：
        系统支持的任务类型，如：情感识别、立场检测、违法账号检测等。
    """

    # 各种任务类型（可用于模型训练或分析）
    emotion = '用户情感识别'
    stance = '用户立场检测'
    account = '违法违规账号发现'
    illegal = '违法违规和敏感信息检测'

    @classmethod
    def list_types(cls) -> List[Dict[str, str]]:
        """
        返回所有类型的 name 和 value 的列表，用于前端下拉菜单渲染

        示例输出：
        [
            {'value': 'emotion', 'label': '用户情感识别'},
            {'value': 'stance', 'label': '用户立场检测'},
            ...
        ]
        """
        return [{'value': member.name, 'label': member.value} for member in cls]

    @classmethod
    def get_value_by_name(cls, name: str) -> Optional[str]:
        """
        根据枚举名称（如 'emotion'）获取中文值（如 '用户情感识别'），找不到返回 None
        """
        member = cls.__members__.get(name)
        return member.value if member else None

    @classmethod
    def get_name_by_value(cls, value: str) -> Optional[str]:
        """
        根据中文值（如 '用户情感识别'）反查枚举名称（如 'emotion'），找不到返回 None
        """
        for member in cls:
            if member.value == value:
                return member.name
        return None


class Model(PaginatedAPIMixin, db.Model):
    __tablename__ = 'models'  # 指定该模型对应数据库中的表名为 'models'

    id = db.Column(db.Integer, primary_key=True)  # 模型主键 ID
    name = db.Column(db.String(64), unique=True)  # 模型名称，唯一
    task_type = db.Column(db.String(64))  # 模型对应的任务类型（如分类、回归等）
    status = db.Column(db.String(64), default=1)  # 模型状态（如启用/禁用），默认为 1
    model_type = db.Column(db.Enum(MODEL_TYPES), default=MODEL_TYPES.normal)  # 模型类型，使用枚举类型，默认为 normal
    model_instance = db.Column(db.String(64))  # 模型实例标识，用于关联注册的模型类
    alias = db.Column(db.String(64))  # 模型别名（用于展示或别称）
    trainable = db.Column(db.Boolean, default=True)  # 是否可训练，默认可训练
    description = db.Column(db.String(256))  # 模型描述信息

    def to_dict(self, **kwargs):
        """
        将模型对象转换为前端需要的字典格式，常用于序列化传输
        """
        data = {
            'value': self.id,  # 显示用的 value，一般用于 select 控件
            'label': self.name,  # 显示用的 label，通常为模型名
            'status': self.status,  # 模型状态
            'task_type': self.task_type,  # 模型任务类型
            'model_type': self.model_type.name,  # 枚举类型的名称（如 'LLM'）
            'alias': self.alias if self.alias else self.name,  # 如果未设置别名则回退为名称
            'description': self.description,  # 模型描述
        }
        return data

    @staticmethod
    def insert_models():
        '''
        初始化时插入预定义模型到数据库（如注册时调用）
        应用部署时应主动调用该函数，将注册表中的模型写入数据库
        '''
        from app.model_registry import MODEL_REGISTRY  # 引入模型注册字典
        models = MODEL_REGISTRY

        for name, fields in models.items():
            model = Model.query.filter_by(name=name).first()  # 根据名称查询是否已存在模型
            if model is None:
                model = Model(name=name)  # 不存在则创建新模型实例

            # 将注册信息中的字段赋值到模型对象
            for field, value in fields.items():
                setattr(model, field, value)

            db.session.add(model)  # 添加到数据库 session 中
        db.session.commit()  # 提交更改保存到数据库

    def get_instance(self):
        """
        根据 model_instance 获取注册的实际模型类
        通常用于执行模型推理等实际操作
        """
        if self.model_instance is None:
            return None

        return MODEL_INSTANCE[self.model_instance].value  # 通过注册字典获取枚举中的模型类

    @staticmethod
    def convert_llm(model_id, raw):
        """
        处理 LLM 类型模型的原始推理结果，将其转换为结构化可分析格式
        参数:
            model_id: 模型的标识 ID
            raw: 模型返回的原始结果（通常是 JSON 数组）
        返回:
            字典格式的处理结果，如 target -> sentiment
        """
        if model_id == 18:
            target_sentiment = {}  # 存放 target 到 sentiment 的映射

            for entry in raw:
                target = entry.get("target")
                sentiment = entry.get("sentiment")

                # 只有当两个字段都存在时才保存，后面数据会覆盖前面的同名 target
                if target and sentiment:
                    target_sentiment[target] = sentiment

            return target_sentiment

        else:
            # 示例逻辑：从随机权重中采样一个处理结果（示意占位）
            processed = random.choices([0, 1, 2], weights=[5, 3, 2], k=1)[0]
            return {}

    @staticmethod
    def convert_normal(model_id, raw):
        """
        处理 normal 类型模型的原始推理结果，转换为结构化数据
        参数:
            model_id: 模型标识 ID
            raw: 模型返回的原始结果（如列表形式）
        返回:
            字典形式结果，如 target -> sentiment / stance
        """
        if model_id == 18:
            target_sentiment = {}
            for entry in raw:
                target = entry.get("target")
                sentiment = entry.get("sentiment")
                if target and sentiment:
                    target_sentiment[target] = sentiment
            return target_sentiment

        elif model_id == 15:
            target_stance = {}
            for entry in raw:
                target = entry.get("target")
                stance = entry.get("stance")
                if target and stance:
                    target_stance[target] = stance
            return target_stance

        else:
            # 默认返回空结果，可根据需要补充其他逻辑
            processed = random.choices([0, 1, 2], weights=[5, 3, 2], k=1)[0]
            return {}

    def convert_result(self, model_id, raw):
        """
        通用结果转换入口，根据模型类型调用对应的处理函数
        参数:
            model_id: 当前模型 ID
            raw: 模型返回的原始推理结果
        返回:
            格式化后的结构化结果
        """
        # 将模型类型映射到对应的处理函数
        mapping = {
            MODEL_TYPES.LLM: self.convert_llm,
            MODEL_TYPES.normal: self.convert_normal,
            # 可扩展支持更多模型类型
        }
        convert_func = mapping.get(self.model_type)  # 根据模型类型获取处理函数

        if not convert_func:
            raise ValueError(f"Unsupported model type: {self.model_type}")

        return convert_func(model_id, raw)  # 调用对应的转换函数


class Evaluation(PaginatedAPIMixin, db.Model):
    __tablename__ = 'evaluations'  # 设置数据库表名为 evaluations

    id = db.Column(db.Integer, primary_key=True)  # 主键，自增 ID
    name = db.Column(db.String(64), nullable=False)  # 评估任务名称，不能为空
    description = db.Column(db.String(256), nullable=True)  # 描述信息，可为空
    metrics = db.Column(db.JSON, nullable=True)  # 评估指标，使用 JSON 存储
    completed = db.Column(db.Boolean, default=False)  # 是否已完成评估，默认 False
    requirements = db.Column(db.JSON, nullable=True)  # 评估所需条件，如输入类型、模型能力等
    model_id = db.Column(db.Integer, db.ForeignKey('models.id'), nullable=False)  # 关联的模型 ID（外键）
    checksum = db.Column(db.String(256), nullable=True)  # 校验码，用于验证评估任务的完整性

    def to_dict(self, **kwargs):
        """
        将当前 Evaluation 对象转换为前端可用的字典结构。
        包含评估任务基本信息及关联模型信息。
        """
        model = Model.query.get(self.model_id)  # 查询对应模型

        data = {
            'value': self.id,  # 唯一值（通常用于表单）
            'label': self.name,  # 名称，用作展示
            'description': self.description,  # 描述
            'metrics': self.metrics,  # 评估指标
            'completed': self.completed,  # 是否完成
            'requirements': self.requirements,  # 评估前提要求
            'model': model.to_dict() if model else None,  # 关联模型信息
        }

        return data

    @staticmethod
    def insert_tasks():
        """
        应用初始化时插入评估任务。
        读取预设评估配置，将其写入数据库（避免重复插入）。
        """
        from evaluation.setting import EvaluationSet  # 导入评估配置集
        metrics = EvaluationSet().metrics  # 获取预定义的评估任务列表

        for name, fields in metrics.items():
            task = Evaluation.query.filter_by(name=name).first()  # 检查该任务是否已存在
            if task is None:
                task = Evaluation(name=name)  # 不存在则新建

            for field, value in fields.items():
                setattr(task, field, value)  # 设置字段属性

            db.session.add(task)  # 添加至 session
        db.session.commit()  # 批量提交


class ModelCheckpoint(PaginatedAPIMixin, db.Model):
    __tablename__ = 'model_checkpoints'  # 设置数据库表名为 model_checkpoints
    
    id = db.Column(db.Integer, primary_key=True)  # 主键 ID

    # 外键，关联基础模型（一个模型有多个 checkpoint）
    model_id = db.Column(db.Integer, db.ForeignKey('models.id'), nullable=False)

    # 外键，标识该 checkpoint 所属的用户（用户训练生成的版本）
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    # 外键，标识训练所用的数据集
    trainset_id = db.Column(db.Integer, db.ForeignKey('datasets.id'), nullable=False)

    # 模型 checkpoint 文件的存储路径（可以是绝对路径或 URL）
    checkpoint_path = db.Column(db.String(256), nullable=True)

    # 版本号或别名，用于识别 checkpoint（如 "v1.0", "aug2024-finetune" 等）
    version = db.Column(db.String(64), nullable=False)

    # 可选说明，记录训练参数、实验备注等信息
    description = db.Column(db.String(256), nullable=True)

    # 创建时间，默认使用 UTC 当前时间
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))

    # 更新时间，记录最后一次修改时间
    updated_at = db.Column(db.DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    # 模型文件大小（单位：字节）
    size = db.Column(db.BigInteger, default=0)

    # 超参数配置，使用 JSON 存储（如 batch_size, lr 等）
    hyperparameters = db.Column(db.JSON, nullable=True)

    # 训练是否已完成
    complete = db.Column(db.Boolean, default=False)

    # 是否为默认使用的 checkpoint
    default = db.Column(db.Boolean, default=False)

    # 是否公开分享该 checkpoint
    shared = db.Column(db.Boolean, default=False)

    # 在训练集上的评估指标
    metrics = db.Column(db.JSON, nullable=True)  # 评估指标，使用 JSON 存储

    # 设置模型和 checkpoint 的一对多关系（lazy='dynamic' 表示按需加载）
    model = db.relationship('Model', backref=db.backref('checkpoints', lazy='dynamic'))

    # 设置用户和 checkpoint 的一对多关系（用于获取某用户上传的所有模型版本）
    user = db.relationship('User', backref=db.backref('model_checkpoints', lazy='dynamic'))

    # 设置数据集和 checkpoint 的一对多关系（用于获取某数据集对应的所有 checkpoint）
    trainset = db.relationship(
        'Dataset',
        backref=db.backref('model_checkpoints', lazy='dynamic')
    )


    def to_dict(self, **kwargs):
        """
        将 ModelCheckpoint 实例序列化为字典，通常用于 API 返回数据。
        """
        data = {
            'value': self.id,  # 唯一标识
            'label': self.version if self.version else self.checkpoint_path,  # 展示名，优先显示版本号
            'description': self.description,  # 描述
            'size': self.size,  # 文件大小（字节）
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,  # 格式化创建时间
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None,  # 格式化更新时间
            'base_model': self.model.to_dict() if self.model else None,  # 所属基础模型信息
            'trainset': self.trainset.to_dict() if self.model else None,
            'author': self.user.username,  # 所属用户（用户名）
            'shared': self.shared,  # 是否公开
            'hyperparameters': self.hyperparameters,  # 训练超参数
            'complete': self.complete,  # 是否已训练完成
            'metrics': self.metrics,
        }

        return data

    def from_dict(self, data):
        """
        通过前端传入的字典设置必要字段，用于创建或更新模型 checkpoint。
        注意：这里只设置了 model_id 和 version，其他字段如 user_id 等需在服务逻辑中补充。
        """
        for field in ['model_id', 'version', 'trainset_id']:
            setattr(self, field, data[field])


# 抽象基类 DataBase，继承分页混入类 PaginatedAPIMixin 和 SQLAlchemy 的模型基类 db.Model
class DataBase(PaginatedAPIMixin, db.Model):
    __abstract__ = True  # 表示这是一个抽象类，不会直接创建对应的数据库表

    id = db.Column(db.Integer, primary_key=True)  # 主键，唯一标识每条记录
    dataset_id = db.Column(db.Integer, db.ForeignKey('datasets.id'), index=True)  # 外键，关联到 datasets 表
    split = db.Column(db.String(32), default='test')  # 数据集划分（如 train/test/val），默认为 test
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))  # 创建时间，默认为当前 UTC 时间
    updated_at = db.Column(db.DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))  
    # 更新时间，默认当前时间，每次更新时自动修改

    # 新增：是否置顶（置顶的项在返回结果中应该排在最前面）
    is_pinned = db.Column(db.Boolean, default=False, index=True, nullable=False)

    def to_dict(self, **kwargs):
        # 抽象方法，子类必须实现，将模型对象转换为字典
        raise NotImplementedError

# 社交媒体数据集模型类，继承自 DataBase
class SocialMediaDataset(DataBase):
    __tablename__ = 'social_media_dataset'  # 显式指定数据库表名

    # 以下是该表的字段定义，每个字段都与社交媒体内容有关
    key_word = db.Column(db.String(1024))  # 关键词
    title = db.Column(db.String(1024))  # 标题
    text = db.Column(LONGTEXT, nullable=False)  # 正文内容，为必填字段
    author = db.Column(db.String(1024))  # 作者名称
    publish_time = db.Column(db.DateTime)  # 发布时间
    label = db.Column(db.Integer)  # 标签，用于分类或标注
    location = db.Column(db.String(128))  # 地点
    news_source = db.Column(db.String(128))  # 新闻来源
    source_station = db.Column(db.String(128))  # 来源站点
    count_comments = db.Column(db.Integer, default=0)  # 评论数量，默认值为 0
    count_likes = db.Column(db.Integer, default=0)  # 点赞数量
    count_forward = db.Column(db.Integer, default=0)  # 转发数量
    count_favorites = db.Column(db.Integer, default=0)  # 收藏数量
    detail_address = db.Column(db.String(512))  # 详细地址
    count_follwers = db.Column(db.Integer, default=0)  # 粉丝数量（注意：followers 拼写为 follwers）
    count_blogs = db.Column(db.Integer, default=1)  # 博客数量，默认为 1
    auth_type = db.Column(db.String(64))  # 认证类型（如普通用户、官方认证等）
    target = db.Column(db.String(256))  # 话题目标或事件核心关键词

    # 定义应排除在默认字段列表之外的字段（如主键、关联 ID、时间字段）
    except_fields = ['id', 'dataset_id', 'split', 'created_at', 'updated_at']

    # 指定必须包含的字段（当前仅 text 为必填）
    required_fields = ['text']

    # 为每个字段定义额外信息，供前端展示使用（包括列宽和字段描述）
    fields_info = {
        "key_word": {"width": "100px", "description": "关键词，字符串类型"},
        "title": {"width": "200px", "description": "标题，字符串类型"},
        "text": {"width": "300px", "description": "正文内容，纯文本"},
        "author": {"width": "100px", "description": "作者名称，字符串类型"},
        "publish_time": {"width": "150px", "description": "发布时间，日期时间类型"},
        "label": {"width": "50px", "description": "标签，整数类型"},
        "location": {"width": "100px", "description": "地点，字符串类型"},
        "news_source": {"width": "100px", "description": "新闻来源，字符串类型"},
        "source_station": {"width": "100px", "description": "来源站点，字符串类型"},
        "count_comments": {"width": "80px", "description": "评论数量，整数类型"},
        "count_likes": {"width": "80px", "description": "点赞数量，整数类型"},
        "count_forward": {"width": "80px", "description": "转发数量，整数类型"},
        "count_favorites": {"width": "80px", "description": "收藏数量，整数类型"},
        "detail_address": {"width": "120px", "description": "详细地址，字符串类型"},
        "count_follwers": {"width": "80px", "description": "粉丝数量，整数类型"},  # 注意拼写
        "count_blogs": {"width": "80px", "description": "博客数量，整数类型"},
        "auth_type": {"width": "100px", "description": "认证类型，字符串类型"},
        "target": {"width": "100px", "description": "话题目标，字符串类型"},
    }

    # 将模型对象转为字典，便于接口返回 JSON 数据
    def to_dict(self, **kwargs) -> dict:
        """
        将模型对象转为字典，便于接口返回 JSON 数据。

        :param required_fields: 需要返回的字段列表，示例 ['title', 'text', 'label']。
                                如果为 None，则返回所有字段。
        :return: 包含指定字段的字典，id 字段始终会被包含。
        """
        # 全量字段映射
        all_fields = {
            'id': self.id,
            'is_pinned': self.is_pinned,
            'title': self.title,
            'publish_time': self.publish_time,
            'key_word': self.key_word,
            'text': self.text,
            'author': self.author,
            'label': self.label,
            'dataset_id': self.dataset_id,
            'location': self.location or '未知',
            'news_source': self.news_source,
            'source_station': self.source_station,
            'count_comments': self.count_comments,
            'count_likes': self.count_likes,
            'count_forward': self.count_forward,
            'count_favorites': self.count_favorites,
            'detail_address': self.detail_address,
            'count_follwers': self.count_follwers,  # 注意拼写
            'count_blogs': self.count_blogs,
            'auth_type': self.auth_type,
            'target': self.target,
        }

        required_fields = kwargs.get('required_fields', None)
        # 如果没有指定 required_fields，则返回所有字段
        if not required_fields:
            return all_fields

        class_names = kwargs.get('class_names', None)
        # 否则，只保留 required_fields 中指定且存在的字段
        result = {}
        # 始终包含 id
        result['id'] = self.id
        for field in required_fields:
            if field == 'id':
                continue

            if field == '标签' and class_names:
                result[field] = class_names[all_fields['label']]
                continue

            if field in all_fields:
                result[field] = all_fields[field]
            else:
                # 如果指定了不存在的字段，可选择抛错或忽略
                raise ValueError(f"字段 '{field}' 不存在于模型中。")
        return result

class SocialDetectionResult(db.Model):
    """
    存储多模型、多任务对单条数据检测结果。
    一条 record 对应一次模型在某个 data_id 上的某个 task 的一次推理/评估结果（一次 run）。
    """
    __tablename__ = 'social_detection_results'

    id = db.Column(db.Integer, primary_key=True)

    # 关联信息
    dataset_id = db.Column(db.Integer, db.ForeignKey('datasets.id'), index=True, nullable=True)
    # 被检测的数据记录 id（例如 SocialMediaDataset.id）
    data_id = db.Column(db.Integer, db.ForeignKey('social_media_dataset.id'), index=True, nullable=False)
    # 如果你有 Model 表，可以用外键；否则也可以用 model_name+version
    model_name = db.Column(db.String(128), nullable=False, index=True)

    # 任务类型，例如 'toxicity', 'ner', 'classification', 'topic_detection' 等
    task_name = db.Column(db.String(64), nullable=False, index=True)
    # 运行参数（如阈值、prompt 等），以及模型原始返回内容与计算出的指标，使用 JSON 存储
    task_params = db.Column(db.JSON, nullable=True)
    raw_result = db.Column(db.JSON, nullable=True)   # 模型原始输出（可能很复杂）
    metrics = db.Column(db.JSON, nullable=True)      # 结构化指标，例如 {"confidence": 0.92, "probabilities": {...}}

    # 方便检索的聚合字段
    primary_score = db.Column(db.Float, nullable=True, index=True)  # 例如置信度/概率/分数
    label = db.Column(db.String(128), nullable=True, index=True)    # 模型输出的标签（若有）

    # 运行状态与错误信息
    status = db.Column(db.String(32), nullable=False, default='completed', index=True)  # pending/running/completed/failed
    error_message = db.Column(db.String(1024), nullable=True)

    # 时间字段
    started_at = db.Column(db.DateTime, nullable=True)
    finished_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    __table_args__ = (
        db.Index('ix_model_task_data', 'model_name', 'task_name', 'data_id'),
        db.Index('ix_dataset_model_task', 'dataset_id', 'model_name', 'task_name'),
    )

    def to_dict(self, fields: list = None) -> dict:
        """将对象转为 dict，默认返回常用字段"""
        base = {
            'id': self.id,
            'dataset_id': self.dataset_id,
            'data_id': self.data_id,
            'model_name': self.model_name,
            'task_name': self.task_name,
            'task_params': self.task_params,
            'raw_result': self.raw_result,
            'metrics': self.metrics,
            'primary_score': self.primary_score,
            'label': self.label,
            'status': self.status,
            'error_message': self.error_message,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'finished_at': self.finished_at.isoformat() if self.finished_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if not fields:
            return base
        return {k: base[k] for k in fields if k in base}

# 非法账号检测表，继承抽象基类 DataBase
class IllegalAccountDetection(DataBase):
    __tablename__ = 'illegal_account_detection'  # 显式指定数据库表名

    # 账号名称，为必填字段
    name = db.Column(db.String(128), nullable=False)
    # 检测标签，例如“违规”或“正常”，为必填字段
    label = db.Column(db.String(32), nullable=False)

    # 排除基类中的公共字段
    except_fields = ['id', 'dataset_id', 'split', 'created_at', 'updated_at']
    # 指定必须填写的字段
    required_fields = ['name', 'label']

    # 字段的前端展示信息定义（列宽与说明）
    fields_info = {
        'name': {'width': '200px', 'description': '账号名称，字符串类型'},
        'label': {'width': '80px', 'description': '检测标签，如违规/正常，字符串类型'},
    }

    # 将模型对象转换为字典格式，便于接口返回 JSON 数据
    def to_dict(self, **kwargs):
        return {
            'id': self.id,
            'is_pinned': self.is_pinned,
            'dataset_id': self.dataset_id,
            'name': self.name,
            'label': self.label,
            'split': self.split,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }

# 账号角色识别任务数据表
class AccountRoleRecognition(DataBase):
    __tablename__ = 'account_role_recognition'  # 表名

    # 用户名，为必填字段
    username = db.Column(db.String(128), nullable=False)
    # 角色标签，如“个人”或“机构官方”，为必填字段
    label = db.Column(db.String(64), nullable=False)
    # 粉丝数量，整数，默认值为 0
    num_followers = db.Column(db.Integer, default=0)
    # 博文数量，默认值为 0
    num_blogs = db.Column(db.Integer, default=0)
    # 用户认证类型，如“蓝V”、“黄V”
    auth_type = db.Column(db.String(32))

    # 公共字段排除列表
    except_fields = ['id', 'dataset_id', 'split', 'created_at', 'updated_at']
    # 必需字段列表
    required_fields = ['username', 'label']

    # 前端字段说明与样式
    fields_info = {
        'username': {'width': '200px', 'description': '用户名，字符串类型'},
        'label': {'width': '120px', 'description': '角色标签，如个人/企业机构官方，字符串类型'},
        'num_followers': {'width': '80px', 'description': '粉丝数量，整数类型'},
        'num_blogs': {'width': '80px', 'description': '博文数量，整数类型'},
        'auth_type': {'width': '100px', 'description': '认证类型，如蓝V/黄V，字符串类型'},
    }

    # 转换为字典
    def to_dict(self, **kwargs):
        return {
            'id': self.id,
            'is_pinned': self.is_pinned,
            'dataset_id': self.dataset_id,
            'username': self.username,
            'label': self.label,
            'num_followers': self.num_followers,
            'num_blogs': self.num_blogs,
            'auth_type': self.auth_type,
            'split': self.split,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }

# 多模态文本+图片数据集模型，用于谣言检测等任务
class MultiModalImageDataset(DataBase):
    __tablename__ = 'multimodal_image_dataset'  # 表名

    id = db.Column(db.Integer, primary_key=True)  # 主键 ID，重复声明用于 clarity
    text = db.Column(db.Text, nullable=False)  # 中文文本内容，必填字段
    processed_input = db.Column(db.Text)  # 可选字段，预处理后的输入内容
    label_rumor = db.Column(db.SmallInteger, default=0)  # 虚假信息检测标签，整数类型，默认 0

    # 多图扩展：与 Image 表建立一对多关系
    images = db.relationship('Image', backref='rumor', lazy='dynamic')

    # 通用字段排除列表
    except_fields = ['id', 'dataset_id', 'split', 'created_at', 'updated_at']
    # 必需字段：文本和图片路径必须提供
    required_fields = ['text', 'image_path']

    # 字段显示说明，用于前端界面
    fields_info = {
        "text": {"width": "200px", "description": "正文内容，字符串类型"},
        "label_rumor": {"width": "80px", "description": "用于虚假信息检测任务的标签，整数类型"},
        "image_path": {"width": "100px", "description": "图片相对路径，支持一文多图，以'|'分割，字符串类型"},
        "processed_input": {"width": "200px", "description": "预处理输入，字符串类型"}
    }

    # 将模型转换为 dict，含图像信息
    def to_dict(self, **kwargs):
        data = {
            'id': self.id,
            'is_pinned': self.is_pinned,
            'text': self.text,
            'label_rumor': self.label_rumor,
            'dataset_id': self.dataset_id,
            'processed_input': self.processed_input if self.processed_input else self.text,
            'images': [image.to_dict() for image in self.images]  # 获取所有关联图片的 dict 表示
        }

        return data


# 图像信息模型，作为 MultiModalImageDataset 的附属表，可独立管理图片
class Image(db.Model):
    """可选扩展表，用于未来独立图片管理"""
    __tablename__ = 'images'

    id = db.Column(db.Integer, primary_key=True)  # 图片记录主键
    path = db.Column(db.String(255))  # 图片路径，字符串形式
    data_id = db.Column(db.Integer, db.ForeignKey('multimodal_image_dataset.id'))  # 外键，关联多模态数据表
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))  # 创建时间，默认当前 UTC

    # 返回包含路径的字典，用于前端加载
    def to_dict(self, **kwargs):
        return {
            'path': self.path,
        }

# 对话会话表，用于存储一个完整对话 session 的基本信息
class DialogSession(DataBase):
    __tablename__ = 'dialog_sessions'  # 显式指定表名为 dialog_sessions

    # 每个 session 的唯一标识码，用于检索和关联，必须唯一且不能为空，并建立索引加快查询
    session_code = db.Column(db.String(64), unique=True, nullable=False, index=True)

    # 存储该 session 下所有 utterance 的 ID 列表（例如 ["utt1", "utt2", "utt3"]），以 JSON 格式保存
    utterance_ids = db.Column(db.JSON, nullable=False)

    # ORM 关系定义：该 session 拥有多个 utterances，反向字段为 DialogUtterance 中的 session
    utterances = db.relationship('DialogUtterance', back_populates='session', lazy='dynamic')

    # 排除公共字段（基类字段）以便简化导出和前端管理逻辑
    except_fields = ['id', 'dataset_id', 'split', 'created_at', 'updated_at']

    # 错误：以下两个字段并非定义在本模型中（可能是误复制自其它模型），实际无效
    required_fields = ['text', 'image_path']

    # 将模型转换为字典（便于接口返回或调试）
    def to_dict(self, **kwargs):
        return {
            'id': self.id,
            'is_pinned': self.is_pinned,
            'dataset_id': self.dataset_id,
            'split': self.split,
            'session_code': self.session_code,
            'utterance_ids': self.utterance_ids,  # 原始 utterance_id 顺序记录
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'utterances': [u.to_dict() for u in self.utterances],  # 所有回复的完整结构（多字段）
            'context_utterances': [u.to_dict()['text'] for u in self.utterances],  # 仅提取 text 字段用于上下文拼接等用途
        }


# 对话发言（Utterance）表，表示一次说话片段
class DialogUtterance(DataBase):
    __tablename__ = 'dialog_utterances'  # 表名

    # 每个发言的唯一标识码（可供追踪），不能为空且唯一，建立索引加速查询
    utterance_code = db.Column(db.String(64), unique=True, nullable=False, index=True)

    # 发言的文本内容，最多 512 字符，必填
    text = db.Column(db.String(512), nullable=False)

    # 发言起始时间（单位为秒，可能来自音视频字幕信息）
    start_time = db.Column(db.Float)

    # 发言结束时间
    end_time = db.Column(db.Float)

    # 说话人标识（如 A/B、用户名等）
    speaker = db.Column(db.String(32))

    # 情感标签（如 neutral/anger/happy 等）
    emotion = db.Column(db.String(32))

    # 与 session 的关联字段，指向 DialogSession 中的 session_code
    session_code = db.Column(db.String(64), db.ForeignKey('dialog_sessions.session_code'), index=True)

    # ORM 关系绑定：每个发言属于一个会话
    session = db.relationship('DialogSession', back_populates='utterances', lazy='joined')

    # 将 Utterance 实例转为字典形式，便于 API 使用
    def to_dict(self, **kwargs):
        return {
            'id': self.id,
            'is_pinned': self.is_pinned,
            'dataset_id': self.dataset_id,
            'split': self.split,
            'utterance_code': self.utterance_code,
            'text': self.text,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'speaker': self.speaker,
            'emotion': self.emotion,
            'session_code': self.session_code,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

    
# 传播评论表，用于构建评论传播树（每条评论可有父评论和多个子评论）
class PropagationComment(DataBase):
    __tablename__ = 'prop_comments'  # 显式指定表名

    id = db.Column(db.Integer, primary_key=True)  # 主键 ID
    post_id = db.Column(db.String(64), index=True, nullable=False)  # 所属原始帖子 ID
    content = db.Column(db.Text, nullable=False)  # 评论内容，不能为空

    # 邻接表结构：指向父评论的 ID，允许为空（若为空表示为根评论）
    parent_id = db.Column(db.Integer, db.ForeignKey('prop_comments.id', ondelete='CASCADE'), nullable=True)

    # ORM 关系：表示当前评论的所有子评论，建立反向绑定 parent（即 child.parent -> parent Comment）
    children = db.relationship(
        'PropagationComment',
        backref=backref(
            'parent',  # 子评论可通过 parent 属性访问其父评论
            remote_side=[id]  # 指定外键引用目标（即上面定义的 id 字段）
        ),
        lazy='dynamic'  # 使用延迟加载，查询子评论时才真正执行 SQL
    )

    @staticmethod
    def get_comment_subtree(root_id: int):
        """
        获取以某条评论（root_id）为根的完整传播子树，返回格式为：
        [(PropagationComment 实例, 所在深度), ...]
        查询基于闭包表 PropagationCommentClosure 实现，具备良好性能。
        """
        rows = (
            db.session.query(PropagationComment, PropagationCommentClosure.depth)
            .join(
                PropagationCommentClosure,
                PropagationComment.id == PropagationCommentClosure.descendant_id
            )
            .filter(PropagationCommentClosure.ancestor_id == root_id)
            .order_by(PropagationCommentClosure.depth, PropagationComment.created_at)
            .all()
        )
        return rows

    def to_dict(self, **kwargs):
        """
        将当前评论对象序列化为字典，并附带其完整传播子树（带深度信息）
        """
        data = {
            'id': self.id,
            'is_pinned': self.is_pinned,
            'dataset_id': self.dataset_id,
            'content': self.content,
        }

        # 获取子树并构建嵌套数据结构
        subtree = []
        for comment, depth in self.get_comment_subtree(self.id):
            subtree.append({
                'comment': {
                    'id': comment.id,
                    'content': comment.content,
                    'parent_id': comment.parent_id
                },
                'depth': depth
            })
        data['subtree'] = subtree
        return data

# 评论传播闭包表，用于存储评论传播结构中的祖先-后代关系
# 使用闭包表方式可高效支持任意节点的“全子树/祖先路径”查询
class PropagationCommentClosure(DataBase):
    __tablename__ = 'prop_comments_closure'  # 表名

    # 祖先节点 ID（即传播链起点）
    ancestor_id = db.Column(
        db.Integer,
        db.ForeignKey('prop_comments.id', ondelete='CASCADE'),
        primary_key=True  # 联合主键
    )

    # 后代节点 ID（即被传播的评论）
    descendant_id = db.Column(
        db.Integer,
        db.ForeignKey('prop_comments.id', ondelete='CASCADE'),
        primary_key=True  # 联合主键
    )

    # 从祖先到后代的路径深度（0 表示自身，1 表示直接子节点）
    depth = db.Column(db.Integer, nullable=False)


# 数据集类型枚举类，每种类型关联一个模型类和元信息
class DatasetType(enum.Enum):
    # --------- 文本类数据 ---------
    SOCIAL = (
        '社交媒体文本数据',
        '该数据集类型用于存储社交平台上的用户原创纯文本内容，不包含传播结构信息。'
        '文本内容通常来自微博、论坛、短视频评论区、新闻评论区等社交媒体平台，具备语义表达自然、语言风格多样、时效性强等特点。'
        '该类型数据适用于情感分析、立场检测、违法违规账号识别、违法违规内容检测、攻击性/有害言论识别、个人隐私信息（PII）检测、文本分类、关键实体识别等多种任务。'
        '可广泛应用于内容审核系统、网络舆情分析、自动化文本过滤、社交平台治理等场景。',
        SocialMediaDataset  # 关联的 SQLAlchemy 模型类
    )

    # --------- 多模态数据 ---------
    IMAGE = (
        '多模态图片数据集',
        '该数据集类型用于存储包含图像内容的多模态数据，图像通常与文本或其他数据一起提供。'
        '图片内容可能来自社交媒体、新闻报道、广告、产品图册等。'
        '该类型数据适用于图像分类、目标检测、图像描述生成、图像-文本匹配、情感分析（通过图像识别情绪）、物体识别等任务。'
        '图像可以与社交媒体文本数据、视频数据等结合，支持多模态学习。'
        '广泛应用于智能监控、内容审核、广告推荐系统、自动驾驶、医疗影像分析、社交媒体数据分析等领域。',
        MultiModalImageDataset
    )

    # --------- 对话类数据 ---------
    INTERACTIVE_DIALOGUE = (
        '交互式对话数据',
        '该数据集用于存储交互式对话的父节点（话题/场景）和子节点（逐句话轮），'
        '适用于对话分析、情感识别、对话生成评估等任务',
        DialogSession
    )

    # --------- 评论传播结构数据 ---------
    PROPAGATION = (
        '传播评论树数据',
        '该数据集类型用于存储社交平台上的评论及其传播树结构，'
        '既包含评论的邻接父子关系，也通过闭包表维护完整的祖先—后代映射。'
        '适用于传播过程分析、谣言溯源、影响力评估、信息扩散建模等任务。',
        PropagationComment
    )

    # --------- 非法账号识别任务 ---------
    ILLEGAL_ACCOUNT_DETECTION = (
        '违法违规账号检测',
        '该数据集类型用于存储需要检测是否为违法违规账号的账号名称与标签信息。'
        '适用于账号审核、网络平台治理等场景。',
        IllegalAccountDetection
    )

    # --------- 账号角色分类任务 ---------
    ACCOUNT_ROLE_RECOGNITION = (
        '账号角色识别',
        '该数据集类型用于存储账号的角色识别信息，包括用户名、角色标签、粉丝数、博文数、认证类型等。'
        '适用于角色分析、用户分类、实名制审核等任务。',
        AccountRoleRecognition
    )

    def __init__(self, alias: str, description: str, model_cls):
        self.alias = alias              # 中文名称（如“传播评论树数据”）
        self.description = description  # 类型说明（用于前端/说明文档）
        self.model = model_cls          # 绑定的 SQLAlchemy 模型类，用于动态表映射


def get_dataset_types_columns() -> dict:
    """
    获取当前系统支持的所有数据集类型的字段信息，返回结构如下：

    {
        "SOCIAL": {
            "alias": "社交媒体文本数据",                      # 中文名称
            "description": "该数据集用于处理社交平台上的纯文本内容...",  # 描述信息
            "required": {                                  # 必填字段
                "text": {"width": "300px", "说明": "正文内容，纯文本"},
                ...
            },
            "optional": {                                  # 可选字段
                "title": {"width": "200px", "说明": "标题，字符串类型"},
                ...
            }
        },
        ...
    }

    用途：
    - 可用于前端动态表单生成（区分 required/optional）
    - 支持通用字段展示逻辑（例如管理界面、上传模版）
    - 为数据校验器、导入导出器提供字段元数据支撑
    """

    result = {}

    # 遍历每种数据集类型
    for dataset in DatasetType:
        dataset_key = dataset.name         # 枚举键（如 "SOCIAL"）
        model = dataset.model              # 对应的 SQLAlchemy 模型类

        try:
            # 获取当前模型类中除去 except_fields 的所有字段名
            all_columns = [
                column.key
                for column in class_mapper(model).columns
                if column.key not in model.except_fields
            ]
        except Exception:
            # 某些模型可能无法映射（尚未初始化），跳过字段提取
            all_columns = []

        # 获取必填字段名列表和字段信息映射表
        required_field_names = getattr(model, 'required_fields', [])
        model_fields_info = getattr(model, 'fields_info', {})

        required = {}
        optional = {}

        # 遍历所有字段，按是否必填分组
        for field in all_columns:
            # 从 fields_info 中获取字段元数据（默认说明为 "未定义"）
            info = model_fields_info.get(field, {"width": 100, "说明": "未定义"})

            if field in required_field_names:
                required[field] = info
            else:
                optional[field] = info

        # 针对多模态 IMAGE 类型，手动补充特殊字段 image_path
        if dataset == DatasetType.IMAGE:
            required['image_path'] = model_fields_info.get('image_path', {"width": 100, "说明": "未定义"})

        # 汇总结果字典
        result[dataset_key] = {
            "alias": dataset.alias,                # 中文名称
            "description": dataset.description,    # 类型说明
            "required": required,                  # 必填字段映射
            "optional": optional                   # 可选字段映射
        }

    return result


def get_dataset_type(name) -> type:
    """
    根据数据集类型名（字符串）返回对应的模型类，例如：
        get_dataset_type("SOCIAL") → SocialMediaDataset
    用于动态路由、查询、字段提取等
    """
    return DatasetType[name].model


def get_dataset_type_info(name) -> tuple:
    """
    获取数据集类型的中文名和英文标识名，返回形式如：
        ("社交媒体文本数据", "SOCIAL")
    常用于前端下拉框、用户可读提示等场景
    """
    return (DatasetType[name].alias, name)


# 存储大语言模型样本数据的表
class HvsmLLMSample(db.Model):
    __tablename__ = 'hvsm_llm_samples'  # 表名：大语言模型样本

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)  # 主键，自增
    text = db.Column(db.Text, nullable=False)                         # 输入文本，不能为空
    label = db.Column(db.Text, nullable=False)                        # 生成/标注标签结果，不能为空
    create_time = db.Column(db.DateTime, default=datetime.now(timezone.utc))  # 样本创建时间

    def to_dict(self, **kwargs):
        """
        将样本对象转换为字典，便于 API 或 JSON 序列化输出
        """
        data = {
            'id': self.id,
            'text': self.text,
            'label': self.label,
            'time': self.create_time
        }
        return data

    @staticmethod
    def insert_samples(text, label):
        """
        插入新样本数据（输入和标签）
        :param text: 样本输入文本
        :param label: 样本对应标签（LLM 生成或人工标注）
        """
        sample = HvsmLLMSample(
            text=text,
            label=label
        )

        db.session.add(sample)

        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            raise e  # 事务失败后回滚并向上抛出异常


# 存储用户得分信息的表（例如用于任务评分、系统评分统计等）
class HvsmScore(db.Model):
    __tablename__ = 'hvsm_score'  # 表名：评分记录表

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)  # 主键，自增
    username = db.Column(db.Text, nullable=False)                     # 用户名
    score = db.Column(db.INT, nullable=False)                         # 分数值
    create_time = db.Column(db.DateTime, default=datetime.now(timezone.utc))  # 记录创建时间

    def to_dict(self, **kwargs):
        """
        将评分对象转换为字典，用于 JSON 序列化或 API 返回
        """
        data = {
            'id': self.id,
            'username': self.username,
            'score': self.score,
            'time': self.create_time
        }
        return data

    @staticmethod
    def insert_samples(username, score):
        """
        插入一条新的评分记录
        :param username: 用户名
        :param score: 得分（int 类型）
        """
        sample = HvsmScore(
            username=username,
            score=score
        )

        db.session.add(sample)

        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            raise e  # 出现异常时回滚并抛出异常

class SystemConfig(db.Model):
    """
    系统级全局配置表
    - 由管理员维护
    - 所有用户共享
    """

    __tablename__ = "system_configs"

    id = db.Column(db.Integer, primary_key=True)

    # 配置唯一键（程序中使用）
    key = db.Column(db.String(128), nullable=False, comment="配置键，如 wechat.admin_cookie")

    # 配置所属模块（便于分组管理）
    module = db.Column(db.String(64), nullable=False, comment="配置模块，如 wechat / crawler / auth")

    # 配置值（统一 JSON 存储，适配复杂结构）
    value = db.Column(db.JSON, nullable=False, comment="配置值，JSON 格式")

    # 配置类型（用于前端渲染 / 校验）
    value_type = db.Column(
        db.Enum(
            "string",
            "number",
            "boolean",
            "json",
            "secret",
            name="system_config_value_type",
        ),
        nullable=False,
        default="string",
        comment="配置值类型"
    )

    # 描述 / 用途说明
    description = db.Column(db.Text, comment="配置说明")

    # 是否启用（支持软关闭）
    enabled = db.Column(db.Boolean, nullable=False, default=True)

    # 是否为敏感配置（前端不直接展示 value）
    is_secret = db.Column(db.Boolean, nullable=False, default=False)

    # 最近修改信息
    updated_by = db.Column(db.String(64), comment="最后修改人（管理员用户名或ID）")
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("key", name="uk_system_config_key"),
        db.Index("idx_system_config_module", "module"),
    )

    def __repr__(self):
        return f"<SystemConfig key={self.key} module={self.module} enabled={self.enabled}>"
    
    def to_dict(self) -> dict:
        return  {
            "id": self.id,
            "key": self.key,
            "module": self.module,
            "enabled": self.enabled,
            "value": self.value,
            "created_at": self.created_at,
        }

def get_system_config(db: Session, key: str, default=None):
    cfg = (
        db.query(SystemConfig)
        .filter(SystemConfig.key == key, SystemConfig.enabled == True)
        .first()
    )
    if not cfg:
        return default
    return cfg.value

def set_system_config(
    db: Session,
    *,
    key: str,
    module: str,
    value,
    value_type: str,
    updated_by: str,
    description: str | None = None,
    enabled: bool = True,
):
    # 类型校验（防止脏数据）
    if value_type == "boolean" and not isinstance(value, bool):
        raise ValueError("value_type=boolean 但 value 不是 bool")
    if value_type == "number" and not isinstance(value, (int, float)):
        raise ValueError("value_type=number 但 value 不是 number")
    if value_type == "string" and not isinstance(value, str):
        raise ValueError("value_type=string 但 value 不是 string")

    # 查找是否已存在
    cfg = (
        db.query(SystemConfig)
        .filter(SystemConfig.key == key)
        .first()
    )

    if cfg:
        # 更新
        cfg.module = module
        cfg.value = value
        cfg.value_type = value_type
        cfg.enabled = enabled
        cfg.updated_by = updated_by
        cfg.updated_at = datetime.now(timezone.utc)
        if description is not None:
            cfg.description = description
    else:
        # 新建
        cfg = SystemConfig(
            key=key,
            module=module,
            value=value,
            value_type=value_type,
            description=description,
            enabled=enabled,
            is_secret=(value_type == "secret"),
            updated_by=updated_by,
        )
        db.add(cfg)

    db.commit()
    return cfg