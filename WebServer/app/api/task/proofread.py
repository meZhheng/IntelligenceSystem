from flask import (
    send_file, make_response, g, render_template_string, render_template, request, session, url_for, jsonify, Response, stream_with_context, current_app
)
from app.models import Model, ModelCheckpoint, MODEL_TYPES, Task, Dataset, get_system_config, set_system_config
from app.api.auth.auth import token_auth
from app.utils.decorator import admin_required
from app.utils.lock import RedisLock
import threading
from app.extensions import db
from app.api import bp
from sqlalchemy import union_all, select, or_, func, tuple_, distinct, desc, false
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from app.utils.systeminfo import get_gpu_info, get_cpu_count
from app.api.errors import bad_request, error_response
from Proofreading.aijiaodui import text_check, get_word_dict, get_access_token, convert_pa_to_dicts, get_word_add, delete_word, update_word, delete_words, upload_words, DEFAULT_API_TOKEN_EXPIRES, get_recommendation_level_map, get_recommendation_category_map
from Proofreading.WeChatSpider.spider import SPider_PA
from app.models_spider import PA_Article, PA_Account, PA_Article_Content, PA_Article_Result, PA_Article_Content_Fs
import json, gzip, uuid
from datetime import datetime, timezone, timedelta
from email import message_from_bytes
from email.policy import default
import base64
import re
from bs4 import BeautifulSoup, NavigableString
import time
import hashlib
import tempfile
from pathlib import Path
import os
import io
from openpyxl import Workbook
from weasyprint import HTML, CSS
from werkzeug.utils import secure_filename

# 定义微信公众号接口使用的 get_appid() 和密钥（可能用于获取 access_token）
def get_appid():
    return current_app.config['PROOFREADING_API_APPID']

def get_key():
    return current_app.config['PROOFREADING_API_KEY']

WORD_DICT_TYPES = {1, 2, 3, 4}
WORD_DICT_RECOMMEND_TYPES = {2, 3}
WORD_DICT_UPLOAD_EXTENSIONS = {'.txt', '.csv', '.xls', '.xlsx'}
WORD_DICT_SINGLE_DELETE_FALLBACK_CODES = {404, 405}


def _json_error(message, status=400):
    return jsonify({'message': message}), status


def _word_json_payload():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise ValueError('You must post JSON data.')
    return payload


def _parse_word_type(value):
    try:
        word_type = int(value)
    except (TypeError, ValueError):
        raise ValueError('type 必须是 1、2、3 或 4')
    if word_type not in WORD_DICT_TYPES:
        raise ValueError('type 必须是 1、2、3 或 4')
    return word_type


def _parse_positive_int(value, name, default=None):
    if value is None or value == '':
        if default is not None:
            return default
        raise ValueError(f'{name} is required.')
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValueError(f'{name} 必须是正整数')
    if parsed <= 0:
        raise ValueError(f'{name} 必须是正整数')
    return parsed


def _require_word_id(payload):
    word_id = payload.get('id')
    if word_id is None or str(word_id).strip() == '':
        raise ValueError('id is required.')
    return word_id


def _require_word(payload):
    word = str(payload.get('word') or '').strip()
    if not word:
        raise ValueError('word is required.')
    return word


def _word_optional_text(payload, key):
    value = payload.get(key)
    if value is None:
        return None
    return str(value).strip()


def _word_payload_fields(payload, word_type):
    recommend = _word_optional_text(payload, 'recommend') if word_type in WORD_DICT_RECOMMEND_TYPES else None
    return {
        'recommend': recommend,
        'hint': _word_optional_text(payload, 'hint'),
        'word_explain': _word_optional_text(payload, 'word_explain'),
        'word_example': _word_optional_text(payload, 'word_example'),
    }


def _get_word_api_token():
    access_token, _ = get_access_token(get_appid(), get_key())
    return access_token


def _word_api_error_response(exc):
    current_app.logger.exception('第三方词库接口调用失败')
    return _json_error(str(exc), 502)


def _word_response_indicates_failure(result):
    if not isinstance(result, dict):
        return False
    for key in ('failed', 'fail', 'errors'):
        value = result.get(key)
        if value:
            return True
    data = result.get('data')
    if isinstance(data, dict):
        return _word_response_indicates_failure(data)
    return False


def _word_delete_unsupported(exc_or_result):
    result = getattr(exc_or_result, 'result', None)
    if isinstance(result, dict):
        exc_or_result = result

    if isinstance(exc_or_result, dict):
        code = exc_or_result.get('code', exc_or_result.get('errcode'))
        message = ' '.join(str(exc_or_result.get(key) or '') for key in ('message', 'msg', 'errmsg', 'error', 'details'))
    else:
        code = getattr(exc_or_result, 'code', None)
        message = str(getattr(exc_or_result, 'message', None) or exc_or_result)

    try:
        normalized_code = int(code)
    except (TypeError, ValueError):
        normalized_code = code
    if normalized_code in WORD_DICT_SINGLE_DELETE_FALLBACK_CODES:
        return True

    lowered = message.lower()
    return '不支持' in message or 'unsupported' in lowered or 'not support' in lowered


@bp.route('/wechat/wordDict', methods=['POST'])
@token_auth.login_required
@admin_required
def wechat_wordDict():
    try:
        payload = _word_json_payload()
        word_type = _parse_word_type(payload.get('type'))
        size = _parse_positive_int(payload.get('size'), 'size')
        num = _parse_positive_int(payload.get('num'), 'num')
        search = str(payload.get('search') or '').strip()
        result = get_word_dict(word_type, size, num, _get_word_api_token(), search)
        return jsonify({'message': '获取成功', 'word_dict': result})
    except ValueError as e:
        return _json_error(str(e))
    except Exception as e:
        return _word_api_error_response(e)


@bp.route('/wechat/addWord', methods=['POST'])
@token_auth.login_required
@admin_required
def wechat_addWord():
    try:
        payload = _word_json_payload()
        word_type = _parse_word_type(payload.get('type'))
        word = _require_word(payload)
        fields = _word_payload_fields(payload, word_type)
        result = get_word_add(
            word_type,
            word,
            fields['recommend'],
            fields['hint'],
            fields['word_explain'],
            fields['word_example'],
            _get_word_api_token(),
        )
        return jsonify({'message': '添加成功', 'word_add': result})
    except ValueError as e:
        return _json_error(str(e))
    except Exception as e:
        return _word_api_error_response(e)


@bp.route('/wechat/updateWord', methods=['POST'])
@token_auth.login_required
@admin_required
def wechat_updateWord():
    try:
        payload = _word_json_payload()
        word_type = _parse_word_type(payload.get('type'))
        word_id = _require_word_id(payload)
        word = _require_word(payload)
        fields = _word_payload_fields(payload, word_type)
        result = update_word(
            word_type,
            word_id,
            word,
            fields['recommend'],
            fields['hint'],
            fields['word_explain'],
            fields['word_example'],
            _get_word_api_token(),
        )
        return jsonify({'message': '更新成功', 'word_update': result})
    except ValueError as e:
        return _json_error(str(e))
    except Exception as e:
        return _word_api_error_response(e)


@bp.route('/wechat/deleteWord', methods=['POST'])
@token_auth.login_required
@admin_required
def wechat_deleteWord():
    try:
        payload = _word_json_payload()
        word_type = _parse_word_type(payload.get('type'))
        word_id = _require_word_id(payload)
        token = _get_word_api_token()
        try:
            result = delete_word(word_type, word_id, token)
            if word_type == 4 and _word_delete_unsupported(result):
                result = delete_words(word_type, [word_id], token)
        except Exception as delete_exc:
            if word_type != 4 or not _word_delete_unsupported(delete_exc):
                raise
            result = delete_words(word_type, [word_id], token)
        return jsonify({'message': '删除成功', 'data': {'id': word_id, 'type': word_type, 'result': result}})
    except ValueError as e:
        return _json_error(str(e))
    except Exception as e:
        return _word_api_error_response(e)


@bp.route('/wechat/deleteWords', methods=['POST'])
@token_auth.login_required
@admin_required
def wechat_deleteWords():
    try:
        payload = _word_json_payload()
        word_type = _parse_word_type(payload.get('type'))
        ids = payload.get('ids')
        if not isinstance(ids, list) or not ids:
            raise ValueError('ids 必须是非空数组')
        normalized_ids = []
        for item in ids:
            if item is None or str(item).strip() == '':
                continue
            normalized_ids.append(item)
        if not normalized_ids:
            raise ValueError('ids 必须是非空数组')
        result = delete_words(word_type, normalized_ids, _get_word_api_token())
        message = '部分词汇删除失败' if _word_response_indicates_failure(result) else '批量删除成功'
        return jsonify({'message': message, 'word_delete_many': result})
    except ValueError as e:
        return _json_error(str(e))
    except Exception as e:
        return _word_api_error_response(e)


@bp.route('/wechat/uploadWordFile', methods=['POST'])
@token_auth.login_required
@admin_required
def wechat_uploadWordFile():
    try:
        word_type = _parse_word_type(request.form.get('type'))
        file = request.files.get('file')
        if file is None or not file.filename:
            raise ValueError('file is required.')
        extension = Path(file.filename).suffix.lower()
        if extension not in WORD_DICT_UPLOAD_EXTENSIONS:
            raise ValueError('仅支持 txt、csv、xls、xlsx 文件')
        filename = secure_filename(file.filename)
        if not filename or Path(filename).suffix.lower() != extension:
            filename = f'word_dict{extension}'

        file.stream.seek(0, os.SEEK_END)
        file_size = file.stream.tell()
        file.stream.seek(0)
        if file_size <= 0:
            raise ValueError('文件不能为空')
        max_size = current_app.config.get('WECHAT_WORD_DICT_UPLOAD_MAX_BYTES', 10 * 1024 * 1024)
        if file_size > int(max_size):
            raise ValueError('文件大小超过限制')

        result = upload_words(word_type, file, filename, _get_word_api_token())
        return jsonify({'message': '上传完成', 'word_upload': result})
    except ValueError as e:
        return _json_error(str(e))
    except Exception as e:
        return _word_api_error_response(e)


# 定义路由 `/wechat/proofread`，用于对单篇文章进行文本校对（审核）
@bp.route('/wechat/proofread', methods=['POST'])
@token_auth.login_required  # 用户需要登录并通过 token 认证
def wechat_proofread():
    payload = request.get_json()  # 从请求体中获取 JSON 数据
    if not payload:
        return bad_request('You must post JSON data.')  # 请求体为空时返回错误提示
    
    if 'title' not in payload or not payload.get('title'):
        return bad_request('title is required.')  # 标题缺失或为空
    
    if 'content' not in payload or not payload.get('content'):
        return bad_request('content is required.')  # 正文缺失或为空
    
    # 分别对标题和正文进行内容审核，并返回结果
    access_token, _ = get_access_token(get_appid(), get_key())
    return jsonify({
        'title_check': text_check(payload.get('title'), access_token),
        'content_check': text_check(payload.get('content'), access_token),
    })

def sse_event(data: dict, event: str = "message"):
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def progress_payload(*, status, current, total, article_id, mistakes=0, reason=None):
    return {
        "type": "progress",
        "status": status,  # success | skipped | failed
        "current": current,
        "total": total,
        "article_id": article_id,
        "mistakes": mistakes,
        "reason": reason
    }


