from app.models import ApplicationGroup, get_dataset_type, application_group_datasets, DataBase, Dataset, Model, ApplicationResult, DatasetStats
from datetime import datetime, timezone
from app.extensions import db
from sqlalchemy.orm.attributes import flag_modified
from flask import current_app
import random

def get_overall_sentiment_analysis(group_id, dataset_ids, model_ids):
    """
    计算总体情绪分析统计，统计给定 group_id 下多个数据集和模型组合的负面、中立、正面数量总和。

    主要步骤：
    1. 从 DatasetStats 查询已有的中间统计结果，按 (dataset_id, model_id) 分组。
    2. 针对每个数据集-模型组合，检查是否有更新的 ApplicationResult 记录。
       - 如果有新记录，增量统计更新 DatasetStats。
       - 否则直接使用已有统计数据。
    3. 最终合并所有数据集和模型的统计结果，返回总计数。
    
    返回格式示例：
    {
        "negative": 123,
        "neutral": 456,
        "positive": 789,
        "total": 1368
    }
    """
    overall_stats = {"negative": 0, "neutral": 0, "positive": 0}

    # 查询已有的情绪统计中间结果，过滤条件包括 group_id、mode='overall_stats'、dataset_id 和 model_id 列表
    existing_stats = DatasetStats.query.filter(
        DatasetStats.group_id == group_id,
        DatasetStats.mode == 'overall_stats',
        DatasetStats.dataset_id.in_(dataset_ids),
        DatasetStats.model_id.in_(model_ids)
    ).all()

    # 构造映射 (dataset_id, model_id) -> DatasetStats 实例，方便快速访问
    stats_dict = {(stat.dataset_id, stat.model_id): stat for stat in existing_stats}

    # 遍历所有数据集和模型组合
    for ds_id in dataset_ids:
        for m_id in model_ids:
            key = (ds_id, m_id)
            if key in stats_dict:
                # 已有统计数据，读取数据和最后更新时间
                stat_record = stats_dict[key]
                result_data = stat_record.data
                last_update_time = stat_record.timestamp
            else:
                # 无已有统计，初始化数据和更新时间
                result_data = {"negative": 0, "neutral": 0, "positive": 0}
                last_update_time = None

            # 查询该组合下，更新于最后时间之后的应用结果（ApplicationResult）
            new_results_query = ApplicationResult.query.filter(
                ApplicationResult.group_id == group_id,
                ApplicationResult.dataset_id == ds_id,
                ApplicationResult.model_id == m_id
            )
            if last_update_time:
                new_results_query = new_results_query.filter(ApplicationResult.timestamp > last_update_time)

            new_results = new_results_query.all()

            # 若无新数据，累加现有数据后继续
            if not new_results:
                overall_stats["negative"] += result_data["negative"]
                overall_stats["neutral"]  += result_data["neutral"]
                overall_stats["positive"] += result_data["positive"]
                continue

            # 获取数据集 ORM 类及模型实例，供后续情绪解析使用
            dataset_obj = Dataset.query.get(ds_id)
            if not dataset_obj:
                continue
            dataset_type = get_dataset_type(dataset_obj.dataset_type)

            new_data_ids = {res.to_dict()['data_id'] for res in new_results}
            data_objs = dataset_type.query.filter(dataset_type.id.in_(list(new_data_ids))).all()
            data_dict = {d.id: d for d in data_objs}

            model_instance = Model.query.get(m_id)
            if not model_instance:
                continue

            # 遍历新结果，根据模型转换得到的情绪结果更新统计
            for res in new_results:
                item = res.to_dict()
                data_id = item['data_id']
                raw = item['result']

                data = data_dict.get(data_id)
                if not data:
                    continue

                target_sentiment = model_instance.convert_result(m_id, raw)

                # 对每个情绪值进行计数
                for sentiment in target_sentiment.values():
                    if sentiment == "负面":
                        result_data["negative"] += 1
                    elif sentiment == "中立":
                        result_data["neutral"] += 1
                    elif sentiment == "正面":
                        result_data["positive"] += 1

            # 更新数据库中的 DatasetStats 记录
            if key in stats_dict:
                stat_record.data = result_data
                stat_record.timestamp = datetime.now(timezone.utc)
                flag_modified(stat_record, "data")
            else:
                new_stat = DatasetStats(
                    group_id=group_id,
                    dataset_id=ds_id,
                    model_id=m_id,
                    mode='overall_stats',
                    data=result_data,
                    timestamp=datetime.now(timezone.utc)
                )
                db.session.add(new_stat)
                stats_dict[key] = new_stat

            db.session.commit()

            # 累加当前组合的统计数据到 overall_stats
            overall_stats["negative"] += result_data["negative"]
            overall_stats["neutral"]  += result_data["neutral"]
            overall_stats["positive"] += result_data["positive"]

    overall_stats["total"] = overall_stats["negative"] + overall_stats["neutral"] + overall_stats["positive"]

    return overall_stats

