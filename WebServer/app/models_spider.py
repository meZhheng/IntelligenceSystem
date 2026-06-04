from app.extensions import db
from app.models import PaginatedAPIMixin
from sqlalchemy.dialects.mysql import BIGINT
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import relationship
import enum
from sqlalchemy import PrimaryKeyConstraint

class WeiboUser(db.Model, PaginatedAPIMixin):
    __bind_key__ = 'weibo'               # 指定使用的数据库连接（绑定名为 weibo）
    __tablename__ = 'weibo_users'        # 指定表名

    # 用户唯一ID（使用MySQL的无符号BIGINT类型，防止溢出）
    id = db.Column(BIGINT(unsigned=True), primary_key=True)

    # 用户名（昵称）
    username = db.Column(db.String(64))

    # 性别，如 '男'、'女' 或 '未知'
    gender = db.Column(db.String(16))

    # 所在地，例如“北京 朝阳区”
    location = db.Column(db.String(64))

    # 出生日期，字符串格式，如 "1990-01-01"
    birthday = db.Column(db.String(32))

    # 个人简介
    description = db.Column(db.Text)

    # 认证原因，如“微博知名博主”
    verified_reason = db.Column(db.String(128))

    # 个人标签/特长，如“摄影达人”
    talent = db.Column(db.String(64))

    # 教育背景描述，如“北京大学 计算机专业”
    education = db.Column(db.String(128))

    # 工作信息，如“腾讯 高级工程师”
    work = db.Column(db.String(128))

    # 发布的微博数量
    weibo_num = db.Column(db.Integer)

    # 关注的人数
    following = db.Column(db.Integer)

    # 粉丝数量，使用无符号BIGINT以支持大用户量
    followers = db.Column(BIGINT(unsigned=True))

    # 最近一次爬取该用户个人信息的时间，用于判断是否需要更新
    last_crawled = db.Column(
        db.DateTime,
        comment='最近一次爬取用户信息时间'
    )

    # 最近一次爬取该用户微博的时间
    last_crawled_wblogs = db.Column(
        db.DateTime
    )

    # 标记该用户在系统中的可见状态，用于软删除或过滤无效用户
    is_visible = db.Column(
        db.Boolean,
        default=True,
    )

    # 关系图的预计算布局结果，存储为 JSON，包含节点坐标（如 x_norm, y_norm）和样式等展示信息
    graph_layout = db.Column(
        db.JSON,
        comment='关系图预计算布局结果'
    )

    # 关系图上次计算的时间，用于判断是否需要重新计算布局
    graph_computed_at = db.Column(
        db.DateTime,
        comment='关系图计算时间'
    )

    # 威胁指数，表示用户违法或违规的次数，默认为 0
    threat_index = db.Column(
        db.Integer,
        default=0,
        nullable=False,
        comment="用户的违法违规总次数"
    )

    # 将数据库模型转换为字典，用于前端接口输出（注意：未包含 graph_layout 等字段）
    def to_dict(self, **kwargs):
        return {
            'id': self.id,
            'username': self.username,
            'gender': self.gender,
            'location': self.location,
            'birthday': self.birthday,
            'description': self.description,
            'verified_reason': self.verified_reason,
            'talent': self.talent,
            'education': self.education,
            'work': self.work,
            'weibo_num': self.weibo_num,
            'following': self.following,
            'followers': self.followers,

            'last_crawled': self.last_crawled,
            'last_crawled_wblogs': self.last_crawled_wblogs,

            'is_visible': self.is_visible,
            'threat_index': self.threat_index,
        }


class WeiboRelation(db.Model):
    __bind_key__ = 'weibo'               # 使用绑定名为 weibo 的数据库连接
    __tablename__ = 'relations'          # 表名为 relations，存储用户关系数据

    # 关系的起始用户ID，使用字符串类型，作为复合主键之一
    source_id = db.Column(db.String(64), primary_key=True)

    # 关系的目标用户ID，使用字符串类型，作为复合主键之一
    target_id = db.Column(db.String(64), primary_key=True)

    # 关系类型，如 'following'（关注）、'fan'（粉丝）、'like' 等，作为复合主键之一，不能为空，默认值为 'following'
    relation_type = db.Column(db.String(16), nullable=False, default='following', primary_key=True)

    # 说明：三字段联合构成复合主键，确保同一source-target之间同种关系仅存在一条记录


