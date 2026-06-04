import re
from .parser import Parser
from urllib.parse import urlparse, parse_qs
from .util import handle_html
import time
import random

class FansParser(Parser):
    """
    获取用户粉丝列表，支持翻页（最大 max_pages 页，每页最多 10 条粉丝）。
    在每次请求前会随机延时，减少请求频率防止被封禁。
    
    返回格式：
    每次 yield 返回一页粉丝数据列表 page_rels，列表中每项是字典，格式如下：
      {
        'uid': '用户ID',
        'nickname': '用户昵称',
        'followers_count': 整型粉丝数,
        'relation': 'fans'  # 表示关系类型为粉丝
      }
    """

    def __init__(self, cookie, user_id, max_pages=20, delay_range=(0.2, 0.5)):
        self.cookie = cookie  # 登录所需 Cookie
        self.user_id = user_id  # 目标用户ID
        self.base_url = f'https://weibo.cn/{user_id}/fans'  # 粉丝列表基础链接
        self.max_pages = max_pages  # 最大爬取页数
        self.delay_range = delay_range  # 请求间隔随机时间范围（秒）

    def extract_fans_list(self):
        # 开始提示
        yield f'准备开始挖掘用户 {self.user_id} 的粉丝列表\n'

        for page in range(1, self.max_pages + 1):
            # 随机等待，防止爬虫过快被封
            wait = random.uniform(*self.delay_range)
            yield f'等待 {wait:.2f}s 开始获取第 {page} 页\n'
            time.sleep(wait)

            # 拼接当前页 URL
            url = f'{self.base_url}?page={page}'

            # 请求页面并解析
            selector = handle_html(self.cookie, url)

            # 每条粉丝信息对应一个 <table> 标签
            entries = selector.xpath('//table')

            # 如果本页没有内容，说明翻页结束，跳出循环
            if not entries:
                yield f'第 {page} 页无更多粉丝，结束。\n'
                break

            page_rels = []
            for tb in entries:
                try:
                    # -------- 提取粉丝的个人主页链接及 uid ----------
                    a_tag = tb.xpath('.//td[2]/a')[0]  # 粉丝昵称链接
                    profile_url = a_tag.xpath('./@href')[0]  # 获取 href 属性

                    # 解析 URL，获取 uid
                    parsed = urlparse(profile_url)
                    qs = parse_qs(parsed.query)

                    # 优先从查询参数 uid 获取
                    if 'uid' in qs and qs['uid']:
                        uid = qs['uid'][0]
                    else:
                        # 兼容路径格式，如 /u/12345678
                        path = parsed.path.strip('/')
                        uid = path.split('/', 1)[1] if path.startswith('u/') else path

                    # -------- 提取昵称 ----------
                    nickname = a_tag.xpath('string(.)').strip()

                    # -------- 提取粉丝数文本并转换为整数 ----------
                    # 粉丝数文本一般在昵称后面，如 "粉丝304.9万人"
                    txt = tb.xpath('.//td[2]/text()')
                    followers_count = 0
                    if txt:
                        txt = txt[0].strip()
                        # 匹配数字，可能带小数，可能带“万”
                        m = re.search(r'([\d\.]+)(万)?人', txt)
                        if m:
                            num = float(m.group(1))
                            if m.group(2) == '万':
                                num *= 10000
                            followers_count = int(num)

                    # 组装该粉丝数据
                    page_rels.append({
                        'uid': uid,
                        'nickname': nickname,
                        'followers_count': followers_count,
                        'relation': 'fans'
                    })
                except Exception as e:
                    # 某条粉丝信息解析异常，记录警告继续执行
                    yield f'警告：第 {page} 页解析粉丝条目失败: {e}\n'
                    continue

            # 返回当前页所有粉丝数据
            yield page_rels
