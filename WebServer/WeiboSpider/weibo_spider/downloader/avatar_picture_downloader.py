import os  # 导入操作系统相关模块，用于路径和目录操作

from .img_downloader import ImgDownloader  # 从当前包导入ImgDownloader基类


class AvatarPictureDownloader(ImgDownloader):
    def __init__(self, file_dir, file_download_timeout):
        # 调用父类构造函数，初始化文件存储目录和下载超时时间
        super().__init__(file_dir, file_download_timeout)
        self.describe = u'头像图片'  # 描述信息，用于目录命名，指明是头像图片
        self.key = 'avatar_pictures'  # 该下载器的标识键

    def handle_download(self, urls):
        """处理头像图片的下载操作"""
        # 拼接头像图片存放目录路径，file_dir/头像图片
        file_dir = self.file_dir + os.sep + self.describe
        # 如果目录不存在，则递归创建目录
        if not os.path.isdir(file_dir):
            os.makedirs(file_dir)

        # 遍历所有需要下载的头像图片URL
        for i, url in enumerate(urls):
            # 通过查找最后一个斜杠定位文件名起始位置
            index = url.rfind('/')
            file_name = url[index:]  # 从url截取文件名（包括斜杠）
            # 组合完整文件路径
            file_path = file_dir + os.sep + file_name
            # 调用父类下载方法下载单个文件，'xxx'为传入的标识参数
            self.download_one_file(url, file_path, 'xxx')