@bp.route('/wechat/proofread/batch', methods=['POST'])
@token_auth.login_required
@admin_required
def wechat_proofread_batch_stream():
    payload = request.get_json() or {}
    
    mode = payload.get('mode', 'selected')  # 'selected' 或 'all'
    filters = payload.get('filters', {})    # 获取筛选条件对象
    is_detect_all = payload.get('is_detect', False) # 是否包含已检测过的文章
    
    # 1. 构建基础 Query
    query = PA_Article.query

    # 2. 根据模式筛选文章
    if mode == 'selected':
        # 模式A：仅检测选中的 ID
        ids = payload.get('ids', [])
        if not ids:
            return bad_request('未提供选中的文章ID')
        query = query.filter(PA_Article.article_id.in_(ids))
    else:
        # 模式B：根据 Filters 筛选全量数据
        query = apply_article_filters(query, filters)

    # 3. 处理 "是否重复检测" 逻辑
    # 如果用户没有勾选“包含已检测项”，则过滤掉 is_detected 为 True 的文章
    if not is_detect_all:
        query = query.filter(
            or_(PA_Article.is_detected.is_(False),
                PA_Article.is_detected.is_(None))
        )

    # 获取所有待处理文章
    query = query.order_by(desc(PA_Article.create_time))
    articles = query.all()
    if not articles:
        return error_response(404, '未找到符合条件的待检测文章')

    try:
        total = len(articles)
    except Exception:
        total = 0

    def generate():
        """
        SSE 流式响应：先返回 token 状态（值和剩余过期时间），然后开始逐篇处理。
        假设：articles, sse_event, progress_payload 等在闭包或模块级可用。
        """
        appid = get_appid()
        key = get_key()

        avg_seconds_per_article = 5     # 经验值：每篇处理平均耗时（包括网络请求）
        buffer_seconds = 300            # 额外缓冲
        estimated_duration = total * avg_seconds_per_article + buffer_seconds

        # 为了确保 token 在处理开始时有足够剩余时间，设置最小有效期
        # 但 API 的最大 expires_in 是 7200s（2小时），因此 min_valid_seconds 最好不要超过 7000
        min_valid_seconds = min(int(estimated_duration), DEFAULT_API_TOKEN_EXPIRES - 60)

        # 获取 token（并强制保证至少 min_valid_seconds）
        try:
            token, remaining = get_access_token(appid, key, min_valid_seconds=min_valid_seconds)
        except Exception as e:
            # 无法获取 token：直接把错误通过 SSE 发回前端并结束
            yield sse_event({
                "type": "token_error",
                "message": str(e)
            }, event="error")
            return

        # 先把 token 状态推给前端（让前端决定是否继续或展示信息）
        try:
            yield sse_event({
                "type": "token_status",
                "access_token": token,
                "expires_in": int(remaining)  # 剩余秒数（注意：可能略小于实际 API 返回的 expires_in，取决于写入 Redis 的策略）
            }, event="token_status")
        except Exception:
            # SSE 推送 token 状态失败也不要阻止后续工作
            pass

        # ---------- 正式开始处理文章 ----------
        try:
            for idx, art in enumerate(articles, start=1):
                article_lock = RedisLock(
                    current_app.redis,
                    f"wechat:proofread:article:{art.article_id}",
                    ttl=current_app.config.get("WECHAT_PROOFREAD_ARTICLE_LOCK_TTL_SECONDS", 600),
                )
                got_lock, lock_token = article_lock.acquire(blocking=False)
                if not got_lock:
                    yield sse_event(progress_payload(
                        status="skipped",
                        current=idx,
                        total=total,
                        article_id=art.article_id,
                        mistakes=0,
                        reason="文章正在检测中"
                    ))
                    continue

                try:
                    # ---------- 1. 清理旧结果 ----------
                    if art.is_detected:
                        PA_Article_Result.query.filter_by(
                            article_id=art.article_id
                        ).delete(synchronize_session=False)
                        db.session.flush()

                    # ---------- 2. 确保有文本 ----------
                    if not _article_text_has_body(art.text):
                        rec = PA_Article_Content_Fs.query.get(art.article_id)

                        if rec and rec.content_path and Path(rec.content_path).exists():
                            try:
                                gzipped_bytes = Path(rec.content_path).read_bytes()
                                parsed_text = _normalize_article_text_payload(extract_title_and_body(gzipped_bytes))
                                if not _article_text_has_body(parsed_text):
                                    raise RuntimeError("未解析到有效正文")
                                art.text = parsed_text
                                db.session.flush()
                            except Exception:
                                yield sse_event(progress_payload(
                                    status="skipped",
                                    current=idx,
                                    total=total,
                                    article_id=art.article_id,
                                    mistakes=0,
                                    reason="未获取到正文"
                                ))
                                continue
                        else:
                            yield sse_event(progress_payload(
                                status="skipped",
                                current=idx,
                                total=total,
                                article_id=art.article_id,
                                mistakes=0,
                                reason="未获取到正文"
                            ))
                            continue

                    art.text = _normalize_article_text_payload(art.text)
                    db.session.flush()

                    # ---------- 3. 调用检测接口 ----------
                    title_req = (art.text.get('title') or '').strip()
                    body_req  = (art.text.get('body') or '').strip()

                    # 如果 title 和 body 都为空，直接跳过
                    if not title_req or not body_req:
                        yield sse_event(progress_payload(
                            status="skipped",
                            current=idx,
                            total=total,
                            article_id=art.article_id,
                            mistakes=0,
                            reason="标题或正文为空"
                        ))
                        continue

                    tm, title_res = convert_pa_to_dicts(
                        art.article_id,
                        text_check(title_req, token),
                        'title'
                    )
                    cm, content_res = convert_pa_to_dicts(
                        art.article_id,
                        text_check(body_req, token),
                        'content'
                    )

                    # ---------- 4. 更新状态 ----------
                    art.is_detected = True
                    art.mistake_num = tm + cm
                    db.session.add(art)
                    db.session.flush()

                    if title_res:
                        db.session.bulk_insert_mappings(PA_Article_Result, title_res)
                    if content_res:
                        db.session.bulk_insert_mappings(PA_Article_Result, content_res)

                    db.session.commit()

                    # ---------- 5. 推送成功进度 ----------
                    yield sse_event(progress_payload(
                        status="success",
                        current=idx,
                        total=total,
                        article_id=art.article_id,
                        mistakes=art.mistake_num
                    ))

                except Exception as e:
                    db.session.rollback()

                    yield sse_event(progress_payload(
                        status="failed",
                        current=idx,
                        total=total,
                        article_id=art.article_id,
                        mistakes=0,
                        reason=str(e)
                    ))
                finally:
                    article_lock.release(lock_token)

            # ---------- 完成事件 ----------
            yield sse_event({
                "type": "complete",
                "total": total
            }, event="complete")

        except Exception as e:
            db.session.rollback()
            yield sse_event({
                "type": "error",
                "message": str(e)
            }, event="error")

    return Response(stream_with_context(generate()), mimetype='text/event-stream')

def apply_article_filters(query, filters):
    """
    将前端传来的 filters 对象转换为 SQLAlchemy 过滤条件
    """
    # 1. 机构过滤 (必填项逻辑按需)
    affiliation = filters.get('affiliation')
    if affiliation:
        query = query.filter(PA_Article.fakeid == affiliation)

    # 2. 关键字搜索
    keyword = filters.get('keyword')
    if keyword:
        kw_clean = keyword.replace(" ", "")
        like_pat = f"%{kw_clean}%"
        query = query.filter(
            or_(
                PA_Article.title.ilike(f"%{keyword}%"),
                func.replace(PA_Article.author_name, ' ', '').ilike(like_pat)
            )
        )

    # 3. 错误等级 / 类型过滤
    levels = filters.get('levels', [])
    categories = filters.get('categories', [])
    if levels or categories:
        query = query.join(PA_Article_Result, PA_Article.article_id == PA_Article_Result.article_id)
        if levels:
            query = query.filter(PA_Article_Result.error_type_id.in_(levels))
        if categories:
            query = query.filter(PA_Article_Result.error_category.in_(categories))
        query = query.distinct()

    # 4. 年份过滤 (优先级最高)
    years = filters.get('years', [])
    if years:
        query = query.filter(func.year(PA_Article.create_time).in_(years))
    else:
        # 时间区间过滤
        start_date = filters.get('start')
        end_date = filters.get('end')
        if start_date:
            query = query.filter(PA_Article.create_time >= start_date)
        if end_date:
            query = query.filter(PA_Article.create_time <= end_date)

    return query


@bp.route('/wechat/affiliation/list', methods=['GET'])
@token_auth.login_required
@admin_required
def get_wechat_affiliation_list():
    # query 参数：前端传 ?affiliation=xxx
    preferred_id = request.args.get('affiliation')

    results = []

    if preferred_id:
        preferred = PA_Account.query.filter_by(id=preferred_id).first()
        if preferred:
            results.append(preferred)

    # 补齐其余账号（排除已加入的）
    query = PA_Account.query

    if results:
        query = query.filter(PA_Account.id.notin_([a.id for a in results]))

    others = query.limit(5 - len(results)).all()
    results.extend(others)

    return jsonify([a.to_dict() for a in results])


@bp.route('/wechat/search_affiliation', methods=['POST'])
@token_auth.login_required
@admin_required
def search_wechat_affiliation():
    data = request.get_json(silent=True) or {}

    q = (data.get("q") or "").strip()
    page = int(data.get("page", 1))
    per_page = int(data.get("pageSize", 5))

    if not q:
        return jsonify({
            "items": [],
            "total": 0
        })

    like_q = f"%{q}%"

    query = (
        PA_Account.query
        .filter(
            or_(
                PA_Account.name.ilike(like_q),
                PA_Account.id.ilike(like_q)
            )
        )
        .order_by(PA_Account.name.asc())
    )

    data = PA_Account.to_collection_dict(query, page, per_page, endpoint='api.search_wechat_affiliation')
    return jsonify(data)

def _wechat_auto_detect_schedule_time():
    hour = current_app.config.get('WECHAT_AUTO_DETECT_HOUR', 2)
    minute = current_app.config.get('WECHAT_AUTO_DETECT_MINUTE', 0)
    return f"每日 {int(hour):02d}:{int(minute):02d}"


def _format_wechat_auto_detect_time(dt):
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone(timedelta(hours=8))).isoformat()


def _get_account_detect_stats(account_ids):
    if not account_ids:
        return {}

    detected_rows = (
        db.session.query(
            PA_Article.fakeid.label('account_id'),
            func.coalesce(func.sum(PA_Article.mistake_num), 0).label('mistake_num'),
        )
        .filter(PA_Article.fakeid.in_(account_ids))
        .filter(PA_Article.is_detected.is_(True))
        .group_by(PA_Article.fakeid)
        .all()
    )
    result_rows = (
        db.session.query(
            PA_Article.fakeid.label('account_id'),
            func.max(PA_Article_Result.created_at).label('last_detected_at'),
        )
        .select_from(PA_Article_Result)
        .join(PA_Article, PA_Article.article_id == PA_Article_Result.article_id)
        .filter(PA_Article.fakeid.in_(account_ids))
        .group_by(PA_Article.fakeid)
        .all()
    )

    stats = {
        row.account_id: {'last_detected_at': None, 'mistake_num': int(row.mistake_num or 0)}
        for row in detected_rows
    }
    for row in result_rows:
        stats.setdefault(row.account_id, {'last_detected_at': None, 'mistake_num': 0})
        stats[row.account_id]['last_detected_at'] = row.last_detected_at
    return stats


