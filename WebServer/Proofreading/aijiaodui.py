import requests
from typing import List, Dict, Any
from flask import current_app
from urllib.parse import urljoin
import copy
import json
from Proofreading.document import recommendation_level_map, recommendation_category_map
from redis import Redis
import time

def get_api_base():
    return current_app.config['PROOFREADING_API_BASE']

DEFAULT_API_TOKEN_EXPIRES = 7200
LOCK_EXPIRE = 10           # 获取 token 时分布式锁的过期（秒）
LOCK_WAIT_RETRIES = 20     # 若未获取锁，最多循环等待次数
LOCK_WAIT_INTERVAL = 0.2   # 每次等待间隔（秒）
SAFETY_MARGIN = 60         # 将 token 写入 redis 时从 expires_in 减掉的安全秒数（避免恰好到期）

def get_access_token(appid: str, key: str, min_valid_seconds: int = 0):
    """
    从 Redis 缓存或远端接口获取 access_token。
    - app: Flask app 或 current_app
    - min_valid_seconds: 如果缓存 token 的剩余有效期小于该值，会强行刷新
    返回: (access_token: str, remaining_seconds: int)
    失败会抛出 RuntimeError
    """
    redis: Redis = current_app.redis
    cache_key = f"api:access_token:{appid}"
    lock_key = cache_key + ":lock"

    # 1) 尝试读取缓存
    try:
        cached = redis.get(cache_key)
        if cached:
            ttl = redis.ttl(cache_key)
            # ttl == -2 -> key 不存在, ttl == -1 -> key 无过期 (罕见)
            if ttl is None:
                ttl = -2
            if ttl >= min_valid_seconds:
                token = cached.decode("utf-8") if isinstance(cached, (bytes, bytearray)) else str(cached)
                return token, int(ttl)
            # 若 ttl < min_valid_seconds，需要刷新（继续下面逻辑）
    except Exception as e:
        # Redis 出错：记录日志并继续尝试直接调用接口获取
        try:
            current_app.logger.warning(f"Redis 读取 access_token 失败（忽略并尝试刷新）: {e}")
        except Exception:
            pass

    # 2) 尝试获取分布式锁以刷新 token（防止并发击穿）
    got_lock = False
    try:
        got_lock = redis.set(lock_key, "1", nx=True, ex=LOCK_EXPIRE)
    except Exception:
        got_lock = False

    if not got_lock:
        # 其它进程正在刷新：轮询等待缓存被写入
        for _ in range(LOCK_WAIT_RETRIES):
            time.sleep(LOCK_WAIT_INTERVAL)
            try:
                cached = redis.get(cache_key)
                if cached:
                    ttl = redis.ttl(cache_key)
                    if ttl is None:
                        ttl = -2
                    if ttl >= min_valid_seconds:
                        token = cached.decode("utf-8") if isinstance(cached, (bytes, bytearray)) else str(cached)
                        return token, int(ttl)
                    # 虽然已写入但 ttl 不足，继续等待或最终自己去刷新
            except Exception:
                # 读取失败就继续等待或尝试获得锁后刷新
                pass

        # 最多等待后，再次尝试获取锁一次
        try:
            got_lock = redis.set(lock_key, "1", nx=True, ex=LOCK_EXPIRE)
        except Exception:
            got_lock = False

    if not got_lock:
        # 最后仍不能拿锁：作为兜底，我们直接调用接口获取（避免长时间阻塞）
        try:
            token, expires_in = _fetch_token_from_api(appid, key)
            # 写入 Redis（尽量写入真实 expires_in - SAFETY_MARGIN）
            try:
                write_ttl = max(1, int(expires_in) - SAFETY_MARGIN)
                redis.setex(cache_key, write_ttl, token)
            except Exception:
                current_app.logger.warning("Redis 写入 access_token 失败（忽略）")
            return token, int(expires_in)
        except Exception as e:
            raise RuntimeError(f"获取 access_token 失败（无锁兜底）: {e}") from e

    # 如果拿到锁，则由当前进程负责刷新
    try:
        token, expires_in = _fetch_token_from_api(appid, key)
        # 写回 Redis：尽量使用真实 expires_in 减去安全余量写入（使得后续读取时仍有安全空间）
        try:
            write_ttl = max(1, int(expires_in) - SAFETY_MARGIN)
            redis.setex(cache_key, write_ttl, token)
        except Exception as e:
            current_app.logger.warning(f"Redis 写入 access_token 失败: {e}")
        return token, int(expires_in)
    finally:
        # 释放锁（如果锁过期了也没关系）
        try:
            redis.delete(lock_key)
        except Exception:
            pass


