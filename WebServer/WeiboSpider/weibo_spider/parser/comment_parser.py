import logging
import random
import requests
import re
from time import sleep
from lxml.html import tostring
from lxml.html import fromstring
from lxml import etree
from .parser import Parser
from .util import handle_garbled, handle_html

# 设置日志记录器，用于记录错误和调试信息
logger = logging.getLogger('spider.comment_parser')


class CommentParser(Parser):
    def __init__(self, cookie, weibo_id):
        # 设置请求的 cookie
        self.cookie = cookie
        # 构造评论页的 URL，例如：https://weibo.cn/comment/xxxxx
        self.url = 'https://weibo.cn/comment/' + weibo_id
        # 使用工具函数获取并解析网页内容为可查询的 selector 对象
        self.selector = handle_html(self.cookie, self.url)

    def get_long_weibo(self):
        """
        获取长原创微博正文内容。
        返回清洗后的纯文本内容，自动处理换行、标签等。
        """
        try:
            # 最多尝试请求 5 次，避免因网络问题导致解析失败
            for i in range(5):
                self.selector = handle_html(self.cookie, self.url)
                if self.selector is not None:
                    # 查找微博内容所在的 div（原创微博正文）
                    info_div = self.selector.xpath("//div[@class='c' and @id='M_']")[0]
                    # 获取微博正文文本部分所在的 span
                    info_span = info_div.xpath("//span[@class='ctt']")[0]

                    # 1. 将 HTML 元素转换为字符串（包含标签）
                    html_string = etree.tostring(info_span, encoding='unicode', method='html')
                    # 2. 将 HTML 中的 <br> 标签替换为换行符 \n
                    html_string = html_string.replace('<br>', '\n')
                    # 3. 解析 HTML，提取纯文本内容，移除标签
                    new_content = fromstring(html_string).text_content()
                    # 4. 将连续多个换行合并为一个
                    new_content = re.sub(r'\n+\s*', '\n', new_content)

                    # 处理网页乱码问题
                    weibo_content = handle_garbled(new_content)
                    if weibo_content is not None:
                        return weibo_content

                # 若 selector 无法获取，则等待一段时间后重试
                sleep(random.randint(6, 10))
        except Exception:
            logger.exception(u'网络出错')

    def get_long_retweet(self):
        """
        获取长转发微博的正文内容（去掉“原文转发”之后的部分）。
        """
        try:
            # 首先获取完整长微博内容
            wb_content = self.get_long_weibo()
            # 截取“原文转发”前的部分，即转发用户自己的内容
            weibo_content = wb_content[:wb_content.rfind(u'原文转发')]
            return weibo_content
        except Exception as e:
            # 捕获异常并记录
            logger.exception(e)

    def get_video_page_url(self):
        """
        获取微博中的视频页面链接（通常用于跳转到 m.weibo.cn/s/video 页面）。
        返回视频链接字符串，如未找到返回空字符串。
        """
        video_url = ''
        try:
            # 重新请求页面，确保 selector 最新
            self.selector = handle_html(self.cookie, self.url)
            if self.selector is not None:
                # 视频链接通常在第一条微博内容的子链接中
                links = self.selector.xpath("body/div[@class='c' and @id][1]/div//a")
                for a in links:
                    href = a.xpath('@href')[0]
                    # 判断是否为微博视频页链接
                    if 'm.weibo.cn/s/video/show?object_id=' in href:
                        video_url = href
                        break
        except Exception:
            logger.exception(u'网络出错')

        return video_url
