## 项目启动
conda activate xxx # 需要进入虚拟环境，与app同一根目录

pip install -r requirements.txt

flask run --debug

## 数据库操作
flask db init

flask db migrate -m ""

flask db upgrade

## api测试
http POST http://127.0.0.1:5000/auth/register username=hengz password=123

http GET http://127.0.0.1:5000/auth/users/1

http GET http://127.0.0.1:5000/auth/users

http PUT http://127.0.0.1:5000/auth/users/1 username=hengzz

http POST http://127.0.0.1:5000/auth/tokens

http POST http://127.0.0.1:5000/auth/train \\  
&emsp;&emsp;model_name="MyModel" \\  
&emsp;&emsp;model_path="path/to/your/model.pth" \\  
&emsp;&emsp;loss_function="MSE" \\  
&emsp;&emsp;optimizer="SGD" \\  
&emsp;&emsp;learning_rate:=0.01 \\  
&emsp;&emsp;input:='[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]' \\  
&emsp;&emsp;target:='[1.5]' \\  
&emsp;&emsp;epochs:=200 \\  
&emsp;&emsp;save_path="path/to/save/trained_model.pth"

## 交互式Shell
flask shell

## 启动后台worker
conda activate xxx # 需要进入虚拟环境，与flask同一根目录  
sudo service redis start
rq worker model-tasks # 监听名为‘model-tasks’的redis队列

## 任务状态类型
0: queued: 待处理  
1: started: 已开始处理  
2: finished: 已完成  
3: failed: 处理失败  
4: deleted: 已删除  

## 项目结构
WebServer/ # 项目根目录  
├── app/ # 核心应用目录，包含Flask应用的主要逻辑  
│&emsp;&emsp;├── api/ # 定义API路由和视图函数  
│&emsp;&emsp;│&emsp;&emsp;├── auth/ # 鉴权相关API  
│&emsp;&emsp;│&emsp;&emsp;├── task/ # 任务相关API  
│&emsp;&emsp;│&emsp;&emsp;├── db.py # 预定义数据库操作函数  
│&emsp;&emsp;│&emsp;&emsp;└── errors.py # 错误处理函数  
│&emsp;&emsp;├── utils/ # 装饰器、任务函数相关  
│&emsp;&emsp;├── \_\_init__.py # 初始化Flask应用，配置应用实例和扩展   
│&emsp;&emsp;├── extensions.py # 配置文件，包含数据库连接、密钥等配置     
│&emsp;&emsp;└── models.py # 数据库模型定义，ORM相关代码  
├── inference/ # 模型定义和训练、推理逻辑  
├── migrations/ # 数据库迁移文件目录，存储数据库版本控制信息  
├── config.py # 配置文件，包含数据库连接、密钥等配置  
├── readme.md # 项目说明文档，包含运行指南和结构说明  
└── requirements.txt # 项目依赖的Python库列表  

## 数据库部署方案

项目使用 Docker 部署 MySQL 数据库。

### 1. 启动 Docker 服务
首先，确保 Docker 服务已经启动：
```bash
sudo systemctl start docker
```

### 2. 拉取 MySQL 镜像
使用以下命令拉取所需版本的 MySQL 镜像（将 `tag` 替换为需要的版本号，例如 `8.4.3`）：
```bash
docker pull mysql:tag
```
服务器需要使用docker镜像源加速

### 3. 创建 MySQL 日志、数据存储及配置目录
创建用于存储日志、数据和配置文件的目录：
```bash
mkdir -p /home/cat/mysql/{log,data,conf}
```
编辑配置文件：
```bash
vim /home/cat/mysql/conf/my.cnf
```
在 `my.cnf` 中添加以下配置项（可根据需要调整）：
```ini
[client]
# 设置客户端默认字符集为 utf8mb4
default-character-set=utf8mb4

[mysql]
# 设置 mysql 客户端默认字符集为 utf8mb4
default-character-set=utf8mb4

[mysqld]
# 配置服务器的服务号，便于未来集群部署使用
server-id = 1
# 开启 MySQL 数据库的二进制日志，记录 SQL 操作
log-bin = mysql-bin
# 设置二进制日志保留 30 天（2592000 秒），防止日志堆积
binlog_expire_logs_seconds = 2592000
# 解决 MySQL 8.0 版本 GROUP BY 问题
sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'
# 允许最大的连接数
max_connections = 1000
# 禁用符号链接以防止安全风险
symbolic-links = 0
# 设置时区为东八区
default-time_zone = '+8:00'
```

