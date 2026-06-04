from .parser import Parser
from .util import handle_html


class PhotoParser(Parser):
    # 初始化 PhotoParser 类实例，继承自 Parser
    def __init__(self, cookie, user_id):
        # 设置 cookie 属性，用于后续网络请求中的身份认证
        self.cookie = cookie
        
        # 根据 user_id 构造访问微博用户照片页的 URL，带有参数 tf=6_008 用于筛选照片类型
        self.url = "https://weibo.cn/" + str(user_id) + "/photo?tf=6_008"
        
        # 通过 handle_html 函数发送请求并处理响应的 HTML，返回页面选择器对象
        self.selector = handle_html(self.cookie, self.url)
        
        # 记录当前用户 ID，方便后续操作中使用
        self.user_id = user_id

    # 提取头像相册页面的 URL 链接
    def extract_avatar_album_url(self):
        # 利用 xpath 选择器查找页面中 alt 属性为“头像相册”的 <img> 标签的父元素 <a> 标签的 href 属性值
        # 例如：
        # <a href="/album/166564740000001980768563?rl=1">
        #   <img width="80" height="80" src="..." alt="头像相册">
        # </a>
        result = self.selector.xpath('//img[@alt="头像相册"]/../@href')
        
        # 如果找到了对应链接，返回完整的头像相册 URL，拼接域名部分
        if len(result) > 0:
            return "https://weibo.cn" + result[0]
        else:
            # 如果未找到头像相册链接，返回用户头像页的默认 URL
            return "https://weibo.cn/" + str(self.user_id) + "/avatar?rl=0"