def _wechat_auto_detect_account_to_dict(account, stats=None):
    stats = stats or {}
    enabled = bool(account.auto_detected)
    return {
        'id': account.id,
        'affiliation_id': account.id,
        'name': account.name,
        'alias': account.id,
        'enabled': enabled,
        'status': 'enabled' if enabled else 'disabled',
        'schedule_time': _wechat_auto_detect_schedule_time(),
        'last_crawl_at': _format_wechat_auto_detect_time(account.last_crawled),
        'last_detected_at': _format_wechat_auto_detect_time(stats.get('last_detected_at')),
        'last_status': 'success' if stats.get('last_detected_at') else None,
        'last_error': None,
        'mistake_num': stats.get('mistake_num', 0),
    }


def _wechat_auto_detect_summary(query):
    today_start = datetime.now(timezone(timedelta(hours=8))).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    ).astimezone(timezone.utc)

    account_ids = [row[0] for row in query.with_entities(PA_Account.id).all()]
    detected_today = 0
    if account_ids:
        detected_today = (
            db.session.query(func.count(distinct(PA_Article.fakeid)))
            .select_from(PA_Article)
            .join(PA_Article_Result, PA_Article_Result.article_id == PA_Article.article_id)
            .filter(PA_Article.fakeid.in_(account_ids))
            .filter(PA_Article_Result.created_at >= today_start)
            .scalar()
            or 0
        )

    return {
        'total': query.count(),
        'enabled': query.filter(PA_Account.auto_detected.is_(True)).count(),
        'detected_today': detected_today,
        'errors': 0,
        'default_schedule_time': _wechat_auto_detect_schedule_time(),
    }


@bp.route('/wechat/auto-detect/accounts', methods=['GET'])
@token_auth.login_required
@admin_required
def get_wechat_auto_detect_accounts():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    keyword = (request.args.get('keyword') or '').strip()
    status = (request.args.get('status') or '').strip()

    if status and status not in {'enabled', 'disabled', 'running', 'error'}:
        return bad_request('status 必须是 enabled、disabled、running 或 error')

    query = PA_Account.query
    if keyword:
        like_keyword = f"%{keyword}%"
        query = query.filter(or_(PA_Account.name.ilike(like_keyword), PA_Account.id.ilike(like_keyword)))

    summary = _wechat_auto_detect_summary(query)

    if status == 'enabled':
        query = query.filter(PA_Account.auto_detected.is_(True))
    elif status == 'disabled':
        query = query.filter(or_(PA_Account.auto_detected.is_(False), PA_Account.auto_detected.is_(None)))
    elif status in {'running', 'error'}:
        query = query.filter(false())

    pagination = query.order_by(PA_Account.last_crawled.desc(), PA_Account.name.asc()).paginate(
        page=page,
        per_page=per_page,
        error_out=False,
        max_per_page=100,
    )
    account_ids = [account.id for account in pagination.items]
    stats_by_account = _get_account_detect_stats(account_ids)

    return jsonify({
        'items': [
            _wechat_auto_detect_account_to_dict(account, stats_by_account.get(account.id))
            for account in pagination.items
        ],
        '_meta': {
            'page': page,
            'per_page': per_page,
            'total_items': pagination.total,
            'total_pages': pagination.pages,
        },
        'summary': summary,
    })


@bp.route('/wechat/auto-detect/accounts', methods=['POST'])
@token_auth.login_required
@admin_required
def add_wechat_auto_detect_accounts():
    payload = request.get_json(silent=True) or {}
    affiliation_ids = payload.get('affiliation_ids')
    if not isinstance(affiliation_ids, list) or not affiliation_ids:
        return bad_request('affiliation_ids 必须是非空数组')

    normalized_ids = []
    for raw_id in affiliation_ids:
        if raw_id is None:
            continue
        affiliation_id = str(raw_id).strip()
        if affiliation_id and affiliation_id not in normalized_ids:
            normalized_ids.append(affiliation_id)

    if not normalized_ids:
        return bad_request('affiliation_ids 必须是非空数组')

    accounts = PA_Account.query.filter(PA_Account.id.in_(normalized_ids)).all()
    account_by_id = {account.id: account for account in accounts}
    added = []
    existed = []
    rejected = []

    for affiliation_id in normalized_ids:
        account = account_by_id.get(affiliation_id)
        if not account:
            rejected.append({
                'affiliation_id': affiliation_id,
                'reason': 'not_found',
                'message': '公众号不在库中，不能添加',
            })
            continue

        item = {'affiliation_id': account.id, 'name': account.name}
        if account.auto_detected:
            existed.append(item)
        else:
            account.auto_detected = True
            added.append(item)

    if added:
        db.session.commit()
    else:
        db.session.rollback()

    response = {'added': added, 'existed': existed, 'rejected': rejected}
    if not added and not existed and rejected:
        response['message'] = '公众号不在库中，不能添加'
        return jsonify(response), 400
    if rejected:
        return jsonify(response), 200
    return jsonify(response), 201


@bp.route('/wechat/auto-detect/accounts/<path:affiliation_id>', methods=['DELETE'])
@token_auth.login_required
@admin_required
def remove_wechat_auto_detect_account(affiliation_id):
    account = PA_Account.query.filter_by(id=affiliation_id).first()
    if not account or not account.auto_detected:
        return jsonify({'message': '该公众号不在自动检测列表中'}), 404

    account.auto_detected = False
    db.session.commit()
    return jsonify({'removed': True, 'affiliation_id': affiliation_id})


@bp.route('/wechat/crawl_affiliation', methods=['POST'])
@token_auth.login_required
@admin_required
def crawl_wechat_affiliation():
    # 权限控制：只有管理员才能执行导入操作
    if not g.current_user.is_administrator():
        return error_response(403)
    
    # 读取请求体（需要提前以便用 fakeid / cookie 构造锁键）
    payload = request.get_json() or {}
    token = payload.get('token')               # 微信公众号后台请求所需 token
    fingerprint = payload.get('fingerprint')   # 浏览器指纹（用于防止登录失效）
    cookie = payload.get('cookie')             # 登录 cookie
    query = payload.get('query', '')
    page = payload.get('page', 1)

    spider = SPider_PA(token, fingerprint, cookie)

    hasMore, affiliations = spider.fetch_affiliation_list(query, page)

    return jsonify({
        "hasMore": hasMore,
        "affiliations": affiliations
    })

@bp.route('/wechat/import_affiliation', methods=['POST'])
@token_auth.login_required
@admin_required
def import_wechat_affiliation():
    data = request.get_json()
    
    # 1. 获取前端传来的完整 item 对象
    fakeid = data.get('fakeid')
    nickname = data.get('nickname')

    if not fakeid or not nickname:
        return jsonify({'message': '参数缺失：需包含 fakeid 和 nickname'}), 400

    try:
        # 2. 检查是否已经存在
        affiliation = PA_Account.query.filter_by(id=fakeid).first()

        if affiliation:
            # 3. 如果存在，则更新信息（实现“导入即更新”）
            affiliation.name = nickname
            return jsonify({'message': '该公众号已存在,更新信息并跳转'}), 200
        else:
            # 4. 如果不存在，则新建记录
            affiliation = PA_Account(
                id=fakeid, 
                name=nickname,
            )
            db.session.add(affiliation)

        db.session.commit()

        # 5. 返回前端需要的格式（注意：前端代码里用了 created.value 和 created.label）
        # 这里构造一个符合前端 select 组件展示的字典
        result = affiliation.to_dict()

        return jsonify({'item': result}), 200

    except IntegrityError:
        db.session.rollback()
        return jsonify({'message': '数据库冲突，该公众号可能已存在'}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'服务器内部错误: {str(e)}'}), 500

# 定义路由 `/wechat/error_category/list`，用于获取错误等级与分类列表
@bp.route('/wechat/error_category/list', methods=['GET'])
@token_auth.login_required  # 需要登录并通过 token 验证
@admin_required
def get_error_category_list():
    """
    获取错误等级与分类列表
    ---
    swagger: "2.0"
    tags:
      - WeChat - History
    summary: 获取错误等级与分类列表
    description: 获取微信公众号文章分析中错误等级及分类，用于前端下拉选择。

    responses:
      200:
        description: 返回错误等级和分类列表
        schema:
          type: object
          properties:
            levels:
              type: array
              items:
                type: object
                properties:
                  value:
                    type: string
                  label:
                    type: string
            categories:
              type: array
              items:
                type: object
                properties:
                  value:
                    type: string
                  label:
                    type: string
    """
    try:
        access_token, _ = get_access_token(get_appid(), get_key())
    except Exception:
        current_app.logger.exception('获取第三方 access_token 失败，使用推荐信息缓存或本地兜底')
        access_token = None
    level_map = get_recommendation_level_map(access_token, refresh=bool(access_token))
    category_map = get_recommendation_category_map(access_token, refresh=bool(access_token))

    level_list = [
        {'value': k, 'label': v}
        for k, v in level_map.items()
    ]
    category_list = [
        {'value': k, 'label': v}
        for k, v in category_map.items()
    ]

    return jsonify({
        'levels': level_list,
        'categories': category_list
    })


# 定义一个工具函数 ts，用于将 datetime 对象转换为时间戳（秒级浮点数）
def ts(dt: datetime):
    # 如果传入的 datetime 对象没有时区信息（naive datetime）
    if dt.tzinfo is None:
        # 强制设置为 UTC 时区
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        # 否则转换为 UTC 时间
        dt = dt.astimezone(timezone.utc)
    # 返回 UNIX 时间戳（1970年1月1日到现在的秒数）
    return dt.timestamp()


def _parse_refresh_time_range(payload):
    start_raw = payload.get('start')
    end_raw = payload.get('end')
    has_start = start_raw is not None
    has_end = end_raw is not None

    if has_start != has_end:
        raise ValueError('start/end 必须成对出现')
    if not has_start:
        return None, None
    if not isinstance(start_raw, str) or not isinstance(end_raw, str):
        raise ValueError('start/end 必须是 ISO 时间字符串')

    try:
        start_dt = parse_iso(start_raw)
        end_dt = parse_iso(end_raw)
    except ValueError as exc:
        raise ValueError('start/end 时间格式非法') from exc

    if start_dt.tzinfo is None:
        start_dt = start_dt.replace(tzinfo=timezone.utc)
    else:
        start_dt = start_dt.astimezone(timezone.utc)
    if end_dt.tzinfo is None:
        end_dt = end_dt.replace(tzinfo=timezone.utc)
    else:
        end_dt = end_dt.astimezone(timezone.utc)

    if start_dt > end_dt:
        raise ValueError('start 不能晚于 end')

    return start_dt, end_dt


def _as_utc_datetime(dt):
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _in_refresh_time_range(dt, start_dt, end_dt):
    dt = _as_utc_datetime(dt)
    return start_dt <= dt <= end_dt


