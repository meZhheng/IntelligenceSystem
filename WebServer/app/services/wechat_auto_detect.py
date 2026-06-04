import gzip
import hashlib
import json
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from flask import current_app
from sqlalchemy import or_

from app.extensions import db
from app.models import get_system_config
from app.models_spider import PA_Account, PA_Article, PA_Article_Content_Fs, PA_Article_Result
from app.utils.lock import RedisLock
from Proofreading.aijiaodui import (
    DEFAULT_API_TOKEN_EXPIRES,
    convert_pa_to_dicts,
    get_access_token,
    text_check,
)
from Proofreading.WeChatSpider.spider import SPider_PA

def _config_int(name: str, default: int) -> int:
    try:
        return int(current_app.config.get(name, default))
    except (TypeError, ValueError):
        return default


class WeChatAutoDetectError(RuntimeError):
    pass


def load_wechat_crawl_config() -> dict:
    cfg = get_system_config(db.session, "wechat_crawl_config", default={}) or {}
    if not isinstance(cfg, dict):
        raise WeChatAutoDetectError("微信爬虫配置格式错误")

    missing = [key for key in ("token", "fingerprint", "cookie") if not cfg.get(key)]
    if missing:
        raise WeChatAutoDetectError(f"微信爬虫配置缺少字段: {', '.join(missing)}")

    fetch_images = cfg.get("fetch_images", False)
    if not isinstance(fetch_images, bool):
        fetch_images = False

    crawl_mode = cfg.get("crawl_mode", "request")
    if crawl_mode not in {"request", "auto", "playwright"}:
        crawl_mode = "request"
    if fetch_images and "crawl_mode" not in cfg:
        crawl_mode = "playwright"

    playwright_fallback = cfg.get("playwright_fallback", True)
    if not isinstance(playwright_fallback, bool):
        playwright_fallback = True

    return {
        "token": cfg["token"],
        "fingerprint": cfg["fingerprint"],
        "cookie": cfg["cookie"],
        "fetch_images": fetch_images,
        "crawl_mode": crawl_mode,
        "playwright_fallback": playwright_fallback,
    }


@contextmanager
def _wechat_refresh_locks(fakeid: str, cookie: str):
    prefix = current_app.config.get("LOCK_KEY_WECHAT", "wechat:refresh:lock")
    ttl = _config_int("LOCK_TTL_SECONDS", 60)
    cookie_id = hashlib.sha256((cookie or "").encode("utf-8")).hexdigest()[:12]
    fakeid_lock = RedisLock(current_app.redis, f"{prefix}:fakeid:{fakeid}", ttl=ttl)
    cookie_lock = RedisLock(current_app.redis, f"{prefix}:cookie:{cookie_id}", ttl=ttl)
    got_fakeid, fakeid_token = fakeid_lock.acquire(blocking=False)
    if not got_fakeid:
        raise WeChatAutoDetectError("公众号正在被其他任务爬取")

    got_cookie = False
    cookie_token = None
    try:
        got_cookie, cookie_token = cookie_lock.acquire(blocking=False)
        if not got_cookie:
            raise WeChatAutoDetectError("微信账号 cookie 正在被其他任务使用")
        yield fakeid_lock, cookie_lock
    finally:
        if got_cookie:
            cookie_lock.release(cookie_token)
        fakeid_lock.release(fakeid_token)


def _refresh_locks(*locks):
    for lock in locks:
        try:
            current_app.redis.expire(lock.key, lock.ttl)
        except Exception:
            current_app.logger.exception("刷新微信自动任务锁失败: %s", lock.key)


def _extract_article_info(article: dict):
    info = json.loads(article["publish_info"])["appmsgex"][0]
    link = info.get("link", "")
    article_id = link.rstrip("/").rsplit("/", 1)[-1] if link else None
    if not article_id:
        return None
    return {
        "article_id": article_id,
        "title": info.get("title", ""),
        "link": link,
        "update_time": datetime.fromtimestamp(info.get("update_time", 0), tz=timezone.utc),
        "create_time": datetime.fromtimestamp(info.get("create_time", 0), tz=timezone.utc),
        "author_name": info.get("author_name", ""),
    }