### 4. 启动 Docker 容器
使用下面的命令启动 MySQL 容器。注意：将 `tag` 替换为实际版本号，例如 `8.4.3`：
```bash
docker run -p 33306:3306 \
  --restart=always \
  --name mysql \
  --network dsNetwork \
  --privileged=true \
  -v /home/cat/mysql/log:/var/log/mysql \
  -v /home/cat/mysql/data:/var/lib/mysql \
  -v /home/cat/mysql/conf/my.cnf:/etc/mysql/my.cnf \
  -e MYSQL_ROOT_PASSWORD=123 \
  -d docker.1ms.run/mysql:8.4.3
```
- `-p 33306:3306`：将宿主机的 `33306` 端口映射到容器内部 `3306`（MySQL 默认端口）

- `--restart=always`：容器崩溃或系统重启后自动启动

- `--privileged=true`：提升容器权限

- `-v` 选项：将 MySQL 的日志、数据、配置文件挂载到宿主机

- `-e MYSQL_ROOT_PASSWORD=yourpassword`：设置 MySQL root 用户密码

- `-d`：后台运行容器

运行以下命令查看 MySQL 容器状态：
```bash
docker ps
```
能看到类似的输出：
```nginx
CONTAINER ID  IMAGE      COMMAND                 PORTS                    NAMES
c665f907d4b1  mysql:8.4.3  "docker-entrypoint.s…"  0.0.0.0:33066->3306/tcp  mysql
```

### 5. 连接数据库
- **本地连接：**  
  使用以下配置连接数据库：
  - Host: `127.0.0.1`
  - Port: `33306`
  - Username: `root`
  - Password: `123`

- **远程连接：**  
  通过 SSH Tunnel 转发连接数据库。以下是 SSH Tunnel 配置：
  - Host: `202.121.180.70`
  - Port: `1018`
  - Username: `cat`
  - Password: `123`

  数据库连接配置与本地连接相同

## Redis 部署方案
使用下面的命令启动 Redis 容器：
```bash
docker run -d \
  --restart=always \
  --log-opt max-size=100m \
  --log-opt max-file=2 \
  -p 63379:6379 \
  --name redis \
  --network dsNetwork \
  -v /home/cat/redis/conf/redis.conf:/etc/redis/redis.conf \
  -v /home/cat/redis/data:/data \
  docker.1ms.run/redis redis-server /etc/redis/redis.conf \
  --appendonly yes \
  --requirepass 123
```

## 后端部署方案
```bash
docker build -t flask-app:cuda .
```

```bash
docker build -t flask-app:cpu .
```

```bash
docker run -d \
  -v /home/cat/DetectSystem/support/webfile:/webfile \
  -v /home/cat/DetectSystem/support/deeplearning:/deeplearning \
  -v /home/cat/DetectSystem/support/uploads:/uploads \
  -p 50008:5000 \
  --name backend_cuda \
  --network dsNetwork \
  --gpus all \
  flask-app:cuda
```

```bash
docker run -d \
  --privileged \
  -v /home/cat/DetectSystem/support/webfile:/webfile \
  -v /home/cat/DetectSystem/support/deeplearning:/deeplearning \
  -v /home/cat/DetectSystem/support/uploads:/uploads \
  -p 50005:5000 \
  --name backend \
  --network dsNetwork \
  flask-app:cpu
```

## RQ Worker部署启动
```bash
nohup rq worker model-tasks --url redis://:123@redis:6379/0 &
```