def _fetch_token_from_api(appid: str, key: str):
    """
    真正去远端拉取 token（同步 HTTP）。失败抛异常。
    返回 (token_str, expires_in_seconds)
    """
    url = urljoin(get_api_base(), "api_token")
    try:
        response = requests.post(
            url,
            json={"app_id": appid, "app_secret": key},
            verify=False,
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        access_token = data.get("access_token")
        expires_in = int(data.get("expires_in", DEFAULT_API_TOKEN_EXPIRES))
        if not access_token:
            raise RuntimeError(f"api_token 接口未返回 access_token: {data}")
        return access_token, expires_in
    except Exception as e:
        # 记录并抛出具体异常
        try:
            current_app.logger.exception("fetch access_token failed")
        except Exception:
            pass
        raise

class WordApiBusinessError(RuntimeError):
    def __init__(self, endpoint: str, code, message: str, result: dict):
        self.endpoint = endpoint
        self.code = code
        self.message = message
        self.result = result
        super().__init__(f"第三方词库接口返回错误: {endpoint}, code={code}, message={message}")


def _word_api_success_code(code) -> bool:
    if code is None:
        return True
    try:
        return int(code) == 0
    except (TypeError, ValueError):
        return str(code).strip() in ("", "0")


def _validate_word_api_result(endpoint: str, result):
    if not isinstance(result, dict):
        return
    code = result.get("code")
    if code is None:
        code = result.get("errcode")
    if _word_api_success_code(code):
        return
    message = (
        result.get("message")
        or result.get("msg")
        or result.get("errmsg")
        or result.get("error")
        or "第三方词库接口返回失败"
    )
    raise WordApiBusinessError(endpoint, code, message, result)


def _post_words_json(endpoint: str, access_token: str, payload: dict, timeout=(10, 30)):
    url = urljoin(get_api_base(), endpoint)
    try:
        response = requests.post(
            url,
            params={"access_token": access_token},
            json=payload,
            timeout=timeout,
        )
        response.raise_for_status()
        result = response.json()
        _validate_word_api_result(endpoint, result)
        return result
    except requests.exceptions.Timeout as e:
        raise RuntimeError(f"第三方词库接口请求超时: {endpoint}") from e
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"第三方词库接口请求失败: {endpoint}, {e}") from e
    except ValueError as e:
        raise RuntimeError(f"第三方词库接口返回非 JSON: {endpoint}") from e


def _word_payload(type, **fields):
    payload = {"type": type}
    for key, value in fields.items():
        if value is not None:
            payload[key] = value
    return payload


def delete_word(type, id, access_token):
    return _post_words_json("words/delete_one", access_token, _word_payload(type, id=id))


def get_word_add(type, word, recommend, hint, word_explain, word_example, access_token):
    return _post_words_json(
        "words/add_one",
        access_token,
        _word_payload(
            type,
            word=word,
            recommend=recommend,
            hint=hint,
            word_explain=word_explain,
            word_example=word_example,
        ),
    )


def update_word(type, id, word, recommend, hint, word_explain, word_example, access_token):
    return _post_words_json(
        "words/update_one",
        access_token,
        _word_payload(
            type,
            id=id,
            word=word,
            recommend=recommend,
            hint=hint,
            word_explain=word_explain,
            word_example=word_example,
        ),
    )


def delete_words(type, ids, access_token):
    return _post_words_json("words/delete_many", access_token, _word_payload(type, ids=ids))


def upload_words(type, file_storage, filename, access_token):
    url = urljoin(get_api_base(), "words/upload")
    try:
        response = requests.post(
            url,
            params={"access_token": access_token},
            data={"type": type},
            files={
                "file": (
                    filename,
                    file_storage.stream,
                    file_storage.mimetype or "application/octet-stream",
                )
            },
            timeout=(10, 120),
        )
        response.raise_for_status()
        result = response.json()
        _validate_word_api_result("words/upload", result)
        return result
    except requests.exceptions.Timeout as e:
        raise RuntimeError("第三方词库上传接口请求超时") from e
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"第三方词库上传接口请求失败: {e}") from e
    except ValueError as e:
        raise RuntimeError("第三方词库上传接口返回非 JSON") from e


