import os


basedir = os.path.abspath(os.path.dirname(__file__))


def _env_bool(name: str, default: bool = False) -> bool:
    return os.environ.get(name, str(default)).lower() in ["1", "true", "on", "yes"]


class Config(object):
    USE_KINGBASE = _env_bool("USE_KINGBASE")

    KINGBASE_HOST = os.environ.get("KINGBASE_HOST", "127.0.0.1")
    KINGBASE_PORT = int(os.environ.get("KINGBASE_PORT", "54321"))
    KINGBASE_USER = os.environ.get("KINGBASE_USER", "")
    KINGBASE_PASSWORD = os.environ.get("KINGBASE_PASSWORD", "")
    KINGBASE_DB = os.environ.get("KINGBASE_DB", "")
    KINGBASE_SCHEMA = os.environ.get("KINGBASE_SCHEMA")

    REMOTE_DB_HOST = os.environ.get("REMOTE_DB_HOST", "127.0.0.1")

    IS_LOCAL_TEST = _env_bool("LOCAL_TEST")

    if USE_KINGBASE:
        if not KINGBASE_SCHEMA:
            raise RuntimeError(
                "USE_KINGBASE 已启用，但未设置 KINGBASE_SCHEMA。"
                " 你必须创建并指定自己的 schema。"
            )

        encoded_options = f"options=-csearch_path%3D{KINGBASE_SCHEMA}"
        SQLALCHEMY_DATABASE_URI = (
            f"postgresql+psycopg2://{KINGBASE_USER}:{KINGBASE_PASSWORD}"
            f"@{KINGBASE_HOST}:{KINGBASE_PORT}/{KINGBASE_DB}?{encoded_options}"
        )
        SQLALCHEMY_BINDS = {
            "weibo": (
                f"postgresql+psycopg2://{KINGBASE_USER}:{KINGBASE_PASSWORD}"
                f"@{KINGBASE_HOST}:{KINGBASE_PORT}/{KINGBASE_DB}?{encoded_options}"
            )
        }
    else:
        SQLALCHEMY_DATABASE_URI = os.environ.get(
            "DATABASE_URL",
            "mysql+pymysql://root@127.0.0.1:3306/DetectSystemDatabase",
        )
        SQLALCHEMY_BINDS = {
            "weibo": os.environ.get(
                "WEIBO_DATABASE_URL",
                "mysql+pymysql://root@127.0.0.1:3306/WeiboSpiderDatabase",
            )
        }

    RQ_DASHBOARD_REDIS_URL = os.environ.get("RQ_DASHBOARD_REDIS_URL", "redis://127.0.0.1:6379/0")
    CACHE_REDIS_URL = os.environ.get("CACHE_REDIS_URL", RQ_DASHBOARD_REDIS_URL)

    CACHE_TYPE = "RedisCache"
    CACHE_DEFAULT_TIMEOUT = 60

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.environ.get("SECRET_KEY", "change-me")
    ADMINS = [name.strip() for name in os.environ.get("ADMINS", "").split(",") if name.strip()]
    LOG_TO_STDOUT = _env_bool("LOG_TO_STDOUT")

    TASKS_PER_PAGE = 10

    UPLOAD_ROOT = os.getenv("UPLOAD_ROOT", "/uploads")
    CRAWL_FILES_ROOT = os.getenv("CRAWL_FILES_ROOT", "/uploads/crawl_files")
    MHTML_RENDER_CACHE_DIR = os.getenv("MHTML_RENDER_CACHE_DIR", "/uploads/mhtml_render_cache")
    CHECKPOINT_ROOT = os.getenv("CHECKPOINT_ROOT", "/checkpoints")
    EXPORT_CACHE_DIR = os.getenv("EXPORT_CACHE_DIR", "/export_cache")
    os.makedirs(EXPORT_CACHE_DIR, exist_ok=True)

    SQLALCHEMY_SESSION_OPTIONS = {
        "expire_on_commit": False
    }
    SQLALCHEMY_RECORD_QUERIES = True
    SQLALCHEMY_SLOW_QUERY_TIME = 0.5

    PROOFREADING_API_APPID = os.environ.get("PROOFREADING_API_APPID", "")
    PROOFREADING_API_KEY = os.environ.get("PROOFREADING_API_KEY", "")
    PROOFREADING_API_BASE = os.environ.get(
        "PROOFREADING_API_BASE",
        "https://www.ijiaodui.com:8080/component/v1/",
    )

    REMOTE_CLIENT_ID = os.environ.get("REMOTE_CLIENT_ID", "")
    REMOTE_CLIENT_SECRET = os.environ.get("REMOTE_CLIENT_SECRET", "")

    YQ_MODEL_API_KEY = os.environ.get("YQ_MODEL_API_KEY", "")
    DASHSCOPE_API_KEY = os.environ.get("DASHSCOPE_API_KEY", "")
    YQ_MODEL_API_BASE_URL = os.environ.get("YQ_MODEL_API_BASE_URL", "")
    YQ_MODEL_API_MODEL = os.environ.get("YQ_MODEL_API_MODEL", "")
    YQ_MODEL_API_TIMEOUT = int(os.environ.get("YQ_MODEL_API_TIMEOUT", "600"))

    DAILY_IMPORT_KEYWORD = os.getenv("DAILY_IMPORT_KEYWORD", "")
    DAILY_IMPORT_ADMIN_USERNAME = os.getenv("DAILY_IMPORT_ADMIN_USERNAME", "")
    ONLINE_IMPORT_EXPECTED = {
        "sshHost": os.getenv("ONLINE_IMPORT_SSH_HOST", ""),
        "sshPort": int(os.getenv("ONLINE_IMPORT_SSH_PORT", "0")),
        "sshUser": os.getenv("ONLINE_IMPORT_SSH_USER", ""),
        "sshPass": os.getenv("ONLINE_IMPORT_SSH_PASS", ""),
        "dbHost": os.getenv("ONLINE_IMPORT_DB_HOST", ""),
        "dbPort": int(os.getenv("ONLINE_IMPORT_DB_PORT", "0")),
        "dbUser": os.getenv("ONLINE_IMPORT_DB_USER", ""),
        "dbPass": os.getenv("ONLINE_IMPORT_DB_PASS", ""),
    }
    DAILY_IMPORT_FIELDS = [
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
    ]

    RUN_SCHEDULER = _env_bool("RUN_SCHEDULER", True)
    SCHEDULER_MASTER = _env_bool("SCHEDULER_MASTER")

    DAILY_IMPORT_HOUR = 0
    DAILY_IMPORT_MINUTE = 30

    WECHAT_AUTO_DETECT_ENABLED = _env_bool("WECHAT_AUTO_DETECT_ENABLED", True)
    WECHAT_AUTO_DETECT_HOUR = int(os.environ.get("WECHAT_AUTO_DETECT_HOUR", 2))
    WECHAT_AUTO_DETECT_MINUTE = int(os.environ.get("WECHAT_AUTO_DETECT_MINUTE", 0))
    WECHAT_AUTO_DETECT_LOCK_TTL_SECONDS = int(os.environ.get("WECHAT_AUTO_DETECT_LOCK_TTL_SECONDS", 21600))
    WECHAT_PROOFREAD_ARTICLE_LOCK_TTL_SECONDS = int(os.environ.get("WECHAT_PROOFREAD_ARTICLE_LOCK_TTL_SECONDS", 600))
    WECHAT_AUTO_DETECT_MAX_ACCOUNTS_PER_RUN = int(os.environ.get("WECHAT_AUTO_DETECT_MAX_ACCOUNTS_PER_RUN", 0))
    WECHAT_AUTO_DETECT_MAX_ARTICLES_PER_ACCOUNT = int(os.environ.get("WECHAT_AUTO_DETECT_MAX_ARTICLES_PER_ACCOUNT", 0))
    WECHAT_AUTO_DETECT_DUPLICATE_PAGE_STOP = int(os.environ.get("WECHAT_AUTO_DETECT_DUPLICATE_PAGE_STOP", 3))
    WECHAT_WORD_DICT_UPLOAD_MAX_BYTES = int(os.environ.get("WECHAT_WORD_DICT_UPLOAD_MAX_BYTES", 10 * 1024 * 1024))


class RedisConfig(object):
    LOCK_KEY_WECHAT = "wechat:refresh:lock"
    LOCK_TTL_SECONDS = 60
    LOCK_REFRESH_INTERVAL = 20
    DATASET_LOCK_TTL = 36000


class CombinedConfig(Config, RedisConfig):
    pass