def save_mhtml_to_fs(compressed: bytes, article_id: int) -> str:
    BASE_STORAGE = Path(current_app.config['CRAWL_FILES_ROOT'])

    # 计算sha256用于去重/命名
    sha = hashlib.sha256(compressed).hexdigest()
    subdir = BASE_STORAGE / sha[0:2] / sha[2:4]
    subdir.mkdir(parents=True, exist_ok=True)
    final_path = subdir / f"{sha}.mhtml.gz"
    tmp = None

    if final_path.exists():
        # 已存在，直接写 DB 引用
        path_str = str(final_path)
    else:
        # 原子写：先写 tmp，再 replace
        with tempfile.NamedTemporaryFile(dir=subdir, delete=False) as f:
            tmp = Path(f.name)
            f.write(compressed)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, final_path)
        path_str = str(final_path)

    # DB 更新（示例：merge）
    row = PA_Article_Content_Fs(article_id=article_id, content_path=path_str)
    db.session.merge(row)
    db.session.commit()
    return path_str

@bp.route('/wechat/refresh', methods=['POST'])
@token_auth.login_required
@admin_required
def pa_refresh():
    """
    Refresh WeChat public account list and contents.
    Lock refresh happens only after successfully saving a page or a content item.
    """
    if not g.current_user.is_administrator():
        return error_response(403)

    payload = request.get_json() or {}
    fakeid = payload.get('fakeid')
    token = payload.get('token')
    fingerprint = payload.get('fingerprint')
    cookie = payload.get('cookie')
    fetch_images = payload.get('fetch_images', False)
    if not isinstance(fetch_images, bool):
        return bad_request('fetch_images 必须是 boolean')

    crawl_mode_explicit = 'crawl_mode' in payload
    crawl_mode = payload.get('crawl_mode', 'request')
    if not isinstance(crawl_mode, str) or crawl_mode not in {'request', 'auto', 'playwright'}:
        return bad_request('crawl_mode 必须是 request、auto 或 playwright')
    if fetch_images and not crawl_mode_explicit:
        crawl_mode = 'playwright'

    playwright_fallback = payload.get('playwright_fallback', True)
    if not isinstance(playwright_fallback, bool):
        return bad_request('playwright_fallback 必须是 boolean')

    try:
        range_start, range_end = _parse_refresh_time_range(payload)
    except ValueError as e:
        return bad_request(str(e))
    has_time_range = range_start is not None and range_end is not None

    r = current_app.redis
    lock_value = str(uuid.uuid4())

    LOCK_KEY_PREFIX = current_app.config.get('LOCK_KEY_WECHAT', 'wechat:refresh:lock')
    LOCK_TTL = current_app.config.get('LOCK_TTL_SECONDS', 45)
    # LOCK_REFRESH_INTERVAL removed; we no longer use a refresh thread.

    cookie_raw = cookie or ''
    cookie_id = hashlib.sha256(cookie_raw.encode('utf-8')).hexdigest()[:12]

    fakeid_lock_key = f"{LOCK_KEY_PREFIX}:fakeid:{fakeid}"
    cookie_lock_key = f"{LOCK_KEY_PREFIX}:cookie:{cookie_id}"

    def _acquire_lock(key):
        try:
            return r.set(key, lock_value, nx=True, ex=LOCK_TTL)
        except Exception:
            current_app.logger.exception("[LOCK] acquire error for %s", key)
            return False

    def _release_lock_if_owned(key):
        """Delete key only if value matches our lock_value (best-effort)."""
        try:
            cur = r.get(key)
            if cur is None:
                return
            if isinstance(cur, bytes):
                cur = cur.decode()
            if cur == lock_value:
                r.delete(key)
        except Exception:
            current_app.logger.exception("[LOCK] release error for %s", key)

    def _release_all_locks():
        _release_lock_if_owned(fakeid_lock_key)
        _release_lock_if_owned(cookie_lock_key)

    def _refresh_locks_after_success():
        """Called only after a successful DB commit or content saved."""
        try:
            # best-effort extend TTL for both locks
            r.expire(fakeid_lock_key, LOCK_TTL)
            r.expire(cookie_lock_key, LOCK_TTL)
        except Exception:
            current_app.logger.exception("[LOCK] refresh error")

    # Acquire fakeid lock first
    got_fakeid = _acquire_lock(fakeid_lock_key)
    if not got_fakeid:
        return jsonify({
            "type": "error",
            "phase": "initialize",
            "status": "locked",
            "progress": 0,
            "message": "当前公众号正在被其他用户更新，请稍后再试"
        }), 423

    # Acquire cookie lock
    got_cookie = _acquire_lock(cookie_lock_key)
    if not got_cookie:
        # release fakeid lock if owned
        _release_lock_if_owned(fakeid_lock_key)
        return jsonify({
            "type": "error",
            "phase": "initialize",
            "status": "locked_cookie",
            "progress": 0,
            "message": "当前账号正在被其他会话使用，请稍后或使用管理员账号"
        }), 423

    # At this point we hold both locks (with value lock_value).
    spider = SPider_PA(token, fingerprint, cookie, fakeid)
    account = PA_Account.query.filter_by(id=fakeid).first()

    latest_article: PA_Article = (
        PA_Article.query
        .filter_by(fakeid=fakeid)
        .order_by(PA_Article.create_time.desc())
        .first()
    )
    earliest_article: PA_Article = (
        PA_Article.query
        .filter_by(fakeid=fakeid)
        .order_by(PA_Article.create_time.asc())
        .first()
    )
    allow_duplicate_page_stop = (
        has_time_range
        and earliest_article is not None
        and range_start >= _as_utc_datetime(earliest_article.create_time)
    )

    # Pre-check: first page
    first_page = []
    if not has_time_range:
        first_page = spider.fetch_publish_list(0, 5)[1] or []
    if not has_time_range and latest_article and first_page:
        try:
            first_info = json.loads(first_page[0]['publish_info'])["appmsgex"][0]
            first_ct = datetime.fromtimestamp(first_info["create_time"], tz=timezone.utc)
        except Exception:
            first_ct = None

        total_article_count = (
            PA_Article.query
            .filter(PA_Article.fakeid == fakeid)
            .count()
        )

        existing_content_count = (
            db.session.query(PA_Article_Content_Fs)
            .join(PA_Article, PA_Article.article_id == PA_Article_Content_Fs.article_id)
            .filter(
                PA_Article.fakeid == fakeid,
                PA_Article_Content_Fs.content_path.isnot(None),
                PA_Article_Content_Fs.content_path != ""
            )
            .count()
        )

        if first_ct is not None and ts(first_ct) <= ts(latest_article.create_time) and existing_content_count == total_article_count:
            # no new articles — release locks and return
            _release_all_locks()
            return jsonify({
                "type": "data",
                "phase": "initialize",
                "status": "no_new",
                "progress": 0,
                "message": "没有检测到新文章"
            })

    # Stream generator
    def generate():
        try:
            begin = 0
            per_page = 5
            page = 1
            total_articles = None
            is_finished = False

            yield json.dumps({
                "type": "data",
                "phase": "list",
                "status": "start",
                "progress": 0,
                "message": "开始拉取文章列表..."
            }) + "\n"

            saved_count = 0
            duplicate_page_streak = 0
            duplicate_page_stop_threshold = 3

            while True:
                # Try to fetch a page (network IO)
                total, publish_list = spider.fetch_publish_list(begin, per_page)

                if not (total is not None and publish_list is not None):
                    yield json.dumps({
                        "type": "error",
                        "phase": "list",
                        "status": "error",
                        "progress": 0,
                        "message": "cookie验证失败，请重新登录微信公众号以获取最新认证信息"
                    }) + '\n'
                    return

                total_articles = total  # always use latest

                if page == 1:
                    try:
                        saved_count = PA_Article.query.filter(PA_Article.fakeid == fakeid).count()
                    except Exception:
                        saved_count = 0

                    if total_articles == 0:
                        # release locks then return
                        _release_all_locks()
                        yield json.dumps({
                            "type": "data",
                            "phase": "list",
                            "status": "completed",
                            "progress": 100,
                            "message": "公众号没有文章"
                        }) + "\n"
                        return

                    if not has_time_range and saved_count >= total_articles:
                        # DB already contains all articles -> release locks and finish
                        _release_all_locks()
                        yield json.dumps({
                            "type": "data",
                            "phase": "list",
                            "status": "no_new",
                            "progress": 100,
                            "message": "没有检测到新文章（数据库已包含所有文章）"
                        }) + "\n"
                        break

                if not publish_list:
                    break

                page_range_count = 0
                page_duplicate_count = 0
                page_inserted_count = 0

                for idx, article in enumerate(publish_list, start=1):
                    info = json.loads(article['publish_info'])["appmsgex"][0]
                    title = info.get("title", "")
                    link = info.get("link", "")
                    update_time = datetime.fromtimestamp(info.get("update_time", 0), tz=timezone.utc)
                    create_time = datetime.fromtimestamp(info.get("create_time", 0), tz=timezone.utc)
                    author_name = info.get("author_name", "")
                    article_id = link.rstrip('/').rsplit('/', 1)[-1] if link else None

                    if has_time_range and not _in_refresh_time_range(create_time, range_start, range_end):
                        if create_time < range_start:
                            is_finished = True
                            break
                        continue

                    if not article_id:
                        continue

                    if has_time_range:
                        page_range_count += 1

                    existing = PA_Article.query.get(article_id)

                    if has_time_range and existing is not None:
                        page_duplicate_count += 1
                        continue

                    if existing is None:
                        new_article = PA_Article(
                            fakeid=fakeid,
                            article_id=article_id,
                            title=title,
                            link=link,
                            update_time=update_time,
                            create_time=create_time,
                            author_name=author_name,
                        )
                        db.session.add(new_article)
                        try:
                            if account:
                                account.last_crawled = datetime.now(timezone.utc)
                            db.session.commit()
                            saved_count += 1
                            page_inserted_count += 1
                            # 成功写入一条文章后，延长锁 TTL（按你的要求：在成功获取一页列表或一次正文内容之后刷新锁）
                            _refresh_locks_after_success()
                        except Exception as e:
                            current_app.logger.exception("保存文章失败: %s", e)
                            db.session.rollback()
                    else:
                        # update fields (no new count)
                        existing.title = title
                        existing.link = link
                        existing.update_time = update_time
                        existing.create_time = create_time
                        existing.author_name = author_name
                        if account:
                            account.last_crawled = datetime.now(timezone.utc)
                        try:
                            db.session.commit()
                            # 更新成功也可以刷新锁（可选）
                            _refresh_locks_after_success()
                        except Exception:
                            db.session.rollback()

                    try:
                        progress_list = int((saved_count / total_articles) * 100) if total_articles and total_articles > 0 else 0
                    except Exception:
                        progress_list = 0

                    yield json.dumps({
                        'type': 'data',
                        'phase': 'list',
                        'status': 'fetching',
                        'progress': min(100, max(0, progress_list)),
                        'message': f"已保存 第 {page} 页 第 {idx} 篇：{title}"
                    }) + '\n'

                    if not has_time_range and saved_count >= total_articles:
                        yield json.dumps({
                            'type': 'data',
                            'phase': 'list',
                            'status': 'completed',
                            'progress': 100,
                            'message': "文章列表已抓取并补全到最新（已包含所有文章）"
                        }) + '\n'
                        is_finished = True
                        break

                if has_time_range and allow_duplicate_page_stop and page_range_count > 0:
                    if page_inserted_count == 0 and page_duplicate_count == page_range_count:
                        duplicate_page_streak += 1
                    else:
                        duplicate_page_streak = 0

                    if duplicate_page_streak >= duplicate_page_stop_threshold:
                        is_finished = True
                        yield json.dumps({
                            'type': 'data',
                            'phase': 'list',
                            'status': 'no_new',
                            'progress': 100,
                            'message': f"连续 {duplicate_page_streak} 页文章已存在，停止继续拉取"
                        }) + '\n'

                begin += per_page
                page += 1

                if begin >= total_articles or is_finished:
                    break

            # 列表阶段完成（但仍保持锁，等待正文阶段或释放）
            yield json.dumps({
                'type': 'data',
                'phase': 'list',
                'status': 'completed',
                'progress': 100,
                'message': '文章标题抓取完毕，开始补充抓取文章正文内容...'
            }) + '\n'

            # 正文阶段
            existing_ids = {
                row.article_id
                for row in PA_Article_Content_Fs.query.with_entities(PA_Article_Content_Fs.article_id).all()
            }

            missing_articles_query = (
                PA_Article.query
                .filter_by(fakeid=fakeid)
                .filter(~PA_Article.article_id.in_(existing_ids))
            )
            if has_time_range:
                missing_articles_query = missing_articles_query.filter(
                    PA_Article.create_time >= range_start,
                    PA_Article.create_time <= range_end,
                )
            missing_articles = (
                missing_articles_query
                .order_by(PA_Article.create_time.desc())
                .all()
            )

            total_missing = len(missing_articles)
            if total_missing == 0:
                yield json.dumps({
                    'type': 'data',
                    'phase': 'content',
                    'status': 'completed',
                    'progress': 100,
                    'message': '没有需要补抓的正文，任务完成。'
                }) + '\n'
            else:
                yield json.dumps({
                    'type': 'data',
                    'phase': 'content',
                    'status': 'start',
                    'progress': 0,
                    'message': f'开始抓取 {total_missing} 篇文章的正文...'
                }) + '\n'

                for idx, art in enumerate(missing_articles, start=1):
                    try:
                        progress_content = int((idx / total_missing) * 100)
                    except Exception:
                        progress_content = 0

                    yield json.dumps({
                        'type': 'data',
                        'phase': 'content',
                        'status': 'fetching',
                        'progress': min(100, max(0, progress_content)),
                        'message': f"({idx}/{total_missing}) 抓取正文：{art.title}"
                    }) + '\n'

                    try:
                        current_app.logger.info(f"[FETCH] start {art.link}")
                        mhtml: bytes = spider.fetch_article_content(
                            art.link,
                            fetch_images=fetch_images,
                            crawl_mode=crawl_mode,
                            playwright_fallback=playwright_fallback,
                        )
                        current_app.logger.info(f"[FETCH] done {art.link}")
                    except Exception as e:
                        yield json.dumps({
                            'type': 'error',
                            'phase': 'content',
                            'status': 'error',
                            'progress': min(100, max(0, progress_content)),
                            'message': f"({idx}/{total_missing}) 抓取失败：{art.link}，原因：{e}"
                        }) + '\n'
                        continue

                    compressed = gzip.compress(mhtml)

                    # 写入正文表或文件系统（假设 save_mhtml_to_fs 保存并返回路径）
                    try:
                        path_to_save = save_mhtml_to_fs(compressed, art.article_id)
                    except Exception as e:
                        current_app.logger.exception("保存正文到文件系统失败: %s", e)
                        yield json.dumps({
                            'type': 'error',
                            'phase': 'content',
                            'status': 'error',
                            'progress': min(100, max(0, progress_content)),
                            'message': f"保存正文失败：{art.article_id}，原因：{e}"
                        }) + '\n'
                        continue

                    try:
                        _ = render_mhtml_inline(compressed, art.article_id)
                    except Exception as e:
                        current_app.logger.exception("render_mhtml_inline failed")
                        yield json.dumps({
                            'type': 'error',
                            'phase': 'content',
                            'status': 'render_failed',
                            'progress': min(100, max(0, progress_content)),
                            'message': f"渲染正文失败：{art.article_id}，原因：{e}"
                        }) + '\n'

                    try:
                        parsed_text = _normalize_article_text_payload(extract_title_and_body(compressed))
                        if _article_text_has_body(parsed_text):
                            art.text = parsed_text
                            db.session.commit()
                    except Exception:
                        current_app.logger.exception("extract_title_and_body failed: %s", art.article_id)

                    # 如果到这里保存成功（至少文件已写），刷新锁
                    _refresh_locks_after_success()

                    filename = os.path.basename(path_to_save)
                    short_name = filename[:8] + '...' if len(filename) > 12 else filename
                    dir_path = os.path.dirname(path_to_save)
                    display_path = os.path.join(dir_path, short_name)
                    size_mb = len(compressed) / 1024 / 1024

                    yield json.dumps({
                        'type': 'data',
                        'phase': 'content',
                        'status': 'saved',
                        'progress': min(100, max(0, progress_content)),
                        'message': f"({idx}/{total_missing}) 已保存正文：{display_path}（压缩后 {size_mb:.2f} MB）"
                    }) + '\n'

                yield json.dumps({
                    'type': 'data',
                    'phase': 'content',
                    'status': 'completed',
                    'progress': 100,
                    'message': '所有文章正文内容抓取完毕。'
                }) + '\n'

        except (GeneratorExit, BrokenPipeError, ConnectionResetError) as e:
            # 客户端已断开（例如 axios abort），记录并中断以走 finally 释放锁
            current_app.logger.info("客户断开连接或发送中断: %s", repr(e))
            return
        except Exception as e:
            current_app.logger.exception("generate 列表抓取异常: %s", e)
            yield json.dumps({
                "type": "error",
                "phase": "list",
                "status": "error",
                "progress": 0,
                "message": f"列表抓取失败: {e}"
            }) + "\n"
        finally:
            # 一律释放锁（仅释放我们持有的）
            try:
                _release_all_locks()
            except Exception:
                current_app.logger.exception('[ERROR] 释放锁失败')

    return Response(
        stream_with_context(generate()),
        mimetype='text/plain'
    )