def _save_article_metadata(account: PA_Account, article_info: dict) -> bool:
    existing = PA_Article.query.get(article_info["article_id"])
    inserted = existing is None
    if inserted:
        existing = PA_Article(fakeid=account.id, **article_info)
        db.session.add(existing)
    else:
        existing.fakeid = account.id
        existing.title = article_info["title"]
        existing.link = article_info["link"]
        existing.update_time = article_info["update_time"]
        existing.create_time = article_info["create_time"]
        existing.author_name = article_info["author_name"]

    account.last_crawled = datetime.now(timezone.utc)
    db.session.commit()
    return inserted


def _content_needs_fetch(article: PA_Article) -> bool:
    from app.api.task.proofread import _article_text_has_body

    if not _article_text_has_body(article.text):
        return True
    content = PA_Article_Content_Fs.query.get(article.article_id)
    return not content or not content.content_path or not Path(content.content_path).exists()


def _fetch_and_save_article_content(spider: SPider_PA, article: PA_Article, credentials: dict) -> bool:
    from app.api.task.proofread import (
        _article_text_has_body,
        _normalize_article_text_payload,
        extract_title_and_body,
        render_mhtml_inline,
        save_mhtml_to_fs,
    )

    mhtml = spider.fetch_article_content(
        article.link,
        fetch_images=credentials["fetch_images"],
        crawl_mode=credentials["crawl_mode"],
        playwright_fallback=credentials["playwright_fallback"],
    )
    compressed = gzip.compress(mhtml)
    save_mhtml_to_fs(compressed, article.article_id)
    try:
        render_mhtml_inline(compressed, article.article_id)
    except Exception:
        current_app.logger.exception("微信自动任务渲染缓存失败: %s", article.article_id)

    parsed_text = _normalize_article_text_payload(extract_title_and_body(compressed))
    if _article_text_has_body(parsed_text):
        article.text = parsed_text
        db.session.commit()
    return True


def crawl_account_articles(account: PA_Account, credentials: dict) -> dict:
    result = {
        "account_id": account.id,
        "inserted": 0,
        "updated": 0,
        "content_saved": 0,
        "content_failed": 0,
        "pages": 0,
    }
    per_page = 5
    begin = 0
    duplicate_page_streak = 0
    duplicate_page_stop_threshold = _config_int("WECHAT_AUTO_DETECT_DUPLICATE_PAGE_STOP", 3)
    max_articles = _config_int("WECHAT_AUTO_DETECT_MAX_ARTICLES_PER_ACCOUNT", 0)
    spider = SPider_PA(credentials["token"], credentials["fingerprint"], credentials["cookie"], account.id)

    with _wechat_refresh_locks(account.id, credentials["cookie"]) as locks:
        while True:
            total, publish_list = spider.fetch_publish_list(begin, per_page)
            if total is None or publish_list is None:
                raise WeChatAutoDetectError("cookie验证失败，请重新配置微信爬虫凭证")
            if not publish_list:
                break

            result["pages"] += 1
            page_inserted = 0
            for article in publish_list:
                if max_articles and result["inserted"] >= max_articles:
                    break
                try:
                    article_info = _extract_article_info(article)
                    if not article_info:
                        continue
                    inserted = _save_article_metadata(account, article_info)
                    if inserted:
                        result["inserted"] += 1
                        page_inserted += 1
                    else:
                        result["updated"] += 1
                    _refresh_locks(*locks)
                except Exception:
                    db.session.rollback()
                    current_app.logger.exception("微信自动任务保存文章元数据失败: account=%s", account.id)

            duplicate_page_streak = duplicate_page_streak + 1 if page_inserted == 0 else 0
            if duplicate_page_streak >= duplicate_page_stop_threshold:
                break
            if max_articles and result["inserted"] >= max_articles:
                break

            begin += per_page
            if begin >= total:
                break

        articles_to_fetch = [
            article for article in (
                PA_Article.query
                .filter_by(fakeid=account.id)
                .order_by(PA_Article.create_time.desc())
                .all()
            )
            if _content_needs_fetch(article)
        ]
        if max_articles:
            articles_to_fetch = articles_to_fetch[:max_articles]

        for article in articles_to_fetch:
            try:
                _fetch_and_save_article_content(spider, article, credentials)
                result["content_saved"] += 1
                _refresh_locks(*locks)
            except Exception:
                db.session.rollback()
                result["content_failed"] += 1
                current_app.logger.exception("微信自动任务抓取正文失败: article=%s", article.article_id)

        account.last_crawled = datetime.now(timezone.utc)
        db.session.commit()

    return result


