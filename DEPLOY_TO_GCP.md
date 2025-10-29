# 🚀 部署到 Google Cloud Platform (GCP)

完整的部署指南，适用于 GCP Compute Engine VM

---

## 📋 前提条件

- **GCP账号**: bob.yang@intelligencecubed.com
- **项目权限**: Compute Engine API 已启用
- **本地工具**: `gcloud` CLI (可选，用于命令行管理)

---

## 🎯 部署步骤

### 方案 A: 通过 GCP 控制台 (推荐 - 更直观)

#### 第1步：创建 VM 实例

1. **登录 GCP Console**: https://console.cloud.google.com
2. **进入 Compute Engine** → **VM 实例**
3. **点击 "创建实例"**

**配置建议：**
```
名称: cloudflare-api-platform
区域: us-west1 (或选择离你最近的)
可用区: us-west1-a (任意)

机器配置:
  系列: E2
  机器类型: e2-medium (2 vCPU, 4GB 内存)
  
启动磁盘:
  操作系统: Ubuntu
  版本: Ubuntu 22.04 LTS
  启动磁盘类型: 标准永久性磁盘
  大小: 20 GB

防火墙:
  ✅ 允许 HTTP 流量
  ✅ 允许 HTTPS 流量
```

4. **点击 "创建"**

#### 第2步：配置防火墙规则

1. **在左侧菜单** → **VPC 网络** → **防火墙**
2. **点击 "创建防火墙规则"**

**规则 1: 允许后端端口 (8000)**
```
名称: allow-backend-8000
目标: 网络中的所有实例
来源 IPv4 范围: 0.0.0.0/0
协议和端口: tcp:8000
```

**规则 2: 允许前端端口 (5173)**
```
名称: allow-frontend-5173
目标: 网络中的所有实例
来源 IPv4 范围: 0.0.0.0/0
协议和端口: tcp:5173
```

#### 第3步：连接到 VM

1. **回到 VM 实例页面**
2. **找到你的实例**，点击 **"SSH"** 按钮
3. **浏览器会打开一个 SSH 终端**

#### 第4步：运行一键部署脚本

在 SSH 终端中执行：

