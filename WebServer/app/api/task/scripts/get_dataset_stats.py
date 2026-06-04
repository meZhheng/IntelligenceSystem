from app.models import ApplicationGroup, get_dataset_type, application_group_datasets, DataBase, Dataset, Model, ApplicationResult, DatasetStats
from app.extensions import db
from datetime import datetime, timezone
import jieba
from collections import Counter
import re

def get_merge_map_stats(group_id, dataset_ids):
    """
    根据 group_id 和 dataset_ids 合并多个数据集的地理分布统计（map_stats）。
    说明：
    - mode 固定为 'map'，表示地理分布相关统计。
    - model_id 设为 -1，表示统计的是整个数据集层面的汇总，不区分具体模型。
    - 如果数据库中已有对应中间结果，则直接读取使用，避免重复计算。
    - 否则从原始数据中计算统计结果，并保存到数据库以便后续使用。

    返回结构：
    {
        "map_stats": [
            {"name": "地点1", "value": 数量1},
            {"name": "地点2", "value": 数量2},
            ...
        ],
        "max_value": 统计中最大的数量，用于图形等展示的最大值设定
    }
    """
    merged_stats = {}  # 存储合并后各地点的累计数量
    max_value = 0  # 记录当前合并后数量的最大值

    # 从数据库查询已有的中间结果，条件：
    # 1) 组ID匹配
    # 2) 统计模式为 'map'
    # 3) 数据集ID在目标列表内
    # 4) model_id 为 -1（表示数据集层面）
    existing_stats = DatasetStats.query.filter(
        DatasetStats.group_id == group_id,
        DatasetStats.mode == 'map',
        DatasetStats.dataset_id.in_(dataset_ids),
        DatasetStats.model_id == -1
    ).all()

    # 构造一个字典方便后续快速查找：dataset_id -> 对应统计数据
    stats_dict = {stat.dataset_id: stat.data for stat in existing_stats}

    for ds_id in dataset_ids:
        # 优先使用已有的中间结果
        if ds_id in stats_dict:
            result_data = stats_dict[ds_id]
        else:
            # 如果没有缓存，则从原始数据中计算
            dataset_obj = Dataset.query.get(ds_id)
            if not dataset_obj:
                # 如果数据集不存在，则跳过该数据集
                continue
            
            # 根据数据集类型，获取对应的ORM模型类
            dataset_type = get_dataset_type(dataset_obj.dataset_type)
            
            # 查询该数据集下所有原始数据记录
            data_list = dataset_type.query.filter_by(dataset_id=ds_id).all()
            
            location_counts = {}  # 用于统计各地点的数量
            
            for data in data_list:
                # 假设每条数据的 location 字段保存了地理位置信息
                location = data.location
                if location:
                    location_counts[location] = location_counts.get(location, 0) + 1
            
            # 将统计结果转为 [{'name': 地点, 'value': 数量}, ...] 格式
            result_data = [{"name": loc, "value": count} for loc, count in location_counts.items()]
            
            # 保存计算结果到数据库，方便后续快速读取
            new_stat = DatasetStats(
                group_id=group_id,
                dataset_id=ds_id,
                model_id=-1,  # 标记为数据集层面统计
                mode='map',
                data=result_data,
                timestamp=datetime.now(timezone.utc)
            )
            db.session.add(new_stat)
            db.session.commit()
            
            # 更新字典缓存
            stats_dict[ds_id] = result_data

        # 合并当前数据集的统计结果到 merged_stats 中（相同地点累加）
        for entry in result_data:
            name = entry['name']
            value = entry['value']
            merged_stats[name] = merged_stats.get(name, 0) + value
            # 更新最大值
            max_value = max(max_value, merged_stats[name])

    # 返回合并后的数据和最大值，方便前端使用
    return {
        "map_stats": [{"name": loc, "value": count} for loc, count in merged_stats.items()],
        "max_value": max_value
    }