class WeiboUserImage(db.Model):
    """可选的扩展表，用于未来独立管理微博用户的图片信息"""

    __bind_key__ = 'weibo'               # 绑定到 weibo 数据库
    __tablename__ = 'weibo_user_images' # 表名

    # 图片记录唯一ID，自增主键
    id = db.Column(db.Integer, primary_key=True)

    # 图片文件路径，字符串，存储图片在服务器或CDN上的路径
    path = db.Column(db.String(255))

    # 关联的微博用户ID，外键，关联到 weibo_users 表的 id 字段
    data_id = db.Column(BIGINT(unsigned=True), db.ForeignKey('weibo_users.id'))

    # 记录创建时间，默认当前 UTC 时间
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))

    # 转换为字典格式，通常用于API输出，暂只输出图片路径
    def to_dict(self, **kwargs):
        return {
            'path': self.path,
        }


class WeiboPost(db.Model, PaginatedAPIMixin):
    __bind_key__ = 'weibo'             # 使用绑定为 weibo 的数据库连接
    __tablename__ = 'weibo_posts'      # 表名为 weibo_posts

    # 主键，微博唯一ID，字符串类型（微博ID通常为字符串）
    id = db.Column(db.String(255), primary_key=True)

    # 发布者用户ID，外键关联到 weibo_users 表的 id 字段，建立索引提高查询效率
    user_id = db.Column(BIGINT(unsigned=True), db.ForeignKey('weibo_users.id'), index=True)

    # 微博正文内容，不允许为空
    content = db.Column(db.Text, nullable=False)

    # 头条文章链接，默认为空字符串且不能为空
    article_url = db.Column(db.String(255), default='', nullable=False)

    # 原始配图，存储为 JSON 数组，默认空列表且不能为空
    original_pictures = db.Column(db.JSON, default=list, nullable=False)

    # 转发微博的配图，存储为 JSON 数组，默认空列表
    retweet_pictures = db.Column(db.JSON, default=list)

    # 如果微博是转发来的，存储被转发微博的ID（字符串）
    original_id = db.Column(db.String(255))

    # 视频链接URL，默认为空字符串
    video_url = db.Column(db.String(255), default='')

    # 发布地点，字符串类型，默认为空字符串
    publish_place = db.Column(db.String(128), default='')

    # 发布时间，DateTime类型，不能为空
    publish_time = db.Column(db.DateTime, nullable=False)

    # 发布工具/客户端信息，如“iPhone客户端”，默认为空字符串
    publish_tool = db.Column(db.String(64), default='')

    # 微博的互动数据：点赞数，默认为0
    up_num = db.Column(db.Integer, default=0)

    # 转发数，默认为0
    retweet_num = db.Column(db.Integer, default=0)

    # 评论数，默认为0
    comment_num = db.Column(db.Integer, default=0)

    # 与互动表建立一对多关系，加载方式为动态查询（lazy='dynamic'），删除微博时连带删除相关互动（级联删除孤儿）
    interactions = db.relationship(
        'WeiboInteraction',
        back_populates='source_post',
        lazy='dynamic',
        cascade='all, delete-orphan'
    )

    def to_dict(self, **kwargs):
        # 根据微博ID从检测结果表中查找三种任务类型的检测结果（立场、情感、违规）
        stance_result = WeiboDetectResult.query.filter_by(weibo_id=self.id, task_type=WeiboDetectResult.DetectType.STANCE).first()
        sentiment_result = WeiboDetectResult.query.filter_by(weibo_id=self.id, task_type=WeiboDetectResult.DetectType.SENTIMENT).first()
        violation_result = WeiboDetectResult.query.filter_by(weibo_id=self.id, task_type=WeiboDetectResult.DetectType.VIOLATION).first()

        return {
            'id': str(self.id),  # 微博ID转字符串
            'user_id': str(self.user_id),  # 发布者用户ID转字符串
            'content': self.content,        # 微博正文内容
            # 若无article_url，返回默认的微博评论链接地址
            'article_url': self.article_url if self.article_url else u'https://weibo.cn/comment/%s\n' % self.id,
            'original_pictures': self.original_pictures,  # 原始配图列表
            'retweet_pictures': self.retweet_pictures,    # 转发配图列表
            'original_id': str(self.original_id) if self.original_id else None,  # 转发源微博ID（可能为None）
            'video_url': self.video_url,  # 视频链接
            'publish_place': self.publish_place,  # 发布地点
            'publish_time': self.publish_time.strftime('%Y-%m-%d %H:%M'),  # 格式化发布时间为字符串
            'publish_tool': self.publish_tool,      # 发布客户端信息
            'up_num': self.up_num,          # 点赞数
            'retweet_num': self.retweet_num,  # 转发数
            'comment_num': self.comment_num,  # 评论数
            'original': self.original_id,  # 用于返回转发源微博ID（有时作为回链）

            # 立场检测结果，若无则为None
            'stance': stance_result.result if stance_result else None,
            # 情感检测结果，若无则为None
            'sentiment': sentiment_result.result if sentiment_result else None,
            # 违规检测结果，若无则为None
            'violations': violation_result.result if violation_result else None,
            # 是否检测过任一结果，有任一检测结果则为True
            'detected': True if stance_result or sentiment_result or violation_result else False,
        }


