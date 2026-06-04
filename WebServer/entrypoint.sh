#!/usr/bin/env bash
# 允许脚本在子进程失败后继续运行
set +e

nohup rq worker model-tasks --url redis://:123@redis:6379/0 &
nohup python -m scripts.run_scheduler &

while true; do
  echo ">>> Starting Gunicorn at $(date) ..."
  # 仅运行 Web API，不在 Gunicorn worker 中启动 scheduler
  RUN_SCHEDULER=false SCHEDULER_MASTER=false gunicorn -c gunicorn.conf.py "app:create_app()"

  EXIT_CODE=$?
  echo ">>> Gunicorn exited with code ${EXIT_CODE} at $(date)."
  echo ">>> Sleeping 10s before retry..."
  sleep 10

done 