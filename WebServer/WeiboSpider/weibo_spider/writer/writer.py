from abc import ABC, abstractmethod


# Writer 抽象基类，定义写入微博和用户信息的通用接口规范
class Writer(ABC):
    def __init__(self):
        """
        构造函数：
        可以根据实际需求在子类中实现如：
        - 初始化输出文件路径
        - 初始化表头信息
        - 初始化数据库连接等操作
        """
        pass

    @abstractmethod
    def write_weibo(self, weibo):
        """
        抽象方法：写入微博信息
        参数：
            weibo：单条或多条微博对象，格式由子类实现决定（如列表或单个对象）
        子类需实现：
            将微博信息写入到指定目标（如 TXT/CSV/JSON/MySQL 等）
        """
        pass

    @abstractmethod
    def write_user(self, user):
        """
        抽象方法：写入用户信息
        参数：
            user：包含用户属性的对象
        子类需实现：
            将用户信息写入到指定目标（如 TXT/CSV/JSON/MySQL 等）
        """
        pass
