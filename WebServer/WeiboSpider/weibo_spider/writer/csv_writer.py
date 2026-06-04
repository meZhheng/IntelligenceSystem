import csv
import logging

# 导入基类 Writer
from .writer import Writer

# 获取名为 'spider.csv_writer' 的 logger 实例
logger = logging.getLogger('spider.csv_writer')


# 定义 CsvWriter 类，继承自 Writer，用于将数据写入 CSV 文件
class CsvWriter(Writer):
    def __init__(self, file_path, filter):
        # 初始化 CSV 文件路径
        self.file_path = file_path

        # 定义要写入 CSV 文件的列标题及其对应的微博属性名（字段键）
        self.result_headers = [('微博id', 'id'), ('微博正文', 'content'),
                               ('头条文章url', 'article_url'),
                               ('原始图片url', 'original_pictures'),
                               ('微博视频url', 'video_url'),
                               ('发布位置', 'publish_place'),
                               ('发布时间', 'publish_time'),
                               ('发布工具', 'publish_tool'), ('点赞数', 'up_num'),
                               ('转发数', 'retweet_num'), ('评论数', 'comment_num')]

        # 若不启用过滤器，则添加“被转发微博原始图片”和“是否原创微博”两个字段
        if not filter:
            self.result_headers.insert(4, ('被转发微博原始图片url', 'retweet_pictures'))
            self.result_headers.insert(5, ('是否为原创微博', 'original'))

        # 尝试创建或追加写入 CSV 文件，写入表头（字段名）
        try:
            with open(self.file_path, 'a', encoding='utf-8-sig',
                      newline='') as f:
                writer = csv.writer(f)
                # 写入表头第一行，仅包含中文字段名
                writer.writerows([[kv[0] for kv in self.result_headers]])
        except Exception as e:
            # 出现异常则记录错误信息
            logger.exception(e)

    def write_user(self, user):
        # 写入用户信息，目前仅赋值给实例变量 self.user，暂未使用
        self.user = user

    def write_weibo(self, weibos):
        """将爬取的信息写入csv文件"""
        try:
            # 从每一条 weibo 对象中提取对应字段，构建二维列表数据
            result_data = [[w.__dict__[kv[1]] for kv in self.result_headers]
                           for w in weibos]

            # 打开 CSV 文件并以追加模式写入微博数据
            with open(self.file_path, 'a', encoding='utf-8-sig',
                      newline='') as f:
                writer = csv.writer(f)
                # 写入微博内容数据
                writer.writerows(result_data)

            # 写入成功，记录日志信息
            logger.info(u'%d条微博写入csv文件完毕，保存路径：%s', len(weibos), self.file_path)
        except Exception as e:
            # 写入过程中发生异常则记录详细错误信息
            logger.exception(e)
