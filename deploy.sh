#!/bin/bash

# ============================================
# API Billing Platform 一键部署脚本
# ============================================

set -e  # 遇到错误立即退出

echo "🚀 开始部署 API Billing Platform..."
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# 1. 检查系统
# ============================================
echo "📋 检查系统环境..."

if [ ! -f /etc/os-release ]; then
    echo -e "${RED}❌ 无法检测系统版本${NC}"
    exit 1
fi

. /etc/os-release
if [ "$ID" != "ubuntu" ]; then
    echo -e "${YELLOW}⚠️  警告: 此脚本为Ubuntu优化，当前系统: $ID${NC}"
fi

# ============================================
# 2. 获取配置信息
# ============================================
echo ""
echo "📝 请提供配置信息:"
echo ""

read -p "Admin用户名 [默认: admin]: " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

read -p "Admin邮箱 [默认: admin@example.com]: " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@example.com}

read -sp "Admin密码: " ADMIN_PASSWORD
echo ""

if [ -z "$ADMIN_PASSWORD" ]; then
    echo -e "${RED}❌ 密码不能为空${NC}"
    exit 1
fi

read -p "Cloudflare API Key [默认使用现有]: " CF_API_KEY
CF_API_KEY=${CF_API_KEY:-r2U0hjXVU9FXbDyLozAl_PcOz8PdoONJpfyIiEjX}

read -p "Cloudflare Account ID [默认使用现有]: " CF_ACCOUNT_ID
CF_ACCOUNT_ID=${CF_ACCOUNT_ID:-2858ce0e47c9c3fabee1fdc0db232172}

read -p "JWT Secret Key [自动生成]: " JWT_SECRET
JWT_SECRET=${JWT_SECRET:-$(openssl rand -hex 32)}

# ============================================
# 3. 安装依赖
# ============================================
echo ""
echo "📦 安装系统依赖..."

sudo apt update
sudo apt install -y python3 python3-pip python3-venv nodejs npm git nginx sqlite3

# ============================================
# 4. 创建部署目录
# ============================================
echo ""
echo "📁 创建部署目录..."

DEPLOY_DIR="/opt/api-billing-platform"
sudo mkdir -p $DEPLOY_DIR
sudo chown $USER:$USER $DEPLOY_DIR

if [ -d "$(pwd)/server" ]; then
    echo "检测到当前目录包含项目文件，复制到部署目录..."
    cp -r $(pwd)/* $DEPLOY_DIR/
else
    echo -e "${RED}❌ 未找到项目文件，请先上传项目到服务器${NC}"
    exit 1
fi

cd $DEPLOY_DIR

# ============================================
# 5. 配置后端
# ============================================
echo ""
echo "⚙️  配置后端..."

cd server

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install --upgrade pip
pip install -r requirements.txt

# 创建.env文件
cat > .env << EOF
CLOUDFLARE_API_KEY=$CF_API_KEY
CLOUDFLARE_ACCOUNT_ID=$CF_ACCOUNT_ID
JWT_SECRET_KEY=$JWT_SECRET
DATABASE_URL=sqlite:///./app.db
HOST=0.0.0.0
PORT=8000
EOF

chmod 600 .env

# 初始化数据库
echo "初始化数据库..."
python migrate_to_admin.py || true
python create_admin.py "$ADMIN_USER" "$ADMIN_EMAIL" "$ADMIN_PASSWORD"

# ============================================
# 6. 配置前端
# ============================================
echo ""
echo "🎨 配置前端..."

cd ../client

# 安装依赖
npm install

# 构建生产版本
npm run build

# ============================================
# 7. 配置Nginx
# ============================================
echo ""
echo "🌐 配置Nginx..."

SERVER_IP=$(curl -s ifconfig.me || echo "YOUR_SERVER_IP")

sudo tee /etc/nginx/sites-available/api-billing-platform > /dev/null << EOF
server {
    listen 80;
    server_name $SERVER_IP _;

    # 前端静态文件
    location / {
        root $DEPLOY_DIR/client/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # 后端API代理
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# 启用站点
sudo ln -sf /etc/nginx/sites-available/api-billing-platform /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 测试Nginx配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# ============================================
# 8. 配置systemd服务
# ============================================
echo ""
echo "🔧 配置systemd服务..."

sudo tee /etc/systemd/system/api-billing-backend.service > /dev/null << EOF
[Unit]
Description=API Billing Platform Backend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$DEPLOY_DIR/server
Environment="PATH=$DEPLOY_DIR/server/venv/bin"
ExecStart=$DEPLOY_DIR/server/venv/bin/python main.py
Restart=always
RestartSec=10
StandardOutput=append:/var/log/api-billing-backend.log
StandardError=append:/var/log/api-billing-backend.log

[Install]
WantedBy=multi-user.target
EOF

# 重载systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start api-billing-backend
sudo systemctl enable api-billing-backend

# ============================================
# 9. 配置防火墙（如果需要）
# ============================================
echo ""
echo "🔒 配置防火墙..."

if command -v ufw &> /dev/null; then
    sudo ufw allow 22/tcp    # SSH
    sudo ufw allow 80/tcp    # HTTP
    sudo ufw allow 443/tcp   # HTTPS
    echo "y" | sudo ufw enable || true
else
    echo "UFW未安装，跳过防火墙配置"
fi

# ============================================
# 10. 创建备份脚本
# ============================================
echo ""
echo "💾 创建备份脚本..."

cat > /home/$USER/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/$USER/backups"
mkdir -p $BACKUP_DIR
sqlite3 /opt/api-billing-platform/server/app.db ".backup '$BACKUP_DIR/app_$DATE.db'"
find $BACKUP_DIR -name "app_*.db" -mtime +7 -delete
EOF

chmod +x /home/$USER/backup-db.sh

# 添加到crontab（每天凌晨2点备份）
(crontab -l 2>/dev/null; echo "0 2 * * * /home/$USER/backup-db.sh") | crontab -

# ============================================
# 完成！
# ============================================
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}✅ 部署完成！${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "📋 部署信息:"
echo "   服务器IP: $SERVER_IP"
echo "   前端地址: http://$SERVER_IP"
echo "   API文档: http://$SERVER_IP/api/docs"
echo ""
echo "🔑 Admin账户:"
echo "   用户名: $ADMIN_USER"
echo "   邮箱: $ADMIN_EMAIL"
echo "   密码: [已设置]"
echo ""
echo "📊 服务管理:"
echo "   查看状态: sudo systemctl status api-billing-backend"
echo "   查看日志: sudo journalctl -u api-billing-backend -f"
echo "   重启服务: sudo systemctl restart api-billing-backend"
echo ""
echo "🔒 安全建议:"
echo "   1. ✅ 立即更改admin密码"
echo "   2. ✅ 配置HTTPS (使用Let's Encrypt)"
echo "   3. ✅ 设置更强的JWT密钥"
echo "   4. ✅ 定期备份数据库"
echo ""
echo "🌐 下一步:"
echo "   访问 http://$SERVER_IP 开始使用！"
echo ""


