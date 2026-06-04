import atexit
import os
import signal
import time

import pytz
from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.schedulers.background import BackgroundScheduler

from app import create_app
from app.schedules import scheduler_tasks
from app.services.scheduler_monitor import register_scheduler_listeners, write_scheduler_snapshot


def build_scheduler(app):
    jobstores = {
        "default": SQLAlchemyJobStore(
            url=app.config["SQLALCHEMY_DATABASE_URI"],
            engine_options={
                "pool_pre_ping": True,
                "pool_recycle": 3600,
            },
        )
    }
    executors = {"default": ThreadPoolExecutor(10)}
    job_defaults = {"coalesce": False, "max_instances": 1}
    return BackgroundScheduler(
        jobstores=jobstores,
        executors=executors,
        job_defaults=job_defaults,
        timezone=pytz.timezone("Asia/Shanghai"),
    )


def register_jobs(app, scheduler):
    scheduler_tasks.register_jobs(app, scheduler)


def main():
    os.environ["RUN_SCHEDULER"] = "false"
    os.environ["SCHEDULER_MASTER"] = "false"
    app = create_app()
    scheduler = build_scheduler(app)
    app.scheduler = scheduler
    register_jobs(app, scheduler)
    register_scheduler_listeners(scheduler, app)
    scheduler.start()
    write_scheduler_snapshot(app, scheduler, running=True, is_master=True)
    app.logger.info("独立定时任务调度器已启动")

    should_stop = False

    def stop(signum, frame):
        nonlocal should_stop
        should_stop = True

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    atexit.register(lambda: scheduler.shutdown(wait=False) if scheduler.running else None)

    while not should_stop:
        write_scheduler_snapshot(app, scheduler, running=True, is_master=True)
        time.sleep(30)

    write_scheduler_snapshot(app, scheduler, running=False, is_master=True)
    scheduler.shutdown(wait=False)
    app.logger.info("独立定时任务调度器已停止")


if __name__ == "__main__":
    main()
