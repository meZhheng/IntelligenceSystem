import json
from datetime import datetime

import pytz
from apscheduler.events import (
    EVENT_JOB_ERROR,
    EVENT_JOB_EXECUTED,
    EVENT_JOB_MISSED,
    EVENT_JOB_SUBMITTED,
)

SCHEDULER_TIMEZONE = pytz.timezone("Asia/Shanghai")
LAST_RUN_KEY_PREFIX = "scheduler:job:last_run:"
SCHEDULER_SNAPSHOT_KEY = "scheduler:jobs:snapshot"
LAST_RUN_TTL_SECONDS = 86400 * 30
SCHEDULER_SNAPSHOT_TTL_SECONDS = 120


def format_datetime(value):
    if value is None:
        return None
    if value.tzinfo is None:
        value = SCHEDULER_TIMEZONE.localize(value)
    return value.astimezone(SCHEDULER_TIMEZONE).isoformat()


def now_iso():
    return datetime.now(SCHEDULER_TIMEZONE).isoformat()


def job_last_run_key(job_id):
    return f"{LAST_RUN_KEY_PREFIX}{job_id}"


def read_job_last_run(redis_client, job_id):
    raw = redis_client.get(job_last_run_key(job_id))
    if not raw:
        return None
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8")
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def write_job_last_run(redis_client, job_id, payload):
    redis_client.setex(
        job_last_run_key(job_id),
        LAST_RUN_TTL_SECONDS,
        json.dumps(payload, ensure_ascii=False),
    )


def read_scheduler_snapshot(redis_client):
    raw = redis_client.get(SCHEDULER_SNAPSHOT_KEY)
    if not raw:
        return None
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8")
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def _serialize_job_snapshot(redis_client, job):
    return {
        "id": job.id,
        "name": job.name,
        "func": job.func_ref,
        "trigger": {
            "type": job.trigger.__class__.__name__.replace("Trigger", "").lower(),
            "description": str(job.trigger),
        },
        "status": "paused" if job.next_run_time is None else "scheduled",
        "next_run_time": format_datetime(job.next_run_time),
        "last_run": read_job_last_run(redis_client, job.id)
        or {
            "status": "unknown",
            "scheduled_run_time": None,
            "started_at": None,
            "finished_at": None,
            "duration_ms": None,
            "message": "暂无运行记录",
            "error": None,
        },
    }


def write_scheduler_snapshot(app, scheduler, running=None, is_master=True):
    payload = {
        "scheduler": {
            "enabled": True,
            "running": scheduler.running if running is None else running,
            "timezone": "Asia/Shanghai",
            "is_master": is_master,
            "generated_at": now_iso(),
        },
        "jobs": [_serialize_job_snapshot(app.redis, job) for job in scheduler.get_jobs()],
    }
    app.redis.setex(
        SCHEDULER_SNAPSHOT_KEY,
        SCHEDULER_SNAPSHOT_TTL_SECONDS,
        json.dumps(payload, ensure_ascii=False),
    )
    return payload


def _scheduled_run_time(event):
    run_times = getattr(event, "scheduled_run_times", None)
    if run_times:
        return run_times[0]
    return getattr(event, "scheduled_run_time", None)


def _duration_ms(started_at, finished_at):
    if not started_at:
        return None
    try:
        start = datetime.fromisoformat(started_at)
        finish = datetime.fromisoformat(finished_at)
        return int((finish - start).total_seconds() * 1000)
    except ValueError:
        return None


def _success_message(retval):
    if isinstance(retval, dict):
        message = retval.get("message")
        if message:
            return message
        status = retval.get("status")
        if status:
            return str(status)
    if retval:
        return str(retval)
    return "执行成功"


def register_scheduler_listeners(scheduler, app):
    def listener(event):
        job_id = event.job_id
        scheduled_run_time = format_datetime(_scheduled_run_time(event))
        existing = read_job_last_run(app.redis, job_id) or {}

        if event.code == EVENT_JOB_SUBMITTED:
            payload = {
                "status": "running",
                "scheduled_run_time": scheduled_run_time,
                "started_at": now_iso(),
                "finished_at": None,
                "duration_ms": None,
                "message": "正在执行",
                "error": None,
            }
        elif event.code == EVENT_JOB_EXECUTED:
            finished_at = now_iso()
            started_at = existing.get("started_at")
            payload = {
                "status": "success",
                "scheduled_run_time": scheduled_run_time or existing.get("scheduled_run_time"),
                "started_at": started_at,
                "finished_at": finished_at,
                "duration_ms": _duration_ms(started_at, finished_at),
                "message": _success_message(getattr(event, "retval", None)),
                "error": None,
            }
        elif event.code == EVENT_JOB_ERROR:
            finished_at = now_iso()
            started_at = existing.get("started_at")
            exception = getattr(event, "exception", None)
            payload = {
                "status": "error",
                "scheduled_run_time": scheduled_run_time or existing.get("scheduled_run_time"),
                "started_at": started_at,
                "finished_at": finished_at,
                "duration_ms": _duration_ms(started_at, finished_at),
                "message": "执行失败",
                "error": str(exception) if exception else "unknown error",
            }
        elif event.code == EVENT_JOB_MISSED:
            payload = {
                "status": "missed",
                "scheduled_run_time": scheduled_run_time,
                "started_at": None,
                "finished_at": now_iso(),
                "duration_ms": None,
                "message": "错过执行时间",
                "error": None,
            }
        else:
            return

        try:
            write_job_last_run(app.redis, job_id, payload)
            write_scheduler_snapshot(app, scheduler, running=True, is_master=True)
        except Exception:
            app.logger.exception("记录 scheduler job 运行状态失败: %s", job_id)

    scheduler.add_listener(
        listener,
        EVENT_JOB_SUBMITTED | EVENT_JOB_EXECUTED | EVENT_JOB_ERROR | EVENT_JOB_MISSED,
    )
