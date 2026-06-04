import logging
import sys

# 导入通用 Writer 基类
from .writer import Writer

# 设置日志记录器
logger = logging.getLogger('spider.txt_writer')


class TxtWriter(Writer):
    def __init__(self, file_path, filter):
        # 初始化 TXT 文件路径
        self.file_path = file_path

        # 用户信息标题
        self.user_header = u'用户信息'

        # 用户字段与中文描述（用于格式化输出）
        self.user_desc = [('nickname', '用户昵称'), ('id', '用户id'),
                          ('weibo_num', '微博数'), ('following', '关注数'),
                          ('followers', '粉丝数')]

        # 判断是否启用“原创微博”过滤标志，设置微博内容标题
        if filter:
            self.weibo_header = u'原创微博内容'
        else:
            self.weibo_header = u'微博内容'

        # 微博字段与中文描述（用于格式化输出）
        self.weibo_desc = [('publish_place', '微博位置'), ('publish_time', '发布时间'),
                           ('up_num', '点赞数'), ('retweet_num', '转发数'),
                           ('comment_num', '评论数'), ('publish_tool', '发布工具')]

    def write_user(self, user):
        # 缓存用户对象
        self.user = user

        # 构造用户信息字符串（每行格式为 "中文字段名：字段值"）
        user_info = '\n'.join(
            [v + '：' + str(self.user.__dict__[k]) for k, v in self.user_desc])

        # 打开 txt 文件并以二进制追加写入用户信息
        with open(self.file_path, 'ab') as f:
            f.write((self.user_header + '：\n' + user_info + '\n\n').encode(
                sys.stdout.encoding))  # 使用系统标准输出编码写入内容

        # 记录日志
        logger.info(u'%s信息写入txt文件完毕，保存路径：%s', self.user.nickname,
                    self.file_path)

    def write_weibo(self, weibo):
        """将爬取的信息写入txt文件"""

        # 首次写入微博时写入“微博内容”标题
        weibo_header = ''
        if self.weibo_header:
            weibo_header = self.weibo_header + '：\n'
            self.weibo_header = ''  # 避免重复写入标题

        try:
            temp_result = []

            # 遍历每条微博，格式化其内容及描述字段为字符串
            for w in weibo:
                temp_result.append(w.__dict__['content'] + '\n' + '\n'.join(
                    [v + '：' + str(w.__dict__[k])
                     for k, v in self.weibo_desc]))

            # 所有微博拼接为最终结果字符串（微博间用空行分隔）
            result = '\n\n'.join(temp_result) + '\n\n'

            # 打开文件以二进制追加模式写入结果
            with open(self.file_path, 'ab') as f:
                f.write((weibo_header + result).encode(sys.stdout.encoding))

            # 记录写入成功日志
            logger.info(u'%d条微博写入txt文件完毕，保存路径：%s', len(weibo), self.file_path)
        except Exception as e:
            # 写入过程中捕获异常并记录错误
            logger.exception(e)
