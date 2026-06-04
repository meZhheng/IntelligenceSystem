from .img_downloader import ImgDownloader  # 导入图片下载器基类


class RetweetPictureDownloader(ImgDownloader):
    """
    转发微博图片下载器，继承自 ImgDownloader
    专门处理转发微博中的图片下载
    """

    def __init__(self, file_dir, file_download_timeout):
        # 调用父类构造函数，初始化文件保存目录和下载超时
        super().__init__(file_dir, file_download_timeout)
        self.describe = u'转发微博图片'  # 用于目录命名，标识内容为转发微博图片
        self.key = 'retweet_pictures'   # 对应微博对象属性名，存储转发微博图片的URL列表
