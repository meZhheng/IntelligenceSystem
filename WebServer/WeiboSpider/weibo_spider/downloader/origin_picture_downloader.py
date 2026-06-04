from .img_downloader import ImgDownloader  # 导入图片下载器基类


class OriginPictureDownloader(ImgDownloader):
    """
    原创微博图片下载器，继承自 ImgDownloader
    专门处理原创微博中的图片下载
    """

    def __init__(self, file_dir, file_download_timeout):
        # 调用父类初始化，传入文件保存目录和下载超时配置
        super().__init__(file_dir, file_download_timeout)
        self.describe = u'原创微博图片'  # 用于目录命名，标识下载内容类型
        self.key = 'original_pictures'   # 对应微博对象中的属性名，获取原创图片URL列表