```
WebServer
├─ 📁app
│  ├─ 📁api
│  │  ├─ 📁auth
│  │  │  ├─ 📄auth.py
│  │  │  ├─ 📄tokens.py
│  │  │  └─ 📄user.py
│  │  ├─ 📁task
│  │  │  ├─ 📁scripts
│  │  │  │  ├─ 📄get_analysis_stats.py
│  │  │  │  └─ 📄get_dataset_stats.py
│  │  │  ├─ 📄analysis_emotion.py
│  │  │  ├─ 📄analysis_illegal.py
│  │  │  ├─ 📄analysis_name.py
│  │  │  ├─ 📄analysis_stance.py
│  │  │  ├─ 📄application.py
│  │  │  ├─ 📄datasets.py
│  │  │  ├─ 📄external_interface.py
│  │  │  ├─ 📄hvsm.py
│  │  │  ├─ 📄manager.py
│  │  │  ├─ 📄models.py
│  │  │  ├─ 📄proofread.py
│  │  │  ├─ 📄study.py
│  │  │  ├─ 📄weiboCrawler.py
│  │  │  └─ 📄__init__.py
│  │  ├─ 📄db.py
│  │  ├─ 📄errors.py
│  │  ├─ 📄notifications.py
│  │  └─ 📄__init__.py
│  ├─ 📁media
│  │  ├─ 📄distributors.py
│  │  └─ 📄__init__.py
│  ├─ 📁utils
│  │  ├─ 📄decorator.py
│  │  ├─ 📄export_helpers.py
│  │  ├─ 📄hvsm_prompts.py
│  │  ├─ 📄IterableDataset.py
│  │  ├─ 📄systeminfo.py
│  │  └─ 📄tasks.py
│  ├─ 📄event_listen.py
│  ├─ 📄extensions.py
│  ├─ 📄models.py
│  ├─ 📄models_spider.py
│  ├─ 📄model_registry.py
│  └─ 📄__init__.py
├─ 📁deep_learning
│  ├─ 📁illegal
│  │  ├─ 📁propa
│  │  │  ├─ 📄config.py
│  │  │  ├─ 📄dataloader.py
│  │  │  ├─ 📄model.py
│  │  │  ├─ 📄train.py
│  │  │  ├─ 📄trainer.py
│  │  │  └─ 📄__init__.py
│  │  ├─ 📄arg.py
│  │  ├─ 📄bert.py
│  │  ├─ 📄bert_train_fever.py
│  │  ├─ 📄bert_train_illegal.py
│  │  ├─ 📄BiGCN.py
│  │  ├─ 📄endef.py
│  │  ├─ 📄fndclip.py
│  │  ├─ 📄fndclip_train.py
│  │  ├─ 📄llm.py
│  │  ├─ 📄llm_feverous.py
│  │  ├─ 📄offensive.py
│  │  ├─ 📄pii.py
│  │  ├─ 📄propagation.py
│  │  ├─ 📄user_role.py
│  │  └─ 📄__init__.py
│  ├─ 📁sentiment
│  │  ├─ 📁VAD
│  │  │  ├─ 📁NRC-VAD
│  │  │  │  └─ 📄NRC-VAD-Lexicon.txt
│  │  │  ├─ 📁utils
│  │  │  │  ├─ 📄utils.py
│  │  │  │  └─ 📄__init__.py
│  │  │  ├─ 📁vae
│  │  │  │  ├─ 📄data_utils.py
│  │  │  │  ├─ 📄losses.py
│  │  │  │  ├─ 📄model.py
│  │  │  │  ├─ 📄utils.py
│  │  │  │  └─ 📄__init__.py
│  │  │  ├─ 📄data.py
│  │  │  ├─ 📄loss.py
│  │  │  ├─ 📄main.py
│  │  │  ├─ 📄model.py
│  │  │  ├─ 📄modeling_bart.py
│  │  │  ├─ 📄README.md
│  │  │  ├─ 📄README.md.txt
│  │  │  ├─ 📄requirements.txt
│  │  │  ├─ 📄vad_predict.py
│  │  │  └─ 📄_init_.py
│  │  ├─ 📄implict_senti_xlnet.py
│  │  ├─ 📄mm_senti.py
│  │  ├─ 📄mm_sentiment_llm.py
│  │  ├─ 📄mm_sentiment_llm_target.py
│  │  ├─ 📄MUSE.py
│  │  ├─ 📄sentiment_llm.py
│  │  ├─ 📄sentiment_llm_target.py
│  │  ├─ 📄vad.py
│  │  └─ 📄__init__.py
│  ├─ 📁stance
│  │  ├─ 📄Gleam.py
│  │  ├─ 📄stance_llm.py
│  │  ├─ 📄stance_llm_target.py
│  │  ├─ 📄XLnet_subtask1.py
│  │  ├─ 📄XLnet_subtask2.py
│  │  ├─ 📄XLnet_subtask3.py
│  │  └─ 📄__init__.py
│  ├─ 📄base_model.py
│  ├─ 📄LLMs.py
│  └─ 📄__init__.py
├─ 📁evaluation
│  ├─ 📄interface.py
│  └─ 📄setting.py
├─ 📁logs
├─ 📁migrations
├─ 📁Proofreading
│  ├─ 📁WeChatSpider
│  │  ├─ 📄downloader.py
│  │  ├─ 📄playwright_download.py
│  │  └─ 📄spider.py
│  ├─ 📄aijiaodui.py
│  ├─ 📄document.py
│  ├─ 📄xunfei.py
│  └─ 📄__init__.py
├─ 📁scripts
│  ├─ 📄dialogDatasetImport.py
│  ├─ 📄export_data.py
│  ├─ 📄propagationDatasetImport.py
│  └─ 📄__init__.py
├─ 📁WeiboSpider
│  ├─ 📁weibo_spider
│  │  ├─ 📁downloader
│  │  │  ├─ 📄avatar_picture_downloader.py
│  │  │  ├─ 📄downloader.py
│  │  │  ├─ 📄img_downloader.py
│  │  │  ├─ 📄origin_picture_downloader.py
│  │  │  ├─ 📄retweet_picture_downloader.py
│  │  │  ├─ 📄video_downloader.py
│  │  │  └─ 📄__init__.py
│  │  ├─ 📁parser
│  │  │  ├─ 📄album_parser.py
│  │  │  ├─ 📄avatar_parser.py
│  │  │  ├─ 📄comment_parser.py
│  │  │  ├─ 📄fans_parser.py
│  │  │  ├─ 📄follow_parser.py
│  │  │  ├─ 📄index_parser.py
│  │  │  ├─ 📄info_parser.py
│  │  │  ├─ 📄mblog_picAll_parser.py
│  │  │  ├─ 📄page_parser.py
│  │  │  ├─ 📄parser.py
│  │  │  ├─ 📄photo_parser.py
│  │  │  ├─ 📄relation_parser.py
│  │  │  ├─ 📄search_parser.py
│  │  │  ├─ 📄util.py
│  │  │  └─ 📄__init__.py
│  │  ├─ 📁writer
│  │  │  ├─ 📄csv_writer.py
│  │  │  ├─ 📄json_writer.py
│  │  │  ├─ 📄mysql_writer.py
│  │  │  ├─ 📄txt_writer.py
│  │  │  ├─ 📄writer.py
│  │  │  └─ 📄__init__.py
│  │  ├─ 📄config_sample.json
│  │  ├─ 📄config_util.py
│  │  ├─ 📄datetime_util.py
│  │  ├─ 📄interaction.py
│  │  ├─ 📄logging.conf
│  │  ├─ 📄spider.py
│  │  ├─ 📄user.py
│  │  ├─ 📄user_id_list.txt
│  │  ├─ 📄weibo.py
│  │  ├─ 📄__init__.py
│  │  └─ 📄__main__.py
│  ├─ 📄README.md
│  ├─ 📄setup.py
│  └─ 📄__init__.py
├─ 📄.gitignore
├─ 📄api_helper.md
├─ 📄config.json
├─ 📄config.py
├─ 📄Dockerfile
├─ 📄entrypoint.sh
├─ 📄gunicorn.conf.py
├─ 📄readme.md
├─ 📄requirements-torch.txt
├─ 📄requirements.txt
└─ 📄stopwords.txt
```