def get_word_dict(type, size, num, access_token, search):
    return _post_words_json(
        "words/get_list",
        access_token,
        _word_payload(type, size=size, num=num, search=search),
    )

RECOMMENDATION_CACHE_TTL_SECONDS = 24 * 60 * 60
RECOMMENDATION_LEVEL_CACHE_KEY = "api:recommendation:level_info"
RECOMMENDATION_CATEGORY_CACHE_KEY = "api:recommendation:category_info"


def build_prefix_keys(mapping):
    return sorted(mapping.keys(), key=lambda k: len(k), reverse=True)


def score_to_risklevel(score: int) -> str:
    if score >= 3:
        return 'critical'
    if score == 2:
        return 'high'
    return 'medium'


def _local_category_score(code: str):
    if not code:
        return None
    code = str(code)
    if code in recommendation_category_map:
        return recommendation_category_map[code][1]
    for key in build_prefix_keys(recommendation_category_map):
        if code.startswith(key):
            return recommendation_category_map[key][1]
    return None


def _normalize_recommendation_pairs(result: dict, key: str):
    rows = result.get(key) if isinstance(result, dict) else None
    if not isinstance(rows, list):
        return {}

    mapping = {}
    for row in rows:
        if not isinstance(row, (list, tuple)) or len(row) < 2:
            continue
        code, label = row[0], row[1]
        if code is None or label is None:
            continue
        mapping[code] = str(label)
    return mapping


def _cache_recommendation_mapping(cache_key: str, mapping: dict):
    try:
        current_app.redis.setex(cache_key, RECOMMENDATION_CACHE_TTL_SECONDS, json.dumps(mapping, ensure_ascii=False))
    except Exception:
        current_app.logger.warning("写入推荐信息缓存失败: %s", cache_key)


def _load_recommendation_mapping(cache_key: str):
    try:
        cached = current_app.redis.get(cache_key)
        if not cached:
            return None
        text = cached.decode("utf-8") if isinstance(cached, (bytes, bytearray)) else str(cached)
        data = json.loads(text)
        return data if isinstance(data, dict) else None
    except Exception:
        current_app.logger.warning("读取推荐信息缓存失败: %s", cache_key)
        return None


def _get_recommendation_json(endpoint: str, access_token: str):
    url = urljoin(get_api_base(), endpoint)
    try:
        resp = requests.get(url, params={"access_token": access_token}, timeout=(5, 15))
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.Timeout as e:
        raise RuntimeError(f"第三方推荐信息接口请求超时: {endpoint}") from e
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"第三方推荐信息接口请求失败: {endpoint}, {e}") from e
    except ValueError as e:
        raise RuntimeError(f"第三方推荐信息接口返回非 JSON: {endpoint}") from e


def _level_map_with_int_keys(mapping: dict):
    normalized = {}
    for key, value in mapping.items():
        try:
            normalized[int(key)] = value
        except (TypeError, ValueError):
            normalized[key] = value
    return normalized


def get_recommendation_level_map(access_token: str = None, refresh: bool = False):
    if not refresh:
        cached = _load_recommendation_mapping(RECOMMENDATION_LEVEL_CACHE_KEY)
        if cached is not None:
            return _level_map_with_int_keys(cached)
    if access_token:
        try:
            result = get_recommendation_level(access_token)
            mapping = _normalize_recommendation_pairs(result, 'recommendation_level_info')
            if mapping:
                _cache_recommendation_mapping(RECOMMENDATION_LEVEL_CACHE_KEY, mapping)
                return _level_map_with_int_keys(mapping)
        except Exception:
            current_app.logger.exception("获取第三方推荐程度信息失败")
    cached = _load_recommendation_mapping(RECOMMENDATION_LEVEL_CACHE_KEY)
    if cached is not None:
        return _level_map_with_int_keys(cached)
    return recommendation_level_map


