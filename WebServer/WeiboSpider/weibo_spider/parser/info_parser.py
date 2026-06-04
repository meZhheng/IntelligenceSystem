import logging
import sys

from ..user import User
from .parser import Parser
from .util import handle_html

logger = logging.getLogger('spider.info_parser')


class InfoParser(Parser):
    def __init__(self, cookie, user_id):
        self.cookie = cookie  # 用于登录验证的 Cookie
        # 用户资料页 URL，格式如 https://weibo.cn/12345678/info
        self.url = 'https://weibo.cn/%s/info' % (user_id)
        # 请求页面并解析 HTML，返回可用 XPath 查询的 selector 对象
        self.selector = handle_html(self.cookie, self.url)

    def extract_user_info(self):
        """
        提取用户基本信息，包括昵称、性别、地区、生日、简介、认证信息、达人信息、
        教育经历和工作经历。

        返回：
          - 成功时返回 User 对象，包含解析到的信息；
          - 失败或 Cookie 无效时返回 dict，包含错误信息。
        """
        try:
            user = User()

            # 获取网页标题，格式一般为 “昵称 微博”，去除末尾“ 微博”
            nickname = self.selector.xpath('//title/text()')[0]
            nickname = nickname[:-3]
            
            # 如果标题是登录页，说明 Cookie 失效或错误
            if nickname == u'登录 - 新' or nickname == u'新浪':
                return {
                    'error': 0,
                    'message': 'cookie错误或已过期,请按照README中方法重新获取'
                }
            
            user.nickname = nickname  # 设置昵称

            # 基本信息一般在第三个 class 为 c 的 div 标签中，文本节点列表
            basic_info = self.selector.xpath("//div[@class='c'][3]/text()")

            # 中文字段列表，对应要映射到 User 属性的英文字段名
            zh_list = [u'性别', u'地区', u'生日', u'简介', u'认证', u'达人']
            en_list = [
                'gender', 'location', 'birthday', 'description',
                'verified_reason', 'talent'
            ]

            # 遍历文本列表，匹配字段名，设置对应 User 属性，去除全角空格 \u3000
            for i in basic_info:
                if i.split(':', 1)[0] in zh_list:
                    setattr(user, en_list[zh_list.index(i.split(':', 1)[0])],
                            i.split(':', 1)[1].replace('\u3000', ''))

            # 解析教育经历和工作经历
            experienced = self.selector.xpath("//div[@class='tip'][2]/text()")
            if experienced and experienced[0] == u'学习经历':
                # 教育经历在第四个 class 为 c 的 div 标签文本，去除首字符（一般是冒号或空格）
                user.education = self.selector.xpath(
                    "//div[@class='c'][4]/text()")[0][1:].replace(u'\xa0', u' ')
                # 判断是否有工作经历
                if self.selector.xpath("//div[@class='tip'][3]/text()")[0] == u'工作经历':
                    user.work = self.selector.xpath(
                        "//div[@class='c'][5]/text()")[0][1:].replace(u'\xa0', u' ')
            elif experienced and experienced[0] == u'工作经历':
                # 若没有学习经历，但有工作经历，则工作经历在第四个 class 为 c 的 div 标签文本
                user.work = self.selector.xpath(
                    "//div[@class='c'][4]/text()")[0][1:].replace(u'\xa0', u' ')

            return user

        except Exception as e:
            # 解析异常时记录日志，函数返回 None
            logger.exception(e)
