#!/usr/bin/env python
# -*- coding: UTF-8 -*-
# 上两行用于指定 Python 解释器路径和编码格式

from typing import List
# 引入类型注解模块，用于标注 List 类型

from .interaction import Interaction
# 导入自定义 Interaction 类（处理互动数据）

import json
import logging
import logging.config
import os
import random
import shutil
import sys
from datetime import date, datetime, timedelta
from time import sleep
# 引入常用标准库：文件操作、系统操作、时间处理、日志记录等

from absl import app, flags
# 引入 abseil-py 库中的 app 和 flags 模块，用于命令行参数解析（Google 提供）

from tqdm import tqdm
# 引入进度条库 tqdm，用于可视化循环进度

from . import config_util, datetime_util
# 导入项目中自定义的工具模块：配置读取工具、时间处理工具

# 导入爬虫中用到的各种解析器和下载器类
from .downloader import AvatarPictureDownloader
from .parser import (
    AlbumParser, IndexParser, PageParser, PhotoParser,
    FollowParser, FansParser, AvatarDownloader,
    InteractionIndexParser, InteractionParser
)

from .user import User
# 导入封装的 User 类，用于表示用户对象

# 读取命令行参数
FLAGS = flags.FLAGS

# 定义命令行参数
flags.DEFINE_string('config_path', None, 'The path to config.json.')
# 配置文件路径参数

flags.DEFINE_string('u', None, 'The user_id we want to input.')
# 要爬取的单个用户 ID（可选）

flags.DEFINE_string('user_id_list', None, 'The path to user_id_list.txt.')
# 要批量爬取的用户 ID 列表路径

flags.DEFINE_string('output_dir', None, 'The dir path to store results.')
# 爬虫结果输出目录

# 设置日志系统
logging_path = os.path.split(
    os.path.realpath(__file__)
)[0] + os.sep + 'logging.conf'
# 获取 logging 配置文件路径（与当前脚本同目录）

logging.config.fileConfig(logging_path)
# 使用配置文件初始化日志系统

logger = logging.getLogger('spider')
# 获取名为 spider 的日志记录器

