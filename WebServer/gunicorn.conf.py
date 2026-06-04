import multiprocessing

# 监听内网端口80
bind = '0.0.0.0:5000'

# 并行工作进程数
workers = multiprocessing.cpu_count() * 2 + 1

# 工作模式协程
worker_class = 'gevent'

# 指定每个工作者的线程数
# threads = 4

# 超时设置（单位：秒）
# 如果请求处理超过 timeout，会重启对应 worker
timeout = 18000

# 设置最大并发量
worker_connections = 100
# 设置进程文件目录
pidfile = 'gunicorn.pid'
# 要写入错误日志的文件目录。
errorlog = 'gunicorn.error.log'
# 要写入的访问日志目录
accesslog = 'gunicorn.access.log'
# 设置日志记录水平
loglevel = 'info'

# 代码发生变化是否自动重启
reload=True