class WeiboDetectResult(db.Model):
    __bind_key__ = 'weibo'                   # 绑定到 weibo 数据库
    __tablename__ = 'weibo_detect_results'  # 表名
    __table_args__ = (
        # 复合主键，联合 weibo_id 和 task_type 唯一标识一条检测结果
        PrimaryKeyConstraint('weibo_id', 'task_type', name='pk_weibo_detect_results'),
    )

    class DetectType(enum.Enum):
        STANCE = '立场'        # 立场检测任务
        SENTIMENT = '情感'    # 情感检测任务
        VIOLATION = '违法违规' # 违规检测任务

    # 关联的微博ID，外键指向 weibo_posts.id，建立索引以加速查询
    weibo_id = db.Column(
        db.String(255),
        db.ForeignKey('weibo_posts.id'),
        nullable=False,
        index=True
    )

    # 任务类型，枚举类型，不能为空
    task_type = db.Column(
        db.Enum(DetectType),
        nullable=False
    )

    # 检测结果，存为JSON格式，不能为空
    result = db.Column(db.JSON, nullable=False)

    # 记录检测时间，默认为当前 UTC 时间，不能为空
    timestamp = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    def to_dict(self, **kwargs):
        # 将模型实例转换成字典，方便序列化输出
        return {
            'weibo_id': self.weibo_id,
            'task_type': self.task_type.value,  # 返回枚举对应的中文值
            'result': self.result,
            'timestamp': self.timestamp.isoformat(),
        }


class WeiboInteraction(db.Model, PaginatedAPIMixin):
    __bind_key__ = 'weibo'                 # 绑定到 weibo 数据库
    __tablename__ = 'weibo_interactions'  # 表名

    # 自增主键，唯一标识一条互动记录
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)

    # 互动用户ID，外键关联微博用户表，不能为空，且建索引
    user_id = db.Column(BIGINT(unsigned=True), db.ForeignKey('weibo_users.id'), nullable=False, index=True)

    # 互动用户名称（昵称）
    username = db.Column(db.String(64))

    # 互动类型，使用枚举限定，只能是 'retweet'（转发）、'comment'（评论）、'like'（点赞）
    interaction_type = db.Column(
        db.Enum('retweet', 'comment', 'like', name='interaction_type'),
        nullable=False,
        comment='retweet=转发，comment=评论'
    )

    # 互动文本内容，不允许为空
    content = db.Column(db.Text, nullable=False)

    # 互动点赞数，默认为0，不能为空
    like_num = db.Column(db.Integer, default=0, nullable=False)

    # 来源，如发布的客户端或设备信息，默认为空字符串
    source = db.Column(db.String(128), default='', nullable=False)

    # 互动发布时间，不能为空
    publish_time = db.Column(db.DateTime, nullable=False)

    # 是否是热门互动，默认为False
    is_hot = db.Column(db.Boolean, default=False, nullable=False)

    # 关联的源微博ID，外键，不能为空，建索引
    source_post_id = db.Column(
        db.String(255),
        db.ForeignKey('weibo_posts.id'),
        nullable=False,
        index=True
    )

    # ORM关系，关联到源微博，支持反向访问 interactions
    source_post = db.relationship(
        'WeiboPost',
        back_populates='interactions'
    )

    def to_dict(self, **kwargs):
        # 转换为字典，方便API接口返回数据
        return {
            'user_id': self.user_id,
            'username': self.username,
            'content': self.content,
            'like_num': self.like_num,
            'source': self.source,
            'publish_time': self.publish_time,
            'interaction_type': self.interaction_type,
            # 目标用户名，从源微博的发布者ID查询用户名
            'target_username': WeiboUser.query.get(self.source_post.user_id).username,
            # 目标用户ID，即源微博发布者ID
            'target_user_id': self.source_post.user_id,
        }