def get_author_activity_stats(group_id, dataset_ids):
    """
    统计数据集中作者（如媒体账号、个人账号等）的活跃度，并获取每位作者最新的认证类型和IP属地信息。
    统计规则：
    - 统计作者出现次数，作为活跃度指标。
    - 获取每个作者最新的一条记录中的认证类型(auth_type)和IP属地(location)。
    - 优先使用已有的中间结果缓存，避免重复计算。
    - 最终结果按照活跃度从高到低排序。

    返回格式示例：
    [
        { "name": "作者A", "value": 2345, "auth_type": "认证类型A", "ip": "属地A" },
        { "name": "作者B", "value": 1890, "auth_type": "认证类型B", "ip": "属地B" },
        ...
    ]
    """
    merged_stats = {}  # 用于合并不同数据集作者统计结果

    # 查询数据库中已有的作者活跃度统计结果，条件与上面类似，只是 mode 为 'ranking_author'
    existing_stats = DatasetStats.query.filter(
        DatasetStats.group_id == group_id,
        DatasetStats.mode == 'ranking_author',
        DatasetStats.dataset_id.in_(dataset_ids),
        DatasetStats.model_id == -1  # 数据集层面的标记
    ).all()

    # 构建 dataset_id -> 中间结果 的映射
    stats_dict = {stat.dataset_id: stat.data for stat in existing_stats}

    for ds_id in dataset_ids:
        # 如果已有缓存数据，直接使用
        if ds_id in stats_dict:
            result_data = stats_dict[ds_id]
        else:
            # 否则，从原始数据中重新计算
            dataset_obj = Dataset.query.get(ds_id)
            if not dataset_obj:
                continue
            dataset_type = get_dataset_type(dataset_obj.dataset_type)  # 获取对应ORM类
            data_list = dataset_type.query.filter_by(dataset_id=ds_id).all()

            author_counts = {}  # 统计作者出现次数
            author_latest_info = {}  # 记录作者最新记录的认证类型和IP属地

            for data in data_list:
                author = data.author
                if not author:
                    continue

                # 累计作者出现次数
                author_counts[author] = author_counts.get(author, 0) + 1

                # 记录该作者最新数据（时间最大的那条）
                if author not in author_latest_info or data.publish_time > author_latest_info[author]['publish_time']:
                    author_latest_info[author] = {
                        "auth_type": data.auth_type,
                        "ip": data.location,
                        "publish_time": data.publish_time
                    }

            # 转换为需要的格式列表，方便前端显示
            result_data = [
                {
                    "name": author,
                    "value": count,
                    "auth_type": author_latest_info[author]["auth_type"],
                    "ip": author_latest_info[author]["ip"]
                }
                for author, count in author_counts.items()
            ]

            # 保存计算结果为中间结果，供后续查询使用
            new_stat = DatasetStats(
                group_id=group_id,
                dataset_id=ds_id,
                model_id=-1,  # 标记为数据集层级统计
                mode='ranking_author',
                data=result_data,
                timestamp=datetime.now(timezone.utc)
            )
            db.session.add(new_stat)
            db.session.commit()
            stats_dict[ds_id] = result_data

        # 将当前数据集的作者统计结果合并到总结果中，累加活跃度值
        for entry in result_data:
            name = entry["name"]
            value = entry["value"]
            auth_type = entry["auth_type"]
            ip = entry["ip"]

            if name in merged_stats:
                merged_stats[name]["value"] += value  # 累加活跃度
            else:
                merged_stats[name] = {
                    "name": name,
                    "value": value,
                    "auth_type": auth_type,
                    "ip": ip
                }

    # 按活跃度降序排序
    ranking = sorted(merged_stats.values(), key=lambda x: x["value"], reverse=True)

    return {
        'content': ranking,
        'title': ['媒体/账号名称', '认证类型', 'ip属地', '活跃度']
    }

