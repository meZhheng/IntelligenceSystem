import requests
from bs4 import BeautifulSoup
from urllib.parse import quote
import re


class WeiboUserSearchParser:
    # 初始化方法，接收 cookie 字符串，用于请求头中模拟登录状态
    def __init__(self, cookie: str):
        self.headers = {
            # 设置浏览器 User-Agent，模拟浏览器访问
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36",
            # 携带 cookie，保持登录状态，避免被反爬
            "Cookie": cookie,
        }

    # 根据关键字搜索微博用户，返回结果列表
    def search_user(self, keyword: str):
        # 1. 对搜索关键词进行 URL 编码，处理中文和特殊字符
        encoded_keyword = quote(keyword)
        # 2. 构造微博搜索用户的 URL，参数 q 为搜索关键词
        url = f"https://s.weibo.com/user?q={encoded_keyword}&Refer=weibo_user"

        # 3. 发送 GET 请求，带上请求头（含 User-Agent 和 Cookie）
        response = requests.get(url, headers=self.headers)
        # 4. 判断响应状态，非 200 报错
        if response.status_code != 200:
            raise Exception(f"请求失败，状态码: {response.status_code}")

        # 5. 使用 BeautifulSoup 解析网页 HTML 内容
        soup = BeautifulSoup(response.text, 'html.parser')
        # 6. 选取所有用户卡片的容器 div，class 为 card card-user-b
        user_cards = soup.select("div.card.card-user-b")

        results = []
        # 7. 遍历所有用户卡片，提取所需信息
        for card in user_cards:
            try:
                # 7.1 用户名及个人主页链接
                name_tag = card.select_one("a.name")
                name = name_tag.text.strip()
                href = name_tag['href']
                profile_url = "https:" + href  # 补全成完整链接

                # 7.2 提取用户唯一 ID（uid），可能为 /u/123456 或 /profile/username 形式
                uid = ""
                if "/u/" in href:
                    uid = href.split("/u/")[-1].split("?")[0].split("/")[0]
                elif "/profile/" in href:
                    uid = href.split("/profile/")[-1].split("?")[0].split("/")[0]

                # 7.3 提取用户简介，排除包含“粉丝”字样的文本
                description = ""
                description_match = card.select("div.info > p")
                for p in description_match:
                    if '粉丝' not in p.text:
                        description = p.text.strip()
                        break

                # 7.4 提取粉丝数文本，查找包含“粉丝”关键字的 span 标签文本
                fans_text = ""
                fans_match = card.select("div.info > p > span")
                for p in fans_match:
                    if '粉丝' in p.text:
                        fans_text = p.text.strip()
                        break

                # 7.5 将提取结果加入列表，以字典形式存储
                results.append({
                    "username": name,
                    "id": uid,
                    "profile_url": profile_url,
                    "description": description,
                    "followers_count": fans_text
                })
            except Exception as e:
                # 出现异常时打印错误，继续处理下一个用户卡片
                print(f"解析用户卡片失败: {e}")
                continue

        # 8. 返回所有解析完成的用户信息列表
        return results