def get_merged_trend_line_sentiment_analysis(group_id, dataset_ids, model_ids):
    """
    计算情绪趋势分析数据，按照日期和情绪目标（target）分类统计情绪分布。

    主要步骤：
    1. 查询已有的趋势线中间结果（mode='trend_line'）；
    2. 对每个数据集和模型组合，查找是否有新应用结果，增量更新数据；
    3. 结果结构为字典，外层key为日期字符串"YYYY-MM-DD"，内层key为情绪目标，值为情绪计数字典；
    4. 合并所有数据集和模型的数据，按日期和目标累积计数。

    返回示例：
    {
        "2024-07-14": {
            "target_1": {"negative": 10, "neutral": 5, "positive": 3},
            "target_2": {"negative": 2, "neutral": 7, "positive": 8},
            ...
        },
        "2024-07-15": {
            ...
        },
        ...
    }
    """
    merged_results = {}  # 最终合并后的趋势线数据

    # 保证数据集和模型ID唯一，避免重复统计
    dataset_ids = list(set(dataset_ids))
    model_ids = list(set(model_ids))

    # 查询已有的趋势线统计中间结果
    existing_stats = DatasetStats.query.filter(
        DatasetStats.group_id == group_id,
        DatasetStats.mode == 'trend_line',
        DatasetStats.dataset_id.in_(dataset_ids),
        DatasetStats.model_id.in_(model_ids)
    ).all()

    stats_dict = {(stat.dataset_id, stat.model_id): stat for stat in existing_stats}

    for ds_id in dataset_ids:
        for m_id in model_ids:
            key = (ds_id, m_id)
            if key in stats_dict:
                stat_record = stats_dict[key]
                result_data = stat_record.data
                last_update_time = stat_record.timestamp
            else:
                result_data = {}
                last_update_time = None

            # 查询应用结果中新产生的、时间晚于上次更新时间的记录
            new_results_query = ApplicationResult.query.filter(
                ApplicationResult.group_id == group_id,
                ApplicationResult.dataset_id == ds_id,
                ApplicationResult.model_id == m_id
            )
            if last_update_time:
                new_results_query = new_results_query.filter(ApplicationResult.timestamp > last_update_time)

            new_results = new_results_query.all()

            # 无新增数据时，直接合并已有趋势线数据到最终结果
            if not new_results:
                for date_str, target_data in result_data.items():
                    merged_results.setdefault(date_str, {})
                    for target, counts in target_data.items():
                        merged_results[date_str].setdefault(target, {"negative": 0, "neutral": 0, "positive": 0})
                        merged_results[date_str][target]["negative"] += counts.get("negative", 0)
                        merged_results[date_str][target]["neutral"] += counts.get("neutral", 0)
                        merged_results[date_str][target]["positive"] += counts.get("positive", 0)
                continue

            # 获取数据集对象和对应 ORM 类型
            dataset_obj = Dataset.query.get(ds_id)
            if not dataset_obj:
                continue
            dataset_type = get_dataset_type(dataset_obj.dataset_type)

            # 收集所有新增结果的 data_id，批量查询对应数据对象
            new_data_ids = {res.to_dict()['data_id'] for res in new_results}
            data_objs = dataset_type.query.filter(dataset_type.id.in_(list(new_data_ids))).all()
            data_dict = {d.id: d for d in data_objs}

            # 获取模型实例
            model_instance = Model.query.get(m_id)
            if not model_instance:
                continue

            # 遍历新增结果，根据模型转换得到的目标情绪分布，更新按日期和目标的统计
            for res in new_results:
                item = res.to_dict()
                data_id = item['data_id']
                raw = item['result']

                data = data_dict.get(data_id)
                if not data:
                    continue

                # 将数据的发布时间格式化为日期字符串
                date_str = data.publish_time.strftime("%Y-%m-%d")
                target_sentiment = model_instance.convert_result(m_id, raw)
                result_data.setdefault(date_str, {})

                # 针对每个情绪目标，累加对应的情绪计数
                for target, sentiment in target_sentiment.items():
                    result_data[date_str].setdefault(target, {"negative": 0, "neutral": 0, "positive": 0})
                    if sentiment == "负面":
                        result_data[date_str][target]["negative"] += 1
                    elif sentiment == "中立":
                        result_data[date_str][target]["neutral"] += 1
                    elif sentiment == "正面":
                        result_data[date_str][target]["positive"] += 1

            # 持久化更新 DatasetStats 中间结果
            if key in stats_dict:
                stat_record.data = result_data
                stat_record.timestamp = datetime.now(timezone.utc)
                flag_modified(stat_record, "data")
            else:
                new_stat = DatasetStats(
                    group_id=group_id,
                    dataset_id=ds_id,
                    model_id=m_id,
                    mode='trend_line',
                    data=result_data,
                    timestamp=datetime.now(timezone.utc)
                )
                db.session.add(new_stat)
                stats_dict[key] = new_stat

            db.session.commit()

            # 将当前数据集和模型组合的结果合并到最终返回的结果中
            for date_str, target_data in result_data.items():
                merged_results.setdefault(date_str, {})
                for target, counts in target_data.items():
                    merged_results[date_str].setdefault(target, {"negative": 0, "neutral": 0, "positive": 0})
                    merged_results[date_str][target]["negative"] += counts.get("negative", 0)
                    merged_results[date_str][target]["neutral"] += counts.get("neutral", 0)
                    merged_results[date_str][target]["positive"] += counts.get("positive", 0)

    return merged_results

