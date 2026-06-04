import logging
from datetime import datetime

import requests
from flask import current_app
from sqlalchemy import and_, inspect, or_

from app.extensions import db
from app.models import SocialMediaDataset

logger = logging.getLogger(__name__)

DataTypeMapping = {
    "title": "title",
    "content": "text",
    "poster": "author",
    "publishDate": "publish_time",
    "sentiment": "label",
    "location": "ipName",
    "newsClassify": "news_source",
    "siteName": "source_station",
    "commentNum": "count_comments",
    "likeNum": "count_likes",
    "forwardNum": "count_forward",
    "pageUrl": "detail_address",
    "concernNum": "count_follwers",
    "verifiedType": "auth_type",
}

SentimentLabelMapping = {"消极": 0, "中立": 1, "积极": 2}


def get_access_token(ip_addr):
    url = f"http://{ip_addr}:8088/auth-gateway/service-oauth/oauth/accessToken"
    headers = {"Content-Type": "application/json"}
    payload = {
        "client_id": current_app.config["REMOTE_CLIENT_ID"],
        "client_secret": current_app.config["REMOTE_CLIENT_SECRET"],
        "grant_type": "client_credentials",
    }
    resp = requests.post(url, json=payload, headers=headers, timeout=30)
    resp.raise_for_status()
    body = resp.json()
    data = body.get("data")
    if not isinstance(data, dict):
        raise ValueError("远程身份验证响应缺少 data")

    token_type = data.get("tokenType", "")
    token = data.get("token")
    if not token:
        raise ValueError("远程身份验证响应缺少 token")
    return f"{token_type}{token}"


def get_data_remote_page(ip_addr, token, params):
    url = f"http://{ip_addr}:8088/auth-gateway/shanghai-yuqing-es/api/v1/common/query/dataAndNum"
    headers = {"Content-Type": "application/json", "Authorization": token}
    payload = {
        "startTime": params.get("startTime"),
        "endTime": params.get("endTime"),
        "expression": params.get("expression", ""),
        "field": params.get("field", ""),
        "index": "sh-yq",
        "pageNum": params.get("pageNum", 1),
        "pageSize": params.get("pageSize", 100),
    }
    resp = requests.post(url, json=payload, headers=headers, timeout=120)
    resp.raise_for_status()
    result = resp.json()
    if result.get("code") != 200:
        raise ValueError(result.get("message", "远程API调用失败"))

    data = result.get("data")
    if not isinstance(data, dict):
        raise ValueError("远程数据响应缺少 data")

    rows = data.get("data", [])
    if rows is None:
        return []
    if not isinstance(rows, list):
        raise ValueError("远程数据响应 data.data 不是列表")
    return rows


def fetch_remote_data(ip_addr, token, params, max_records=2000):
    max_records = int(max_records)
    if max_records <= 0:
        return []

    page_num = int(params.get("pageNum", 1) or 1)
    requested_page_size = int(params.get("pageSize", max_records) or max_records)
    page_size = max(1, min(requested_page_size, max_records))
    collected = []

    while len(collected) < max_records:
        page_params = dict(params)
        page_params["pageNum"] = page_num
        page_params["pageSize"] = min(page_size, max_records - len(collected))
        rows = get_data_remote_page(ip_addr, token, page_params)
        if not rows:
            break

        collected.extend(rows[: max_records - len(collected)])
        if len(rows) < page_params["pageSize"]:
            break
        page_num += 1

    return collected


def normalize_time(ts: str):
    if ts and isinstance(ts, str):
        try:
            if ts.endswith("Z"):
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            else:
                dt = datetime.fromisoformat(ts)
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        except Exception as e:
            logger.warning("时间格式转换失败: %s, 错误: %s", ts, e)
            return None
    return None


def _truncate_value(value, max_len, field_name):
    if value is None or not max_len:
        return value
    value = str(value)
    if len(value) > max_len:
        current_app.logger.warning("%s 被截断至 %s 字符", field_name, max_len)
        return value[:max_len]
    return value


def build_social_media_item(dataset_id, row, valid_fields=None, expression=""):
    valid_fields = set(valid_fields) if valid_fields else None
    new_item = SocialMediaDataset(dataset_id=dataset_id)

    if valid_fields is None or "key_word" in valid_fields:
        new_item.key_word = expression

    mapper = inspect(SocialMediaDataset)
    title_max_len = mapper.columns.title.type.length
    content_max_len = 4294967295

    for remote_key, db_field in DataTypeMapping.items():
        if remote_key not in row or not hasattr(new_item, db_field):
            continue
        if valid_fields is not None and db_field not in valid_fields:
            continue

        value = row[remote_key]
        if remote_key == "publishDate" and value:
            value = normalize_time(value)
        elif remote_key == "sentiment" and value:
            value = SentimentLabelMapping.get(value, 1)
            if row[remote_key] not in SentimentLabelMapping:
                current_app.logger.warning("未知 sentiment=%s，使用中立标签", row[remote_key])
        elif remote_key == "title" and value:
            value = _truncate_value(value, title_max_len, "Title")
        elif remote_key == "content" and value:
            value = _truncate_value(value, content_max_len, "Content")

        setattr(new_item, db_field, value)

    if not new_item.text:
        return None
    return new_item


def _dedupe_key(item):
    if item.detail_address:
        return ("url", item.detail_address)
    if item.title or item.author or item.publish_time:
        return ("fallback", item.title, item.author, item.publish_time)
    return None


def _load_existing_keys(dataset_id, items):
    urls = {item.detail_address for item in items if item.detail_address}
    fallback_keys = [
        (item.title, item.author, item.publish_time)
        for item in items
        if not item.detail_address and (item.title or item.author or item.publish_time)
    ]

    conditions = []
    if urls:
        conditions.append(SocialMediaDataset.detail_address.in_(urls))
    conditions.extend(
        and_(
            SocialMediaDataset.title == title,
            SocialMediaDataset.author == author,
            SocialMediaDataset.publish_time == publish_time,
        )
        for title, author, publish_time in fallback_keys
    )

    if not conditions:
        return set()

    existing_rows = SocialMediaDataset.query.filter(
        SocialMediaDataset.dataset_id == dataset_id,
        or_(*conditions),
    ).all()
    return {key for key in (_dedupe_key(row) for row in existing_rows) if key is not None}


def save_remote_social_rows(dataset_id, rows, valid_fields=None, expression="", batch_size=500):
    saved_count = 0
    items_to_add = []
    seen_keys = set()

    for row in rows:
        try:
            item = build_social_media_item(dataset_id, row, valid_fields, expression)
        except Exception as e:
            current_app.logger.warning("远程数据行清洗失败，已跳过: %s", e)
            continue

        if item is None:
            current_app.logger.warning("远程数据行缺少正文，已跳过")
            continue

        key = _dedupe_key(item)
        if key is not None:
            if key in seen_keys:
                continue
            seen_keys.add(key)
        items_to_add.append(item)

    existing_keys = _load_existing_keys(dataset_id, items_to_add)
    new_items = [item for item in items_to_add if _dedupe_key(item) not in existing_keys]

    for index in range(0, len(new_items), batch_size):
        batch = new_items[index : index + batch_size]
        db.session.bulk_save_objects(batch)
        db.session.commit()
        saved_count += len(batch)
        current_app.logger.info("已提交 %s 条远程舆情数据", saved_count)

    return saved_count