# 工具函数：将 ISO 格式字符串解析为 datetime 对象
def parse_iso(s: str) -> datetime:
    # 若字符串以 Z 结尾，表示 UTC，需要转换为 +00:00 时区格式
    if s.endswith('Z'):
        s = s[:-1] + '+00:00'
    return datetime.fromisoformat(s)  # 返回解析后的 datetime 对象


@bp.route('/wechat/articles', methods=['GET'])
@token_auth.login_required
@admin_required
def fetch_wechat_articles():
    # 1. 分页参数
    page     = request.args.get('page',      1,  type=int)
    per_page = request.args.get('per_page', 10, type=int)

    # 2. 基础 query（不含时间过滤
    affiliation = request.args.get('affiliation', type=str)
    query = PA_Article.query.filter(PA_Article.fakeid == affiliation)

    # 3. 关键字搜索
    keyword = request.args.get('keyword', type=str)
    if keyword:
        kw = keyword.replace(" ", "")
        like_pat = f"%{kw}%"
        query = query.filter(
            or_(
                PA_Article.title.ilike(f"%{keyword}%"),
                func.replace(PA_Article.author_name, ' ', '').ilike(like_pat)
            )
        )

    # 4. 错误等级 / 类型过滤
    levels     = request.args.getlist('levels[]',     type=int)
    categories = request.args.getlist('categories[]', type=str)
    if levels or categories:
        query = query.join(
            PA_Article_Result,
            PA_Article.article_id == PA_Article_Result.article_id
        )
        if levels:
            query = query.filter(PA_Article_Result.error_type_id.in_(levels))
        if categories:
            query = query.filter(PA_Article_Result.error_category.in_(categories))
        query = query.distinct()

    # ============================================================
    # ★ 5. 基于【当前非时间条件】的按年统计（years 面板）
    # ============================================================
    try:
        # MySQL: func.year
        year_expr = func.year(PA_Article.create_time)
        # Postgres 可替换为：
        # year_expr = func.extract('year', PA_Article.create_time)

        years_q = query.with_entities(
            year_expr.label('year'),
            func.count(func.distinct(PA_Article.article_id)).label('count')
        ).group_by(year_expr).order_by(year_expr.desc())

        years_data = years_q.all()
        years_list = [
            {'year': int(row.year), 'count': int(row.count)}
            for row in years_data if row.year is not None
        ]
    except Exception:
        years_list = []

    # ============================================================
    # ★ 6. 时间 / 年份过滤（真正影响文章列表）
    # ============================================================

    # ★ NEW：不连续年份过滤（优先级最高）
    years = request.args.getlist('years[]', type=int)
    if years:
        query = query.filter(
            func.year(PA_Article.create_time).in_(years)
        )
    else:
        # 旧逻辑：连续时间区间
        start = request.args.get('start', type=str)
        end   = request.args.get('end',   type=str)

        if start:
            try:
                dt_start = parse_iso(start)
                query = query.filter(PA_Article.create_time >= dt_start)
            except ValueError:
                pass

        if end:
            try:
                dt_end = parse_iso(end)
                query = query.filter(PA_Article.create_time <= dt_end)
            except ValueError:
                pass

    # ============================================================
    # 7. 排序
    # ============================================================
    sort_by    = request.args.get('sort_by',    type=str)
    sort_order = request.args.get('sort_order', type=str)

    if sort_by in {'create_time', 'update_time', 'mistake_num'}:
        if sort_by == 'mistake_num':
            query = query.filter(PA_Article.is_detected == True)
        col = getattr(PA_Article, sort_by)
        query = query.order_by(col.asc() if sort_order == 'asc' else col.desc())
    else:
        query = query.order_by(PA_Article.create_time.desc())

    # ============================================================
    # 8. 分页 & 返回
    # ============================================================
    resp = PA_Article.to_collection_dict(
        query, page, per_page, 'api.fetch_wechat_articles'
    )

    # ★ 将 years 统计附加到响应中
    resp['years'] = years_list

    return jsonify(resp)


def _normalize_gzip_for_hash(gz: bytes) -> bytes:
    """
    将 gzip header 的 MTIME 字段清零以获得更稳定的 fingerprint，
    这样同一内容但不同 MTIME 的 gzip bytes 也会命中同一个缓存。
    gzip header 格式（前 10 字节）：ID1 ID2 CM FLG MTIME(4) XFL OS
    """
    if len(gz) >= 10 and gz[0:2] == b'\x1f\x8b':
        # 将 bytes 4..7 (MTIME) 置为 0
        return gz[:4] + b'\x00\x00\x00\x00' + gz[8:]
    return gz

def _decode_message_payload_or_raw(msg, raw: bytes) -> str:
    payload = msg.get_payload(decode=True)
    if payload is None:
        return raw.decode(msg.get_content_charset('utf-8'), 'ignore')
    return payload.decode(msg.get_content_charset('utf-8'), 'ignore')