def get_overall_stance_analysis(group_id, dataset_ids, model_ids):
    """
    计算总体立场分析统计:
    - 先从 `DatasetStats` 获取已存储的中间结果，并检查 `timestamp` 是否最新。
    - 如果有新的 `ApplicationResult` 记录，则增量更新统计数据。
    - 返回格式为包含三种情绪计数和总计数的字典。
      {
          "negative": X,
          "neutral": Y,
          "positive": Z,
          "total": X+Y+Z
      }
    """
    # 初始化整体统计计数字典，三种情绪初始为0
    overall_stats = {"negative": 0, "neutral": 0, "positive": 0}

    # 从数据库中查询符合条件（组ID，mode为overall_stats，数据集ID和模型ID范围内）的统计记录
    existing_stats = DatasetStats.query.filter(
        DatasetStats.group_id == group_id,
        DatasetStats.mode == 'overall_stats',
        DatasetStats.dataset_id.in_(dataset_ids),
        DatasetStats.model_id.in_(model_ids)
    ).all()

    # 将查询到的记录转换成字典，键为 (dataset_id, model_id)，方便后续快速查找
    stats_dict = {(stat.dataset_id, stat.model_id): stat for stat in existing_stats}

    # 对每个数据集ID和模型ID的组合进行遍历，逐一处理统计更新
    for ds_id in dataset_ids:
        for m_id in model_ids:
            key = (ds_id, m_id)

            if key in stats_dict:
                # 如果已有统计记录，取出之前的统计数据和更新时间
                stat_record = stats_dict[key]
                result_data = stat_record.data
                last_update_time = stat_record.timestamp
            else:
                # 如果没有统计记录，初始化一个空的统计结果，更新时间为空
                result_data = {"negative": 0, "neutral": 0, "positive": 0}
                last_update_time = None

            # 构建对 ApplicationResult 的查询，筛选当前组、数据集和模型的结果记录
            new_results_query = ApplicationResult.query.filter(
                ApplicationResult.group_id == group_id,
                ApplicationResult.dataset_id == ds_id,
                ApplicationResult.model_id == m_id
            )
            # 如果存在之前的更新时间，则只查询更晚的新增记录，实现增量更新
            if last_update_time:
                new_results_query = new_results_query.filter(ApplicationResult.timestamp > last_update_time)
            
            # 执行查询，获取新增的 ApplicationResult 记录列表
            new_results = new_results_query.all()
            
            # 如果没有新增记录，直接将已有统计数据加到整体统计中，继续下一组处理
            if not new_results:
                overall_stats["negative"] += result_data["negative"]
                overall_stats["neutral"]  += result_data["neutral"]
                overall_stats["positive"] += result_data["positive"]
                continue

            # 获取对应的数据集对象，用于获取数据类型
            dataset_obj = Dataset.query.get(ds_id)
            if not dataset_obj:
                # 若数据集不存在，跳过当前循环
                continue

            # 通过数据集类型名称获取对应的ORM模型类
            dataset_type = get_dataset_type(dataset_obj.dataset_type)

            # 收集所有新增 ApplicationResult 的 data_id，准备批量查询数据内容
            new_data_ids = {res.to_dict()['data_id'] for res in new_results}

            # 批量查询数据对象，避免循环中单条查询，提升效率
            data_objs = dataset_type.query.filter(dataset_type.id.in_(list(new_data_ids))).all()
            # 构建数据字典，键为数据id，值为数据对象，方便后续快速访问
            data_dict = {d.id: d for d in data_objs}

            # 获取模型实例，用于调用模型的方法转换原始结果
            model_instance = Model.query.get(m_id)
            if not model_instance:
                # 如果模型实例不存在，跳过当前循环
                continue

            # 遍历新增的每条结果记录，进行情绪统计增量更新
            for res in new_results:
                item = res.to_dict()
                data_id = item['data_id']
                raw = item['result']

                # 获取对应的数据对象，如果缺失则跳过
                data = data_dict.get(data_id)
                if not data:
                    continue

                # 调用模型实例的方法，将原始结果转换为具体情绪标签（如“支持”、“反对”等）
                target_sentiment = model_instance.convert_result(m_id, raw)

                # 根据转换的情绪标签，更新对应情绪计数
                for sentiment in target_sentiment.values():
                    if sentiment == "反对":
                        result_data["negative"] += 1
                    elif sentiment == "中立":
                        result_data["neutral"] += 1
                    elif sentiment == "支持":
                        result_data["positive"] += 1

            # 更新或新增 DatasetStats 中对应的统计记录，并刷新更新时间
            if key in stats_dict:
                stat_record.data = result_data
                stat_record.timestamp = datetime.now(timezone.utc)
                # 标记字段已修改，确保SQLAlchemy正确提交更新
                flag_modified(stat_record, "data")
            else:
                # 如果之前没有该记录，则新建并添加到会话中
                new_stat = DatasetStats(
                    group_id=group_id,
                    dataset_id=ds_id,
                    model_id=m_id,
                    mode='overall_stats',
                    data=result_data,
                    timestamp=datetime.now(timezone.utc)
                )
                db.session.add(new_stat)
                stats_dict[key] = new_stat

            # 提交数据库事务，保存更改
            db.session.commit()

            # 将当前数据集和模型组合的统计结果累加到整体统计中
            overall_stats["negative"] += result_data["negative"]
            overall_stats["neutral"]  += result_data["neutral"]
            overall_stats["positive"] += result_data["positive"]
    
    # 统计总数，等于三种情绪的和
    overall_stats["total"] = overall_stats["negative"] + overall_stats["neutral"] + overall_stats["positive"]

    # 返回总体立场统计结果
    return overall_stats

