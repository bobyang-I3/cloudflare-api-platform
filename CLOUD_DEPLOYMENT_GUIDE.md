# ☁️ 云服务器部署指南

## 📋 目录
1. [方案选择](#方案选择)
2. [Google Cloud部署](#google-cloud部署)
3. [Docker部署](#docker部署)
4. [域名和HTTPS](#域名和https)
5. [安全配置](#安全配置)

---

## 🎯 方案选择

### 推荐方案1: Google Cloud Compute Engine ⭐
- **优点**: 稳定、速度快、免费额度充足
- **成本**: $10-30/月（根据配置）
- **适合**: 正式生产环境

### 方案2: DigitalOcean
- **优点**: 简单易用、价格透明
- **成本**: $5-20/月
- **适合**: 快速部署

### 方案3: AWS EC2
- **优点**: 功能强大、生态完善
- **成本**: $8-25/月
- **适合**: 企业级应用

---

## 🚀 Google Cloud部署（推荐）

### 第一步: 创建VM实例

#### 1. 登录Google Cloud Console
访问: https://console.cloud.google.com

#### 2. 创建VM实例
```
名称: api-billing-platform
区域: us-central1 (或选择离你最近的)
机器类型: e2-medium (2 vCPU, 4 GB 内存)
启动磁盘: 
  - 操作系统: Ubuntu 22.04 LTS
  - 磁盘大小: 20 GB
防火墙:
  ✅ 允许 HTTP 流量
  ✅ 允许 HTTPS 流量
```

#### 3. 配置防火墙规则
在"VPC网络" → "防火墙" 中添加规则：

**规则1: 允许后端端口**
```
名称: allow-api-8000
目标: 所有实例
来源IP范围: 0.0.0.0/0
协议和端口: tcp:8000
```

**规则2: 允许前端端口**
```
名称: allow-frontend-5173
目标: 所有实例
来源IP范围: 0.0.0.0/0
协议和端口: tcp:5173
```

### 第二步: 连接并配置服务器

#### 1. SSH连接到服务器
```bash
# 在Google Cloud Console点击"SSH"按钮连接
# 或使用gcloud命令
gcloud compute ssh api-billing-platform --zone=us-central1-a
```

#### 2. 更新系统
```bash
sudo apt update && sudo apt upgrade -y
```

#### 3. 安装必要软件
```bash
# 安装Python 3.11+
sudo apt install -y python3 python3-pip python3-venv

# 安装Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 安装Git
sudo apt install -y git

# 安装Nginx (用于反向代理)
sudo apt install -y nginx

# 安装SQLite3
sudo apt install -y sqlite3
```

### 第三步: 部署应用

#### 1. 克隆代码
```bash
# 如果有Git仓库
git clone <your-repo-url> /home/$USER/api-billing-platform
cd /home/$USER/api-billing-platform

# 或者从本地上传（在本地执行）
# 在本地压缩
cd /Users/chunyiyang/I3
tar -czf api-billing-platform.tar.gz api-billing-platform/

# 上传到服务器
gcloud compute scp api-billing-platform.tar.gz api-billing-platform:~/ --zone=us-central1-a

# 在服务器上解压
tar -xzf api-billing-platform.tar.gz
cd api-billing-platform
```

#### 2. 配置后端
```bash
cd server

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 创建.env文件
cat > .env << 'EOF'
CLOUDFLARE_API_KEY=r2U0hjXVU9FXbDyLozAl_PcOz8PdoONJpfyIiEjX
CLOUDFLARE_ACCOUNT_ID=2858ce0e47c9c3fabee1fdc0db232172
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
DATABASE_URL=sqlite:///./app.db
HOST=0.0.0.0
PORT=8000
EOF

# 初始化数据库
python migrate_to_admin.py
python create_admin.py admin admin@cloudflare.com YourSecurePassword123
```

#### 3. 配置前端
```bash
cd ../client

# 安装依赖
npm install

# 构建生产版本
npm run build

# 构建完成后，dist目录包含静态文件
```

### 第四步: 配置Nginx反向代理

#### 1. 创建Nginx配置
```bash
sudo nano /etc/nginx/sites-available/api-billing-platform
```

#### 2. 添加配置内容
```nginx
# 获取服务器外部IP
# YOUR_SERVER_IP = 在Google Cloud Console中查看

server {
    listen 80;
    server_name YOUR_SERVER_IP;  # 替换为你的服务器IP或域名

    # 前端静态文件
    location / {
        root /home/$USER/api-billing-platform/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端API代理
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 3. 启用配置
```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/api-billing-platform /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 第五步: 使用systemd管理后端服务

#### 1. 创建服务文件
```bash
sudo nano /etc/systemd/system/api-billing-backend.service
```

#### 2. 添加服务配置
```ini
[Unit]
Description=API Billing Platform Backend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/home/$USER/api-billing-platform/server
Environment="PATH=/home/$USER/api-billing-platform/server/venv/bin"
ExecStart=/home/$USER/api-billing-platform/server/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### 3. 启动服务
```bash
# 重载systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start api-billing-backend

# 开机自启
sudo systemctl enable api-billing-backend

# 查看状态
sudo systemctl status api-billing-backend

# 查看日志
sudo journalctl -u api-billing-backend -f
```

---

## 🐳 Docker部署（可选，更简单）

### 1. 安装Docker
```bash
# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装Docker Compose
sudo apt install -y docker-compose

# 重新登录以应用组权限
exit
# 重新SSH连接
```

### 2. 创建docker-compose.yml
```bash
cd /home/$USER/api-billing-platform
nano docker-compose.yml
```

```yaml
version: '3.8'

services:
  backend:
    build: ./server
    ports:
      - "8000:8000"
    environment:
      - CLOUDFLARE_API_KEY=r2U0hjXVU9FXbDyLozAl_PcOz8PdoONJpfyIiEjX
      - CLOUDFLARE_ACCOUNT_ID=2858ce0e47c9c3fabee1fdc0db232172
      - JWT_SECRET_KEY=your-super-secret-jwt-key-change-this
      - DATABASE_URL=sqlite:///./app.db
      - HOST=0.0.0.0
      - PORT=8000
    volumes:
      - ./server/app.db:/app/app.db
    restart: always

  frontend:
    build: ./client
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: always
```

### 3. 创建前端Dockerfile
```bash
nano client/Dockerfile.prod
```

```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 4. 创建Nginx配置
```bash
nano client/nginx.conf
```

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name _;

        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location /api {
            proxy_pass http://backend:8000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

### 5. 启动服务
```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart
```

---

## 🌐 域名和HTTPS

### 1. 购买域名（可选）
- Namecheap: https://www.namecheap.com
- GoDaddy: https://www.godaddy.com
- Google Domains: https://domains.google

### 2. 配置DNS
在域名提供商的DNS设置中：
```
类型: A
名称: @ (或 api)
值: YOUR_SERVER_IP
TTL: 自动
```

### 3. 配置HTTPS (使用Let's Encrypt)
```bash
# 安装Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取SSL证书（替换为你的域名）
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 证书会自动续期
sudo certbot renew --dry-run
```

---

## 🔒 安全配置

### 1. 配置防火墙
```bash
# 安装UFW
sudo apt install -y ufw

# 基本规则
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 允许SSH
sudo ufw allow ssh

# 允许HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 如果直接暴露后端端口（不推荐）
# sudo ufw allow 8000/tcp

# 启用防火墙
sudo ufw enable
```

### 2. 更改默认密码
```bash
# 登录后立即更改admin密码
cd /home/$USER/api-billing-platform/server
source venv/bin/activate
python create_admin.py admin admin@yourdomain.com YourVerySecurePassword123!
```

### 3. 环境变量安全
```bash
# 确保.env文件权限正确
chmod 600 server/.env

# 不要提交.env到Git
echo ".env" >> .gitignore
```

---

## 📊 监控和维护

### 1. 查看后端日志
```bash
# systemd服务日志
sudo journalctl -u api-billing-backend -f

# 或直接查看日志文件
tail -f /home/$USER/api-billing-platform/server/server.log
```

### 2. 数据库备份
```bash
# 创建备份脚本
cat > ~/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/$USER/backups"
mkdir -p $BACKUP_DIR
sqlite3 /home/$USER/api-billing-platform/server/app.db ".backup '$BACKUP_DIR/app_$DATE.db'"
# 保留最近7天的备份
find $BACKUP_DIR -name "app_*.db" -mtime +7 -delete
EOF

chmod +x ~/backup-db.sh

# 添加到crontab（每天凌晨2点备份）
crontab -e
# 添加行: 0 2 * * * /home/$USER/backup-db.sh
```

### 3. 更新应用
```bash
# 拉取最新代码
cd /home/$USER/api-billing-platform
git pull

# 更新后端
cd server
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart api-billing-backend

# 更新前端
cd ../client
npm install
npm run build
# Nginx会自动使用新的dist文件
```

---

## 🎯 快速部署总结

### 最简单的方案（推荐新手）:

```bash
# 1. 创建Google Cloud VM (Ubuntu 22.04, e2-medium)
# 2. SSH连接到服务器

# 3. 一键安装脚本
curl -fsSL https://raw.githubusercontent.com/your-repo/deploy.sh | bash

# 4. 访问 http://YOUR_SERVER_IP
```

### 访问地址
- 前端: `http://YOUR_SERVER_IP`
- 后端API: `http://YOUR_SERVER_IP/api`
- API文档: `http://YOUR_SERVER_IP/api/docs`

### 默认登录
- 用户名: `admin`
- 密码: 部署时设置的密码

---

## 🆘 故障排除

### 问题1: 无法访问服务器
```bash
# 检查防火墙
sudo ufw status

# 检查Nginx
sudo systemctl status nginx
sudo nginx -t

# 检查后端服务
sudo systemctl status api-billing-backend
sudo journalctl -u api-billing-backend -n 50
```

### 问题2: CORS错误
```bash
# 编辑服务器配置
nano /home/$USER/api-billing-platform/server/config.py

# 添加服务器IP到cors_origins
cors_origins: str = '["http://YOUR_SERVER_IP","http://yourdomain.com"]'

# 重启服务
sudo systemctl restart api-billing-backend
```

### 问题3: 数据库锁定
```bash
# 停止服务
sudo systemctl stop api-billing-backend

# 检查数据库
sqlite3 /home/$USER/api-billing-platform/server/app.db "PRAGMA integrity_check;"

# 重启服务
sudo systemctl start api-billing-backend
```

---

## 💰 成本估算

### Google Cloud (推荐配置)
```
VM实例 (e2-medium): ~$25/月
流量 (1TB): 免费额度内
磁盘 (20GB SSD): ~$3/月
---
总计: ~$28/月
```

### DigitalOcean
```
Droplet (2 GB RAM): $12/月
流量 (1TB): 包含
磁盘 (50GB SSD): 包含
---
总计: $12/月
```

---

## 📚 相关资源

- Google Cloud文档: https://cloud.google.com/compute/docs
- Docker文档: https://docs.docker.com
- Nginx文档: https://nginx.org/en/docs
- Let's Encrypt: https://letsencrypt.org

---

**部署完成后，记得:**
1. ✅ 更改默认admin密码
2. ✅ 配置HTTPS
3. ✅ 设置数据库备份
4. ✅ 配置防火墙
5. ✅ 监控服务状态

**需要帮助？** 联系管理员或查看详细日志！