def render_mhtml_inline(gzipped_bytes: bytes, article_id: str, force_refresh: bool = False) -> str:
    """
    将 MHTML (Gzip压缩) 转换为内联 Data-URI 格式的 HTML。
    :param force_refresh: 是否强制跳过缓存重新生成渲染结果
    """
    # 配置缓存目录
    cache_dir = Path(current_app.config.get('MHTML_RENDER_CACHE_DIR', '/uploads/mhtml_render_cache'))

    # 计算指纹
    # 注意：您的代码中 fingerprint 是基于 article_id 生成的，
    # 这意味着如果 article_id 不变，文件名就不会变，因此 force_refresh 逻辑至关重要。
    fingerprint = hashlib.sha256(
        article_id.encode("utf-8") # 假设 _normalize_gzip_for_hash 处理的是 id 或内容
    ).hexdigest()
    
    subdir = cache_dir / fingerprint[0:2] / fingerprint[2:4]
    subdir.mkdir(parents=True, exist_ok=True)
    cache_path = subdir / f"{fingerprint}.html"

    # --- 核心修改部分：缓存检查逻辑 ---
    if not force_refresh:
        try:
            if cache_path.exists() and cache_path.stat().st_size > 0:
                return str(cache_path)  # 缓存命中且非强制刷新，直接返回
        except Exception as e:
            current_app.logger.warning("缓存 %s 读取状态失败，准备重新生成: %s", cache_path, e)
    else:
        current_app.logger.info("强制刷新开启：忽略缓存，开始为文章 %s 重新生成渲染内容", article_id)
    # --- 修改结束 ---

    # 1) 解压 gzip 数据
    try:
        raw = gzip.decompress(gzipped_bytes)
    except Exception as e:
        current_app.logger.error("Gzip 解压失败: %s", e)
        return None

    # 2）解析 multipart/related 格式邮件
    msg = message_from_bytes(raw, policy=default)
    if not msg.is_multipart():
        rendered = _decode_message_payload_or_raw(msg, raw)
        try:
            tmp_path = cache_path.with_suffix('.html.tmp')
            tmp_path.write_text(rendered, encoding='utf-8', errors='replace')
            os.replace(tmp_path, cache_path)
            return str(cache_path)
        except Exception:
            current_app.logger.exception(f"缓存写入失败: {cache_path}")
            return None

    # 3）查找主 HTML 内容块
    html_part = next((p for p in msg.walk() if p.get_content_type().lower() == "text/html"), None)
    if not html_part:
        return "<p>无法找到 HTML 部分</p>"

    charset = html_part.get_content_charset('utf-8')
    html = html_part.get_payload(decode=True).decode(charset, 'ignore')

    # 4）构建资源映射表
    resource_map = {}
    frame_map = {}
    for part in msg.walk():
        ctype = part.get_content_type().lower()
        data = part.get_payload(decode=True) or b""
        loc = part.get("Content-Location") or part.get("Content-ID")
        if loc:
            loc = loc.strip("<>")
            if ctype.startswith("text/html") and loc != html_part.get("Content-Location"):
                fc = part.get_content_charset('utf-8')
                frame_map[loc] = data.decode(fc, 'ignore')
                continue
            b64 = base64.b64encode(data).decode()
            resource_map[loc] = f"data:{ctype};base64,{b64}"

    # 5）使用 BeautifulSoup 解析并内联
    soup = BeautifulSoup(html, "html.parser")

    # ── 图片、脚本、样式表、内联 CSS 中的资源链接替换 ──

    # <img src="cid:loc"> 或 <img src="loc"> 的处理
    for img in soup.find_all("img", src=True):
        src = img["src"]
        key = src.replace("cid:", "")
        if key in resource_map:
            img["src"] = resource_map[key]

    # <script src="loc"> 替换为内联 data-uri
    for tag in soup.find_all("script", src=True):
        key = tag["src"]
        if key in resource_map:
            tag["src"] = resource_map[key]

    # <link href="loc"> 替换样式表资源
    for link in soup.find_all("link", href=True):
        key = link["href"]
        if key in resource_map:
            link["href"] = resource_map[key]

    # CSS 样式表中出现的 url(...) 资源替换
    for style in soup.find_all("style"):
        txt = style.string or ""
        for loc, uri in resource_map.items():
            # 将 url("loc")、url('loc')、url(loc) 形式统一替换成 data-uri
            txt = re.sub(
                rf'url\((["\']?){re.escape(loc)}\1\)',
                f"url({uri})",
                txt
            )
        style.string = txt  # 更新 style 标签内容

    # 6）处理嵌套 iframe / frame 标签
    for frame in soup.find_all(["iframe", "frame"], src=True):
        key = frame["src"].replace("cid:", "")
        if key in frame_map:
            # 若找到对应的 frame HTML，则使用 srcdoc 方式直接内嵌内容
            frame.attrs.pop("src", None)
            frame["srcdoc"] = frame_map[key]

    # 7）添加 <base href=""> 
    head = soup.find("head")
    if head:
        base = soup.new_tag("base", href="")
        head.insert(0, base)

    rendered = str(soup)

    # 8) 原子写缓存
    try:
        tmp_path = cache_path.with_suffix('.html.tmp')
        tmp_path.write_text(rendered, encoding='utf-8', errors='replace')
        os.replace(tmp_path, cache_path)
        return str(cache_path)
    except Exception as e:
        current_app.logger.exception(f"缓存写入失败: {cache_path}")
        return None

@bp.route('/wechat/articles/<article_id>/content', methods=['GET'])
@token_auth.login_required
@admin_required
def fetch_article_content(article_id):
    # 权限检查，只有管理员可以访问
    if not g.current_user.is_administrator():
        return error_response(403)

    rec = PA_Article_Content_Fs.query.get(article_id)
    if not rec or not rec.content_path:
        return error_response(404, 'Article content not found.')

    content_path = Path(rec.content_path)
    if not content_path.exists():
        return error_response(404, f'Article content file missing: {content_path}')

    try:
        # 假设文件是直接写入的 gzipped bytes（未解压）
        gzipped_bytes = content_path.read_bytes()
    except Exception as e:
        return error_response(500, f'Failed to read article content: {e}')

    try:
        cache_path = render_mhtml_inline(gzipped_bytes, article_id)
    except Exception as e:
        # 如果渲染失败，尽量返回友好错误页面而非 500 的 traceback
        current_app.logger.exception("render_mhtml_inline failed")
        return error_response(500, f'Failed to render article content: {e}')
    
    if cache_path and Path(cache_path).exists() and Path(cache_path).stat().st_size > 0:
        # 用 send_file 发送缓存文件（让 WSGI / webserver 更高效）
        resp = make_response(send_file(str(cache_path), mimetype='text/html; charset=utf-8'))
        # 添加缓存验证头 (ETag / Cache-Control)
        resp.headers['Cache-Control'] = 'public, max-age=86400'
        resp.headers['ETag'] = article_id
        return resp

    return error_response(500, f'Failed to render article content: {e}')

@bp.route('/wechat/articles/<article_id>/refetch_content', methods=['POST'])
@token_auth.login_required
@admin_required
def refetch_article_content(article_id):
    """
    手动强制重抓单篇文章正文的接口
    输入参数: article_id (字符串)
    """
    payload = request.get_json() or {}
    if not article_id:
        return jsonify({"status": "error", "message": "缺少 article_id"}), 400

    try:
        # 1. 从数据库获取文章元数据（需要 link 来爬取）
        art = PA_Article.query.filter_by(article_id=article_id).first()
        if not art:
            return jsonify({"status": "error", "message": "数据库中未找到该文章记录"}), 404

        # 2. 调用爬虫抓取正文 (强制重新请求)
        token = payload.get('token')               # 微信公众号后台请求所需 token
        fingerprint = payload.get('fingerprint')   # 浏览器指纹（用于防止登录失效）
        cookie = payload.get('cookie')             # 登录 cookie
        fetch_images = payload.get('fetch_images', False)
        if not isinstance(fetch_images, bool):
            return bad_request('fetch_images 必须是 boolean')

        crawl_mode_explicit = 'crawl_mode' in payload
        crawl_mode = payload.get('crawl_mode', 'request')
        if not isinstance(crawl_mode, str) or crawl_mode not in {'request', 'auto', 'playwright'}:
            return bad_request('crawl_mode 必须是 request、auto 或 playwright')
        if fetch_images and not crawl_mode_explicit:
            crawl_mode = 'playwright'

        playwright_fallback = payload.get('playwright_fallback', True)
        if not isinstance(playwright_fallback, bool):
            return bad_request('playwright_fallback 必须是 boolean')

        spider = SPider_PA(token, fingerprint, cookie)
        try:
            mhtml: bytes = spider.fetch_article_content(
                art.link,
                fetch_images=fetch_images,
                crawl_mode=crawl_mode,
                playwright_fallback=playwright_fallback,
            )
        except Exception as e:
            current_app.logger.error(f"抓取失败 {art.link}: {str(e)}")
            return jsonify({"status": "error", "message": f"爬虫抓取正文失败: {str(e)}"}), 500

        if not mhtml:
            return jsonify({"status": "error", "message": "抓取到的内容为空"}), 500

        # 3. 核心逻辑：压缩与存储
        # 强制覆盖：save_mhtml_to_fs 内部逻辑通常会根据 ID 覆盖同名文件
        compressed = gzip.compress(mhtml)
        path_to_save = save_mhtml_to_fs(compressed, art.article_id)

        parsed_text = _normalize_article_text_payload(extract_title_and_body(compressed))
        art.text = parsed_text if _article_text_has_body(parsed_text) else None
        art.is_detected = False
        art.mistake_num = 0
        PA_Article_Result.query.filter_by(article_id=article_id).delete(synchronize_session=False)
        db.session.commit()

        # 4. 强制执行内联渲染逻辑
        try:
            # 传入 force_refresh=True，确保即使磁盘上有旧的 HTML 缓存也会被覆盖
            render_result = render_mhtml_inline(compressed, art.article_id, force_refresh=True)
            
            if render_result:
                current_app.logger.info(f"文章 {article_id} 渲染缓存已更新")
            else:
                current_app.logger.error(f"文章 {article_id} 渲染失败")
                
        except Exception as e:
            current_app.logger.exception("渲染重刷时发生崩溃")

        size_mb = len(compressed) / 1024 / 1024
        filename = os.path.basename(path_to_save)

        return jsonify({
            "status": "success",
            "message": "文章正文强制覆盖成功",
            "data": {
                "article_id": article_id,
                "title": art.title,
                "file": filename,
                "size_mb": round(size_mb, 2)
            }
        })

    except Exception as e:
        db.session.rollback()
        current_app.logger.exception(f"接口异常: {str(e)}")
        return jsonify({"status": "error", "message": f"系统异常: {str(e)}"}), 500

IMAGE_PLACEHOLDER_RE = re.compile(r'[【\[]\s*图\s*片\s*(?::|：)?\s*[^】\]\n]*[】\]]')
URL_RE = re.compile(r'(?i)\b(?:https?://|www\.)\S+|\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|cn|net|org|gov|edu|io|ai|me|info|biz|top|xyz|site|club|中国|公司|网络)(?:/[\w./?%&=+#:@~-]*)?')
EMOJI_RE = re.compile(r'[\U0001F1E6-\U0001F1FF\U0001F300-\U0001FAFF☀-⛿✀-➿️⃣]')
LEADING_PUNCTUATION_RE = re.compile(r'^[，。！？；：、,.!?;:）)】\]》>”’%％]+')
SENTENCE_END_RE = re.compile(r"[。！？!?；;…]+[”’\"')）】\]》>]*$")
INLINE_JOIN_TRAILING_RE = re.compile(r'[（(【\[《<“‘、，,]$')
LIST_HEADING_RE = re.compile(r'^(?:[一二三四五六七八九十百千万]+[、.．]|第[一二三四五六七八九十百千万]+[章节部分]|\d+[、.．]|[（(][一二三四五六七八九十\d]+[)）])')
HIDDEN_STYLE_RE = re.compile(r'(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0)', re.I)
ARTICLE_TEXT_BLOCK_TAGS = {
    'p', 'section', 'blockquote', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'td', 'th', 'figcaption'
}
ARTICLE_TEXT_SKIP_TAGS = {'script', 'style', 'noscript', 'svg', 'canvas', 'iframe', 'video', 'audio'}
INVISIBLE_SPACE_TRANSLATION = {
    0x200B: ' ',
    0x200C: ' ',
    0x200D: ' ',
    0xFEFF: ' ',
    0x00A0: ' ',
}