def get_merged_trend_line_stance_analysis(group_id, dataset_ids, model_ids):
    """
    计算立场趋势分析（按日期统计）:
    - 从 `DatasetStats` 获取已存储的趋势统计结果，检查时间戳判断是否需要增量更新。
    - 查询并处理 `ApplicationResult` 中比已存储统计更新的新增数据，实现数据的增量累积。
    - 统计结构以日期为一级键，二级键为目标(target)，每个目标包含三类情绪计数。
    - 返回格式示例：
      {
          "2023-07-01": {
              "target_1": {"negative": X, "neutral": Y, "positive": Z},
              "target_2": {"negative": A, "neutral": B, "positive": C},
              ...
          },
          "2023-07-02": { ... },
          ...
      }
    """
    # 存储最终的合并趋势结果
    merged_results = {}

    # 去重 dataset_ids 和 model_ids，避免重复查询
    dataset_ids = list(set(dataset_ids))
    model_ids = list(set(model_ids))

    # 查询数据库中已存在的符合条件的趋势统计记录
    existing_stats = DatasetStats.query.filter(
        DatasetStats.group_id == group_id,
        DatasetStats.mode == 'trend_line',
        DatasetStats.dataset_id.in_(dataset_ids),
        DatasetStats.model_id.in_(model_ids)
    ).all()

    # 构建键为(dataset_id, model_id)的字典，方便快速定位已存在统计
    stats_dict = {(stat.dataset_id, stat.model_id): stat for stat in existing_stats}

    # 遍历所有数据集和模型组合，分别处理其趋势统计
    for ds_id in dataset_ids:
        for m_id in model_ids:
            key = (ds_id, m_id)
            if key in stats_dict:
                # 如果存在已有统计，提取其数据和最后更新时间
                stat_record = stats_dict[key]
                result_data = stat_record.data
                last_update_time = stat_record.timestamp
            else:
                # 无历史统计时，初始化空字典和空更新时间
                result_data = {}
                last_update_time = None

            # 查询 ApplicationResult 中属于当前组合且更新时间晚于已有统计的记录（增量更新）
            new_results_query = ApplicationResult.query.filter(
                ApplicationResult.group_id == group_id,
                ApplicationResult.dataset_id == ds_id,
                ApplicationResult.model_id == m_id
            )
            if last_update_time:
                new_results_query = new_results_query.filter(ApplicationResult.timestamp > last_update_time)

            # 获取所有新增结果
            new_results = new_results_query.all()

            if not new_results:
                # 若无新增数据，直接将已有统计合并到最终结果中
                for date_str, target_data in result_data.items():
                    merged_results.setdefault(date_str, {})
                    for target, counts in target_data.items():
                        merged_results[date_str].setdefault(target, {"negative": 0, "neutral": 0, "positive": 0})
                        merged_results[date_str][target]["negative"] += counts.get("negative", 0)
                        merged_results[date_str][target]["neutral"] += counts.get("neutral", 0)
                        merged_results[date_str][target]["positive"] += counts.get("positive", 0)
                continue

            # 获取数据集对象，用于后续获取数据类型
            dataset_obj = Dataset.query.get(ds_id)
            if not dataset_obj:
                # 数据集不存在则跳过当前循环
                continue

            # 根据数据集类型字符串获取对应ORM类
            dataset_type = get_dataset_type(dataset_obj.dataset_type)

            # 预先提取所有新增结果中的 data_id，准备批量查询
            new_data_ids = {res.to_dict()['data_id'] for res in new_results}

            # 批量查询数据对象，避免循环中频繁查询数据库
            data_objs = dataset_type.query.filter(dataset_type.id.in_(list(new_data_ids))).all()
            data_dict = {d.id: d for d in data_objs}

            # 获取模型实例
            model_instance = Model.query.get(m_id)
            if not model_instance:
                continue

            # 遍历所有新增 ApplicationResult，进行情绪统计的累积更新
            for res in new_results:
                item = res.to_dict()
                data_id = item['data_id']
                raw = item['result']

                data = data_dict.get(data_id)
                if not data:
                    # 若对应数据缺失，跳过
                    continue

                # 以数据发布时间为依据，格式化为“YYYY-MM-DD”字符串
                date_str = data.publish_time.strftime("%Y-%m-%d")

                # 将原始结果转换为具体情绪标签字典，键为目标
                target_sentiment = model_instance.convert_result(m_id, raw)

                # 确保当天日期在结果字典中存在
                result_data.setdefault(date_str, {})

                # 对每个目标的情绪结果进行累积统计
                for target, sentiment in target_sentiment.items():
                    # 初始化目标的情绪计数结构
                    result_data[date_str].setdefault(target, {"negative": 0, "neutral": 0, "positive": 0})

                    # 根据情绪值更新对应计数
                    if sentiment == "反对":
                        result_data[date_str][target]["negative"] += 1
                    elif sentiment == "中立":
                        result_data[date_str][target]["neutral"] += 1
                    elif sentiment == "支持":
                        result_data[date_str][target]["positive"] += 1

            # 将更新后的统计数据写回 DatasetStats 表（更新或新增）
            if key in stats_dict:
                stat_record.data = result_data
                stat_record.timestamp = datetime.now(timezone.utc)
                # 标记字段已修改，确保SQLAlchemy正确更新
                flag_modified(stat_record, "data")
            else:
                new_stat = DatasetStats(
                    group_id=group_id,
                    dataset_id=ds_id,
                    model_id=m_id,
                    mode='trend_line',
                    data=result_data,
                    timestamp=datetime.now(timezone.utc)
                )
                db.session.add(new_stat)
                stats_dict[key] = new_stat

            # 提交数据库事务
            db.session.commit()

            # 将当前数据集-模型组合的统计结果合并到最终结果中
            for date_str, target_data in result_data.items():
                merged_results.setdefault(date_str, {})
                for target, counts in target_data.items():
                    merged_results[date_str].setdefault(target, {"negative": 0, "neutral": 0, "positive": 0})
                    merged_results[date_str][target]["negative"] += counts.get("negative", 0)
                    merged_results[date_str][target]["neutral"] += counts.get("neutral", 0)
                    merged_results[date_str][target]["positive"] += counts.get("positive", 0)

    # 返回合并后的按日期、目标统计的情绪趋势结果
    return merged_results

