import logging

from .info_parser import InfoParser
from .parser import Parser
from .util import handle_html, string_to_int
from ..user import User

logger = logging.getLogger('spider.index_parser')


class IndexParser(Parser):
    def __init__(self, cookie, user_uri):
        self.cookie = cookie  # 用户登录的 Cookie
        self.user_uri = user_uri  # 用户主页的 URI，可能是 UID 或个性化域名
        self.url = 'https://weibo.cn/%s' % (user_uri)  # 构造用户主页 URL
        # 请求并解析用户主页 HTML，生成 XPath 可查询对象
        self.selector = handle_html(self.cookie, self.url)

    def _get_user_id(self):
        """
        获取真实用户 ID。
        因为输入的 user_uri 可能是个性域名，非数字 UID，
        需要解析用户主页中“资料”链接的 href 来获取真正的用户 ID。
        
        返回：
            user_id (str): 真实的用户 ID
        """
        user_id = self.user_uri  # 默认先用传入的 URI
        url_list = self.selector.xpath("//div[@class='u']//a")  # 查找用户主页“资料”等链接

        for url in url_list:
            # 找到文本为“资料”的链接
            if (url.xpath('string(.)')) == u'资料':
                # 确保 href 存在，且链接以 '/info' 结尾
                if url.xpath('@href') and url.xpath('@href')[0].endswith('/info'):
                    link = url.xpath('@href')[0]
                    # href 格式一般为 /用户ID/info，去除前后缀，获得用户 ID
                    user_id = link[1:-5]
                    break

        return user_id

    def get_user(self) -> User:
        """
        抓取用户的完整基础信息。
        包含：
          - 纠正后的真实用户 ID
          - 用户基本信息（昵称、简介等）通过 InfoParser 获取
          - 微博数、关注数、粉丝数统计
          
        返回：
          User 对象，或抓取失败时返回错误信息或异常
        """
        # 1. 获取真实的用户 ID（防止输入的 user_uri 是个性域名）
        real_id = self._get_user_id()

        # 2. 使用 InfoParser 获取用户详细信息（返回 User 对象）
        UserInfo = InfoParser(self.cookie, real_id).extract_user_info()
        # 若返回不是 User 类型，直接返回（可能是错误信息）
        if not isinstance(UserInfo, User):
            return UserInfo

        # 设置 User 对象的 ID 为真实用户 ID
        UserInfo.id = real_id

        # 3. 从用户主页统计栏获取微博、关注、粉丝数量
        # xpath 返回类似 ['微博123', '关注456', '粉丝789'] 的字符串列表
        stats = self.selector.xpath("//div[@class='tip2']/*/text()")

        # 使用 string_to_int 函数解析数字（去掉文字，转换成整数）
        UserInfo.weibo_num = string_to_int(stats[0][3:-1])    # 微博数，去掉开头“微博”字，和末尾“条”字
        UserInfo.following = string_to_int(stats[1][3:-1])    # 关注数
        UserInfo.followers = string_to_int(stats[2][3:-1])    # 粉丝数

        return UserInfo

    def get_page_num(self):
        """
        获取该用户微博的总页数，用于分页抓取微博内容。
        如果页面没有分页输入框，默认为 1 页。
        
        返回：
          int 页数，出错时返回 None 并写日志
        """
        try:
            # 查找分页输入框 <input name="mp" value="xx" />
            if self.selector.xpath("//input[@name='mp']") == []:
                page_num = 1
            else:
                page_num = int(self.selector.xpath("//input[@name='mp']")[0].attrib['value'])
            return page_num
        except Exception as e:
            logger.exception(e)