def get_merge_station_stats(group_id, dataset_ids):
    """
    根据 group_id 和 dataset_ids，统计多个数据集中的站点（station）出现次数，并合并为整体统计结果。
    主要流程：
    1. 先从数据库中查询是否已有对应的中间统计结果（mode='distribution_station'，model_id=-1）；
    2. 如果已有则直接使用，避免重复计算；
    3. 否则从原始数据表中读取数据，统计每个站点出现的次数，并保存为中间结果；
    4. 对所有数据集的结果进行合并，累计相同站点的出现次数；
    5. 返回合并后的结果，按次数从高到低排序。

    返回格式为列表：
    [
        {"name": "站点A", "value": countA},
        {"name": "站点B", "value": countB},
        ...
    ]
    """
    merged_stats = {}  # 存储合并后的站点统计，key为站点名，value为累计次数
    
    # 查询数据库已有的中间结果，条件：
    # - group_id匹配
    # - 统计模式为 'distribution_station'
    # - 数据集ID在指定列表内
    # - model_id为-1，表示数据集层面的统计结果
    existing_stats = DatasetStats.query.filter(
        DatasetStats.group_id == group_id,
        DatasetStats.mode == 'distribution_station',
        DatasetStats.dataset_id.in_(dataset_ids),
        DatasetStats.model_id == -1
    ).all()
    
    # 构造映射：dataset_id -> 已存储的统计数据，方便后续快速访问
    stats_dict = {stat.dataset_id: stat.data for stat in existing_stats}
    
    # 遍历每个数据集ID
    for ds_id in dataset_ids:
        if ds_id in stats_dict:
            # 直接使用已有的中间结果，避免重复计算
            result_data = stats_dict[ds_id]
        else:
            # 无中间结果，则从原始数据计算统计
            dataset_obj = Dataset.query.get(ds_id)
            if not dataset_obj:
                # 数据集不存在，跳过
                continue
            # 根据数据集类型获取对应ORM模型类
            dataset_type = get_dataset_type(dataset_obj.dataset_type)
            # 查询该数据集下所有数据记录
            data_list = dataset_type.query.filter_by(dataset_id=ds_id).all()
            
            station_counts = {}
            for data in data_list:
                # 假设每条数据的 source_station 字段保存了站点名称
                station = data.source_station
                if station:
                    station_counts[station] = station_counts.get(station, 0) + 1
            
            # 转换为标准格式列表
            result_data = [{"name": s, "value": cnt} for s, cnt in station_counts.items()]
            
            # 新建数据库条目，保存为中间结果，方便下次直接读取
            new_stat = DatasetStats(
                group_id=group_id,
                dataset_id=ds_id,
                model_id=-1,  # 标记为数据集层面统计
                mode='distribution_station',
                data=result_data,
                timestamp=datetime.now(timezone.utc)
            )
            db.session.add(new_stat)
            db.session.commit()
            
            # 更新字典缓存
            stats_dict[ds_id] = result_data
        
        # 合并当前数据集统计结果到总的合并结果中，累计相同站点次数
        for entry in result_data:
            name = entry['name']
            value = entry['value']
            merged_stats[name] = merged_stats.get(name, 0) + value
    
    # 将字典转换为列表，并按次数降序排序，方便前端展示
    merged_list = [{"name": station, "value": count} for station, count in merged_stats.items()]
    merged_list.sort(key=lambda x: x["value"], reverse=True)
    
    return merged_list


def get_merge_source_stats(group_id, dataset_ids):
    """
    根据 group_id 和 dataset_ids，统计多个数据集中的新闻来源（news_source）出现次数，并合并为整体统计结果。
    主要逻辑与 get_merge_station_stats 类似，区别是统计字段不同、mode不同。

    处理步骤：
    - 查询是否已有中间结果（mode='distribution_source'，model_id=-1）；
    - 无中间结果时从原始数据统计；
    - 合并所有数据集结果，累加相同来源出现次数；
    - 返回按次数降序排列的来源列表。

    返回格式：
    [
        {"name": "来源A", "value": countA},
        {"name": "来源B", "value": countB},
        ...
    ]
    """
    merged_stats = {}  # 存储合并后的来源统计
    
    existing_stats = DatasetStats.query.filter(
        DatasetStats.group_id == group_id,
        DatasetStats.mode == 'distribution_source',
        DatasetStats.dataset_id.in_(dataset_ids),
        DatasetStats.model_id == -1
    ).all()
    
    stats_dict = {stat.dataset_id: stat.data for stat in existing_stats}
    
    for ds_id in dataset_ids:
        if ds_id in stats_dict:
            result_data = stats_dict[ds_id]
        else:
            dataset_obj = Dataset.query.get(ds_id)
            if not dataset_obj:
                continue
            dataset_type = get_dataset_type(dataset_obj.dataset_type)
            data_list = dataset_type.query.filter_by(dataset_id=ds_id).all()
            
            source_counts = {}
            for data in data_list:
                # 假设 news_source 字段存储新闻来源名称
                source = data.news_source
                if source:
                    source_counts[source] = source_counts.get(source, 0) + 1
            
            result_data = [{"name": s, "value": cnt} for s, cnt in source_counts.items()]
            new_stat = DatasetStats(
                group_id=group_id,
                dataset_id=ds_id,
                model_id=-1,
                mode='distribution_source',
                data=result_data,
                timestamp=datetime.now(timezone.utc)
            )
            db.session.add(new_stat)
            db.session.commit()
            stats_dict[ds_id] = result_data
        
        for entry in result_data:
            name = entry['name']
            value = entry['value']
            merged_stats[name] = merged_stats.get(name, 0) + value
    
    merged_list = [{"name": source, "value": count} for source, count in merged_stats.items()]
    merged_list.sort(key=lambda x: x["value"], reverse=True)
    
    return merged_list