def get_recommendation_category_map(access_token: str = None, refresh: bool = False):
    if not refresh:
        cached = _load_recommendation_mapping(RECOMMENDATION_CATEGORY_CACHE_KEY)
        if cached is not None:
            return cached
    if access_token:
        try:
            result = get_recommendation_categories(access_token)
            mapping = _normalize_recommendation_pairs(result, 'recommendation_categories_info')
            if mapping:
                _cache_recommendation_mapping(RECOMMENDATION_CATEGORY_CACHE_KEY, mapping)
                return mapping
        except Exception:
            current_app.logger.exception("获取第三方推荐分类信息失败")
    cached = _load_recommendation_mapping(RECOMMENDATION_CATEGORY_CACHE_KEY)
    if cached is not None:
        return cached
    return {code: item[0] for code, item in recommendation_category_map.items()}


def resolve_category_name(code: str, category_map: dict = None):
    if not code:
        return None, None
    code = str(code)
    category_map = category_map or get_recommendation_category_map()
    score = _local_category_score(code)

    if code in category_map:
        return category_map[code], score
    for key in build_prefix_keys(category_map):
        if code.startswith(str(key)):
            return category_map[key], score or _local_category_score(key)
    return None, score


def resolve_category_score_by_name(name: str):
    if not name:
        return None
    for label, score in recommendation_category_map.values():
        if name == label or name.find(label) != -1 or label.find(name) != -1:
            return score
    return None

def convert_categories_in_check_result(raw_result: dict, access_token: str = None) -> dict:
    result = copy.deepcopy(raw_result)
    category_map = get_recommendation_category_map(access_token)
    level_map = get_recommendation_level_map(access_token)

    sec_result = result.get('result') or {}
    mistakes = sec_result.get('mistakes') or []
    for m in mistakes:
        infos = m.get('infos') or []
        for info in infos:
            code = info.get('category') or info.get('category_code') or None
            info['category_code'] = code
            name, score = resolve_category_name(code, category_map)
            if name:
                score = int(score) if score is not None else 1
                info['category_name'] = name
                info['score'] = score
                info['riskLevel'] = score_to_risklevel(score)
            else:
                info['category_name'] = '未知分类'
                info['score'] = None
                info['riskLevel'] = 'medium'
            info['type_name'] = level_map.get(info.get('type'))
            info['category'] = info['category_name']

    return result

ERROR_CODE_MAP = {
    -1:     "系统繁忙，请稍后再试",
    40001:  "access_token 无效或不是最新",
    41002:  "缺少 appsecret 参数",
    40003:  "不合法的 AppID",
    40004:  "无效的 appsecret",
    43001:  "AppID 被禁用",
    44001:  "AppID 未开始生效",
    48001:  "API 功能未授权",
    50001:  "数据格式错误（JSON/XML 解析失败或参数缺失）",
    50002:  "不支持的文件类型",
    60001:  "流量已耗尽",
    60002:  "服务已过期（时长耗尽）",
    70001:  "词典单词添加错误",
    70002:  "词典单词更新错误",
    70003:  "词典列表获取错误",
    70004:  "词典单词删除错误",
}
MAX_RETRY = 3
RETRY_SLEEP = 1.0   # 每次重试间隔（秒）

def text_check(text: str, access_token: str):
    """
    执行文本校对，调用校对接口检查文本中的错误。

    - 当发生【超时】或【系统繁忙(-1)】时自动重试（最多3次）
    - 返回准确的中文错误信息
    """
    url = "https://www.ijiaodui.com:8080/component/v2/check"
    params = {"access_token": access_token}

    last_exc = None

    for attempt in range(1, MAX_RETRY + 1):
        try:
            response = requests.post(
                url,
                params=params,
                json={
                    "text": text,
                    "check_mode": 3, #准2.0：更高阶算法，精准更高，但校对速度相比于全、准会慢2~3倍左右
                    "check_functions": 799
                },
                timeout=(5, 30)   # 连接超时5秒，读取超时30秒
            )
            response.raise_for_status()
            result = response.json()

            # ---------- 业务错误处理 ----------
            code = result.get("code", 0)
            if code != 0:
                # 系统繁忙：允许重试
                if code == -1 and attempt < MAX_RETRY:
                    time.sleep(RETRY_SLEEP)
                    continue

                # 翻译错误码为中文
                cn_msg = ERROR_CODE_MAP.get(code, "未知错误")
                raw_msg = result.get("msg", "")

                raise RuntimeError(
                    f"接口返回错误: code={code}, {cn_msg}"
                    + (f" ({raw_msg})" if raw_msg else "")
                )

            # ---------- 成功 ----------
            return convert_categories_in_check_result(result, access_token)

        # ---------- 超时异常：允许重试 ----------
        except (requests.exceptions.Timeout) as e:
            if attempt < MAX_RETRY:
                time.sleep(RETRY_SLEEP)
                continue
            raise RuntimeError(
                f"请求校对接口超时，已重试 {MAX_RETRY} 次仍失败，{str(e)}"
            ) from e

        # ---------- 其它网络异常：不重试 ----------
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"请求校对接口失败：{str(e)}") from e

        # ---------- 业务异常 ----------
        except Exception as e:
            # 非系统繁忙的业务错误直接抛出
            last_exc = e

    if last_exc:
        raise RuntimeError(f"请求失败：{last_exc}") from last_exc

