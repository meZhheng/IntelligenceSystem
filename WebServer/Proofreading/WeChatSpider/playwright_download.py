import logging
import asyncio
import nest_asyncio
from typing import Optional, List
from playwright.async_api import async_playwright, Error as PlaywrightError
from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from flask import current_app
import urllib.parse
import re
import html
import httpx
from bs4 import BeautifulSoup

# 给已运行的事件循环打补丁，允许嵌套运行异步代码
nest_asyncio.apply()

# 降低 Playwright 日志等级，避免输出过多信息
playwright_logger = logging.getLogger('playwright')
playwright_logger.setLevel(logging.WARNING)


def _cookies_to_dict(cookies: Optional[List[dict]]) -> dict:
    cookie_dict = {}
    if cookies:
        for cookie in cookies:
            if 'name' in cookie and 'value' in cookie:
                cookie_dict[cookie['name']] = cookie['value']
    return cookie_dict


def _extract_js_string_after_key(source: str, key: str) -> str:
    match = re.search(rf'(?<![\w$])(?:["\']{re.escape(key)}["\']|{re.escape(key)})\s*[:=]', source)
    if not match:
        raise RuntimeError(f"未找到 {key}")

    index = match.end()
    while index < len(source) and source[index].isspace():
        index += 1

    if index >= len(source) or source[index] not in ("'", '"'):
        raise RuntimeError(f"{key} 不是 JS 字符串")

    quote = source[index]
    index += 1
    value = []
    escaped = False

    while index < len(source):
        char = source[index]
        if escaped:
            value.append('\\' + char)
            escaped = False
        elif char == '\\':
            escaped = True
        elif char == quote:
            return ''.join(value)
        else:
            value.append(char)
        index += 1

    raise RuntimeError(f"{key} 字符串未闭合")


def _decode_js_string(value: str) -> str:
    result = []
    index = 0
    simple_escapes = {
        'b': '\b',
        'f': '\f',
        'n': '\n',
        'r': '\r',
        't': '\t',
        'v': '\v',
        '0': '\0',
        '"': '"',
        "'": "'",
        '\\': '\\',
        '/': '/',
    }

    while index < len(value):
        char = value[index]
        if char != '\\':
            result.append(char)
            index += 1
            continue

        index += 1
        if index >= len(value):
            result.append('\\')
            break

        escape = value[index]
        index += 1

        if escape == 'x' and index + 2 <= len(value):
            hex_value = value[index:index + 2]
            if re.fullmatch(r'[0-9a-fA-F]{2}', hex_value):
                result.append(chr(int(hex_value, 16)))
                index += 2
                continue
            result.append('\\x')
            continue

        if escape == 'u' and index + 4 <= len(value):
            hex_value = value[index:index + 4]
            if re.fullmatch(r'[0-9a-fA-F]{4}', hex_value):
                codepoint = int(hex_value, 16)
                index += 4
                if 0xD800 <= codepoint <= 0xDBFF and value[index:index + 2] == '\\u':
                    low_hex = value[index + 2:index + 6]
                    if re.fullmatch(r'[0-9a-fA-F]{4}', low_hex):
                        low = int(low_hex, 16)
                        if 0xDC00 <= low <= 0xDFFF:
                            codepoint = 0x10000 + ((codepoint - 0xD800) << 10) + (low - 0xDC00)
                            index += 6
                result.append(chr(codepoint))
                continue
            result.append('\\u')
            continue

        result.append(simple_escapes.get(escape, escape))

    return ''.join(result)


def _extract_article_title(page_html: str) -> str:
    try:
        title = _decode_js_string(_extract_js_string_after_key(page_html, 'title'))
        title = html.unescape(title).strip()
        if title:
            return title
    except Exception:
        pass

    soup = BeautifulSoup(page_html, 'html.parser')
    title_tag = soup.find(id='activity-name')
    if title_tag:
        return title_tag.get_text(strip=True)

    meta_title = soup.find('meta', attrs={'property': 'og:title'})
    if meta_title and meta_title.get('content'):
        return meta_title['content'].strip()

    if soup.title and soup.title.string:
        return soup.title.string.strip()

    return ''


