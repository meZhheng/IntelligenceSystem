# -*- coding:utf-8 -*-
from datetime import datetime
from wsgiref.handlers import format_date_time
from time import mktime
import hashlib
import base64
import hmac
from urllib.parse import urlencode
import json
import requests


class AssembleHeaderException(Exception):
    """
    自定义异常类：组装请求头失败时抛出
    """
    def __init__(self, msg):
        self.message = msg


class Url:
    """
    简单URL拆分类，封装host, path, schema三部分
    """
    def __init__(self, host, path, schema):
        self.host = host
        self.path = path
        self.schema = schema


class WebsocketDemo:
    """
    演示如何调用讯飞私有云的文本校对接口（WebSocket鉴权流程+HTTP POST请求）

    参数:
        APPId (str): 应用ID
        APISecret (str): API密钥，用于签名
        APIKey (str): API Key，接口鉴权参数
        Text (str): 需要校对的文本内容
    """
    def __init__(self, APPId, APISecret, APIKey, Text):
        self.appid = APPId
        self.apisecret = APISecret
        self.apikey = APIKey
        self.text = Text
        self.url = 'https://cn-huadong-1.xf-yun.com/v1/private/s37b42a45'  # 私有云接口地址

    def sha256base64(self, data):
        """
        计算SHA256哈希并进行Base64编码

        参数:
            data (bytes): 输入数据（字节类型）
        返回:
            str: base64编码的SHA256摘要
        """
        sha256 = hashlib.sha256()
        sha256.update(data)
        digest = base64.b64encode(sha256.digest()).decode(encoding='utf-8')
        return digest

    def parse_url(self, request_url):
        """
        解析URL字符串，拆分为host、path、schema部分
        
        参数:
            request_url (str): 完整URL字符串
        返回:
            Url: 包含host, path, schema的Url对象
        异常:
            如果URL格式不符合预期抛出AssembleHeaderException
        """
        stidx = request_url.index("://")
        host = request_url[stidx + 3:]
        schema = request_url[:stidx + 3]
        edidx = host.index("/")
        if edidx <= 0:
            raise AssembleHeaderException("invalid request url:" + request_url)
        path = host[edidx:]
        host = host[:edidx]
        u = Url(host, path, schema)
        return u

    def assemble_ws_auth_url(self, request_url, method="POST", api_key="", api_secret=""):
        """
        构造带鉴权信息的WebSocket请求URL

        参数:
            request_url (str): 原始请求URL
            method (str): HTTP请求方法，默认POST
            api_key (str): API Key，用于鉴权
            api_secret (str): API Secret，用于签名
        返回:
            str: 带鉴权参数的完整请求URL
        """
        u = self.parse_url(request_url)
        host = u.host
        path = u.path
        now = datetime.now()
        date = format_date_time(mktime(now.timetuple()))  # 格式化为HTTP日期格式
        # 拼接原始签名字符串
        signature_origin = "host: {}\ndate: {}\n{} {} HTTP/1.1".format(host, date, method, path)
        # 用api_secret进行HMAC-SHA256签名并base64编码
        signature_sha = hmac.new(api_secret.encode('utf-8'), signature_origin.encode('utf-8'),
                                 digestmod=hashlib.sha256).digest()
        signature_sha = base64.b64encode(signature_sha).decode(encoding='utf-8')
        # 拼接authorization头内容
        authorization_origin = "api_key=\"%s\", algorithm=\"%s\", headers=\"%s\", signature=\"%s\"" % (
            api_key, "hmac-sha256", "host date request-line", signature_sha)
        # 对authorization进行base64编码
        authorization = base64.b64encode(authorization_origin.encode('utf-8')).decode(encoding='utf-8')
        # 将host、date、authorization作为URL参数拼接到请求地址
        values = {
            "host": host,
            "date": date,
            "authorization": authorization
        }
        return request_url + "?" + urlencode(values)

    def get_body(self):
        """
        构造POST请求的JSON请求体
        
        返回:
            dict: 符合接口要求的请求体字典
        """
        body =  {
            "header": {
                "app_id": self.appid,
                "status": 3,  # 表示请求状态，接口要求
                #"uid":"your_uid" # 可选用户ID
            },
            "parameter": {
                "midu_correct": {
                    #"res_id":"your_res_id",  # 可选资源ID
                    "output_result": {
                        "encoding": "utf8",
                        "compress": "raw",
                        "format": "json"
                    }
                }
            },
            "payload": {
                "text": {
                    "encoding": "utf8",
                    "compress": "raw",
                    "format": "plain",
                    "status": 3,  # 表示文本状态
                    # 文本内容需要base64编码后作为字符串传递
                    "text": base64.b64encode(self.text.encode("utf-8")).decode('utf-8')
                }
            }
        }
        return body

    def get_result(self):
        """
        执行文本校对请求，发送POST请求并打印解析结果
        
        返回:
            None
        """
        # 构造鉴权后的请求URL
        request_url = self.assemble_ws_auth_url(self.url, "POST", self.apikey, self.apisecret)
        # 设置请求头，content-type为json，host和app_id是接口要求的头部
        headers = {'content-type': "application/json", 'host':'api.xf-yun.com', 'app_id':self.appid}
        body = self.get_body()
        # 发送POST请求
        response = requests.post(request_url, data=json.dumps(body), headers=headers)
        print('onMessage：\n' + response.content.decode())
        tempResult = json.loads(response.content.decode())
        # 解码返回的base64文本字段，打印解析后的结果
        print('公文校对text字段解析：\n' + base64.b64decode(tempResult['payload']['output_result']['text']).decode())



if __name__ == '__main__':
    # 控制台获取的凭证信息
    APPId = "0c9db600"
    APISecret = "ZDYxYzA4MjNhOWM1ZjhhMzViOWUxZDFl"
    APIKey = "6728bcaa2ae0e3f352a96dbb6e5ea52f"

    # 需纠错文本
    Text = (
        "党的十八大以来，以习近平主席为核心的党中央引领我国经济社会发展取得历史性成就、"
        "发生历史性变革，在实践中形成和发展了习近平经济思想，为新征程上做好经济工作提供了行动指南。"
        "近段时间发布的多个数据显示，，餐饮、文旅等线下消费热度上升，全国各地的“烟火气”火速回归，"
        "为提振全年经济开了好头。作为拉动我国经济增涨的“第一动力”，消费升温为上下游市场负苏增添了暖意。"
        "业内专家指出，随着传统消回暖，叠加IP消费、健康消费、兴趣消费等新增长增长点的迅速崛起，消费增长的结构性潜力将加快释放，"
        "我国经济回稳之势进一步确立。二O二三年以来，餐饮、电影、旅游多种等消费快速恢复。"
        "餐厅等位已成常态，春节期间，湖北长沙市文和友海信广场店以排队超过4500桌冲上了微博热搜。"
        "电影票房也迎来高增长，猫眼电影数据展示，截至2月6日，春节档电影《满江红》和《流浪地球2票房总额已超82亿元。 "
        "国信中心大数据发展部研究员表示，各地市委政府多项高频消费数据反映今年以来我国消费市场持续回暖。"
        "线下消费热度快速恢复，至2月31日已较去年12月的低点大幅提升22.8个点,各大商圈人气日渐兴旺."
    )

    demo = WebsocketDemo(APPId, APISecret, APIKey, Text)
    demo.get_result()