def _ensure_article_text(article: PA_Article) -> bool:
    from app.api.task.proofread import _article_text_has_body, _normalize_article_text_payload, extract_title_and_body

    if _article_text_has_body(article.text):
        normalized_text = _normalize_article_text_payload(article.text)
        if normalized_text != article.text:
            article.text = normalized_text
            db.session.flush()
        return True

    content = PA_Article_Content_Fs.query.get(article.article_id)
    if not content or not content.content_path or not Path(content.content_path).exists():
        return False

    parsed_text = _normalize_article_text_payload(extract_title_and_body(Path(content.content_path).read_bytes()))
    if not _article_text_has_body(parsed_text):
        return False

    article.text = parsed_text
    db.session.flush()
    return True


def proofread_article(article: PA_Article, access_token: str) -> dict:
    lock = RedisLock(
        current_app.redis,
        f"wechat:proofread:article:{article.article_id}",
        ttl=_config_int("WECHAT_PROOFREAD_ARTICLE_LOCK_TTL_SECONDS", 600),
    )
    got, token = lock.acquire(blocking=False)
    if not got:
        return {"status": "skipped", "reason": "locked", "mistakes": 0}

    try:
        if not _ensure_article_text(article):
            db.session.rollback()
            return {"status": "skipped", "reason": "未获取到正文", "mistakes": 0}

        title = (article.text.get("title") or "").strip()
        body = (article.text.get("body") or "").strip()
        if not title or not body:
            db.session.rollback()
            return {"status": "skipped", "reason": "标题或正文为空", "mistakes": 0}

        title_mistakes, title_res = convert_pa_to_dicts(
            article.article_id,
            text_check(title, access_token),
            "title",
        )
        content_mistakes, content_res = convert_pa_to_dicts(
            article.article_id,
            text_check(body, access_token),
            "content",
        )

        PA_Article_Result.query.filter_by(article_id=article.article_id).delete(synchronize_session=False)
        article.is_detected = True
        article.mistake_num = title_mistakes + content_mistakes
        db.session.add(article)
        db.session.flush()

        if title_res:
            db.session.bulk_insert_mappings(PA_Article_Result, title_res)
        if content_res:
            db.session.bulk_insert_mappings(PA_Article_Result, content_res)

        db.session.commit()
        return {"status": "success", "reason": None, "mistakes": article.mistake_num or 0}
    except Exception:
        db.session.rollback()
        raise
    finally:
        lock.release(token)


