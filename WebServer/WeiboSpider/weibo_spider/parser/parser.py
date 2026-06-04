class Parser:
    # 初始化 Parser 类的实例
    def __init__(self, cookie):
        # 接收一个 cookie 参数，通常用于 HTTP 请求中的身份验证或会话保持
        self.cookie = cookie
        
        # 初始化一个空字符串，用于存储后续可能设置的 URL 地址
        self.url = ''
        
        # 初始化选择器，默认为 None，可能用于后续的页面元素定位或数据提取
        self.selector = None
