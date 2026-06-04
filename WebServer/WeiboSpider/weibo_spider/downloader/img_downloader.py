import os  # 用于路径和文件夹操作

from .downloader import Downloader  # 导入基础下载器基类


class ImgDownloader(Downloader):
    """图片下载器，继承自Downloader"""

    def __init__(self, file_dir, file_download_timeout):
        # 调用父类初始化方法，设置文件目录和超时
        super().__init__(file_dir, file_download_timeout)
        self.describe = u'图片'  # 描述信息，用于目录命名
        self.key = ''  # 图片链接对应的属性名，具体由子类或使用者赋值

    def handle_download(self, urls, w):
        """处理图片下载的具体逻辑
        :param urls: 可能包含多个图片URL的字符串，逗号分割
        :param w: 当前微博对象，用于生成文件名前缀和ID
        """
        # 文件名前缀由微博发布时间（去掉'-'）和微博ID组成，格式示例：20230714_1234567890
        file_prefix = w.publish_time[:10].replace('-', '') + '_' + w.id
        # 图片保存目录路径：file_dir/图片
        file_dir = self.file_dir + os.sep + self.describe

        # 如果图片目录不存在，递归创建
        if not os.path.isdir(file_dir):
            os.makedirs(file_dir)

        # 判断urls是否包含多个URL（逗号分割）
        if ',' in urls:
            # 分割为URL列表
            url_list = urls.split(',')
            # 遍历每个URL
            for i, url in enumerate(url_list):
                # 查找最后一个点，截取文件后缀名
                index = url.rfind('.')
                # 如果后缀长度异常（超过5个字符），则默认用.jpg后缀
                if len(url) - index >= 5:
                    file_suffix = '.jpg'
                else:
                    file_suffix = url[index:]
                # 拼接文件名，格式：前缀_序号.后缀，如20230714_1234567890_1.jpg
                file_name = file_prefix + '_' + str(i + 1) + file_suffix
                # 拼接文件完整路径
                file_path = file_dir + os.sep + file_name
                # 调用基类方法下载单个文件
                self.download_one_file(url, file_path, w.id)
        else:
            # 只有一个URL时处理逻辑，和上面类似
            index = urls.rfind('.')
            if len(urls) - index > 5:
                file_suffix = '.jpg'
            else:
                file_suffix = urls[index:]
            # 文件名无序号，格式：前缀.后缀，如20230714_1234567890.jpg
            file_name = file_prefix + file_suffix
            file_path = file_dir + os.sep + file_name
            self.download_one_file(urls, file_path, w.id)
