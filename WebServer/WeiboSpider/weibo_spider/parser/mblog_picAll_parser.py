from .parser import Parser
from .util import handle_html


class MblogPicAllParser(Parser):
    """
    用于抓取微博所有配图的链接。
    给定微博 ID，访问对应的“全部图片”页面，提取所有图片预览图的 URL。
    """

    def __init__(self, cookie, weibo_id):
        self.cookie = cookie  # 用于身份验证的 Cookie
        # 构造微博全部图片页 URL，格式如 https://weibo.cn/mblog/picAll/微博ID?rl=1
        self.url = 'https://weibo.cn/mblog/picAll/' + weibo_id + '?rl=1'
        # 请求页面并解析 HTML，得到可用 XPath 查询的 selector 对象
        self.selector = handle_html(self.cookie, self.url)

    def extract_preview_picture_list(self):
        """
        提取页面中所有图片的 src 属性值，即所有图片预览图的链接列表。
        
        返回：
            图片 URL 字符串列表
        """
        return self.selector.xpath('//img/@src')
