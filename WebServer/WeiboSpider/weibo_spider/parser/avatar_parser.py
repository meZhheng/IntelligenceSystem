import os
import requests
from urllib.parse import urlparse
from flask import current_app
from app.models_spider import WeiboUserImage
from typing import Optional, Generator

class AvatarDownloader:
    """
    微博头像下载器。
    用于通过用户 UID 下载其头像图片，并保存至本地指定目录。
    
    参数:
        cookies (str): 登录用的 Cookie 字符串（暂未使用，可根据需要添加到请求中）。
        uid (str): 微博用户 ID。
    """

    def __init__(self, cookies: str, uid: str):
        # 获取上传根目录配置，例如 '/uploads'
        upload_root = current_app.config['UPLOAD_ROOT']
        # 保存头像的子目录（完整路径）
        self.save_root = os.path.join(upload_root, 'avatar')
        self.uid = uid  # 微博用户 ID
        self.cookies = cookies  # 传入但未用于请求，可用于后续支持登录请求
        # 如果目录不存在，则创建
        os.makedirs(self.save_root, exist_ok=True)

    def download(self):
        """
        下载微博用户头像并保存到本地。
        
        返回：
            Generator：
              - 若失败：yield 一个包含 error 和 message 字段的 dict。
              - 若成功：yield 一个 WeiboUserImage 对象，记录下载成功的头像路径等信息。
        """
        # 构造头像请求地址
        url = f"https://weibo.cn/{self.uid}/avatar?rl=0"

        headers = {
            "Referer": "https://weibo.cn",  # 伪装来源，部分网站可能需要
            "User-Agent": "Mozilla/5.0",    # 伪装浏览器 UA，防止被屏蔽
        }

        try:
            # 发起头像请求，使用流模式下载（stream=True）
            resp = requests.get(url, headers=headers, timeout=5, stream=True)
            resp.raise_for_status()  # 抛出 HTTP 错误（如 404、403 等）
        except Exception as e:
            # 请求失败，抛出错误信息
            yield {
                'error': 0,
                'message': f"下载头像失败 {self.uid}: {e}"
            }

        # 获取响应头中的 Content-Type，用于判断图片格式
        content_type = resp.headers.get("Content-Type", "")
        ext = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/gif": ".gif",
        }.get(content_type.split(";")[0], ".jpg")  # 默认使用 .jpg

        # 构造本地保存文件名（例如 '123456.jpg'）
        filename = f"{self.uid}{ext}"
        local_path = os.path.join(self.save_root, filename)

        # 将头像数据写入本地文件
        try:
            with open(local_path, "wb") as f:
                for chunk in resp.iter_content(1024):  # 每次写入 1KB 数据
                    f.write(chunk)
        except Exception as e:
            # 文件写入失败
            yield {
                'error': 0, 
                'message': f"写入头像文件失败 {local_path}: {e}"
            }

        # 计算相对于 UPLOAD_ROOT 的路径（供前端访问或存数据库）
        rel_path = os.path.relpath(local_path, current_app.config["UPLOAD_ROOT"])

        # 构建 WeiboUserImage 模型实例，记录头像文件信息
        image = WeiboUserImage(
            data_id=self.uid,  # 用户 ID
            path=rel_path,     # 头像相对路径
        )

        # 返回模型对象给调用方
        yield image
