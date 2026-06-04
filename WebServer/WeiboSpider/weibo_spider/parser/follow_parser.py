import re
from .parser import Parser
from urllib.parse import urlparse, parse_qs
from .util import handle_html
import time
import random

class FollowParser(Parser):
    """
    获取用户关注列表（最大 max_pages 页，每页最多 10 条）。
    在每次请求前加入随机延时，防止被封禁。

    返回格式：
    每次 yield 返回一页关注列表 page_rels，列表中每项为字典，格式如下：
      {
        'uid': '用户ID',
        'nickname': '用户昵称',
        'followers_count': 整型粉丝数,
        'relation': 'following'  # 关注关系标记
      }
    """

    def __init__(self, cookie, user_id, max_pages=20, delay_range=(0.2, 0.5)):
        self.cookie = cookie  # 登录 cookie
        self.user_id = user_id  # 目标用户ID
        self.base_url = f'https://weibo.cn/{user_id}/follow'  # 关注列表基础URL
        self.max_pages = max_pages  # 最大爬取页数
        self.delay_range = delay_range  # 请求延时范围（秒）

    def extract_follow_list(self):
        # 开始提示
        yield f'准备开始挖掘用户 {self.user_id} 的关注列表\n'

        for page in range(1, self.max_pages + 1):
            # 随机等待一段时间，防止请求过快被封禁
            wait = random.uniform(*self.delay_range)
            yield f'等待 {wait:.2f}s 开始获取第 {page} 页\n'
            time.sleep(wait)

            # 构造当前页 URL
            url = f'{self.base_url}?page={page}'

            # 请求页面并解析 HTML
            selector = handle_html(self.cookie, url)

            # 每个关注用户的信息对应一个 <table> 标签
            entries = selector.xpath('//table')

            # 如果当前页无数据，结束爬取
            if not entries:
                yield f'第 {page} 页无更多关注，结束。\n'
                break

            page_rels = []
            for tb in entries:
                try:
                    # -------- 提取个人主页 URL 与 uid ----------
                    a_tag = tb.xpath('.//td[2]/a')[0]  # 获取昵称链接 <a>
                    profile_url = a_tag.xpath('./@href')[0]  # 获取 href 属性
                    parsed = urlparse(profile_url)
                    qs = parse_qs(parsed.query)

                    # 优先从查询参数 uid 中获取用户ID
                    if 'uid' in qs and qs['uid']:
                        uid = qs['uid'][0]
                    else:
                        # 若无 uid 参数，尝试从路径中解析
                        path = parsed.path.strip('/')
                        uid = path.split('/', 1)[1] if path.startswith('u/') else path

                    # -------- 提取昵称 ----------
                    nickname = a_tag.xpath('string(.)').strip()

                    # -------- 提取粉丝数文本并转换为整数 ----------
                    # 粉丝数通常在昵称后面的文本节点，如："粉丝31.9万人"
                    txt = tb.xpath('.//td[2]/text()')
                    followers_count = 0
                    if txt:
                        txt = txt[0].strip()
                        # 匹配数字（可能有小数点）和“万”单位
                        m = re.search(r'([\d\.]+)(万)?人', txt)
                        if m:
                            num = float(m.group(1))
                            if m.group(2) == '万':
                                num *= 10000
                            followers_count = int(num)

                    # 组装单个关注用户数据
                    page_rels.append({
                        'uid': uid,
                        'nickname': nickname,
                        'followers_count': followers_count,
                        'relation': 'following'
                    })
                except Exception as e:
                    # 解析某条数据失败，记录警告并继续
                    yield f'警告：第 {page} 页解析条目失败: {e}\n'
                    continue

            # 返回该页所有关注用户数据列表
            yield page_rels