def convert_pa_to_dicts(article_id: str, api_result: Dict[str, Any], result_type) -> List[Dict[str, Any]]:
    records = []
    level_map = get_recommendation_level_map()
    result = api_result['result']
    mistakes = result.get('mistakes', [])
    for mistake in mistakes:
        start = mistake.get('l')
        end = mistake.get('r')
        for info in mistake.get('infos', []):
            error_type_id = info.get('type')
            category_code = info.get('category_code') or info.get('category')
            category_name = info.get('category_name')
            if not category_name or category_name == category_code:
                category_name = resolve_category_name(category_code)[0]
            record = {
                'article_id': article_id,
                'vendor': 'PA',
                'start_pos': start,
                'end_pos': end,
                'original_text': None,
                'context_snippet': None,
                'error_type_id': error_type_id,
                'error_type_name': info.get('type_name') or level_map.get(error_type_id),
                'error_category': category_code,
                'error_category_name': category_name or category_code,
                'sentence_error_count': None,
                'recommend_text': info.get('recommend'),
                'extra_info': {'desc1': info.get('desc1')} if info.get('desc1') else None,
                'result_type': result_type
            }
            records.append(record)

    mistake_num = result.get('mistake_num', 0)
    return mistake_num, records


def get_recommendation_level(access_token):
    return _get_recommendation_json("get_recommendation_level_info", access_token)


def get_recommendation_categories(access_token):
    return _get_recommendation_json("get_recommendation_categories_info", access_token)

    
def get_remaining_num(access_token):
    """
    调用“对时”接口，获取服务端剩余调用次数等时间校验信息的 JSON 数据。
    接口文档：https://www.ijiaodui.com:8080/component/v1/get_recommendation_level

    :param access_token: str，访问令牌
    :returns: dict，接口返回的 JSON 数据
    :raises: Exception 如果请求失败或返回格式错误
    """

    # 构造请求 URL，带上 access_token 参数
    url = urljoin(get_api_base(), f"get_remaining_num?access_token={access_token}")

    try:
        # 注意此接口使用 POST 请求，连接超时5秒，读取超时15秒
        resp = requests.post(url, timeout=(5, 15))
        resp.raise_for_status()  # 抛出HTTP错误异常
    except requests.exceptions.ReadTimeout:
        print("调用对时接口超时")
        raise Exception("对时接口请求超时")
    except requests.exceptions.HTTPError as e:
        print(f"对时接口返回 HTTP 错误: {e}")
        raise
    except Exception as e:
        print(f"调用对时接口失败: {e}")
        raise

    try:
        # 尝试解析JSON响应
        return resp.json()
    except ValueError:
        print("对时接口返回的不是合法 JSON")
        raise Exception("对时接口返回格式错误")

# 使用示例
if __name__ == "__main__":
    # 配置凭证
    APPID = "CnOFfzviHCwks1uLA1FIrcf3ZPanhgvW"
    KEY = "cqm4MNtoGj6WUItfVdb9J9TRUkZWPhYA"
    
    try:
        # 获取访问令牌
        access_token = get_access_token(APPID, KEY)
        print("成功获取access_token:", access_token)
        
        # 调用剩余调用次数接口并打印结果
        print(get_recommendation_categories(access_token))
        print(get_recommendation_level(access_token))
            
    except Exception as e:
        print("程序执行出错:", str(e))