```bash
# 下载部署脚本
curl -O https://raw.githubusercontent.com/你的仓库/deploy-gcp.sh

# 或者直接创建脚本
cat > deploy-gcp.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e

echo "========================================"
echo "🚀 Cloudflare API Platform - GCP 部署"
echo "========================================"
echo ""

# 更新系统
echo "📦 更新系统包..."
sudo apt-get update
sudo apt-get upgrade -y

# 安装 Python 3.11
echo "🐍 安装 Python 3.11..."
sudo apt-get install -y python3.11 python3.11-venv python3-pip

# 安装 Node.js 18
echo "📗 安装 Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 Git
echo "📚 安装 Git..."
sudo apt-get install -y git

# 克隆项目（你需要替换为你的仓库地址）
echo "📥 克隆项目..."
cd ~
if [ -d "api-billing-platform" ]; then
    echo "⚠️ 项目目录已存在，跳过克隆"
else
    # 如果你的代码在GitHub，使用:
    # git clone https://github.com/你的用户名/api-billing-platform.git
    
    # 如果没有Git仓库，需要手动上传文件
    echo "❌ 请先上传项目文件到服务器"
    echo "可以使用 scp 或 通过 GCP Console 上传"
    exit 1
fi

cd api-billing-platform

# 设置环境变量
echo "⚙️ 配置环境变量..."
cat > server/.env << EOF
# Cloudflare API Credentials
CLOUDFLARE_API_KEY=r2U0hjXVU9FXbDyLozAl_PcOz8PdoONJpfyIiEjX
CLOUDFLARE_ACCOUNT_ID=2858ce0e47c9c3fabee1fdc0db232172

# Security
SECRET_KEY=$(openssl rand -hex 32)

# Database
DATABASE_URL=sqlite:///./app.db

# Server
API_HOST=0.0.0.0
API_PORT=8000

# CORS (添加你的域名)
CORS_ORIGINS=["http://localhost:5173","http://$(curl -s ifconfig.me):5173","http://$(curl -s ifconfig.me):8000"]
EOF

# 安装后端依赖
echo "📦 安装后端依赖..."
cd server
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 初始化数据库
echo "🗄️ 初始化数据库..."
python migrate_to_admin.py
python create_admin.py

deactivate
cd ..

# 安装前端依赖
echo "📦 安装前端依赖..."
cd client
npm install

# 构建前端
echo "🔨 构建前端..."
npm run build
cd ..

# 创建启动脚本
echo "📝 创建启动脚本..."
cat > start-production.sh << 'STARTSCRIPT'
#!/bin/bash

# 启动后端
cd ~/api-billing-platform/server
source venv/bin/activate
nohup python main.py > backend.log 2>&1 &
echo $! > backend.pid
echo "✅ 后端已启动 (PID: $(cat backend.pid))"

# 启动前端
cd ~/api-billing-platform/client
nohup npm run preview -- --host 0.0.0.0 --port 5173 > frontend.log 2>&1 &
echo $! > frontend.pid
echo "✅ 前端已启动 (PID: $(cat frontend.pid))"

echo ""
echo "🎉 服务已启动!"
echo "后端: http://$(curl -s ifconfig.me):8000"
echo "前端: http://$(curl -s ifconfig.me):5173"
STARTSCRIPT

chmod +x start-production.sh

# 创建停止脚本
cat > stop-production.sh << 'STOPSCRIPT'
#!/bin/bash

# 停止后端
if [ -f ~/api-billing-platform/server/backend.pid ]; then
    kill $(cat ~/api-billing-platform/server/backend.pid) 2>/dev/null
    rm ~/api-billing-platform/server/backend.pid
    echo "⏹️ 后端已停止"
fi

# 停止前端
if [ -f ~/api-billing-platform/client/frontend.pid ]; then
    kill $(cat ~/api-billing-platform/client/frontend.pid) 2>/dev/null
    rm ~/api-billing-platform/client/frontend.pid
    echo "⏹️ 前端已停止"
fi
STOPSCRIPT

chmod +x stop-production.sh

echo ""
echo "========================================"
echo "✅ 部署完成!"
echo "========================================"
echo ""
echo "🎯 下一步操作："
echo "1. 启动服务: ./start-production.sh"
echo "2. 访问前端: http://$(curl -s ifconfig.me):5173"
echo "3. API文档: http://$(curl -s ifconfig.me):8000/docs"
echo ""
echo "📋 管理员账号:"
echo "   用户名: admin"
echo "   密码: admin123"
echo ""
echo "🔧 其他命令:"
echo "   停止服务: ./stop-production.sh"
echo "   查看日志: tail -f server/backend.log"
echo "   查看日志: tail -f client/frontend.log"
DEPLOY_SCRIPT

chmod +x deploy-gcp.sh

# 运行部署
./deploy-gcp.sh
```

**⚠️ 重要**: 由于你的代码在本地，需要先上传到 VM。有两种方法：

---

## 📤 方法 1: 使用 gcloud 命令上传（推荐）

在**本地终端**执行：

```bash
# 1. 认证 gcloud（首次使用）
gcloud auth login

# 2. 设置项目
gcloud config set project YOUR_PROJECT_ID

# 3. 上传项目到 VM
cd /Users/chunyiyang/I3
gcloud compute scp --recurse api-billing-platform cloudflare-api-platform:~ --zone=us-west1-a

# 4. SSH 到 VM
gcloud compute ssh cloudflare-api-platform --zone=us-west1-a

# 5. 在 VM 上运行部署脚本（见上面的脚本）
```

---

## 📤 方法 2: 通过 Git 仓库（更推荐用于生产环境）

### 在本地：

```bash
cd /Users/chunyiyang/I3/api-billing-platform

# 初始化 Git（如果还没有）
git init
git add .
git commit -m "Initial commit"

# 推送到 GitHub（需要先创建仓库）
# 1. 在 GitHub 创建一个新的 private 仓库
# 2. 添加 remote 并推送
git remote add origin https://github.com/你的用户名/cloudflare-api-platform.git
git branch -M main
git push -u origin main
```

### 在 VM 上：

```bash
# 克隆项目
git clone https://github.com/你的用户名/cloudflare-api-platform.git
cd cloudflare-api-platform

# 运行上面的部署脚本...
```

---

## 📤 方法 3: 手动上传文件（简单但较慢）

在 GCP Console 的 SSH 窗口中：

1. **创建目录**：
```bash
mkdir -p ~/api-billing-platform
cd ~/api-billing-platform
```