class PA_Article(db.Model, PaginatedAPIMixin):
    __bind_key__ = 'weibo'            # 绑定使用 weibo 数据库
    __tablename__ = 'pa_article'      # 表名：pa_article，存储公众号文章数据

    # 公众号唯一标识，外键关联 pa_account 表的 id，不能为空
    fakeid = db.Column(db.String(255), db.ForeignKey('pa_account.id'), nullable=False)

    # 文章ID，主键，字符串类型
    article_id = db.Column(db.String(255), nullable=False, primary_key=True)

    # 文章标题，不能为空
    title = db.Column(db.String(255), nullable=False)

    # 文章链接，不能为空
    link = db.Column(db.String(255), nullable=False)

    # 文章最后更新时间，不能为空
    update_time = db.Column(db.DateTime, nullable=False)

    # 文章创建时间，不能为空
    create_time = db.Column(db.DateTime, nullable=False)

    # 作者名称，不能为空
    author_name = db.Column(db.String(255), nullable=False)

    # 软删除标记，默认为False，表示未删除
    is_deleted = db.Column(db.Boolean, default=False)

    # 解析后的文章文本内容，存储为JSON格式
    text = db.Column(db.JSON, comment="解析后的文本内容")

    # 是否已检测过错误，默认为False
    is_detected = db.Column(db.Boolean, default=False)

    # 检测出错误的数量，默认为0
    mistake_num = db.Column(db.Integer, default=0)

    # 正向关系，关联公众号账号，每篇文章属于一个公众号账号
    account = relationship('PA_Account', back_populates='articles')

    # 关联校对结果，一篇文章对应多个校对结果，级联删除孤儿记录
    proofread_results = db.relationship(
        'PA_Article_Result',
        back_populates='article',
        cascade='all, delete-orphan'
    )

    def to_dict(self, **kwargs):
        # 转换为字典，用于API输出
        return {
            'title': self.title,
            'link': self.link,
            'article_id': self.article_id,
            'update_time': self.update_time,
            'create_time': self.create_time,
            'author_name': self.author_name,
            'is_deleted': self.is_deleted,
            'affiliation': self.account.name,  # 所属公众号名称
            'is_detected': self.is_detected,
            'result': self.mistake_num,
        }


