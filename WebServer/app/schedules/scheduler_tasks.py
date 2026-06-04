# app/schedules/scheduler_tasks.py
from typing import Optional
from flask import Flask
import logging

# 模块级全局，用于在 create_app 时注入 Flask app 实例
APP: Optional[Flask] = None

def set_app(app: Flask):
    """在应用启动时调用一次，将 app 绑定到模块级全局变量中（可序列化安全）"""
    global APP
    APP = app

def run_daily_import_job():
    """
    APScheduler 调用的 job。不要接收参数，不要使用 current_app，
    使用模块级 APP，在其上下文下执行主任务。
    """
    if APP is None:
        logging.getLogger(__name__).error("run_daily_import_job: APP 未设置，请在 create_app() 中调用 set_app(app)")
        return

    # 在这个线程/上下文中创建 app context
    try:
        with APP.app_context():
            # 延迟导入，避免循环依赖
            from .remote_import import import_daily_data
            return import_daily_data(APP)  # 我们的 import_daily_data 改为接受 app 参数
    except Exception:
        APP.logger.exception("run_daily_import_job 执行失败")
        raise


def run_wechat_auto_detect_job():
    if APP is None:
        logging.getLogger(__name__).error("run_wechat_auto_detect_job: APP 未设置，请在 create_app() 中调用 set_app(app)")
        return {"status": "error", "message": "APP 未设置，微信公众号自动检测任务未执行"}

    try:
        with APP.app_context():
            from app.services.wechat_auto_detect import run_daily_wechat_auto_detect
            return run_daily_wechat_auto_detect(APP)
    except Exception:
        APP.logger.exception("run_wechat_auto_detect_job 执行失败")
        raise


def register_jobs(app: Flask, scheduler):
    set_app(app)
    scheduler.add_job(
        func="app.schedules.scheduler_tasks:run_daily_import_job",
        trigger="cron",
        hour=app.config.get("DAILY_IMPORT_HOUR", 1),
        minute=app.config.get("DAILY_IMPORT_MINUTE", 0),
        id="daily_data_import",
        name="每日舆情数据导入",
        replace_existing=True,
    )

    if app.config.get("WECHAT_AUTO_DETECT_ENABLED", True):
        scheduler.add_job(
            func="app.schedules.scheduler_tasks:run_wechat_auto_detect_job",
            trigger="cron",
            hour=app.config.get("WECHAT_AUTO_DETECT_HOUR", 2),
            minute=app.config.get("WECHAT_AUTO_DETECT_MINUTE", 0),
            id="wechat_auto_detect_daily",
            name="每日微信公众号自动抓取与校对",
            replace_existing=True,
        )
