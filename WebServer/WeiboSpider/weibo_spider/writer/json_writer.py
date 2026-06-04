import codecs
import json
import logging
import os

# 导入基类 Writer
from .writer import Writer

# 获取名为 'spider.json_writer' 的 logger 实例
logger = logging.getLogger('spider.json_writer')


# JsonWriter 类用于将爬取的微博数据写入 JSON 文件
class JsonWriter(Writer):
    def __init__(self, file_path):
        # 初始化 JSON 文件路径
        self.file_path = file_path

    def write_user(self, user):
        # 写入用户信息，暂存为实例属性（将用于后续写入微博信息中）
        self.user = user

    def _update_json_data(self, data, weibo_info):
        """
        更新要写入 JSON 文件的数据：
        - 若已有数据，则更新已有微博信息或追加新微博
        - 若没有，则直接写入新微博列表
        """
        # 将用户信息转为字典格式，写入 data 中
        data['user'] = self.user.__dict__

        if data.get('weibo'):
            # 判断微博列表是否是新增的（避免重复写入）
            is_new = 1  # 1 表示待写入微博都是新微博
            for old in data['weibo']:
                # 如果已有微博中存在最后一条新微博的 id，说明存在重复数据
                if weibo_info[-1]['id'] == old['id']:
                    is_new = 0
                    break

            if is_new == 0:
                # 存在重复数据，需要更新已有微博或追加新微博
                for new in weibo_info:
                    flag = 1  # 标记是否为新微博
                    for i, old in enumerate(data['weibo']):
                        if new['id'] == old['id']:
                            # 若微博 ID 已存在，更新旧数据
                            data['weibo'][i] = new
                            flag = 0
                            break
                    if flag:
                        # 若该微博不存在于已有数据中，则追加
                        data['weibo'].append(new)
            else:
                # 若全是新微博，直接拼接到已有列表中
                data['weibo'] += weibo_info
        else:
            # 若原 JSON 文件中没有微博数据，则直接赋值
            data['weibo'] = weibo_info

        return data

    def write_weibo(self, weibos):
        """将爬到的信息写入 JSON 文件"""
        data = {}

        # 如果目标文件已存在，读取已有数据
        if os.path.isfile(self.file_path):
            with codecs.open(self.file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

        # 更新 JSON 数据（整合新微博内容）
        data = self._update_json_data(data, [w.__dict__ for w in weibos])

        # 写入更新后的数据到文件（覆盖原文件）
        with codecs.open(self.file_path, 'w', encoding='utf-8') as f:
            f.write(json.dumps(data, indent=4, ensure_ascii=False))

        # 日志记录写入成功的信息
        logger.info(u'%d条微博写入json文件完毕，保存路径：%s', len(weibos), self.file_path)