def _article_text_has_body(text: dict) -> bool:
    if not isinstance(text, dict):
        return False
    body = (text.get('body') or '').strip()
    body = IMAGE_PLACEHOLDER_RE.sub('', body)
    return bool(re.sub(r'\s+', '', body))


def _visible_text_len(text: str) -> int:
    return len(re.sub(r'\s+', '', text or ''))


def _ends_sentence(text: str) -> bool:
    return bool(SENTENCE_END_RE.search((text or '').strip()))


def _looks_like_list_heading(text: str) -> bool:
    return bool(LIST_HEADING_RE.match((text or '').strip()))


def _clean_article_text_line(line: str) -> str:
    line = str(line or '').translate(INVISIBLE_SPACE_TRANSLATION)
    line = IMAGE_PLACEHOLDER_RE.sub('', line)
    line = URL_RE.sub('', line)
    line = EMOJI_RE.sub('', line)
    line = re.sub(r'[\s\t\r\f\v]+', ' ', line)
    line = re.sub(r'\s+([，。！？；：、,.!?;:）)】\]》>”’%％])', r'\1', line)
    line = re.sub(r'([（(【\[《<“‘])\s+', r'\1', line)
    return re.sub(r'[★🔺▲|■]+', '', line).strip()


def _should_join_article_line(prev: str, current: str) -> bool:
    if not prev or not current:
        return False
    if LEADING_PUNCTUATION_RE.match(current):
        return True
    if _ends_sentence(prev):
        return False

    prev_len = _visible_text_len(prev)
    current_len = _visible_text_len(current)
    if not prev_len or not current_len:
        return False
    if _looks_like_list_heading(current) and current_len >= 3:
        return False
    if _looks_like_list_heading(prev) and prev_len >= 4 and current_len > 6:
        return False
    if prev_len <= 8 or current_len <= 8:
        return True
    if INLINE_JOIN_TRAILING_RE.search(prev):
        return True
    return prev_len < 28 and current_len < 28


def _merge_article_text_lines(lines: list[str]) -> list[str]:
    merged = []
    for line in lines:
        if not line:
            continue
        if merged and _should_join_article_line(merged[-1], line):
            merged[-1] = _clean_article_text_line(f'{merged[-1]}{line}')
        else:
            merged.append(line)
    return merged


def _normalize_article_body_text(body: str) -> str:
    lines = []
    for line in str(body or '').splitlines():
        cleaned = _clean_article_text_line(line)
        if cleaned:
            lines.append(cleaned)
    return "\n".join(_merge_article_text_lines(lines))


def _normalize_article_text_payload(text: dict) -> dict:
    if not isinstance(text, dict):
        return {"title": "", "body": ""}
    return {
        "title": _clean_article_text_line(text.get("title") or ""),
        "body": _normalize_article_body_text(text.get("body") or ""),
    }


def _append_article_text_block(blocks: list[str], text: str):
    text = _clean_article_text_line(text)
    if text and (not blocks or blocks[-1] != text):
        blocks.append(text)


def _collect_article_text_blocks(body_container) -> list[str]:
    blocks = []

    def flush(parts: list[str]):
        _append_article_text_block(blocks, ''.join(parts))
        parts.clear()

    def visit_inline(node, parts: list[str]):
        if isinstance(node, NavigableString):
            parts.append(str(node))
            return
        if not getattr(node, 'name', None):
            return

        tag_name = node.name.lower()
        if tag_name in ARTICLE_TEXT_SKIP_TAGS:
            return
        if tag_name in ARTICLE_TEXT_BLOCK_TAGS:
            flush(parts)
            visit_block(node)
            return

        for child in node.children:
            visit_inline(child, parts)

    def visit_block(node):
        parts = []
        for child in node.children:
            visit_inline(child, parts)
        flush(parts)

    top_parts = []
    for child in body_container.children:
        visit_inline(child, top_parts)
    flush(top_parts)

    if blocks:
        return blocks

    text = _clean_article_text_line(body_container.get_text('', strip=False))
    return [text] if text else []


def extract_title_and_body(gzipped_bytes: bytes) -> dict:
    raw = gzip.decompress(gzipped_bytes)
    msg = message_from_bytes(raw, policy=default)

    if not msg.is_multipart():
        html = _decode_message_payload_or_raw(msg, raw)
    else:
        html_part = next(
            (p for p in msg.walk() if p.get_content_type().lower() == "text/html"),
            None
        )
        if not html_part:
            return {"title": "", "body": ""}

        charset = html_part.get_content_charset('utf-8')
        html = html_part.get_payload(decode=True).decode(charset, 'ignore')

    soup = BeautifulSoup(html, "html.parser")
    title_tag = soup.find(id="activity-name")
    title_text = _clean_article_text_line(title_tag.get_text('', strip=False)) if title_tag else ""

    js_content = soup.find(id="js_content")
    if not js_content:
        js_content = soup.find(id="js_article")
    body_text = extract_all_text_from_mhtml(js_content) if js_content else ""

    return {
        "title": title_text,
        "body": body_text
    }


def extract_all_text_from_mhtml(body_container) -> str:
    if body_container is None:
        return ""

    # 原有处理逻辑：
    # for tag in list(body_container.find_all(tuple(ARTICLE_TEXT_SKIP_TAGS))):
    #     tag.decompose()
    #
    # for tag in list(body_container.find_all(True)):
    #     if HIDDEN_STYLE_RE.search(tag.get('style') or ''):
    #         tag.decompose()
    #
    # lines = _collect_article_text_blocks(body_container)
    # return "\n".join(_merge_article_text_lines(lines))

    content_elements = body_container.find_all(string=True)
    cleaned_texts = [text.strip() for text in content_elements if text.strip()]
    return "\n".join(cleaned_texts)

@bp.route('/wechat/articles/<article_id>/text', methods=['GET'])
@token_auth.login_required
@admin_required
def fetch_article_text(article_id):
    # 根据 article_id 从数据库获取文章对象
    rec = PA_Article.query.get(article_id)
    if not rec:
        # 如果文章不存在，返回 404 错误
        return error_response(404, 'Article content not found.')

    # 尝试从文章对象中直接获取预先解析好的文本内容
    text = _normalize_article_text_payload(rec.text)
    if _article_text_has_body(text):
        if text != rec.text:
            rec.text = text
            db.session.commit()

        # 如果已有解析文本，附加是否检测和错误数信息
        text['is_detected'] = rec.is_detected
        text['mistake_num'] = rec.mistake_num

        # 查询该文章内容相关的审核结果（正文和标题分别查询）
        content_check = PA_Article_Result.query.filter_by(article_id=article_id, result_type='content').all()
        title_check = PA_Article_Result.query.filter_by(article_id=article_id, result_type='title').all()

        # 如果存在正文审核结果，转换成字典列表添加到返回数据
        if content_check:
            text['content_check'] = [item.to_dict() for item in content_check]
        # 如果存在标题审核结果，同样处理
        if title_check:
            text['title_check'] = [item.to_dict() for item in title_check]

        # 返回带审核结果的文章文本信息
        return jsonify(text)
    
    # 如果数据库中没有预先解析的文本，调用 extract_title_and_body 函数解析正文内容
    content = PA_Article_Content_Fs.query.get(article_id)
    if not content or not content.content_path:
        return error_response(404, 'Article content not found.')

    content_path = Path(content.content_path)
    if not content_path.exists():
        return error_response(404, 'Article content file missing.')

    try:
        # 直接读取 gzip 文件为 bytes（gzip.open 会返回解压内容，如果用 'rb'）
        # 这里需要原始 gzipped bytes，以便 render_mhtml_inline 的缓存 key 一致
        # 假设文件是直接写入的 gzipped bytes（非已解压）
        gzipped_bytes = content_path.read_bytes()
    except Exception as e:
        return error_response(500, f'Failed to read article content: {e}')
    
    text = _normalize_article_text_payload(extract_title_and_body(gzipped_bytes))

    rec.text = text  # 将解析结果存回文章对象

    # 附加检测状态及错误数信息
    text['is_detected'] = rec.is_detected
    text['mistake_num'] = rec.mistake_num

    # 提交数据库更新
    db.session.commit()

    # 返回解析后的文本
    return jsonify(text)

@bp.route('/wechat/articles/<article_id>/check', methods=['PUT'])
@token_auth.login_required
@admin_required
def set_article_check_result(article_id):
    # 查询文章记录
    rec = PA_Article.query.get(article_id)
    if not rec:
        return error_response(404, 'Article content not found.')

    # 删除已有的该文章审核结果，避免重复
    PA_Article_Result.query.filter_by(article_id=article_id).delete()
    db.session.flush()  # 立即同步删除操作到数据库

    # 获取前端传来的审核结果 JSON（包含标题和正文两部分）
    result = request.json.get('check_result')

    # 调用转换函数，将审核结果转换成数据库可存储的格式
    title_mistakes, title_res = convert_pa_to_dicts(article_id, result['title_check'], 'title')
    content_mistakes, content_res = convert_pa_to_dicts(article_id, result['content_check'], 'content')

    # 1) 更新文章检测状态和错误数目
    rec.is_detected = True
    rec.mistake_num = title_mistakes + content_mistakes

    # 标记文章对象为已修改（脏数据）
    db.session.add(rec)
    # 立即 flush，确保状态同步到数据库
    db.session.flush()

    # 批量插入新的标题和正文审核结果
    if title_res:
        db.session.bulk_insert_mappings(PA_Article_Result, title_res)
    if content_res:
        db.session.bulk_insert_mappings(PA_Article_Result, content_res)

    # 提交所有变更（包括文章状态和审核结果）
    db.session.commit()

    # 返回成功响应
    return jsonify('success')

@bp.route('/wechat/crawl/systemConfig', methods=['GET'])
@token_auth.login_required
@admin_required
def fetch_system_config():
    cfg = get_system_config(db.session, "wechat_crawl_config")
    return cfg

@bp.route('/wechat/crawl/systemConfig', methods=['PUT'])
@token_auth.login_required
@admin_required
def put_system_config():
    module = request.json.get('module')
    value_type = request.json.get('value_type')
    value = request.json.get('value')
    description = request.json.get('description')

    cfg = set_system_config(
        db.session, 
        module=module, 
        key="wechat_crawl_config", 
        value=value, 
        value_type=value_type, 
        description=description, 
        updated_by=g.current_user.id
    )
    return jsonify(cfg.to_dict())

