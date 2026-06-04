import logging
from datetime import datetime, timedelta, timezone

import pytz

from app.extensions import db
from app.models import Dataset, User
from app.services.remote_opinion_import import (
    fetch_remote_data,
    get_access_token,
    save_remote_social_rows,
)
from app.utils.lock import RedisLock

logger = logging.getLogger(__name__)
DAILY_IMPORT_MAX_RECORDS = 2000


def get_or_create_daily_dataset(app):
    """获取或创建每日自动导入的数据集"""
    with app.app_context():
        try:
            admin_username = app.config.get("DAILY_IMPORT_ADMIN_USERNAME", "")
            if not admin_username:
                raise Exception("未配置 DAILY_IMPORT_ADMIN_USERNAME")

            admin_user = User.query.filter_by(username=admin_username).first()
            if not admin_user:
                logger.error("未找到系统管理员用户 '%s'", admin_username)
                raise Exception("系统初始化不完整：缺少管理员用户")

            dataset_name = "每日自动更新舆情数据"
            daily_dataset = Dataset.query.filter_by(
                name=dataset_name,
                user_id=admin_user.id,
                dataset_type="SOCIAL",
                is_deleted=False,
            ).first()

            if not daily_dataset:
                logger.info("未找到数据集 '%s'，正在创建新数据集...", dataset_name)
                default_fields = [
                    "title",
                    "text",
                    "author",
                    "publish_time",
                    "label",
                    "source_station",
                    "detail_address",
                    "key_word",
                    "count_comments",
                    "count_likes",
                    "count_forward",
                ]
                daily_dataset = Dataset(
                    name=dataset_name,
                    description="系统自动创建 - 每日从远程舆情系统自动导入的最新数据",
                    dataset_type="SOCIAL",
                    user_id=admin_user.id,
                    valid_fields=default_fields,
                )
                db.session.add(daily_dataset)
                db.session.commit()
                logger.info("已创建数据集 '%s'，ID: %s", dataset_name, daily_dataset.id)
            else:
                logger.info("已找到现有数据集 '%s'，ID: %s", dataset_name, daily_dataset.id)
                required_fields = {"key_word"}
                current_fields = set(daily_dataset.valid_fields or [])
                if not required_fields.issubset(current_fields):
                    daily_dataset.valid_fields = list(current_fields.union(required_fields))
                    db.session.commit()
                    logger.info("已更新数据集字段，添加必要字段: %s", required_fields - current_fields)

            return daily_dataset.id
        except Exception as e:
            db.session.rollback()
            logger.error("获取或创建每日数据集失败: %s", e, exc_info=True)
            raise


def enqueue_dataset_analysis(app, dataset_id):
    from app.api.task.datasets import DEFAULT_CONFIG, process_dataset_background_task

    ttl = app.config.get("DATASET_LOCK_TTL", 36000)
    lock_key = f"dataset_lock:{dataset_id}"
    lock = RedisLock(app.redis, lock_key, ttl=ttl)
    got, token = lock.acquire(blocking=False)
    if not got:
        logger.info("数据集 %s 正在分析中，跳过本次自动分析入队", dataset_id)
        return None

    try:
        job = app.task_queue.enqueue(
            process_dataset_background_task,
            dataset_id,
            DEFAULT_CONFIG.copy(),
            lock_key,
            token,
            32,
            job_timeout=ttl,
            meta={"dataset_id": dataset_id, "source": "daily_import"},
        )
        logger.info("每日导入后的分析任务已入队，dataset_id=%s, job_id=%s", dataset_id, job.id)
        return job
    except Exception:
        lock.release(token)
        logger.exception("每日导入后的分析任务入队失败，dataset_id=%s", dataset_id)
        raise


def import_daily_data(app):
    """每天定时导入前一天数据的任务，需要传入 app 实例"""
    with app.app_context():
        logger.info("开始执行每日数据导入任务")

        try:
            target_dataset_id = get_or_create_daily_dataset(app)
            ip_addr = app.config["REMOTE_DB_HOST"]
            keyword_expression = app.config.get("DAILY_IMPORT_KEYWORD", "")
            field_list = app.config.get(
                "DAILY_IMPORT_FIELDS",
                [
                    "title",
                    "content",
                    "poster",
                    "publishDate",
                    "sentiment",
                    "siteName",
                    "pageUrl",
                    "commentNum",
                    "likeNum",
                    "forwardNum",
                ],
            )

            beijing_tz = pytz.timezone("Asia/Shanghai")
            yesterday = datetime.now(beijing_tz) - timedelta(days=1)
            start_time = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
            end_time = yesterday.replace(hour=23, minute=59, second=59, microsecond=999999)
            start_time_str = start_time.strftime("%Y-%m-%d %H:%M:%S")
            end_time_str = end_time.strftime("%Y-%m-%d %H:%M:%S")
            logger.info("导入时间范围: %s 至 %s", start_time_str, end_time_str)

            token = get_access_token(ip_addr)
            logger.info("成功获取远程访问令牌")

            params = {
                "startTime": start_time_str,
                "endTime": end_time_str,
                "expression": keyword_expression,
                "field": ",".join(field_list),
                "pageNum": 1,
                "pageSize": DAILY_IMPORT_MAX_RECORDS,
            }
            data_list = fetch_remote_data(
                ip_addr,
                token,
                params,
                max_records=DAILY_IMPORT_MAX_RECORDS,
            )

            saved_count = 0
            if not data_list:
                logger.info("未获取到新数据，时间范围: %s 至 %s", start_time_str, end_time_str)
            else:
                logger.info("成功获取 %s 条远程数据", len(data_list))
                saved_count = save_remote_social_rows(
                    target_dataset_id,
                    data_list,
                    expression=keyword_expression,
                )
                logger.info("成功导入 %s 条新数据到数据集 (ID: %s)", saved_count, target_dataset_id)

            dataset = Dataset.query.get(target_dataset_id)
            if dataset:
                now = datetime.now(timezone.utc)
                dataset.updated_time = now
                dataset.description = (
                    "系统自动更新 - 每日从远程舆情系统自动导入的最新数据。"
                    f"最后更新: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}, "
                    f"本次导入: {saved_count} 条"
                )
                db.session.commit()
                logger.info("已更新数据集描述和更新时间")

            if saved_count > 0:
                enqueue_dataset_analysis(app, target_dataset_id)
            else:
                logger.info("本次没有新增数据，跳过自动分析入队")
        except Exception as e:
            db.session.rollback()
            logger.error("定时导入任务失败: %s", e, exc_info=True)
            raise