def _replace_images_with_placeholders(soup: BeautifulSoup) -> None:
    for img in soup.find_all('img'):
        placeholder = soup.new_tag('span')
        placeholder['style'] = 'display:inline-block; white-space:nowrap;'
        placeholder.string = '【图片】'
        img.replace_with(placeholder)


def _remove_hidden_nodes(soup: BeautifulSoup) -> None:
    for tag in list(soup.find_all(style=True)):
        style = re.sub(r'\s+', '', tag.get('style', '').lower())
        if 'display:none' in style or 'visibility:hidden' in style:
            tag.decompose()


async def _save_with_http_article_body(
    url: str,
    cookies: Optional[List[dict]] = None,
    cookie_header: Optional[str] = None
) -> bytes:
    cookie_dict = _cookies_to_dict(cookies)
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0",
        "Referer": "https://mp.weixin.qq.com/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
    }
    if cookie_header:
        headers["Cookie"] = cookie_header

    try:
        async with httpx.AsyncClient(
            headers=headers,
            cookies={} if cookie_header else cookie_dict,
            follow_redirects=True,
            timeout=httpx.Timeout(30.0, connect=10.0)
        ) as client:
            response = await client.get(url)
            response.raise_for_status()

        page_html = response.text
        if 'mp.weixin.qq.com/safe' in str(response.url) or 'mp.weixin.qq.com/login' in str(response.url) or '登录' in page_html[:2000]:
            raise RuntimeError(f"HTTP 获取被重定向到登录页，当前 url={response.url}")

        content_raw = _extract_js_string_after_key(page_html, 'content_noencode')
        content_html = _decode_js_string(content_raw)
        content_soup = BeautifulSoup(content_html, 'html.parser')
        _remove_hidden_nodes(content_soup)
        _replace_images_with_placeholders(content_soup)

        body_text = html.unescape(content_soup.get_text('', strip=True)).replace('【图片】', '').strip()
        if len(body_text) < 20:
            raise RuntimeError("content_noencode 正文文本过短")

        title = _extract_article_title(page_html)
        rendered = (
            '<!doctype html><html><head><meta charset="utf-8">'
            f'<title>{html.escape(title)}</title>'
            '</head><body id="activity-detail">'
            f'<h1 id="activity-name">{html.escape(title)}</h1>'
            f'<div id="js_content">{str(content_soup)}</div>'
            '</body></html>'
        )
        return rendered.encode('utf-8')
    except Exception as e:
        raise RuntimeError(f"HTTP 轻量正文获取失败: {e}") from e


async def _save_page_mhtml(url: str, cookies: Optional[List[dict]] = None, fetch_images: bool = False) -> bytes:
    """
    智能网页快照获取：优先使用 Playwright 生成 MHTML，支持多级失败重试。

    重试策略：
    1. 默认无图模式：拦截图片请求，页面内替换为【图片】占位符
    2. fetch_images=True 时优先使用正常模式，完整浏览器渲染并包含图片资源
    3. HTTP 模式：直接 HTTP 请求获取原始 HTML（绕过浏览器渲染，应对反爬或浏览器限制）

    返回: MHTML 或 HTML 的 bytes；所有层级失败则抛出最后一个异常
    """
    last_exception = None
    attempts = []
    if fetch_images:
        attempts.append(("正常模式", False))
    attempts.append(("无图模式（忽略图片）", True))

    for index, (label, skip_images) in enumerate(attempts, start=1):
        try:
            logging.info(f"[{index}/{len(attempts) + 1}] 尝试{label}获取: {url}")
            return await _save_with_playwright(url, cookies, skip_images=skip_images)
        except Exception as e:
            last_exception = e
            logging.warning(f"{label}失败: {e}")

    # ========== 最后尝试：HTTP 直连 ==========
    try:
        logging.info(f"[{len(attempts) + 1}/{len(attempts) + 1}] 尝试 HTTP 直接获取: {url}")
        return await _save_with_http(url, cookies)
    except Exception as e:
        last_exception = e
        logging.error(f"HTTP 模式也失败: {e}")

    # 全部失败，抛出最后一次异常
    raise RuntimeError(f"所有获取方式均失败（已尝试 Playwright 正常/无图模式 + HTTP 直连）: {last_exception}") from last_exception