def load_stopwords(filepath="./stopwords.txt"):
    """
    读取停用词文件，加载为一个集合。
    若文件不存在，则打印警告并返回空集合。
    """
    stopwords = set()
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            stopwords = set(word.strip() for word in f.readlines())
    except FileNotFoundError:
        print(f"Warning: 停用词文件 {filepath} 未找到，未进行停用词过滤")
    return stopwords


def get_word_frequency(group_id, dataset_ids):
    """
    统计给定 group_id 和 dataset_ids 中所有记录的词频。
    流程：
    1. 查询数据库中是否已有对应中间结果（mode='word_freq', model_id=-1）；
    2. 若已有，直接使用；否则从原始数据中读取文本进行分词和词频统计，结果保存为中间结果；
    3. 合并多个数据集的词频统计，累计词频；
    4. 返回合并后的词频列表，按词频降序排序。

    处理细节：
    - 只统计中文词汇（通过正则提取中文字符）
    - 使用 jieba 进行分词
    - 过滤停用词、空白和单字符词汇

    返回格式：
    [
        {"name": "词语1", "value": 频率1},
        {"name": "词语2", "value": 频率2},
        ...
    ]
    """
    merged_word_freq = {}  # 存储所有数据集合并后的词频结果

    # 查询已有词频统计中间结果
    existing_stats = DatasetStats.query.filter(
        DatasetStats.group_id == group_id,
        DatasetStats.mode == 'word_freq',
        DatasetStats.dataset_id.in_(dataset_ids),
        DatasetStats.model_id == -1
    ).all()

    stats_dict = { stat.dataset_id: stat.data for stat in existing_stats }

    for ds_id in dataset_ids:
        if ds_id in stats_dict:
            result_data = stats_dict[ds_id]
        else:
            STOPWORDS = load_stopwords()
            CHINESE_PATTERN = re.compile(r"[\u4e00-\u9fff]+")
            dataset_obj = Dataset.query.get(ds_id)
            if not dataset_obj:
                continue

            dataset_type = get_dataset_type(dataset_obj.dataset_type)
            data_list = dataset_type.query.filter_by(dataset_id=ds_id).all()
            word_counts = {}

            for data in data_list:
                text = data.text
                if not text:
                    continue

                # 提取中文字符，排除非中文部分
                chinese_text = "".join(CHINESE_PATTERN.findall(text))
                words = jieba.cut(chinese_text)

                for word in words:
                    word = word.strip()
                    # 过滤停用词、空白词及单字符词
                    if not word or word in STOPWORDS or len(word) == 1:
                        continue
                    word_counts[word] = word_counts.get(word, 0) + 1

            result_data = [{"name": word, "value": count} for word, count in word_counts.items()]
            result_data.sort(key=lambda x: x["value"], reverse=True)

            new_stat = DatasetStats(
                group_id = group_id,
                dataset_id = ds_id,
                model_id = -1,
                mode = 'word_freq',
                data = result_data,
                timestamp = datetime.now(timezone.utc)
            )
            db.session.add(new_stat)
            db.session.commit()
            stats_dict[ds_id] = result_data

        # 合并当前数据集词频到总词频
        for entry in result_data:
            word = entry["name"]
            count = entry["value"]
            merged_word_freq[word] = merged_word_freq.get(word, 0) + count

    merged_result_list = [{"name": word, "value": count} for word, count in merged_word_freq.items()]
    merged_result_list.sort(key=lambda x: x["value"], reverse=True)

    return merged_result_list