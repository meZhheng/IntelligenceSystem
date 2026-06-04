class Interaction:
    def __init__(self):
        # 微博ID，标识这条互动所属的微博
        self.weibo_id = ''

        # 用户ID，标识进行互动的用户
        self.user_id = ''

        # 用户名，进行互动的用户昵称
        self.username = ''

        # 互动类型，如评论、点赞、转发等
        self.interaction_type = ''

        # 互动内容，通常为评论的文本内容
        self.content = ''

        # 点赞数，互动对象获得的点赞数量
        self.like_num = ''

        # 互动来源，可能指设备、平台或者应用来源
        self.source = ''

        # 发布时间，互动内容发布的时间
        self.publish_time = ''

        # 是否热门，标记该互动是否被认为是热门互动
        self.is_hot = ''