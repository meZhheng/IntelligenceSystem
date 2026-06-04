from .parser import Parser  # 导入基础解析器类 Parser，用于继承
from .util import handle_html  # 导入处理 HTML 的工具函数 handle_html


class AlbumParser(Parser):
    def __init__(self, cookie, album_url):
        self.cookie = cookie  # 用户登录后的 cookie，用于获取页面数据
        self.url = album_url  # 相册页面的 URL
        # 使用 handle_html 函数获取页面内容，并将其解析为可进行 XPath 查询的 selector 对象
        self.selector = handle_html(self.cookie, self.url)

    def extract_pic_urls(self):
        # 从页面中提取所有图片的 src 属性（图片地址）
        # 匹配 HTML 中 class 为 "c" 的 div 标签下所有 img 标签的 src 属性
        # 例如：<img src="http://xxx.jpg" class="c">
        pic_list = self.selector.xpath('//div[@class="c"]//img/@src')
        
        # 遍历图片地址列表，去除 src 中带有参数的部分（如 "?xxx"）
        for i, pic in enumerate(pic_list):
            if "?" in pic:
                # 仅保留 ? 前的部分，去掉 URL 参数
                pic = pic[:pic.index("?")]
            # 更新清洗后的图片链接
            pic_list[i] = pic

        # 返回处理后的图片地址列表
        return pic_list
