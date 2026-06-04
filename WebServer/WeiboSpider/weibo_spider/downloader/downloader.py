# -*- coding: UTF-8 -*-
import logging
import os
import sys
from abc import ABC, abstractmethod  # 引入抽象基类和抽象方法

import requests  # 发送HTTP请求
from requests.adapters import HTTPAdapter  # 适配器，用于设置重试策略
from tqdm import tqdm  # 进度条库，用于展示下载进度

# 创建名为'spider.downloader'的日志记录器
logger = logging.getLogger('spider.downloader')


class Downloader(ABC):
    """抽象下载器基类，支持图片和视频文件下载"""

    def __init__(self, file_dir, file_download_timeout):
        """
        初始化下载器
        :param file_dir: 文件保存目录
        :param file_download_timeout: 下载超时时间列表，格式为 [连接重试次数, 连接超时时间, 读取超时时间]
        """
        self.file_dir = file_dir  # 文件存储路径
        self.describe = ''        # 具体下载器描述（由子类赋值）
        self.key = ''             # 该下载器处理的属性名（由子类赋值）

        # 默认超时设置：[最大重试次数, 连接超时(s), 读取超时(s)]
        self.file_download_timeout = [5, 5, 10]

        # 若传入的超时时间参数符合格式，则覆盖默认值
        if (isinstance(file_download_timeout, list)
                and len(file_download_timeout) == 3):
            for i in range(3):
                v = file_download_timeout[i]
                if isinstance(v, (int, float)) and v > 0:
                    self.file_download_timeout[i] = v

    @abstractmethod
    def handle_download(self, urls, w):
        """
        抽象方法，由子类实现具体下载逻辑
        :param urls: 需要下载的文件URL列表
        :param w: 传入的单条微博数据对象，用于生成文件名等信息
        """
        pass

    def download_one_file(self, url, file_path, weibo_id):
        """
        下载单个文件（图片或视频）
        :param url: 文件下载链接
        :param file_path: 文件保存路径
        :param weibo_id: 微博ID，下载失败时记录错误信息用
        """
        try:
            # 仅当文件不存在时才执行下载，避免重复下载
            if not os.path.isfile(file_path):
                s = requests.Session()  # 创建请求会话
                # 挂载适配器，设置最大重试次数，针对特定url
                s.mount(url,
                        HTTPAdapter(max_retries=self.file_download_timeout[0]))
                # 发送GET请求，设置连接超时和读取超时
                downloaded = s.get(url,
                                   timeout=(self.file_download_timeout[1],
                                            self.file_download_timeout[2]))
                # 以二进制写入文件
                with open(file_path, 'wb') as f:
                    f.write(downloaded.content)
        except Exception as e:
            # 发生异常时，将失败信息写入not_downloaded.txt文件，方便后续检查
            error_file = self.file_dir + os.sep + 'not_downloaded.txt'
            with open(error_file, 'ab') as f:
                # 格式：微博ID:文件路径:URL
                url = weibo_id + ':' + file_path + ':' + url + '\n'
                f.write(url.encode(sys.stdout.encoding))
            # 记录异常堆栈日志
            logger.exception(e)

    def download_files(self, weibos):
        """
        批量下载文件（图片/视频）
        :param weibos: 微博数据列表，每个元素含有待下载文件的URL属性
        """
        try:
            logger.info(u'即将进行%s下载', self.describe)  # 记录开始下载日志

            # 遍历每条微博数据，使用tqdm显示下载进度
            for w in tqdm(weibos, desc='Download progress'):
                # 如果该微博中对应的文件字段不为空或非“无”
                if getattr(w, self.key) != u'无':
                    # 调用子类实现的下载方法，传入对应url列表和微博对象
                    self.handle_download(getattr(w, self.key), w)

            logger.info(u'%s下载完毕,保存路径:', self.describe)
            logger.info(self.file_dir)  # 记录保存路径
        except Exception as e:
            # 记录下载过程中的异常
            logger.exception(e)