async def _save_with_playwright(
    url: str, 
    cookies: Optional[List[dict]] = None, 
    skip_images: bool = False
) -> bytes:
    """
    Playwright 核心实现。支持 skip_images 模式：拦截图片请求并替换为占位符。
    """
    browser = None
    context = None
    page = None
    client = None
    
    try:
        async with async_playwright() as p:
            # 启动浏览器
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--disable-software-rasterizer",
                    "--disable-features=IsolateOrigins,site-per-process",
                ]
            )
            
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0",
                extra_http_headers={"Referer": "https://mp.weixin.qq.com/"}
            )
            
            if cookies:
                await context.add_cookies(cookies)
            
            page = await context.new_page()
            
            # ========== 无图模式：拦截图片请求 ==========
            if skip_images:
                # 拦截常见图片格式请求，直接中止（节省带宽和时间）
                await page.route(
                    "**/*.{png,jpg,jpeg,gif,webp,svg,bmp,ico,avif}", 
                    lambda route: route.abort("blockedbyclient")
                )
            
            # 辅助函数：安全执行 JS
            async def safe_evaluate(script: str, timeout=30):
                last_exc = None
                for attempt in range(2):
                    try:
                        return await asyncio.wait_for(
                            page.evaluate(script),
                            timeout=timeout
                        )
                    except Exception as e:
                        last_exc = e
                        logging.warning(f"safe_evaluate 第{attempt+1}次失败: {e}; 将重试")
                        await asyncio.sleep(0.5)
                raise RuntimeError(f"safe_evaluate 失败: {last_exc}") from last_exc
            
            # 导航
            await page.goto(url, timeout=60_000, wait_until="domcontentloaded")
            
            # 检查是否被重定向到登录页
            current = page.url
            if 'mp.weixin.qq.com/safe' in current or 'mp.weixin.qq.com/login' in current:
                raise RuntimeError(f"页面被重定向到登录/安全页，请检查 Cookie 是否有效，当前 url={current}")
            
            # ========== 无图模式：DOM 替换图片为占位符 ==========
            if skip_images:
                await safe_evaluate('''() => {
                    document.querySelectorAll('img').forEach(img => {
                        // 创建占位符元素
                        const placeholder = document.createElement('span');
                        placeholder.textContent = '【图片】';
                        placeholder.style.cssText = 'display:inline-block; white-space:nowrap; padding:8px 12px; margin:4px; border:1px dashed #ccc; background:#f5f5f5; color:#666; font-size:14px; border-radius:4px;';
                        placeholder.setAttribute('data-original-src', img.src || '');
                        placeholder.setAttribute('data-alt', img.alt || '');
                        
                        // 替换原图片
                        if (img.parentNode) {
                            img.parentNode.replaceChild(placeholder, img);
                        }
                    });
                    
                    // 也处理背景图片元素（可选）
                    document.querySelectorAll('[style*="background-image"]').forEach(el => {
                        el.style.backgroundImage = 'none';
                        el.style.backgroundColor = '#f0f0f0';
                    });
                }''')
            else:
                # 正常模式：处理懒加载图片
                try:
                    await safe_evaluate('''() => {
                        document.querySelectorAll('img[data-src]').forEach(img =>
                            img.src = img.getAttribute('data-src')
                        );
                    }''')
                except Exception as e:
                    raise RuntimeError(f"替换懒加载 img[data-src] 失败: {e}") from e
                
                # 等待图片加载（仅正常模式）
                try:
                    await asyncio.wait_for(
                        page.evaluate("""() => Promise.all(
                            Array.from(document.images)
                                .filter(img => img.src && !img.src.startsWith('data:'))
                                .map(img => new Promise(resolve => {
                                    if (img.complete) return resolve();
                                    img.addEventListener('load', resolve, { once: true });
                                    img.addEventListener('error', resolve, { once: true });
                                    setTimeout(resolve, 5000);
                                }))
                        )"""),
                        timeout=60
                    )
                except asyncio.TimeoutError:
                    logging.warning("等待图片加载总体超时，继续抓取")
            
            # 滚动触发懒加载（文字内容）
            await safe_evaluate('''async () => {
                const total = Math.max(
                    document.documentElement.scrollHeight || 0,
                    document.body.scrollHeight || 0
                );
                const vh = window.innerHeight || document.documentElement.clientHeight || 0;
                const step = Math.max(1, Math.floor(vh));
                
                if (!total || vh <= 0) {
                    window.dispatchEvent(new Event('scroll'));
                    await new Promise(r => setTimeout(r, 150));
                    return;
                }
                
                if (total <= vh) {
                    window.scrollBy(0, 1);
                    await new Promise(r => setTimeout(r, 150));
                    window.scrollTo(0, 0);
                    return;
                }
                
                for (let pos = 0; pos < total; pos += step) {
                    window.scrollTo(0, pos);
                    await new Promise(r => setTimeout(r, 150));
                }
                window.scrollTo(0, total);
                await new Promise(r => setTimeout(r, 200));
                window.scrollTo(0, 0);
            }''')
            
            # 等待网络空闲
            await page.wait_for_load_state("networkidle", timeout=30_000 if skip_images else 60_000)
            
            # 通过 CDP 抓取 MHTML
            client = await context.new_cdp_session(page)
            snapshot = await client.send('Page.captureSnapshot', {'format': 'mhtml'})
            
            mhtml = snapshot.get('data', '')
            if not mhtml:
                raise RuntimeError("抓取到的 MHTML 内容为空")
            
            return mhtml.encode('utf-8') if isinstance(mhtml, str) else mhtml
            
    except Exception:
        # 直接抛出，让上层重试逻辑处理
        raise
    finally:
        # 确保资源释放
        try:
            if client:
                await client.detach()
            if page:
                await page.close()
            if context:
                await context.close()
            if browser:
                await browser.close()
        except Exception:
            pass


