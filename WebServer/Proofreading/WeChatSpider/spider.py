import time, random, requests, json
from typing import List, Dict, Optional
from .playwright_download import _save_page_mhtml, _save_with_http_article_body
import asyncio
from flask import current_app
    
class FetchArticleError(RuntimeError):
    pass

class SPider_PA:
    def __init__(self, token, fingerprint, cookie,
                 fakeid = None,
                 min_interval: float = 1.5,
                 max_requests: int = 20,
                 cooldown_range: tuple[float, float] = (3.0, 8.0),
                 page_wait_every: int = 3,
                 page_wait_range: tuple[float, float] = (2.0, 5.0)):
        """
        初始化 SPider_PA 爬虫实例。

        参数：
        - fakeid: 公众号的 fakeid，用于标识目标公众号。
        - token: 登录后获取的 token，用于请求认证。
        - fingerprint: 指纹信息，来自页面参数。
        - cookie: 请求头中的 Cookie，用于认证会话。
        - min_interval: 两次请求之间的最小间隔（单位：秒），防止过于频繁。
        - max_requests: 达到此请求数后触发冷却，避免被封。
        - cooldown_range: 每次冷却的随机等待区间（单位：秒）。
        - page_wait_every: 列表抓取每隔多少页随机等待一次。
        - page_wait_range: 按页随机等待区间（单位：秒）。
        """

        # —— 请求基本参数与身份信息 ——
        self.fakeid = fakeid
        self.token = token
        self.fingerprint = fingerprint
        self.cookie = cookie

        # 请求参数配置（GET 请求参数）
        self.params = {
            "sub": "list",                          # 表示查询子类型为“列表”
            "search_field": "null",                 # 搜索字段（此处无指定）
            "begin": 0,                             # 查询起始位置
            "count": 5,                             # 每次拉取的数量
            "query": "",                            # 查询关键字（为空表示全部）
            "fakeid": fakeid,                       # 当前公众号的 fakeid
            "type": "101_1",                        # 类型（图文/视频/其他）
            "free_publish_type": 1,                 # 发布类型（自由发布）
            "sub_action": "list_ex",                # 子操作，扩展列表
            "fingerprint": fingerprint,             # 页面指纹，用于防刷识别
            "token": token,                         # 登录 token
            "lang": "zh_CN",                        # 接口语言
            "f": "json",                            # 返回格式
            "ajax": 1                               # 是否异步请求
        }

        # 请求头配置
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) "
                          "Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0",
            "Accept": "*/*",
            "Accept-Language": "zh-CN,zh;q=0.9",
            "Referer": f"https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&token={token}&lang=zh_CN",
            "X-Requested-With": "XMLHttpRequest",  # 标明是 AJAX 请求
            "Cookie": cookie,                      # Cookie 信息（必须包含认证信息）
        }

        # —— 调速与请求控制相关配置 ——
        self.min_interval = min_interval           # 两次请求之间的最小时间间隔（防止频繁访问）
        self.request_count = 0                     # 当前已连续发出的请求数量
        self.max_requests = max_requests           # 达到此数量后进行冷却
        self.cooldown_range = cooldown_range       # 冷却等待时间的随机范围（防止模式识别）
        self.page_wait_every = page_wait_every
        self.page_wait_range = page_wait_range
        self.publish_list_request_count = 0
        self.last_request = 0.0                    # 上一次请求的时间戳（用于计算间隔）

    def _throttle(self):
        """内部节流器：
        1) 保证每次请求之间至少间隔 min_interval 秒；
        2) 若请求数量达到上限 max_requests，则进入冷却期 cooldown。
        """

        now = time.time()  # 获取当前时间戳（单位：秒）
        since = now - self.last_request  # 距离上一次请求的时间间隔
        self.request_count += 1  # 当前连续请求次数加一

        # —— 节流逻辑 1：请求间隔不足时，等待 ——  
        if since < self.min_interval:
            jitter = random.uniform(0, 0.5)  # 添加随机抖动，避免多个实例并发造成节奏一致
            wait = (self.min_interval - since) + jitter  # 计算需要等待的时间
            current_app.logger.info(f"[节流] 上次请求距今只有{since:.2f}s，需再等待{wait:.2f}s")
            time.sleep(wait)  # 阻塞等待一段时间以满足最小间隔要求

        # —— 节流逻辑 2：达到请求上限后强制冷却 ——
        if self.request_count >= self.max_requests:
            cd = random.uniform(*self.cooldown_range)  # 从冷却区间中随机选择冷却时间
            current_app.logger.info(f"[冷却] 已连续发送{self.request_count}次请求，强制冷却{cd:.2f}s")
            time.sleep(cd)  # 进入冷却期，暂停请求
            self.request_count = 0  # 重置请求计数

        # 记录本次请求时间，用于下一次节流判断
        self.last_request = time.time()

    def _wait_after_publish_page(self):
        self.publish_list_request_count += 1
        if self.page_wait_every <= 0:
            return
        if self.publish_list_request_count % self.page_wait_every != 0:
            return

        wait = random.uniform(*self.page_wait_range)
        current_app.logger.info(f"[分页等待] 已抓取{self.publish_list_request_count}页，随机等待{wait:.2f}s")
        time.sleep(wait)

    # 验证返回结果中的cookie是否有效
    def cookie_validation(self, response):
        # 如果 ret 为 0，说明响应成功，cookie有效
        if response['base_resp']['ret'] == 0:
            return True
        else:
            # 否则打印错误信息，并返回 False
            print("cookie验证失败：", response['base_resp'])
            return False

    # 获取发布文章列表（分页），每次获取 count 篇文章，从 begin 开始
    def fetch_publish_list(self, begin, count=5):
        # —— 节流操作，防止请求频率过高（可能涉及sleep或时间控制） ——
        self._throttle()

        # 设置请求参数：起始位置和获取数量
        self.params['begin'] = begin
        self.params['count'] = count

        # 发起 GET 请求，请求微信公众号发布文章列表接口
        resp = requests.get(
            "https://mp.weixin.qq.com/cgi-bin/appmsgpublish", 
            params=self.params, headers=self.headers, timeout=10
        )
        
        # 如果响应失败，抛出异常（如 404/500 等），不再继续
        resp.raise_for_status()

        # 将响应数据解析为 JSON 格式
        outer = resp.json()

        # 如果 cookie 验证通过
        if self.cookie_validation(outer):
            # 解析响应中的 publish_page 字段（是一个 JSON 字符串），转为字典
            publish_page = json.loads(outer["publish_page"])

            # 获取文章总数和当前页的文章列表
            total_count = publish_page["total_count"]
            publish_list = publish_page["publish_list"]
            self._wait_after_publish_page()
            return total_count, publish_list
        else:
            # cookie 验证失败，返回 None
            return None, None

    # 获取文章详情页的内容（默认 request 轻量正文，必要时回退 Playwright/MHTML）
    def fetch_article_content(
        self,
        link: str,
        cookies: Optional[List[dict]] = None,
        fetch_images: bool = False,
        crawl_mode: str = "request",
        playwright_fallback: bool = True,
    ) -> bytes:
        """
        同步接口，创建一个新的 event loop 执行抓取并确保关闭 loop。
        会把内部所有异常转换/透传为 FetchArticleError（保留原始异常链）。
        """
        # 节流
        self._throttle()

        if crawl_mode not in {"request", "auto", "playwright"}:
            raise FetchArticleError(f"不支持的 crawl_mode: {crawl_mode}")

        loop = None
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            if crawl_mode in {"request", "auto"}:
                try:
                    return loop.run_until_complete(
                        asyncio.wait_for(
                            _save_with_http_article_body(link, cookies=cookies, cookie_header=self.cookie),
                            timeout=45
                        )
                    )
                except Exception as request_exc:
                    if not playwright_fallback:
                        raise request_exc
                    current_app.logger.warning(
                        "HTTP 轻量正文抓取失败，回退 Playwright：url=%s, err=%s",
                        link,
                        request_exc,
                    )

            return loop.run_until_complete(
                asyncio.wait_for(
                    _save_page_mhtml(link, cookies=cookies, fetch_images=fetch_images),
                    timeout=150
                )
            )
        except Exception as e:
            # 包装异常以便外层更容易识别来源，但保留原始异常
            raise FetchArticleError(f"fetch_article_content 失败，url={link}: {e}") from e
        finally:
            try:
                if loop and not loop.is_closed():
                    loop.close()
            except Exception as close_exc:
                current_app.logger.warning(f"关闭 event loop 时出错：{close_exc}")
            # 清理当前线程的事件循环引用（谨慎）
            try:
                asyncio.set_event_loop(None)
            except Exception:
                pass

    def fetch_affiliation_list(self, query: str, page: int) -> List[Dict[str, str]]:
        # —— 节流操作，防止请求频率过高（可能涉及sleep或时间控制） ——
        self._throttle()

        per_page = 5
        # 设置请求参数：起始位置和获取数量
        self.params['begin'] = (page - 1) * per_page
        self.params['count'] = per_page
        self.params['action'] = 'search_biz'
        self.params['query'] = query
        
        # 发起 GET 请求，请求微信公众号发布文章列表接口
        resp = requests.get(
            "https://mp.weixin.qq.com/cgi-bin/searchbiz", 
            params=self.params, headers=self.headers, timeout=10
        )
        
        # 如果响应失败，抛出异常（如 404/500 等），不再继续
        resp.raise_for_status()

        # 将响应数据解析为 JSON 格式
        outer = resp.json()

        # 如果 cookie 验证通过
        if self.cookie_validation(outer):
            affiliation_list = outer["list"]
            total = outer["total"]

            return total == 5, affiliation_list
        else:
            # cookie 验证失败，返回 None
            return None, None