import os  # 用于处理文件和目录路径
import sys  # 用于操作解释器环境（如路径、退出程序等）

from absl import app  # absl-py 提供的命令行入口模块，用于封装主函数入口
sys.path.append(os.path.abspath(os.path.dirname(os.getcwd())))
# 将上级目录添加到 sys.path，以便能够导入 weibo_spider 包（解决相对导入问题）

from weibo_spider.spider import main  # 从 weibo_spider 模块中导入主逻辑函数 main

# 启动程序，absl.app 会自动解析命令行参数并调用 main 函数
app.run(main)
