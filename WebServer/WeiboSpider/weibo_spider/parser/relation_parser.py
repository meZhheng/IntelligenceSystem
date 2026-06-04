from .util import handle_html
from typing import Literal, List
import re
from ..interaction import Interaction
from datetime import datetime, timezone
from lxml import etree
import html

class InteractionIndexParser:
    # 初始化方法，传入 cookie、微博ID 以及 mode（评论热点、转发或点赞）
    def __init__(self, cookie, weibo_id, mode: Literal['comment/hot', 'repost', 'attitude']):
        # 存储 cookie，用于身份验证等请求头
        self.cookie = cookie
        
        # 根据传入的 mode 和微博ID 拼接目标页面的 URL
        self.url = 'https://weibo.cn/%s/%s' % (mode, weibo_id)
        
        # 调用 handle_html 函数，使用 cookie 访问 URL 并返回页面解析器对象
        self.selector = handle_html(self.cookie, self.url)

    # 获取当前微博关系数据的总页数，返回整数类型
    def get_page_num(self) -> int:
        """获取关系总页数"""
        
        # 1) xpath 选择器中使用“//…//div”，匹配任意层级的 div，而不仅限于直接子节点
        # 选择 class 为 'pa' 且 id 为 'pagelist' 的 div 内所有子孙 div 的文本内容，存成列表
        pagelist_texts = self.selector.xpath(
            "//div[@class='pa' and @id='pagelist']//div/text()"
        )
        
        # 遍历所有获取到的文本
        for text in pagelist_texts:
            text = text.strip()  # 去除首尾空白
            
            # 文本有时包含“下页”，这里用正则匹配格式如 “当前页数 / 总页数 页”的字符串
            # 例如： "1 / 10页" 提取总页数 10
            m = re.search(r'(\d+)\s*/\s*(\d+)页', text)
            if m:
                # 返回匹配到的总页数，转为整数
                return int(m.group(2))
        
        # 如果没有匹配到分页信息，说明只有一页，返回1
        return 1


