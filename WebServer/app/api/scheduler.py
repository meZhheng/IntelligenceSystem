from flask import current_app, jsonify

from app.api import bp
from app.api.auth.auth import token_auth
from app.services.scheduler_monitor import (
    format_datetime,
    now_iso,
    read_job_last_run,
    read_scheduler_snapshot,
)
from app.utils.decorator import admin_required


def _as_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in {"1", "true", "on", "yes"}
    return bool(value)


def _scheduler_state(scheduler):
    if scheduler is None:
        return False
    return bool(getattr(scheduler, "running", False))


def _job_status(job):
    if job.next_run_time is None:
        return "paused"
    return "scheduled"


def _serialize_job(job):
    return {
        "id": job.id,
        "name": job.name,
        "func": job.func_ref,
        "trigger": {
            "type": job.trigger.__class__.__name__.replace("Trigger", "").lower(),
            "description": str(job.trigger),
        },
        "status": _job_status(job),
        "next_run_time": format_datetime(job.next_run_time),
        "last_run": read_job_last_run(current_app.redis, job.id)
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


@bp.route("/scheduler/jobs", methods=["GET"])
@token_auth.login_required
@admin_required
def get_scheduler_jobs():
    scheduler = getattr(current_app, "scheduler", None)
    enabled = _as_bool(current_app.config.get("RUN_SCHEDULER", True))

    if scheduler is None:
        snapshot = read_scheduler_snapshot(current_app.redis)
        if snapshot:
            return jsonify(snapshot)

    running = _scheduler_state(scheduler)
    is_master = _as_bool(current_app.config.get("SCHEDULER_MASTER", False))

    jobs = []
    if scheduler is not None:
        jobs = [_serialize_job(job) for job in scheduler.get_jobs()]

    return jsonify(
        {
            "scheduler": {
                "enabled": enabled,
                "running": running,
                "timezone": "Asia/Shanghai",
                "is_master": is_master,
                "generated_at": now_iso(),
            },
            "jobs": jobs,
        }
    )
