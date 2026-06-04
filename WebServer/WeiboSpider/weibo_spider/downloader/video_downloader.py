import os  # 操作系统模块，处理路径相关操作

from .downloader import Downloader  # 导入基础下载器类


class VideoDownloader(Downloader):
    """视频文件下载器，继承自Downloader"""

    def __init__(self, file_dir, file_download_timeout):
        # 调用父类构造函数，初始化保存目录和超时设置
        super().__init__(file_dir, file_download_timeout)
        self.describe = u'视频'       # 描述，用于日志和目录命名
        self.key = 'video_url'       # 微博对象中视频链接对应的属性名

    def handle_download(self, urls, w):
        """
        处理视频文件的下载逻辑
        :param urls: 视频文件URL（一般只有一个视频URL）
        :param w: 微博对象，用于生成文件名
        """
        # 生成文件名前缀，格式示例：20230714_1234567890
        file_prefix = w.publish_time[:10].replace('-', '') + '_' + w.id
        file_suffix = '.mp4'  # 视频文件后缀，固定为mp4格式

        # 拼接完整文件名
        file_name = file_prefix + file_suffix
        # 拼接文件完整路径，保存在指定目录
        file_path = self.file_dir + os.sep + file_name

        # 调用父类的下载单文件方法执行下载
        self.download_one_file(urls, file_path, w.id)