def get_overall_illegal_analysis(group_id, dataset_ids, model_ids):

    overall_stats = {"normal": 0, "illegal": 0, "normal_data": [], "illegal_data": []}

    # 查询已有的情绪统计中间结果，过滤条件包括 group_id、mode='overall_stats'、dataset_id 和 model_id 列表
    existing_stats = DatasetStats.query.filter(
        DatasetStats.group_id == group_id,
        DatasetStats.mode == 'overall_stats',
        DatasetStats.dataset_id.in_(dataset_ids),
        DatasetStats.model_id.in_(model_ids)
    ).all()

    stats_dict = {(stat.dataset_id, stat.model_id): stat for stat in existing_stats}

    

    # 遍历所有数据集和模型组合
    for ds_id in dataset_ids:
        for m_id in model_ids:
            key = (ds_id, m_id)
            if key in stats_dict:
                # 已有统计数据，读取数据和最后更新时间
                stat_record = stats_dict[key]
                result_data = stat_record.data
                last_update_time = stat_record.timestamp
            else:
                # 无已有统计，初始化数据和更新时间
                result_data = {"normal": 0, "illegal": 0, "normal_data": [], "illegal_data": []}
                last_update_time = None

            # 查询该组合下，更新于最后时间之后的应用结果（ApplicationResult）
            new_results_query = ApplicationResult.query.filter(
                ApplicationResult.group_id == group_id,
                ApplicationResult.dataset_id == ds_id,
                ApplicationResult.model_id == m_id
            )
            if last_update_time:
                new_results_query = new_results_query.filter(ApplicationResult.timestamp > last_update_time)

            new_results = new_results_query.all()

            # 若无新数据，累加现有数据后继续
            if not new_results:
                overall_stats["normal"] += result_data["normal"]
                overall_stats["illegal"]  += result_data["illegal"]
                overall_stats["normal_data"] += result_data["normal_data"]
                overall_stats["illegal_data"]  += result_data["illegal_data"]
                continue

            # 获取数据集 ORM 类及模型实例，供后续情绪解析使用
            dataset_obj = Dataset.query.get(ds_id)
            if not dataset_obj:
                continue
            dataset_type = get_dataset_type(dataset_obj.dataset_type)

            new_data_ids = {res.to_dict()['data_id'] for res in new_results}
            data_objs = dataset_type.query.filter(dataset_type.id.in_(list(new_data_ids))).all()
            data_dict = {d.id: d for d in data_objs}

            model_instance = Model.query.get(m_id)
            if not model_instance:
                continue
            model_instance = model_instance.get_instance()
            current_app.logger.info(f"check for {model_instance.__name__}" )

            # 遍历新结果，根据模型转换得到的情绪结果更新统计
            for res in new_results:
                item = res.to_dict()
                data_id = item['data_id']
                raw = item['result']

                data = data_dict.get(data_id)
                if not data:
                    continue

                pred_label = model_instance.convert_result(raw)
                
                if "不" in pred_label:
                    result_data["normal"] += 1
                    if len(result_data["normal_data"]) < 100:
                        tmp = random.randint(1, 10)
                        if tmp == 1:
                            result_data["normal_data"].append(data.to_dict()['text'])

                else:
                    result_data["illegal"] += 1
                    if len(result_data["illegal_data"]) < 100:
                        tmp = random.randint(1, 10)
                        if tmp == 1:
                            result_data["illegal_data"].append(data.to_dict()['text'])    

            # 更新数据库中的 DatasetStats 记录
            if key in stats_dict:
                stat_record.data = result_data
                stat_record.timestamp = datetime.now(timezone.utc)
                flag_modified(stat_record, "data")
            else:
                new_stat = DatasetStats(
                    group_id=group_id,
                    dataset_id=ds_id,
                    model_id=m_id,
                    mode='overall_stats',
                    data=result_data,
                    timestamp=datetime.now(timezone.utc)
                )
                db.session.add(new_stat)
                stats_dict[key] = new_stat

            db.session.commit()

            # 累加当前组合的统计数据到 overall_stats
            overall_stats["normal"] += result_data["normal"]
            overall_stats["illegal"]  += result_data["illegal"]
            overall_stats["normal_data"] += result_data["normal_data"]
            overall_stats["illegal_data"]  += result_data["illegal_data"]

    overall_stats["total"] = overall_stats["normal"] + overall_stats["illegal"]

    return overall_stats