async def _save_with_http(url: str, cookies: Optional[List[dict]] = None) -> bytes:
    """
    HTTP 直连备选方案：使用 httpx 直接获取页面 HTML。
    返回原始 HTML bytes（非 MHTML 格式），render_mhtml_inline 会将其识别为单部分消息处理。
    """
    cookie_dict = {}
    if cookies:
        for cookie in cookies:
            if 'name' in cookie and 'value' in cookie:
                cookie_dict[cookie['name']] = cookie['value']
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0",
        "Referer": "https://mp.weixin.qq.com/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
    }
    
    try:
        async with httpx.AsyncClient(
            headers=headers, 
            cookies=cookie_dict, 
            follow_redirects=True,
            timeout=httpx.Timeout(30.0, connect=10.0)
        ) as client:
            
            response = await client.get(url)
            response.raise_for_status()
            
            html_content = response.text
            
            # 安全检查
            if 'mp.weixin.qq.com/safe' in str(response.url) or '登录' in html_content[:2000]:
                raise RuntimeError(f"HTTP 获取被重定向到登录页，当前 url={response.url}")
            
            # 替换图片为占位符
            def replace_img_tag(match):
                img_tag = match.group(0)
                alt_match = re.search(r'alt=["\']([^"\']*)["\']', img_tag, re.IGNORECASE)
                alt_text = alt_match.group(1) if alt_match else ""
                label = f'【图片: {alt_text}】' if alt_text else '【图片】'
                return f'<span style="display:inline-block; white-space:nowrap;">{html.escape(label)}</span>'
            
            cleaned_html = re.sub(
                r'<img[^>]+>', 
                replace_img_tag, 
                html_content, 
                flags=re.IGNORECASE | re.DOTALL
            )
            
            # 关键修改：直接返回 HTML 字符串的 UTF-8 编码 bytes
            # render_mhtml_inline 中的 msg.is_multipart() 会返回 False，
            # 然后执行 get_payload().decode() 正确解析
            return cleaned_html.encode('utf-8')
            
    except Exception as e:
        raise RuntimeError(f"HTTP 直接获取失败: {e}") from e