class Spider:
    def __init__(self, config):
        """初始化微博爬虫类 Spider"""
        
        # 是否只爬取原创微博：0为全部微博（默认），1为只爬原创
        self.filter = config['filter']

        # 处理起始时间（since_date）
        # 如果是整数，表示从今天起向前推的天数
        since_date = config['since_date']
        if isinstance(since_date, int):
            since_date = date.today() - timedelta(since_date)
        # 格式化为字符串形式 yyyy-mm-dd
        self.since_date = str(since_date)

        # 结束时间（字符串格式），可设为具体日期或"now"
        self.end_date = config['end_date']

        # 配置每随机爬取一定页数后暂停，避免反爬
        random_wait_pages = config['random_wait_pages']
        self.random_wait_pages = [
            min(random_wait_pages),
            max(random_wait_pages)
        ]

        # 配置暂停等待的时间范围（秒）
        random_wait_seconds = config['random_wait_seconds']
        self.random_wait_seconds = [
            min(random_wait_seconds),
            max(random_wait_seconds)
        ]

        # 配置全局等待时间，例如每爬取1000页等待1小时
        self.global_wait = config['global_wait']
        self.page_count = 0  # 当前全局计数器，用于记录已爬页面数

        # 设置输出写入模式（如 txt、csv、json、mysql、mongo 等），可多选
        self.write_mode = config['write_mode']

        # 是否下载微博中的原始图片：0为不下载，1为下载
        self.pic_download = config['pic_download']

        # 是否下载微博中的视频：0为不下载，1为下载
        self.video_download = config['video_download']

        # 文件下载超时设置，格式为 [重试次数, 最大连接时间, 最大读取时间]
        self.file_download_timeout = config.get(
            'file_download_timeout',
            [5, 5, 10]
        )

        # 决定结果文件存储目录：0表示按用户昵称命名，1表示按用户ID命名
        self.result_dir_name = config.get('result_dir_name', 0)

        # cookie 用于身份验证和反爬处理
        self.cookie = config['cookie']

        # 数据库配置（MySQL），可选
        self.mysql_config = config.get('mysql_config')

        # SQLite 配置，可选
        self.sqlite_config = config.get('sqlite_config')

        # Kafka 消息队列配置，用于大规模数据接入，可选
        self.kafka_config = config.get('kafka_config')

        # MongoDB 配置，可选
        self.mongo_config = config.get('mongo_config')

        # POST 方式提交的配置，可选
        self.post_config = config.get('post_config')

        # 用户配置文件路径，初始化为空
        self.user_config_file_path = ''
        user_id_list = config['user_id_list']

        # 判断 user_id_list 是否为 list，如果不是可能是文件路径
        if not isinstance(user_id_list, list):
            # 若提供的是相对路径则转为绝对路径
            if not os.path.isabs(user_id_list):
                user_id_list = os.getcwd() + os.sep + user_id_list
            # 若文件不存在则发出警告并退出
            if not os.path.isfile(user_id_list):
                logger.warning('不存在%s文件', user_id_list)
                sys.exit()
            # 记录用户配置文件路径
            self.user_config_file_path = user_id_list

        # 如果 user_id_list 是列表类型，则处理成统一格式的 user_config_list
        if isinstance(user_id_list, list):
            # 对于字典型的 user_id（含有起始时间和结束时间的），保留相关配置
            user_config_list = list(
                map(
                    lambda x: {
                        'user_uri': x['id'],
                        'since_date': x.get('since_date', self.since_date),
                        'end_date': x.get('end_date', self.end_date),
                    }, [
                        user_id for user_id in user_id_list
                        if isinstance(user_id, dict)
                    ])) + list(
                        map(
                            lambda x: {
                                'user_uri': x,
                                'since_date': self.since_date,
                                'end_date': self.end_date
                            },
                            set([
                                user_id for user_id in user_id_list
                                if not isinstance(user_id, dict)
                            ])))
        else:
            # 如果 user_id_list 是路径，读取配置文件生成 user_config_list
            user_config_list = config_util.get_user_config_list(
                user_id_list, self.since_date)
            for user_config in user_config_list:
                user_config['end_date'] = self.end_date

        # 记录用户配置列表，每个元素是一个字典：user_uri + since_date + end_date
        self.user_config_list = user_config_list

        # 当前正在处理的用户配置
        self.user_config = {}

        # 当前用户爬取完成后自动生成的新起始时间
        self.new_since_date = ''

        # 初始化 User 实例，用于存储用户信息
        self.user = User()

        # 记录爬取到的微博条数
        self.got_num = 0

        # 存储已爬取的所有微博ID，用于去重或判断是否爬完
        self.weibo_id_list = []

    def write_weibo(self, weibos):
        """
        将爬取到的微博信息写入目标（文件或数据库）中，并处理媒体文件的下载。

        参数：
            weibos (list[Weibo]): 包含若干条微博的对象列表。

        操作流程：
            1. 调用所有 writer 实例（如 TxtWriter、CsvWriter、MongoWriter 等），
            将微博内容保存到相应格式或数据库。
            2. 调用所有 downloader 实例（如图片或视频下载器），下载微博中包含的多媒体内容。
        """
        for writer in self.writers:
            writer.write_weibo(weibos)

        for downloader in self.downloaders:
            downloader.download_files(weibos)

    def write_user(self, user):
        """
        将当前用户信息写入到配置的存储位置（如 JSON、数据库）。

        参数：
            user (User): 当前已获取的用户对象，包含如用户昵称、简介、粉丝数等信息。

        操作流程：
            遍历 writer 列表，调用其 write_user 方法写入用户信息。
        """
        for writer in self.writers:
            writer.write_user(user)

    def get_user_info(self, user_uri: str) -> User:
        """
        获取指定用户的基础信息（如昵称、粉丝数、简介等）。

        参数：
            user_uri (str): 用户标识符（通常是 UID 或主页 URI）。

        返回：
            User: 封装后的用户对象。

        操作流程：
            1. 调用 IndexParser（用户主页信息解析器）来获取该用户详细资料。
            2. 成功获取后，增加页面计数器 page_count（用于后续控制全局等待、分页等）。
        """
        user = IndexParser(self.cookie, user_uri).get_user()
        self.page_count += 1
        return user

    def download_user_avatar(self, user_uri):
        """
        下载指定用户的头像图片（通常为最新头像）。

        参数：
            user_uri (str): 用户标识符。

        操作流程：
            1. 使用 PhotoParser 解析出用户头像相册的 URL。
            2. 使用 AlbumParser 获取该相册下所有头像图片的原始链接。
            3. 使用 AvatarPictureDownloader 下载图片到本地 img 文件夹。
        """
        avatar_album_url = PhotoParser(self.cookie, user_uri).extract_avatar_album_url()
        pic_urls = AlbumParser(self.cookie, avatar_album_url).extract_pic_urls()
        AvatarPictureDownloader(
            self._get_filepath('img'),  # 下载路径为 img 子目录
            self.file_download_timeout   # 下载超时控制参数
        ).handle_download(pic_urls)

    def get_weibo_info(self, user_config):
        """
        获取指定用户的所有微博内容（分页拉取），通过生成器逐页返回。

        参数：
            user_config (dict): 单个用户的配置，包括 user_uri、since_date、end_date 等。

        功能说明：
            1. 首先确定用户的微博页数（最多爬取50页）；
            2. 遍历每一页微博，解析并去重，返回抓取到的微博内容；
            3. 支持全局爬取频率控制与页内随机等待，避免被封禁；
            4. 支持动态更新时间（如将抓取结束后的日期更新回配置文件）；
            5. 使用生成器 `yield` 提交结果，适合流式写入或异步处理。

        异常处理：
            抓取过程中若出现错误（如连接超时、接口变更等），将记录异常日志但不中断程序。
        """
        try:
            # 起始时间转为 datetime 对象
            since_date = datetime_util.str_to_time(self.since_date)
            now = datetime.now()

            # 如果设定的起始时间早于当前时间，则继续爬取
            if since_date <= now:
                # 获取用户微博的总页数，最多不超过 50 页（平台限制或防止被封）
                page_num = min(
                    IndexParser(self.cookie, user_config['user_uri']).get_page_num(),
                    50
                )

                self.page_count += 1  # 记录已爬页面数量，用于控制全局等待

                # 检查是否需要进入全局等待（例如每爬1000页后休眠1小时）
                if self.page_count > 2 and (self.page_count + page_num) > self.global_wait[0][0]:
                    wait_seconds = int(
                        self.global_wait[0][1] * min(1, self.page_count / self.global_wait[0][0])
                    )
                    logger.info(f'即将进入全局等待时间，{wait_seconds}秒后程序继续执行')
                    for _ in tqdm(range(wait_seconds)):
                        sleep(1)
                    self.page_count = 0  # 重置计数
                    self.global_wait.append(self.global_wait.pop(0))  # 轮换等待策略（支持多个策略轮询）

                page1 = 0  # 记录上次等待后起始页码
                random_pages = random.randint(*self.random_wait_pages)  # 随机设置每几页等待一次

                # 主循环：从第1页到最后一页
                for page in range(1, page_num + 1):
                    # 获取单页微博内容，包含是否继续爬的标志 to_continue
                    weibos, self.weibo_id_list, to_continue = PageParser(
                        self.cookie,
                        user_config, page, self.filter
                    ).get_one_page(self.weibo_id_list)

                    self.page_count += 1

                    # 如果抓取到微博内容，则通过 yield 返回（适用于后续写入/处理）
                    if weibos:
                        yield weibos

                    # 如果微博拉取到中途被终止（如触发中断条件），提前退出
                    if not to_continue:
                        break

                    # -------------------- 随机等待控制 --------------------
                    # 每隔 random_pages 页，随机暂停一段时间，模拟人类操作，降低被封风险
                    if (page - page1) % random_pages == 0 and page < page_num:
                        sleep(random.randint(*self.random_wait_seconds))
                        page1 = page
                        random_pages = random.randint(*self.random_wait_pages)
                    # ------------------------------------------------------

                    # -------------------- 全局等待控制 --------------------
                    # 每累计一定页数后触发一次强制全局等待（如每1000页暂停3600秒）
                    if self.page_count >= self.global_wait[0][0]:
                        logger.info(f'即将进入全局等待时间，{self.global_wait[0][1]}秒后程序继续执行')
                        for _ in tqdm(range(self.global_wait[0][1])):
                            sleep(1)
                        self.page_count = 0
                        self.global_wait.append(self.global_wait.pop(0))
                    # ------------------------------------------------------

                # -------------------- 可选配置文件更新逻辑 --------------------
                # 如果启用 user_config_file_path（或命令行 FLAGS.u），可自动更新用户配置文件的 since_date
                # config_util.update_user_config_file(
                #     self.user_config_file_path,
                #     self.user_config['user_uri'],
                #     self.user.nickname,
                #     self.new_since_date,
                # )
                # -------------------------------------------------------------

        except Exception as e:
            # 捕获并记录所有运行时异常，保证程序不中断
            logger.exception(e)

    def get_weibo_relation_likes(self, weibo_id):
        """
        获取指定微博的点赞关系数据（用户点赞列表），按页爬取，返回点赞交互列表生成器。

        参数：
            weibo_id (str): 目标微博ID。

        功能说明：
            1. 通过 InteractionIndexParser 获取点赞页数，最多爬取10页以避免访问压力；
            2. 逐页调用 InteractionParser 获取点赞详情；
            3. 加入随机等待和全局等待，降低爬虫频率，防止被限制；
            4. 通过 yield 生成器逐批返回点赞交互数据列表。

        返回：
            生成器，yield 返回 List[Interaction]，即每页的点赞交互数据。
        """
        page_num = min(InteractionIndexParser(
            self.cookie, weibo_id, 'attitude'
        ).get_page_num(), 10)

        self.page_count += 1

        # 全局等待控制：如果达到阈值，暂停一段时间
        if self.page_count > 2 and (self.page_count + page_num) > self.global_wait[0][0]:
            wait_seconds = int(
                self.global_wait[0][1] * min(1, self.page_count / self.global_wait[0][0])
            )
            logger.info(f'即将进入全局等待时间，{wait_seconds}秒后程序继续执行')
            for _ in tqdm(range(wait_seconds)):
                sleep(1)
            self.page_count = 0
            self.global_wait.append(self.global_wait.pop(0))

        page1 = 0
        random_pages = random.randint(*self.random_wait_pages)

        for page in range(1, page_num + 1):
            interactions: List[Interaction] = InteractionParser(
                self.cookie, weibo_id, 'attitude', page
            ).get_relations_like()  # 获取点赞用户列表

            self.page_count += 1

            if interactions:
                yield interactions

            # 随机等待，模拟人为操作，降低被封风险
            if (page - page1) % random_pages == 0 and page < page_num:
                sleep(random.randint(*self.random_wait_seconds))
                page1 = page
                random_pages = random.randint(*self.random_wait_pages)

            # 全局等待控制
            if self.page_count >= self.global_wait[0][0]:
                logger.info(f'即将进入全局等待时间，{self.global_wait[0][1]}秒后程序继续执行')
                for _ in tqdm(range(self.global_wait[0][1])):
                    sleep(1)
                self.page_count = 0
                self.global_wait.append(self.global_wait.pop(0))


    def get_weibo_relation_forwards(self, weibo_id):
        """
        获取指定微博的转发关系数据，按页爬取，返回转发交互列表生成器。

        参数：
            weibo_id (str): 目标微博ID。

        功能说明：
            - 逻辑与点赞类似，区别在于InteractionIndexParser和InteractionParser的参数改为'repost'，
            并调用对应的转发数据获取方法。
        """
        page_num = min(InteractionIndexParser(
            self.cookie, weibo_id, 'repost'
        ).get_page_num(), 10)

        self.page_count += 1

        if self.page_count > 2 and (self.page_count + page_num) > self.global_wait[0][0]:
            wait_seconds = int(
                self.global_wait[0][1] * min(1, self.page_count / self.global_wait[0][0])
            )
            logger.info(f'即将进入全局等待时间，{wait_seconds}秒后程序继续执行')
            for _ in tqdm(range(wait_seconds)):
                sleep(1)
            self.page_count = 0
            self.global_wait.append(self.global_wait.pop(0))

        page1 = 0
        random_pages = random.randint(*self.random_wait_pages)

        for page in range(1, page_num + 1):
            interactions: List[Interaction] = InteractionParser(
                self.cookie, weibo_id, 'repost', page
            ).get_weibo_relation_retweet()  # 获取转发用户列表

            self.page_count += 1

            if interactions:
                yield interactions

            if (page - page1) % random_pages == 0 and page < page_num:
                sleep(random.randint(*self.random_wait_seconds))
                page1 = page
                random_pages = random.randint(*self.random_wait_pages)

            if self.page_count >= self.global_wait[0][0]:
                logger.info(f'即将进入全局等待时间，{self.global_wait[0][1]}秒后程序继续执行')
                for _ in tqdm(range(self.global_wait[0][1])):
                    sleep(1)
                self.page_count = 0
                self.global_wait.append(self.global_wait.pop(0))


    def get_weibo_relation_comment(self, weibo_id):
        """
        获取指定微博的热门评论关系数据，按页爬取，返回评论交互列表生成器。

        参数：
            weibo_id (str): 目标微博ID。

        功能说明：
            - 逻辑与点赞、转发类似，参数变为 'comment/hot'，调用对应的评论获取方法。
        """
        page_num = min(InteractionIndexParser(
            self.cookie, weibo_id, 'comment/hot'
        ).get_page_num(), 10)

        self.page_count += 1

        if self.page_count > 2 and (self.page_count + page_num) > self.global_wait[0][0]:
            wait_seconds = int(
                self.global_wait[0][1] * min(1, self.page_count / self.global_wait[0][0])
            )
            logger.info(f'即将进入全局等待时间，{wait_seconds}秒后程序继续执行')
            for _ in tqdm(range(wait_seconds)):
                sleep(1)
            self.page_count = 0
            self.global_wait.append(self.global_wait.pop(0))

        page1 = 0
        random_pages = random.randint(*self.random_wait_pages)

        for page in range(1, page_num + 1):
            interactions: List[Interaction] = InteractionParser(
                self.cookie, weibo_id, 'comment/hot', page
            ).get_weibo_relation_comment()  # 获取热门评论列表

            self.page_count += 1

            if interactions:
                yield interactions

            if (page - page1) % random_pages == 0 and page < page_num:
                sleep(random.randint(*self.random_wait_seconds))
                page1 = page
                random_pages = random.randint(*self.random_wait_pages)

            if self.page_count >= self.global_wait[0][0]:
                logger.info(f'即将进入全局等待时间，{self.global_wait[0][1]}秒后程序继续执行')
                for _ in tqdm(range(self.global_wait[0][1])):
                    sleep(1)
                self.page_count = 0
                self.global_wait.append(self.global_wait.pop(0))

    def _get_filepath(self, type):
        """
        获取结果文件路径，根据传入的文件类型构造对应的路径。

        参数：
            type (str): 文件类型，比如 'img', 'video', 'json', 'txt' 等。

        返回：
            str: 根据类型生成的文件夹路径或文件路径。

        处理逻辑：
        1. 根据用户信息确定目录名，优先使用用户昵称，若 result_dir_name 为真，则改用用户ID。
        2. 判断全局配置 FLAGS.output_dir 是否存在，存在则在其目录下创建对应用户文件夹。
        不存在则默认在当前工作目录的 weibo 文件夹下创建用户文件夹。
        3. 如果文件类型是 'img' 或 'video'，则在用户文件夹内新建对应的子文件夹。
        4. 如果文件夹不存在则创建该文件夹。
        5. 如果文件类型是 'img' 或 'video'，直接返回对应的文件夹路径。
        否则，返回具体文件路径，文件名为 用户ID + 文件类型后缀。
        6. 过程中捕获异常并记录日志。

        """
        try:
            # 默认使用用户昵称作为目录名
            dir_name = self.user.nickname

            # 如果 self.result_dir_name 为真，则用用户ID作为目录名替代昵称
            if self.result_dir_name:
                dir_name = self.user.id

            # 判断是否配置了输出目录
            if FLAGS.output_dir is not None:
                # 使用配置的输出目录 + 用户目录名作为最终目录
                file_dir = FLAGS.output_dir + os.sep + dir_name
            else:
                # 默认使用当前工作目录 + 'weibo' + 用户目录名
                file_dir = os.getcwd() + os.sep + 'weibo' + os.sep + dir_name

            # 如果文件类型是图片或视频，则在用户目录下创建对应类型的子目录
            if type == 'img' or type == 'video':
                file_dir = file_dir + os.sep + type

            # 如果目标路径不存在，则递归创建目录
            if not os.path.isdir(file_dir):
                os.makedirs(file_dir)

            # 如果是图片或视频类型，返回对应的文件夹路径
            if type == 'img' or type == 'video':
                return file_dir

            # 否则，返回文件的完整路径，文件名由用户ID和类型后缀组成，例如：user123.json
            file_path = file_dir + os.sep + self.user.id + '.' + type
            return file_path

        except Exception as e:
            # 捕获所有异常并记录详细日志，便于排查错误
            logger.exception(e)

    def initialize_info(self, user_config):
        """初始化爬虫信息，设置基础属性并根据配置加载对应的写入器和下载器"""

        # 初始化已获取数据条数计数器
        self.got_num = 0

        # 保存用户传入的配置参数
        self.user_config = user_config

        # 初始化微博ID列表，用于存储后续抓取的微博ID
        self.weibo_id_list = []

        # 判断结束日期是否为 'now'，如果是则使用当前时间作为新的起始时间点
        if self.end_date == 'now':
            self.new_since_date = datetime.now().strftime('%Y-%m-%d %H:%M')
        else:
            # 否则使用用户配置的结束日期作为起始时间点
            self.new_since_date = self.end_date

        # 初始化写入器列表，用于存放多种数据写入方式的实例
        self.writers = []

        # 根据写入模式配置加载对应的写入器模块及实例
        if 'csv' in self.write_mode:
            from .writer import CsvWriter
            # 实例化CSV写入器，传入文件路径和筛选条件
            self.writers.append(
                CsvWriter(self._get_filepath('csv'), self.filter))

        if 'txt' in self.write_mode:
            from .writer import TxtWriter
            # 实例化TXT写入器，传入文件路径和筛选条件
            self.writers.append(
                TxtWriter(self._get_filepath('txt'), self.filter))

        if 'json' in self.write_mode:
            from .writer import JsonWriter
            # 实例化JSON写入器，传入文件路径
            self.writers.append(JsonWriter(self._get_filepath('json')))

        if 'mysql' in self.write_mode:
            from .writer import MySqlWriter
            # 实例化MySQL写入器，传入MySQL数据库配置
            self.writers.append(MySqlWriter(self.mysql_config))

        if 'mongo' in self.write_mode:
            from .writer import MongoWriter
            # 实例化MongoDB写入器，传入MongoDB配置
            self.writers.append(MongoWriter(self.mongo_config))

        if 'sqlite' in self.write_mode:
            from .writer import SqliteWriter
            # 实例化SQLite写入器，传入SQLite配置
            self.writers.append(SqliteWriter(self.sqlite_config))

        if 'kafka' in self.write_mode:
            from .writer import KafkaWriter
            # 实例化Kafka写入器，传入Kafka配置
            self.writers.append(KafkaWriter(self.kafka_config))

        if 'post' in self.write_mode:
            from .writer import PostWriter
            # 实例化Post请求写入器，传入相关配置
            self.writers.append(PostWriter(self.post_config))

        # 初始化下载器列表，用于存放图片和视频下载器实例
        self.downloaders = []

        # 如果配置开启了原图下载（pic_download为1）
        if self.pic_download == 1:
            from .downloader import (OriginPictureDownloader,
                                    RetweetPictureDownloader)
            # 实例化原图下载器，传入图片保存路径和超时时间
            self.downloaders.append(
                OriginPictureDownloader(self._get_filepath('img'),
                                        self.file_download_timeout))

        # 如果开启了图片下载且不启用过滤，则添加转发图下载器
        if self.pic_download and not self.filter:
            self.downloaders.append(
                RetweetPictureDownloader(self._get_filepath('img'),
                                        self.file_download_timeout))

        # 如果配置开启了视频下载（video_download为1）
        if self.video_download == 1:
            from .downloader import VideoDownloader
            # 实例化视频下载器，传入视频保存路径和超时时间
            self.downloaders.append(
                VideoDownloader(self._get_filepath('video'),
                                self.file_download_timeout))

    def get_one_user(self, user_config):
        """
        生成器函数：用于爬取单个用户的信息流程
        主要步骤：
        1. 根据用户配置中的 URI 获取用户基本信息
        2. yield 出 User 对象供外部接收和处理
        3. 进一步爬取该用户的关注列表和粉丝列表
        """

        # 从配置中获取目标用户的URI地址
        uri = user_config['user_uri']

        try:
            # 调用方法获取用户详细信息，返回 User 实例或错误信息
            user = self.get_user_info(uri)

            # 如果返回值不是 User 类实例，说明获取失败，直接返回该结果
            if not isinstance(user, User):
                return user

            # 成功获取用户信息后，先 yield 一条成功日志信息（字符串）
            yield f'获取用户 {user.id} 信息成功，昵称：{user.nickname}\n'

            # 抛出 User 实例，外层调用方可以捕获此对象并进行数据持久化等操作
            yield user

            # 通过 FollowParser 爬取该用户的关注列表，并将结果逐条 yield 出去
            yield from FollowParser(self.cookie, user.id).extract_follow_list()

            # 通过 FansParser 爬取该用户的粉丝列表，并将结果逐条 yield 出去
            yield from FansParser(self.cookie, user.id).extract_fans_list()

            # 如果需要，后续可打开注释下载用户头像相册图片
            # yield from AvatarDownloader(user.id).download()

        except Exception as e:
            # 异常处理，用户不存在或已注销时返回错误信息字典
            print(e)
            yield {
                'error': 0,
                'message': '用户不存在或已注销，请尝试更换用户',
            }

            # 以下注释代码是之前可能的初始化、写入、下载等操作逻辑，
            # 目前注释不启用，保留以备后续参考或恢复。

            # self.initialize_info(user_config)
            # self.write_user(self.user)
            # logger.info('*' * 100)

            # # 下载用户头像相册中的图片。
            # if self.pic_download:
            #     self.download_user_avatar(user_config['user_uri'])

            # for weibos in self.get_weibo_info():
            #     self.write_weibo(weibos)
            #     self.got_num += len(weibos)
            # if not self.filter:
            #     logger.info(u'共爬取' + str(self.got_num) + u'条微博')
            # else:
            #     logger.info(u'共爬取' + str(self.got_num) + u'条原创微博')
            # logger.info(u'信息抓取完毕')
            # logger.info('*' * 100)

    def get_user_posts(self, user_config):
        """
        生成器函数：爬取单个用户的微博动态
        主要流程：
        1. 根据用户配置调用 get_weibo_info 获取微博数据列表
        2. 逐条 yield 出微博数据
        3. 统计已获取微博条数
        4. 完成后 yield 一条爬取结果统计信息
        """

        try:
            # 遍历通过 get_weibo_info 获取的微博分页列表
            for weibos in self.get_weibo_info(user_config):
                # 这里注释掉了写入微博的代码，若需要可以恢复
                # self.write_weibo(weibos)

                # 遍历当前页所有微博，将单条微博逐个yield出去
                for weibo in weibos:
                    yield weibo

                # 累计已经获取的微博数
                self.got_num += len(weibos)

            # 根据是否过滤原创微博，yield 出最终的抓取统计信息
            if not self.filter:
                yield u'共爬取' + str(self.got_num) + u'条微博'
            else:
                yield u'共爬取' + str(self.got_num) + u'条原创微博'

        except Exception as e:
            # 异常捕获，返回错误信息字典（包括异常描述）
            yield {
                'error': 0,
                'message': '用户不存在或已注销，请尝试更换用户' + str(e),
            }

            # 以下注释代码是之前的初始化、写入、日志和头像下载逻辑，暂时未启用
            # self.initialize_info(user_config)
            # self.write_user(self.user)
            # logger.info('*' * 100)

            # # 下载用户头像相册中的图片。
            # if self.pic_download:
            #     self.download_user_avatar(user_config['user_uri'])


    def start(self):
        """运行爬虫，依次爬取配置的每个用户的基本信息"""

        try:
            # 如果用户配置列表为空，打印提示日志并退出
            if not self.user_config_list:
                logger.info(
                    u'没有配置有效的user_id，请通过config.json或user_id_list.txt配置user_id')
                return

            # 初始化用户计数器
            user_count = 0
            # 从配置的随机等待页数范围内随机取一个值，作为初始基准
            user_count1 = random.randint(*self.random_wait_pages)
            # 再随机决定间隔多少用户进行一次随机休眠
            random_users = random.randint(*self.random_wait_pages)

            total = len(self.user_config_list)
            # 遍历所有用户配置，idx从1开始计数
            for idx, user_config in enumerate(self.user_config_list, 1):
                # 获取用户URI
                uri = user_config['user_uri']

                # 根据计数和随机参数，决定是否进行随机休眠，防止爬取过于频繁
                if (user_count - user_count1) % random_users == 0:
                    # 随机休眠一段时间，秒数范围由配置决定
                    sleep(random.randint(*self.random_wait_seconds))
                    # 重新设置基准和间隔，保证休眠不固定
                    user_count1 = user_count
                    random_users = random.randint(*self.random_wait_pages)

                user_count += 1

                # 输出开始爬取该用户基本信息的提示
                yield f'[{idx}/{total}] 开始爬取用户 {uri} 的基本信息...\n'

                # 调用生成器函数，逐条产出该用户信息爬取结果
                yield from self.get_one_user(user_config)

                # 输出完成该用户信息爬取的提示
                yield f'[{idx}/{total}] 完成用户 {uri} 信息爬取。\n'

        except Exception as e:
            # 记录异常堆栈日志，便于调试
            logger.exception(e)


    def crawl_posts(self):
        """爬取所有配置用户的微博动态"""

        try:
            # 如果用户配置列表为空，打印提示日志并退出
            if not self.user_config_list:
                logger.info(
                    u'没有配置有效的user_id，请通过config.json或user_id_list.txt配置user_id')
                return

            # 初始化用户计数器
            user_count = 0
            # 随机获取一个基准值，用于控制休眠触发
            user_count1 = random.randint(*self.random_wait_pages)
            # 随机决定间隔多少用户后休眠
            random_users = random.randint(*self.random_wait_pages)

            total = len(self.user_config_list)
            # 遍历所有用户配置
            for idx, user_config in enumerate(self.user_config_list, 1):
                # 获取用户URI
                uri = user_config['user_uri']

                # 判断是否满足休眠条件，避免频繁请求
                if (user_count - user_count1) % random_users == 0:
                    # 随机休眠一定秒数
                    sleep(random.randint(*self.random_wait_seconds))
                    # 更新基准和间隔，保证休眠触发点随机化
                    user_count1 = user_count
                    random_users = random.randint(*self.random_wait_pages)

                user_count += 1

                # 输出开始爬取用户微博的提示
                yield f'[{idx}/{total}] 开始爬取用户 {uri} 的最新微博...\n'

                # 逐条产出该用户微博爬取结果
                yield from self.get_user_posts(user_config)

                # 输出完成用户微博爬取提示
                yield f'[{idx}/{total}] 完成用户 {uri} 的微博信息爬取。\n'

        except Exception as e:
            # 记录异常信息堆栈日志
            logger.exception(e)