class InteractionParser:
    # 初始化方法，传入 cookie、微博ID、链接类型（评论热点、转发、点赞）和页码
    def __init__(self, cookie, weibo_id, link: Literal['comment/hot', 'repost', 'attitude'], page):
        self.cookie = cookie  # 保存 cookie，用于请求验证
        self.weibo_id = weibo_id  # 保存微博ID
        # 拼接对应页码的微博互动页面 URL
        self.url = 'https://weibo.cn/%s/%s?page=%s' % (link, weibo_id, page)
        # 使用 handle_html 请求页面并返回解析器对象
        self.selector = handle_html(self.cookie, self.url)
    
    @staticmethod
    def parse_publish_time(timestr: str) -> datetime:
        """
        将微博页的发布时间字符串解析为 datetime 对象：
        - 如果是完整时间戳（格式如 '2024-08-25 17:51:07' 或 '2024-09-26 16:44:05'），直接按 "%Y-%m-%d %H:%M:%S" 解析；
        - 如果格式为 '今天 HH:MM'，则取当天日期并解析对应时间；
        - 如果格式为 '06月12日 18:33'，补当前年份解析；
        - 还支持无秒英文时间戳 '2024-08-25 17:51'，自动补秒解析；
        - 其他格式不匹配时，抛出解析异常。
        """
        timestr = timestr.strip()  # 去除字符串首尾空白

        # 1. 标准带秒的完整时间戳
        m1 = re.match(r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})$', timestr)
        if m1:
            return datetime.strptime(m1.group(1), "%Y-%m-%d %H:%M:%S")

        # 2. “今天 HH:MM” 格式，取当前年月日并填充时间
        m_today = re.match(r'^今天\s*(\d{2}):(\d{2})$', timestr)
        if m_today:
            now = datetime.now()
            hour, minute = map(int, m_today.groups())
            return datetime(now.year, now.month, now.day, hour, minute)

        # 3. 中文“MM月DD日 HH:MM”格式，补当前年份解析
        m2 = re.match(r'^(\d{2})月(\d{2})日\s*(\d{2}):(\d{2})$', timestr)
        if m2:
            now = datetime.now()
            month, day, hour, minute = map(int, m2.groups())
            return datetime(now.year, month, day, hour, minute)

        # 4. 无秒英文时间戳 “YYYY-MM-DD HH:MM”，补充秒数后解析
        m3 = re.match(r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})$', timestr)
        if m3:
            return datetime.strptime(m3.group(1) + ":00", "%Y-%m-%d %H:%M:%S")

        # 5. 以上格式均不匹配，抛出异常
        raise ValueError(f"无法解析的发布时间格式: {timestr!r}")
    
    # 解析当前页的点赞互动，返回 Interaction 对象列表
    def get_relations_like(self) -> List[Interaction]:
        interactions: List[Interaction] = []

        # 通过 xpath 定位点赞列表 div，取 id 为 cmtfrm 的元素后的所有同级 class 为 c 的 div
        items = self.selector.xpath(
            '//div[@class="pms" and @id="cmtfrm"]/following-sibling::div[@class="c"]'
        )
        for item in items:
            # 1. 提取第一个 a 标签的 href 属性，判断是否为用户链接
            hrefs = item.xpath('./a/@href')
            href = hrefs[0] if hrefs else ''
            
            # 只处理格式为 /u/数字 的用户链接
            m = re.match(r'^/u/(\d+)$', href)
            if not m:
                # 非标准用户链接（如“返回用户xxx的微博”）跳过
                continue
            user_id = m.group(1)

            # 2. 提取用户名，取第一个 a 标签的文本内容，去除空白
            names = item.xpath('./a/text()')
            username = names[0].strip() if names else ''

            # 3. 提取发布时间文本，位于 span.ct 标签内
            times = item.xpath('./span[@class="ct"]/text()')
            if not times:
                continue
            raw_time = times[0].strip()
            # 解析发布时间字符串为 datetime 对象
            publish_time = self.parse_publish_time(raw_time)

            # 4. 构造 Interaction 对象并赋值
            interaction = Interaction()
            interaction.weibo_id = self.weibo_id
            interaction.user_id = user_id
            interaction.username = username
            interaction.interaction_type = 'like'  # 互动类型为点赞
            interaction.publish_time = publish_time

            # 加入结果列表
            interactions.append(interaction)

        return interactions


    def get_weibo_relation_retweet(self) -> List[Interaction]:
        interactions: List[Interaction] = []

        # 选取 class 为 "pms" 的 div 后面所有同级 class 为 "c" 的 div，代表每条转发记录
        items = self.selector.xpath(
            '//div[@class="pms"]/following-sibling::div[@class="c"]'
        )

        for item in items:
            # 跳过“返回我的首页”这类无关块
            
            # 1. 提取所有 a 标签的 href 属性
            hrefs = item.xpath('./a/@href')
            href0 = hrefs[0] if hrefs else ''
            
            # 只处理 href 完全匹配 "/纯数字" 的情况，否则跳过（这代表用户主页链接格式）
            if not re.match(r'^/\d+$', href0):
                continue

            # 解析用户 ID
            m = re.match(r'/(\d+)', href0)
            user_id = m.group(1) if m else ''

            # 解析用户名，取第一个 a 标签文本并去除空白
            names = item.xpath('./a[1]/text()')
            user_name = names[0].strip() if names else ''

            # 提取文本内容（转发内容）
            raw_texts = item.xpath('text()')
            content = ''
            for t in raw_texts:
                t = t.strip()
                # 过滤空字符串和以\xa0（不间断空格）开头的文本，取第一个有效内容
                if t and not t.startswith('\xa0'):
                    content = t
                    break

            # 提取点赞数，位于 span.cc 下的 a 标签文本，如 "[3]"
            like_texts = item.xpath('.//span[@class="cc"]/a/text()')
            like_text = like_texts[0] if like_texts else ''
            m2 = re.search(r'\[(\d+)\]', like_text)
            like_num = int(m2.group(1)) if m2 else 0

            # 解析时间和来源信息，位于 span.ct 标签内文本
            ct_texts = item.xpath('.//span[@class="ct"]/text()')
            ct = ct_texts[0].strip() if ct_texts else ''

            publish_time_str = ''
            source = ''

            # 5.1 完整带年份时间戳格式（可带“来自XXX”）
            m_full = re.match(r"^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})(?:\s*来自\s*(.*))?$", ct)
            if m_full:
                publish_time_str = m_full.group(1)
                source = (m_full.group(2) or "").strip()

            else:
                # 5.2 “今天 HH:MM” 格式
                m_today = re.match(r"^今天\s*(\d{2}):(\d{2})$", ct)
                if m_today:
                    now = datetime.now()
                    hour, minute = map(int, m_today.groups())
                    # 构造当前年月日，拼接时间
                    publish_time_str = f"{now.year}-{now.month:02d}-{now.day:02d} {hour:02d}:{minute:02d}:00"
                    source = ""

                else:
                    # 5.3 中文“MM月DD日 HH:MM [来自XXX]”格式
                    m_short = re.match(
                        r"^(\d{2})月(\d{2})日\s*(\d{2}):(\d{2})(?:\s*来自(.*))?$", 
                        ct
                    )
                    if m_short:
                        now = datetime.now()
                        mon, day, hh, mm, src = m_short.groups()
                        publish_time_str = f"{now.year}-{mon}-{day} {hh}:{mm}:00"
                        source = src.strip() if src else ""

            # -----------------------
            # 构造 Interaction 对象
            # -----------------------
            try:
                inter = Interaction()
                inter.weibo_id = self.weibo_id
                inter.user_id = user_id
                inter.username = user_name
                inter.interaction_type = 'retweet'  # 互动类型为转发
                inter.content = content
                inter.like_num = like_num
                # 调用已有的 parse_publish_time 函数解析发布时间字符串
                inter.publish_time = self.parse_publish_time(publish_time_str)
                inter.source = source

                interactions.append(inter)
            except Exception as e:
                # 捕获异常并打印错误信息及对应 HTML，方便调试
                print(f"处理微博交互记录时出错：{e}")
                html = etree.tostring(item, encoding='unicode', pretty_print=True)
                print("HTML:\n", html)

        return interactions

    def get_weibo_relation_comment(self) -> List[Interaction]:
        interactions: List[Interaction] = []

        # 1. 选出所有 id 以 "C_" 开头的 div，代表评论块
        comment_divs = self.selector.xpath("//div[@class='c' and starts-with(@id,'C_')]")
        for div in comment_divs:
            # 2. 提取用户ID和用户名
            hrefs = div.xpath("./a[1]/@href")  # 第一个 a 标签的 href
            href = hrefs[0] if hrefs else ""
            m = re.match(r"/u/(\d+)", href)  # 匹配 /u/后跟数字的格式
            user_id = m.group(1) if m else ""
            names = div.xpath("./a[1]/text()")  # 第一个 a 标签的文本（用户名）
            user_name = names[0].strip() if names else ""

            # 3. 提取评论内容，保留链接文字，去掉所有 HTML 标签
            ctt_nodes = div.xpath("./span[@class='ctt']")
            if ctt_nodes:
                ctt_node = ctt_nodes[0]
                raw_text = "".join(ctt_node.itertext()).strip()  # 获取所有子节点文本并拼接
                content = html.unescape(raw_text)  # 转义HTML实体为正常字符
            else:
                content = ""

            # 4. 点赞数，取第一个 span.cc 下的 a 标签文本，如 "[3]"
            like_texts = div.xpath(".//span[@class='cc'][1]/a/text()")
            like_text = like_texts[0] if like_texts else ""
            m2 = re.search(r"\[(\d+)\]", like_text)
            like_num = int(m2.group(1)) if m2 else 0

            # 5. 提取时间和来源文本，位于 span.ct 标签
            ct_texts = div.xpath(".//span[@class='ct']/text()")
            ct = ct_texts[0].strip() if ct_texts else ""
            publish_time_str = ""
            source = ""

            # 5.1 带或不带“来自”的完整时间戳，如：
            # "2024-09-10 18:45:23 来自iPhone客户端"
            m_full = re.match(
                r"^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})"
                r"(?:\s*来自|\s+)"
                r"(.+)$",
                ct
            )
            if m_full:
                publish_time_str = m_full.group(1)
                source = m_full.group(2).strip()

            else:
                # 5.2 “今天 HH:MM” 格式
                m_today = re.match(r"^今天\s*(\d{2}):(\d{2})$", ct)
                if m_today:
                    now = datetime.now()
                    hour, minute = map(int, m_today.groups())
                    publish_time_str = f"{now.year}-{now.month:02d}-{now.day:02d} {hour:02d}:{minute:02d}:00"
                    source = ""

                else:
                    # 5.3 “MM月DD日 HH:MM 来自XXX” 或 “MM月DD日 HH:MM XXX” 格式
                    m_short = re.match(
                        r"^(\d{2})月(\d{2})日\s*(\d{2}:\d{2})"
                        r"(?:\s*来自|\s+)"
                        r"(.+)$",
                        ct
                    )
                    if m_short:
                        now = datetime.now()
                        mon, day, hm, src = m_short.groups()
                        publish_time_str = f"{now.year}-{mon}-{day} {hm}:00"
                        source = src.strip()

            # 7. 构造 Interaction 对象并填充字段
            try:
                inter = Interaction()
                inter.weibo_id          = self.weibo_id
                inter.user_id           = user_id
                inter.username          = user_name
                inter.interaction_type  = 'comment'  # 标记互动类型为评论
                inter.content           = content
                inter.like_num          = like_num
                inter.source            = source
                inter.publish_time      = self.parse_publish_time(publish_time_str)

            except Exception as e:
                # 捕获异常，打印错误及对应 HTML，方便调试
                print(f"处理微博交互记录时出错：{e}")
                error_text = etree.tostring(div, encoding='unicode', pretty_print=True)
                print("HTML:\n", error_text)

            interactions.append(inter)

        return interactions
