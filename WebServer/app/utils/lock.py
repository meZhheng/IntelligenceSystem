import uuid
from flask import current_app
from redis import Redis
import time

# ----------------- Redis Lock helper -----------------
class RedisLock:
    """
    简单的分布式锁封装（基于 redis set nx + ex，以及 Lua 脚本安全释放）
    用法:
        lock = RedisLock(app.redis, f"dataset_lock:{dataset_id}", ttl=36000)
        got, token = lock.acquire(blocking=False)
        if not got:
            # 处理未获锁
        try:
            # 业务处理
        finally:
            lock.release(token)
    也可用上下文管理（若 blocking=True）:
        with RedisLock(...).acquire_context():
            ...
    """
    RELEASE_SCRIPT = """
    if redis.call("get",KEYS[1]) == ARGV[1] then
        return redis.call("del",KEYS[1])
    else
        return 0
    end
    """

    def __init__(self, redis_client: Redis, key: str, ttl: int = 36000):
        self.redis = redis_client
        self.key = key
        self.ttl = int(ttl)
        # token 用来标记锁持有者，release 时会比对
        self._local_token = None

    def _new_token(self):
        return str(uuid.uuid4())

    def acquire(self, blocking: bool = False, wait_sleep: float = 0.1, timeout: float = None):
        """
        尝试获取锁。
        - blocking: False => 立即尝试，失败返回 (False, None)
                    True  => 会阻塞直到获取或 timeout（单位秒，None 表示无限）
        - wait_sleep: blocking 模式下轮询间隔
        - 返回 (got: bool, token: str_or_None)
        """
        token = self._new_token()
        if not blocking:
            ok = self.redis.set(self.key, token, nx=True, ex=self.ttl)
            if ok:
                self._local_token = token
                return True, token
            else:
                return False, None

        # blocking == True
        start = time.time()
        while True:
            ok = self.redis.set(self.key, token, nx=True, ex=self.ttl)
            if ok:
                self._local_token = token
                return True, token
            if timeout is not None and (time.time() - start) >= timeout:
                return False, None
            time.sleep(wait_sleep)

    def release(self, token: str = None):
        """
        释放锁。token 必须与 acquire 返回的 token 一致；如果 token 为 None，会尝试使用内部 token。
        返回 True 表示释放成功（或锁已过期/不存在）；False 表示 token 不匹配，未释放。
        """
        tok = token or self._local_token
        if not tok:
            current_app.logger.warning("尝试释放 RedisLock 时没有 token")
            return False
        try:
            res = self.redis.eval(self.RELEASE_SCRIPT, 1, self.key, tok)
            # res == 1 表示删除成功，0 表示 token 不匹配或键不存在
            if res == 1:
                return True
            else:
                return False
        except Exception as e:
            current_app.logger.exception("RedisLock.release 异常: %s", e)
            return False

    def ttl_remaining(self):
        """返回剩余 TTL（秒），-2 表示 key 不存在，-1 表示无过期（不应出现）"""
        try:
            return self.redis.ttl(self.key)
        except Exception as e:
            current_app.logger.exception("RedisLock.ttl_remaining 异常: %s", e)
            return None

    # 可选：上下文管理器快捷方式（blocking acquire）
    def acquire_context(self, blocking=True, timeout=None):
        class _Ctx:
            def __init__(self, outer, blocking, timeout):
                self.outer = outer
                self.blocking = blocking
                self.timeout = timeout
                self.got = False
                self.token = None

            def __enter__(self):
                got, token = self.outer.acquire(blocking=self.blocking, timeout=self.timeout)
                if not got:
                    raise RuntimeError("Failed to acquire redis lock in context manager")
                self.got = True
                self.token = token
                return token

            def __exit__(self, exc_type, exc, tb):
                if self.got:
                    try:
                        self.outer.release(self.token)
                    except Exception:
                        current_app.logger.exception("Context manager release lock failed")
        return _Ctx(self, blocking, timeout)