def _get_config():
    """读取并返回 config.json 配置数据，如果不存在则复制默认示例文件并提示用户配置"""

    # 获取当前文件所在目录下的 config_sample.json 示例配置文件的绝对路径
    src = os.path.split(
        os.path.realpath(__file__))[0] + os.sep + 'config_sample.json'

    # 获取当前工作目录下 WeiboSpider/config.json 的路径，作为实际配置文件路径
    config_path = os.getcwd() + os.sep + 'WeiboSpider/config.json'

    # 如果你使用命令行参数传入了配置路径，可以取消注释使用
    # if FLAGS.config_path:
    #     config_path = FLAGS.config_path

    # 如果配置文件不存在，则从示例配置复制一份，并提示用户去配置
    if not os.path.isfile(config_path):
        shutil.copy(src, config_path)
        logger.info(u'请先配置当前目录(%s)下的config.json文件，'
                    u'如果想了解config.json参数的具体意义及配置方法，请访问\n'
                    u'https://github.com/dataabc/weiboSpider#2程序设置' %
                    os.getcwd())
        # 配置缺失，程序退出
        sys.exit()

    try:
        # 读取配置文件内容
        with open(config_path) as f:
            try:
                # 校验 cookie 配置是否有效，失败则记录提示日志
                config_util.check_cookie(config_path)
            except Exception:
                logger.info("Using the cookie field in config.json as the request cookie.")

            # 将读取的JSON字符串解析为Python字典
            config = json.loads(f.read())

            # 返回解析后的配置字典
            return config
    except ValueError:
        # JSON格式错误，打印错误日志并退出
        logger.error(u'config.json 格式不正确，请访问 '
                     u'https://github.com/dataabc/weiboSpider#2程序设置')
        sys.exit()


def main(_):
    """主程序入口，负责初始化爬虫并启动爬取"""

    try:
        # 获取配置文件
        config = _get_config()

        # 校验配置合法性，确保参数正确
        config_util.validate_config(config)

        # 创建爬虫实例，传入配置
        wb = Spider(config)

        # 启动爬虫开始爬取微博信息
        wb.start()
    except Exception as e:
        # 捕获并打印异常堆栈，方便调试
        logger.exception(e)


if __name__ == '__main__':
    # 通过应用框架（如 absl.app）启动主程序
    app.run(main)