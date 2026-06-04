class Weibo:
    def __init__(self):
        # 微博的唯一标识符
        self.id = ''
        # 用户的唯一标识符
        self.user_id = ''

        # 微博正文内容
        self.content = ''
        # 微博中可能包含的文章链接
        self.article_url = ''

        # 原创微博中的图片链接列表
        self.original_pictures = []
        # 转发微博中的图片链接列表（可能为 None）
        self.retweet_pictures = None
        # 如果是转发微博，original 表示原微博对象（可为 None）
        self.original = None
        # 微博中包含的视频链接
        self.video_url = ''

        # 发布微博的位置（地理信息）
        self.publish_place = ''
        # 微博的发布时间，格式为字符串
        self.publish_time = ''
        # 发布微博所使用的工具（如手机型号、网页等）
        self.publish_tool = ''

        # 点赞数
        self.up_num = 0
        # 转发数
        self.retweet_num = 0
        # 评论数
        self.comment_num = 0

    def __str__(self):
        """返回该微博对象的字符串表示，用于打印输出"""
        result = self.content + '\n'
        result += u'微博发布位置：%s\n' % self.publish_place
        result += u'发布时间：%s\n' % self.publish_time
        result += u'发布工具：%s\n' % self.publish_tool
        result += u'点赞数：%d\n' % self.up_num
        result += u'转发数：%d\n' % self.retweet_num
        result += u'评论数：%d\n' % self.comment_num
        result += u'url：https://weibo.cn/comment/%s\n' % self.id
        result += u'用户id：%s\n' % self.user_id
        return result