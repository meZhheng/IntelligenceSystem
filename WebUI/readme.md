# 项目启动指南

## 1. 环境准备  
在启动项目之前，请确保环境满足以下要求：  

- **Node.js** >= 20.14.0  
- **npm** >= 10.7.0  

如果尚未安装 Node.js 和 npm，可以前往 [Node.js 官网](https://nodejs.org/) 下载并安装最新版本，或者使用 `nvm` 进行管理：  

```bash
# 安装 nvm
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash

# 安装指定版本的 Node.js
nvm install 20.14.0
nvm use 20.14.0
```

## 2. 启动项目
```bash
# 进入前端项目根目录
cd frontend

# 安装依赖
npm install

# 运行开发环境
npm run dev

# 访问本地服务
http://localhost:5173
```

# 🚀 前端部署方案（Docker + Nginx + Vite）

基于 Docker 的前端部署方案，实现快速构建、一键部署 [参考链接](https://blog.csdn.net/Big_YiFeng/article/details/134393458)

## 📊 项目结构
```bash
frontend
  ├── Dockerfile          # 镜像构建配置
  ├── .dockerignore       # 构建忽略规则
  ├── package.json        # 项目依赖配置
  ├── vite.config.js      # Vite 构建配置
  └── dist/               # 构建产物目录（自动生成）
```

## 📦 核心配置文件
### Dockerfile 多阶段构建
```Dockerfile
# 构建阶段
FROM docker.1ms.run/node:20.19 AS builder

WORKDIR /usr/src/app
COPY . .
RUN npm install
RUN npm run build

# 生产阶段
FROM docker.1ms.run/nginx:latest

COPY --from=0 /usr/src/app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf  # 可选：自定义Nginx配置

EXPOSE 80
```

### .dockerignore 配置
```bash
node_modules
dist
.git
.env
```

## ▶️ 快速开始
### 1. 构建镜像
```bash
docker build -t vite-app .
```

### 2. 依据镜像创建容器
```bash
docker run -d \
  -p 8502:80 \
  --name frontend \
  --restart=always \
  --network dsNetwork \
  vite-app
```

### 3. 验证部署
```bash
# 查看容器状态
docker ps -a | grep vite-app

# 实时查看日志
docker logs -f --tail 100 frontend

# 健康检查
curl -I http://localhost:8502
```

### 4. 手动建立ssh后台转发通道
```bash
ssh -N -L 5000:127.0.0.1:50005 -p 1018 cat@202.121.180.70
```