class PA_Article_Result(db.Model, PaginatedAPIMixin):
    __tablename__ = 'proofread_results'   # 表名，存储校对结果
    __bind_key__ = 'weibo'                 # 绑定数据库

    # 自增主键ID，唯一标识一条校对记录
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # 关联文章ID，外键关联 pa_article.article_id，删除文章时对应结果自动删除
    article_id = db.Column(db.String(255), db.ForeignKey('pa_article.article_id', ondelete='CASCADE'), nullable=False)

    # 错误来源厂商名称，如 PA、UM 等
    vendor = db.Column(db.String(50), nullable=False, comment='来源厂商，如 PA、UM')

    # 错误在文本中的起始位置（字符索引）
    start_pos = db.Column(db.Integer, nullable=False, comment='错误起始位置')

    # 错误在文本中的结束位置（字符索引）
    end_pos = db.Column(db.Integer, nullable=False, comment='错误结束位置')

    # 原始错误片段，可能为空
    original_text = db.Column(db.String(255), nullable=True, comment='原始错误片段')

    # 错误上下文摘录，可能为空
    context_snippet = db.Column(db.Text, nullable=True, comment='上下文摘录')

    # 错误类型ID，可选
    error_type_id = db.Column(db.Integer, nullable=True, comment='错误类型ID')

    # 错误等级名称，可选
    error_type_name = db.Column(db.String(100), nullable=True, comment='错误等级')

    # 细分类别，可选
    error_category = db.Column(db.String(50), nullable=True, comment='细分类别')

    # 错误类型名称，可选
    error_category_name = db.Column(db.String(50), nullable=True, comment='错误类型名称')

    # 该句子中的错误总数，可选
    sentence_error_count = db.Column(db.Integer, nullable=True, comment='一句话中错误总数')

    # 推荐的替换文本，可能为空
    recommend_text = db.Column(db.Text, nullable=True, comment='推荐替换文本')

    # 额外信息，存储原始返回的其他字段，JSON格式，可为空
    extra_info = db.Column(db.JSON, nullable=True, comment='原始返回的其他字段')

    # 记录创建时间，默认当前UTC时间，不能为空
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc), nullable=False)

    # 更新时间，记录修改时间，自动更新为当前UTC时间，不能为空
    updated_at = db.Column(db.DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc), nullable=False)

    # 结果类型，标识该错误是标题错误还是正文内容错误
    result_type = db.Column(db.String(50), nullable=False, comment='标题还是内容错误')

    # 关联到文章表，反向关联为 proofread_results
    article = relationship('PA_Article', back_populates='proofread_results')

    def to_dict(self, **kwargs):
        # 转换为字典，方便API输出
        return {
            'id': self.id,
            'article_id': self.article_id,
            'vendor': self.vendor,
            'start_pos': self.start_pos,
            'end_pos': self.end_pos,
            'original_text': self.original_text,
            'context_snippet': self.context_snippet,
            'error_type_id': self.error_type_id,
            'error_type_name': self.error_type_name,
            'error_category': self.error_category,
            'error_category_name': self.error_category_name,
            'sentence_error_count': self.sentence_error_count,
            'recommend_text': self.recommend_text,
            'extra_info': self.extra_info,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

    
class PA_Article_Content(db.Model, PaginatedAPIMixin):
    __bind_key__ = 'weibo'              # 绑定使用 weibo 数据库
    __tablename__ = 'pa_article_content' # 表名，存储公众号文章的全文内容

    # 文章ID，主键，外键关联 pa_article 表的 article_id，不能为空
    article_id = db.Column(
        db.String(255),
        db.ForeignKey('pa_article.article_id'),
        nullable=False,
        primary_key=True
    )

    # 文章正文内容，使用 LargeBinary 类型存储，内容为 gzip 压缩后的 HTML
    content = db.Column(db.LargeBinary, comment="gzip 压缩后的全文 HTML")

    def to_dict(self, **kwargs):
        # 目前未实现转换方法，视需求可解压后返回字符串内容
        pass

class PA_Article_Content_Fs(db.Model, PaginatedAPIMixin):
    __bind_key__ = 'weibo'              # 绑定使用 weibo 数据库
    __tablename__ = "pa_article_content_fs"
    article_id = db.Column(
        db.String(255),
        db.ForeignKey('pa_article.article_id'),
        nullable=False, 
        primary_key=True
    )
    content_path = db.Column(db.String(1024), nullable=True)

    def to_dict(self, **kwargs):
        # 目前未实现转换方法，视需求可解压后返回字符串内容
        pass

class PA_Account(db.Model, PaginatedAPIMixin):
    __bind_key__ = 'weibo'              # 绑定数据库
    __tablename__ = 'pa_account'        # 表名，存储公众号账号信息

    # 公众号唯一ID，主键，字符串类型
    id = db.Column(db.String(255), nullable=False, primary_key=True)

    # 公众号名称，可为空（爬取时可能未获取到）
    name = db.Column(db.String(255), nullable=True)

    # 最近一次爬取时间，记录数据更新状态
    last_crawled = db.Column(db.DateTime)
    
    # 是否自动检测
    auto_detected = db.Column(db.Boolean, default=False)

    # 反向关系：一个账号对应多篇文章，加载方式为动态查询
    articles = relationship(
        'PA_Article',
        back_populates='account',
        lazy='dynamic'
    )

    def to_dict(self, **kwargs):
        # 转换为字典，方便接口输出
        return {
            'value': self.id,
            'label': self.name,
            'last_crawled': self.last_crawled
        }

class AccountDetectResult(db.Model):
    """
    账号检测结果
    """
    __bind_key__ = 'weibo'                          # 绑定数据库
    __tablename__ = 'account_detect_result'         # 表名，存储公众号账号信息

    # 自增主键ID，唯一标识一条校对记录
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    # 用户名，为必填字段
    username = db.Column(db.String(128), nullable=False)
    # 粉丝数量，整数，默认值为 0
    num_followers = db.Column(db.Integer, default=0)
    # 博文数量，默认值为 0
    num_blogs = db.Column(db.Integer, default=0)
    # 用户认证类型，如“蓝V”、“黄V”
    auth_type = db.Column(db.String(32))

    # 角色标签，如“个人”或“机构官方”，为必填字段
    label = db.Column(db.String(64))

    task_type = db.Column(db.String(64))