def get_overall_name_analysis(group_id, dataset_ids, model_ids):

    overall_stats = {"normal": 0, "illegal": 0, "normal_data": [], "illegal_data": []}

    # 查询已有的情绪统计中间结果，过滤条件包括 group_id、mode='overall_stats'、dataset_id 和 model_id 列表
    existing_stats = DatasetStats.query.filter(
        DatasetStats.group_id == group_id,
        DatasetStats.mode == 'overall_stats',
        DatasetStats.dataset_id.in_(dataset_ids),
        DatasetStats.model_id.in_(model_ids)
    ).all()

    stats_dict = {(stat.dataset_id, stat.model_id): stat for stat in existing_stats}

    

    # 遍历所有数据集和模型组合
    for ds_id in dataset_ids:
        for m_id in model_ids:
            key = (ds_id, m_id)
            if key in stats_dict:
                # 已有统计数据，读取数据和最后更新时间
                stat_record = stats_dict[key]
                result_data = stat_record.data
                last_update_time = stat_record.timestamp
            else:
                # 无已有统计，初始化数据和更新时间
                result_data = {"normal": 0, "illegal": 0, "normal_data": [], "illegal_data": []}
                last_update_time = None

            # 查询该组合下，更新于最后时间之后的应用结果（ApplicationResult）
            new_results_query = ApplicationResult.query.filter(
                ApplicationResult.group_id == group_id,
                ApplicationResult.dataset_id == ds_id,
                ApplicationResult.model_id == m_id
            )
            if last_update_time:
                new_results_query = new_results_query.filter(ApplicationResult.timestamp > last_update_time)

            new_results = new_results_query.all()

            # 若无新数据，累加现有数据后继续
            if not new_results:
                overall_stats["normal"] += result_data["normal"]
                overall_stats["illegal"]  += result_data["illegal"]
                overall_stats["normal_data"] += result_data["normal_data"]
                overall_stats["illegal_data"]  += result_data["illegal_data"]
                continue

            # 获取数据集 ORM 类及模型实例，供后续情绪解析使用
            dataset_obj = Dataset.query.get(ds_id)
            if not dataset_obj:
                continue
            dataset_type = get_dataset_type(dataset_obj.dataset_type)

            new_data_ids = {res.to_dict()['data_id'] for res in new_results}
            data_objs = dataset_type.query.filter(dataset_type.id.in_(list(new_data_ids))).all()
            data_dict = {d.id: d for d in data_objs}

            model_instance = Model.query.get(m_id)
            if not model_instance:
                continue
            model_instance = model_instance.get_instance()
            current_app.logger.info(f"check for {model_instance.__name__}" )

            # 遍历新结果，根据模型转换得到的情绪结果更新统计
            for res in new_results:
                item = res.to_dict()
                data_id = item['data_id']
                raw = item['result']

                data = data_dict.get(data_id)
                if not data:
                    continue

                pred_label = raw['data'][0]
                
                if not pred_label:
                    result_data["normal"] += 1
                    if len(result_data["normal_data"]) < 100:
                        tmp = random.randint(1, 10)
                        if tmp == 1:
                            result_data["normal_data"].append(data.to_dict()['name'])

                else:
                    result_data["illegal"] += 1
                    if len(result_data["illegal_data"]) < 100:
                        tmp = random.randint(1, 10)
                        if tmp == 1:
                            result_data["illegal_data"].append(data.to_dict()['name'])    

            # 更新数据库中的 DatasetStats 记录
            if key in stats_dict:
                stat_record.data = result_data
                stat_record.timestamp = datetime.now(timezone.utc)
                flag_modified(stat_record, "data")
            else:
                new_stat = DatasetStats(
                    group_id=group_id,
                    dataset_id=ds_id,
                    model_id=m_id,
                    mode='overall_stats',
                    data=result_data,
                    timestamp=datetime.now(timezone.utc)
                )
                db.session.add(new_stat)
                stats_dict[key] = new_stat

            db.session.commit()

            # 累加当前组合的统计数据到 overall_stats
            overall_stats["normal"] += result_data["normal"]
            overall_stats["illegal"]  += result_data["illegal"]
            overall_stats["normal_data"] += result_data["normal_data"]
            overall_stats["illegal_data"]  += result_data["illegal_data"]

    overall_stats["total"] = overall_stats["normal"] + overall_stats["illegal"]

    return overall_stats
