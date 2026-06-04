import hashlib
import json
import logging
import sys

import requests
from lxml import etree

# 是否开启生成测试数据模式，开启后会将抓取的HTML保存到本地
GENERATE_TEST_DATA = False
TEST_DATA_DIR = 'tests/testdata'  # 测试数据保存目录
URL_MAP_FILE = 'url_map.json'     # URL与文件路径映射文件
logger = logging.getLogger('spider.util')  # 日志记录器


def hash_url(url):
    """
    对URL进行SHA224哈希，返回哈希值字符串。
    用于生成唯一且固定的文件名，方便保存测试数据。
    """
    return hashlib.sha224(url.encode('utf8')).hexdigest()


def handle_html(cookie, url):
    """
    根据cookie和url发送GET请求，获取页面HTML并返回lxml的selector对象。

    如果开启GENERATE_TEST_DATA，会将响应内容写入本地文件，并更新url映射。

    Args:
        cookie (str): 用于请求的cookie字符串。
        url (str): 目标URL。

    Returns:
        lxml.etree._Element: 解析后的HTML DOM树选择器。

    异常时会记录异常日志。
    """
    try:
        user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0'
        # UA 考虑改为用户根据自己的浏览器在前端输入，而不是固定值
        headers = {'User-Agent': user_agent, 'Cookie': cookie}
        resp = requests.get(url, headers=headers)

        # 生成测试数据文件
        if GENERATE_TEST_DATA:
            import io
            import os

            # 生成文件名（url哈希值.html）
            resp_file = os.path.join(TEST_DATA_DIR, '%s.html' % hash_url(url))
            # 写入HTML内容
            with io.open(resp_file, 'w', encoding='utf-8') as f:
                f.write(resp.text)

            # 读取并更新url_map.json映射文件，保存url对应的文件路径
            with io.open(os.path.join(TEST_DATA_DIR, URL_MAP_FILE), 'r+') as f:
                url_map = json.loads(f.read())
                url_map[url] = resp_file
                f.seek(0)
                f.write(json.dumps(url_map, indent=4, ensure_ascii=False))
                f.truncate()

        # 解析HTML为DOM树，返回选择器对象
        selector = etree.HTML(resp.content)
        return selector
    except Exception as e:
        logger.exception(e)

def handle_garbled(info):
    """
    处理乱码字符，将字符串或支持xpath的对象提取文本并转码。

    Args:
        info (str or lxml element): 可能含乱码的文本或元素。

    Returns:
        str: 处理后无乱码的字符串，异常时返回"无"。
    """
    try:
        # 如果 info 支持 xpath 方法，使用 xpath('string(.)') 提取纯文本
        if hasattr(info, 'xpath'):
            info_str = info.xpath('string(.)')
        else:
            # 否则将其转换为字符串
            info_str = str(info)

        # 替换零宽空格 \u200b，按系统标准输出编码忽略错误解码
        info = info_str.replace(u'\u200b', '').encode(
            sys.stdout.encoding, 'ignore').decode(sys.stdout.encoding)
        return info
    except Exception as e:
        logger.exception(e)
        return u'无'


def bid2mid(bid):
    """
    将微博的bid转换为mid，bid是微博内部标识，mid为微博消息ID。

    转换算法基于微博的base62编码和分段转换规则。

    Args:
        bid (str): 微博bid字符串。

    Returns:
        str: 对应的mid字符串。
    """
    alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    base = len(alphabet)
    bidlen = len(bid)
    head = bidlen % 4
    digit = int((bidlen - head) / 4)
    dlist = [bid[0:head]]
    for d in range(1, digit + 1):
        dlist.append(bid[head:head + d * 4])
        head += 4
    mid = ''
    for d in dlist:
        num = 0
        idx = 0
        strlen = len(d)
        for char in d:
            power = (strlen - (idx + 1))
            num += alphabet.index(char) * (base**power)
            idx += 1
        strnum = str(num)
        # 长度为4的段需左侧补0至7位
        while (len(d) == 4 and len(strnum) < 7):
            strnum = '0' + strnum
        mid += strnum
    return mid


def to_video_download_url(cookie, video_page_url):
    """
    通过视频页面URL获取视频真实下载地址。

    Args:
        cookie (str): 请求cookie。
        video_page_url (str): 视频页面URL。

    Returns:
        str: 视频下载地址，如果无权限或无视频返回空字符串。
    """
    if video_page_url == '':
        return ''

    # 替换视频播放页面URL为视频对象API地址
    video_object_url = video_page_url.replace('m.weibo.cn/s/video/show',
                                              'm.weibo.cn/s/video/object')
    try:
        user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36'
        headers = {'User_Agent': user_agent, 'Cookie': cookie}
        wb_info = requests.get(video_object_url, headers=headers).json()
        video_url = wb_info['data']['object']['stream'].get('hd_url')
        if not video_url:
            video_url = wb_info['data']['object']['stream']['url']
            if not video_url:  # 视频为直播或无地址
                video_url = ''
    except json.decoder.JSONDecodeError:
        logger.warning(u'当前账号没有浏览该视频的权限')

    return video_url


def string_to_int(string):
    """
    将含中文数量单位的字符串转换成整数。
    支持末尾含“万+”、“万”、“亿”单位的字符串转换。

    Args:
        string (str): 原始字符串，如 '5万+'、'3亿'。

    Returns:
        int: 转换后的整数。
    """
    if len(string) == 0:
        logger.warning("string to int, the input string is empty!")
        return 0
    if isinstance(string, int):
        return string
    elif string.endswith(u'万+'):
        string = string[:-2] + '0000'  # 万+直接补四个0
    elif string.endswith(u'万'):
        string = float(string[:-1]) * 10000
    elif string.endswith(u'亿'):
        string = float(string[:-1]) * 100000000
    return int(string)