def proofread_undetected_articles(account_id: str, limit: int = 0) -> dict:
    articles_query = (
        PA_Article.query
        .filter(PA_Article.fakeid == account_id)
        .filter(or_(PA_Article.is_detected.is_(False), PA_Article.is_detected.is_(None)))
        .order_by(PA_Article.create_time.desc())
    )
    if limit:
        articles_query = articles_query.limit(limit)
    articles = articles_query.all()

    result = {
        "total": len(articles),
        "success": 0,
        "skipped": 0,
        "failed": 0,
        "mistakes": 0,
    }
    if not articles:
        return result

    appid = current_app.config["PROOFREADING_API_APPID"]
    key = current_app.config["PROOFREADING_API_KEY"]
    min_valid_seconds = min(len(articles) * 5 + 300, DEFAULT_API_TOKEN_EXPIRES - 60)
    access_token, _remaining = get_access_token(appid, key, min_valid_seconds=min_valid_seconds)

    for article in articles:
        try:
            item = proofread_article(article, access_token)
            if item["status"] == "success":
                result["success"] += 1
                result["mistakes"] += item.get("mistakes", 0)
            else:
                result["skipped"] += 1
        except Exception:
            result["failed"] += 1
            current_app.logger.exception("微信自动任务检测文章失败: article=%s", article.article_id)

    return result


def run_daily_wechat_auto_detect(app=None) -> dict:
    started_at = datetime.now(timezone.utc)
    job_lock = RedisLock(
        current_app.redis,
        "wechat:auto_detect:job:lock",
        ttl=_config_int("WECHAT_AUTO_DETECT_LOCK_TTL_SECONDS", 21600),
    )
    got, token = job_lock.acquire(blocking=False)
    if not got:
        return {"status": "skipped", "message": "微信公众号自动检测任务已在运行，跳过本次执行"}

    summary = {
        "status": "success",
        "accounts_total": 0,
        "accounts_success": 0,
        "accounts_failed": 0,
        "articles_inserted": 0,
        "contents_saved": 0,
        "content_failed": 0,
        "proofread_success": 0,
        "proofread_skipped": 0,
        "proofread_failed": 0,
        "mistakes_total": 0,
        "started_at": started_at.isoformat(),
        "finished_at": None,
    }

    try:
        credentials = load_wechat_crawl_config()
        accounts_query = PA_Account.query.filter(PA_Account.auto_detected.is_(True)).order_by(PA_Account.name.asc())
        max_accounts = _config_int("WECHAT_AUTO_DETECT_MAX_ACCOUNTS_PER_RUN", 0)
        if max_accounts:
            accounts_query = accounts_query.limit(max_accounts)
        accounts = accounts_query.all()
        summary["accounts_total"] = len(accounts)

        proofread_limit = _config_int("WECHAT_AUTO_DETECT_MAX_ARTICLES_PER_ACCOUNT", 0)
        for account in accounts:
            try:
                current_app.logger.info("开始微信公众号自动任务: %s", account.id)
                crawl_result = crawl_account_articles(account, credentials)
                proofread_result = proofread_undetected_articles(account.id, limit=proofread_limit)
                summary["accounts_success"] += 1
                summary["articles_inserted"] += crawl_result["inserted"]
                summary["contents_saved"] += crawl_result["content_saved"]
                summary["content_failed"] += crawl_result["content_failed"]
                summary["proofread_success"] += proofread_result["success"]
                summary["proofread_skipped"] += proofread_result["skipped"]
                summary["proofread_failed"] += proofread_result["failed"]
                summary["mistakes_total"] += proofread_result["mistakes"]
            except Exception:
                summary["accounts_failed"] += 1
                current_app.logger.exception("微信公众号自动任务处理账号失败: %s", account.id)

        if summary["accounts_failed"]:
            summary["status"] = "partial" if summary["accounts_success"] else "error"
        summary["finished_at"] = datetime.now(timezone.utc).isoformat()
        summary["message"] = (
            f"微信公众号自动抓取与校对完成：账号 {summary['accounts_total']} 个，"
            f"新增文章 {summary['articles_inserted']} 篇，保存正文 {summary['contents_saved']} 篇，"
            f"成功检测 {summary['proofread_success']} 篇，失败 {summary['proofread_failed']} 篇，"
            f"发现问题 {summary['mistakes_total']} 个"
        )
        return summary
    except Exception:
        summary["status"] = "error"
        summary["finished_at"] = datetime.now(timezone.utc).isoformat()
        summary["message"] = "微信公众号自动检测任务执行失败"
        raise
    finally:
        job_lock.release(token)