2. **在本地打包项目**：
```bash
cd /Users/chunyiyang/I3
tar -czf api-billing-platform.tar.gz api-billing-platform/
```

3. **使用 GCP Console 的上传功能**：
   - 在 SSH 窗口右上角，点击 ⚙️ (设置图标)
   - 选择 "Upload file"
   - 上传 `api-billing-platform.tar.gz`

4. **在 VM 上解压**：
```bash
cd ~
tar -xzf api-billing-platform.tar.gz
```

---

## 🚀 启动服务

上传完成后，在 VM 上执行：

```bash
cd ~/api-billing-platform

# 运行简化的手动部署
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y python3.11 python3.11-venv python3-pip nodejs npm git

# 后端
cd server
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python migrate_to_admin.py
python create_admin.py
nohup python main.py > backend.log 2>&1 &
cd ..

# 前端
cd client
npm install
npm run build
nohup npm run preview -- --host 0.0.0.0 --port 5173 > frontend.log 2>&1 &
cd ..

echo "✅ 服务已启动!"
echo "前端: http://$(curl -s ifconfig.me):5173"
echo "后端: http://$(curl -s ifconfig.me):8000"
```

---

## 🔒 配置域名（可选）

如果你有域名（例如 `api.yourdomain.com`）：

### 1. 设置 DNS
在域名提供商（如 Cloudflare DNS）添加 A 记录：
```
api.yourdomain.com  →  [你的 VM 外部 IP]
```

### 2. 安装 Nginx
```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx

# 配置 Nginx
sudo nano /etc/nginx/sites-available/cloudflare-api
```

**Nginx 配置**：
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # 前端
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 后端 API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/cloudflare-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 获取 SSL 证书
sudo certbot --nginx -d api.yourdomain.com
```

---

## 🔄 设置开机自启动（推荐）

创建 systemd 服务：

```bash
# 后端服务
sudo nano /etc/systemd/system/cloudflare-backend.service
```

```ini
[Unit]
Description=Cloudflare API Backend
After=network.target

[Service]
Type=simple
User=你的用户名
WorkingDirectory=/home/你的用户名/api-billing-platform/server
Environment="PATH=/home/你的用户名/api-billing-platform/server/venv/bin"
ExecStart=/home/你的用户名/api-billing-platform/server/venv/bin/python main.py
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# 前端服务
sudo nano /etc/systemd/system/cloudflare-frontend.service
```

```ini
[Unit]
Description=Cloudflare API Frontend
After=network.target

[Service]
Type=simple
User=你的用户名
WorkingDirectory=/home/你的用户名/api-billing-platform/client
ExecStart=/usr/bin/npm run preview -- --host 0.0.0.0 --port 5173
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# 启用并启动服务
sudo systemctl enable cloudflare-backend cloudflare-frontend
sudo systemctl start cloudflare-backend cloudflare-frontend

# 查看状态
sudo systemctl status cloudflare-backend
sudo systemctl status cloudflare-frontend
```

---

## 📊 监控和维护

```bash
# 查看日志
sudo journalctl -u cloudflare-backend -f
sudo journalctl -u cloudflare-frontend -f

# 重启服务
sudo systemctl restart cloudflare-backend
sudo systemctl restart cloudflare-frontend

# 更新代码
cd ~/api-billing-platform
git pull
sudo systemctl restart cloudflare-backend cloudflare-frontend
```

---

## 🎉 完成！

你的服务现在应该可以通过以下地址访问：

- **前端**: `http://[VM外部IP]:5173`
- **后端API**: `http://[VM外部IP]:8000`
- **API文档**: `http://[VM外部IP]:8000/docs`

**管理员账号**:
- 用户名: `admin`
- 密码: `admin123`

---

## 🆘 故障排查

### 无法访问服务
```bash
# 检查防火墙
sudo ufw status
sudo ufw allow 8000
sudo ufw allow 5173

# 检查进程
ps aux | grep python
ps aux | grep node

# 检查端口
sudo netstat -tlnp | grep 8000
sudo netstat -tlnp | grep 5173
```

### 查看错误日志
```bash
cd ~/api-billing-platform
tail -50 server/backend.log
tail -50 client/frontend.log
```

---

## 📞 需要帮助？

如果遇到问题，请提供：
1. VM 外部 IP
2. 错误日志
3. 防火墙规则截图