@bp.route('/wechat/crawl/verify-cookie', methods=['POST'])
@token_auth.login_required
@admin_required
def verify_cookie():
    token = request.json.get('token')
    fingerprint = request.json.get('fingerprint')
    cookie = request.json.get('cookie')

    spider = SPider_PA(token, fingerprint, cookie)

    # 预检测：获取第一页
    total, affiliation_list = spider.fetch_affiliation_list(token, 1)
    if total is not None and affiliation_list is not None:
        return jsonify({"message": "Cookie 验证成功"}), 200
    else:
        return jsonify({"message": "Cookie 验证失败"}), 400
    
EXPORT_BATCH_SIZE = 200


def _build_export_article_info(art, summary_stats, include_article_content):
    results = art.proofread_results
    content_map = art.text if isinstance(art.text, dict) else {}

    article_info = {
        "title": art.title,
        "author": art.author_name,
        "date": art.create_time.strftime('%Y-%m-%d') if art.create_time else "",
        "link": art.link,
        "mistake_count": art.mistake_num,
        "details": []
    }
    if include_article_content:
        article_info["article_content"] = {
            "title": content_map.get('title', ''),
            "body": content_map.get('body', '')
        }

    summary_stats["total_mistakes"] += art.mistake_num or 0

    for res in results:
        source_text = ""
        if res.result_type == 'title':
            source_text = content_map.get('title', '')
        else:
            source_text = content_map.get('body', '')

        extracted_original = ""
        if source_text and res.start_pos is not None and res.end_pos is not None:
            extracted_original = source_text[res.start_pos : res.end_pos]

        detail = {
            "type": res.error_category or "无分类",
            "level": res.error_type_name or "无等级",
            "original": extracted_original,
            "recommend": res.recommend_text or "",
            "context": res.context_snippet or "",
            "location": f"{'标题' if res.result_type == 'title' else '正文'} (位置:{res.start_pos}—{res.end_pos})"
        }
        article_info["details"].append(detail)

        cat = detail["type"]
        summary_stats["error_types"][cat] = summary_stats["error_types"].get(cat, 0) + 1

    return article_info


def _iter_export_articles(query, batch_size=EXPORT_BATCH_SIZE):
    last_article_id = None
    ordered_query = query.order_by(PA_Article.article_id.asc())

    while True:
        batch_query = ordered_query
        if last_article_id is not None:
            batch_query = batch_query.filter(PA_Article.article_id > last_article_id)
        batch = (
            batch_query
            .options(selectinload(PA_Article.proofread_results))
            .limit(batch_size)
            .all()
        )
        if not batch:
            break

        for article in batch:
            yield article
        last_article_id = batch[-1].article_id
        db.session.expunge_all()


@bp.route('/wechat/proofread/export', methods=['POST'])
@token_auth.login_required
@admin_required
def wechat_proofread_export():
    payload = request.get_json() or {}
    mode = payload.get('mode', 'selected')
    file_format = payload.get('format', 'pdf')
    filters = payload.get('filters', {})
    ids = payload.get('ids', [])
    include_article_content = payload.get('include_article_content', False)
    if not isinstance(include_article_content, bool):
        return bad_request('include_article_content 必须是 boolean')
    if file_format not in {'json', 'txt', 'xlsx', 'pdf'}:
        return bad_request('不支持的文件格式')

    # 1. 获取文章数据
    query = PA_Article.query.filter(PA_Article.is_detected == True)
    if mode == 'selected':
        if not ids:
            return bad_request('未提供选中的文章ID')
        query = query.filter(PA_Article.article_id.in_(ids))
    else:
        query = apply_article_filters(query, filters)

    total_articles = query.count()
    if total_articles == 0:
        return error_response(404, '没有符合条件的数据可导出')

    summary_stats = {
        "total_articles": total_articles,
        "total_mistakes": 0,
        "error_types": {}
    }

    if file_format == 'xlsx':
        return generate_excel(query, summary_stats, include_article_content)

    export_data = []
    for art in _iter_export_articles(query):
        export_data.append(_build_export_article_info(art, summary_stats, include_article_content))

    if file_format == 'json':
        return jsonify({"summary": summary_stats, "data": export_data})
    elif file_format == 'txt':
        return generate_txt(export_data, summary_stats)
    elif file_format == 'pdf':
        return generate_pdf(export_data, summary_stats)

# --- 辅助生成函数 ---

def generate_txt(data, summary):
    output = io.StringIO()
    output.write(f"微信文章校对报告\n生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
    output.write("="*30 + "\n")
    output.write(f"总计文章: {summary['total_articles']} 篇\n")
    output.write(f"发现错误: {summary['total_mistakes']} 处\n\n")

    for art in data:
        output.write(f"【文章】{art['title']} ({art['author']})\n")
        if art.get('article_content'):
            content = art['article_content']
            output.write(f"{content.get('body', '')}")
        if not art['details']:
            output.write("  - 未发现错误或未进行检测\n")
        for d in art['details']:
            # 使用 location 明确是标题还是正文
            output.write(f"  - [{d['type']}] {d['location']}\n")
            output.write(f"    原文：{d['original']}\n")
            output.write(f"    建议：{d['recommend']}\n")
            # 只有当 context 不为空时才打印
            if d['context']:
                output.write(f"    上下文: ...{d['context']}...\n")
        output.write("\n")
    
    mem = io.BytesIO()
    mem.write(output.getvalue().encode('utf-8'))
    mem.seek(0)
    return send_file(mem, mimetype='text/plain', as_attachment=True, download_name="report.txt")

def _append_excel_article_rows(sheet, art):
    article_content = art.get('article_content') or {}
    include_article_content = bool(article_content)

    def append_row(detail):
        row = [
            art['title'],
            art['author'],
            art['date'],
            art['mistake_count'] if detail else 0,
            detail['location'] if detail else "-",
            detail['type'] if detail else "-",
            detail['original'] if detail else "-",
            detail['recommend'] if detail else "-",
            detail['context'] if detail else "-",
        ]
        if include_article_content:
            row.extend([
                article_content.get('title', ''),
                article_content.get('body', ''),
            ])
        sheet.append(row)

    if not art['details']:
        append_row(None)
        return

    for detail in art['details']:
        append_row(detail)


def generate_excel(query, summary, include_article_content):
    output = io.BytesIO()
    workbook = Workbook(write_only=True)
    detail_sheet = workbook.create_sheet('详细结果')
    headers = ["文章标题", "作者", "发布时间", "错误总数", "位置", "错误类型", "原始内容", "推荐建议", "上下文"]
    if include_article_content:
        headers.extend(["原文标题", "原文正文"])
    detail_sheet.append(headers)

    for art in _iter_export_articles(query):
        article_info = _build_export_article_info(art, summary, include_article_content)
        _append_excel_article_rows(detail_sheet, article_info)

    summary_sheet = workbook.create_sheet('统计摘要')
    summary_sheet.append(["错误类型", "数量"])
    for error_type, count in summary['error_types'].items():
        summary_sheet.append([error_type, count])

    workbook.save(output)
    output.seek(0)
    return send_file(output, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                     as_attachment=True, download_name="proofread_report.xlsx")

def generate_pdf(data, summary):
    # 1. 定义 HTML 模板
    html_template = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            @page { size: A4; margin: 2cm; }
            body { font-family: "PingFang SC", "Microsoft YaHei", sans-serif; color: #333; line-height: 1.6; }
            h1 { text-align: center; color: #409EFF; border-bottom: 2px solid #409EFF; padding-bottom: 10px; }
            .summary-box { background: #F5F7FA; padding: 15px; border-radius: 8px; margin-bottom: 30px; display: flex; justify-content: space-around; }
            .summary-item { text-align: center; }
            .summary-item b { font-size: 24px; color: #F56C6C; display: block; }
            
            .article-section { margin-bottom: 40px; page-break-inside: avoid; }
            /* 优化头部布局，使其支持两端对齐 */
            .article-header { 
                background: #EBEEF5; 
                padding: 10px 15px; 
                border-left: 5px solid #409EFF; 
                font-weight: bold; 
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .article-title { font-size: 14px; flex: 1; }
            .article-meta { font-weight: normal; font-size: 12px; color: #666; white-space: nowrap; margin-left: 20px; }
            .error-count-tag { color: #F56C6C; font-weight: bold; }

            .mistake-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            .mistake-table th { background: #F2F6FC; text-align: left; padding: 8px; border: 1px solid #DCDFE6; }
            .mistake-table td { padding: 8px; border: 1px solid #DCDFE6; }
            .original { color: #F56C6C; text-decoration: line-through; }
            .recommend { color: #67C23A; font-weight: bold; }
            .tag { padding: 2px 6px; border-radius: 4px; font-size: 11px; background: #909399; color: #fff; }
        </style>
    </head>
    <body>
        <h1>微信公众号文章校对分析报告</h1>
        
        <div class="summary-box">
            <div class="summary-item"><span>检测文章数</span><b>{{ summary.total_articles }}</b></div>
            <div class="summary-item"><span>发现错误总数</span><b>{{ summary.total_mistakes }}</b></div>
            <div class="summary-item"><span>平均单篇错误</span><b>{{ (summary.total_mistakes / summary.total_articles)|round(1) if summary.total_articles > 0 else 0 }}</b></div>
        </div>

        {% for art in data %}
        <div class="article-section">
            <div class="article-header">
                <span class="article-title">{{ loop.index }}. {{ art.title }}</span>
                <span class="article-meta">
                    {# 2. 作者不为空才显示 #}
                    {% if art.author %}
                        作者：{{ art.author }} | 
                    {% endif %}
                    时间：{{ art.date }} | 
                    {# 1. 显示这篇文章的错误数量 #}
                    错误数：<span class="error-count-tag">{{ art.mistake_count }}</span>
                </span>
            </div>
            
            {% if art.article_content %}
            <div style="margin: 10px 0 15px 15px; font-size: 13px; white-space: pre-wrap;">
                <b>原文标题：</b>{{ art.article_content.title }}<br>
                <b>原文正文：</b><br>{{ art.article_content.body }}
            </div>
            {% endif %}

            {% if art.details %}
            <table class="mistake-table">
                <thead>
                    <tr>
                        <th width="25%">类型/位置</th>
                        <th width="75%">校对建议</th>
                    </tr>
                </thead>
                <tbody>
                    {% for d in art.details %}
                    <tr>
                        <td>
                            <span class="tag">{{ d.type }}</span><br>
                            <small style="color: #666;">{{ d.location }}</small>
                        </td>
                        <td>
                            <span class="original">{{ d.original if d.original else '(未提取到原文)' }}</span> 
                            <span style="margin: 0 5px;">→</span> 
                            <span class="recommend">{{ d.recommend }}</span>
                        </td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
            {% else %}
            <p style="color: #67C23A; font-size: 13px; margin-left: 15px;">✓ 本篇文章未检测出校对错误。</p>
            {% endif %}
        </div>
        {% endfor %}
        
        <div style="text-align: center; color: #C0C4CC; font-size: 12px; margin-top: 50px;">
            报告生成时间：{{ now_time }} | 系统自动生成
        </div>
    </body>
    </html>
    """

    # 2. 渲染 HTML 内容
    rendered_html = render_template_string(
        html_template, 
        data=data, 
        summary=summary, 
        now_time=datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    )

    # 3. 使用 WeasyPrint 生成 PDF
    pdf_file = HTML(string=rendered_html).write_pdf()

    # 4. 返回文件流
    return send_file(
        io.BytesIO(pdf_file),
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f"校对报告_{datetime.now().strftime('%Y%m%d%H%M')}.pdf"
    )