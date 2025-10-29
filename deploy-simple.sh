#!/bin/bash
# Cloudflare API Platform - 简化部署脚本
# 适用于 Ubuntu 22.04 LTS on GCP

set -e

echo "========================================"
echo "🚀 Cloudflare API Platform 部署"
echo "========================================"
echo ""

# 获取当前用户和目录
CURRENT_USER=$(whoami)
APP_DIR="$HOME/api-billing-platform"

# 检查是否在正确的目录
if [ ! -f "server/main.py" ]; then
    echo "❌ 错误: 请在 api-billing-platform 目录中运行此脚本"
    echo "当前目录: $(pwd)"
    exit 1
fi

# 更新系统
echo "📦 步骤 1/8: 更新系统包..."
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq

# 安装 Python 3.11
echo "🐍 步骤 2/8: 安装 Python 3.11..."
sudo apt-get install -y -qq python3.11 python3.11-venv python3-pip

# 安装 Node.js 18
echo "📗 步骤 3/8: 安装 Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - > /dev/null
    sudo apt-get install -y -qq nodejs
fi

# 配置环境变量
echo "⚙️ 步骤 4/8: 配置环境变量..."
VM_IP=$(curl -s ifconfig.me)
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

# CORS
CORS_ORIGINS=["http://localhost:5173","http://$VM_IP:5173","http://$VM_IP:8000","https://$VM_IP:5173","https://$VM_IP:8000"]
EOF

# 安装后端依赖
echo "📦 步骤 5/8: 安装后端依赖..."
cd server
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q

# 初始化数据库和管理员账号
echo "🗄️ 步骤 6/8: 初始化数据库..."
python migrate_to_admin.py
python create_admin.py

deactivate
cd ..

# 安装前端依赖
echo "📦 步骤 7/8: 安装前端依赖..."
cd client
npm install --silent

# 构建前端
echo "🔨 构建前端..."
npm run build

cd ..

# 创建管理脚本
echo "📝 步骤 8/8: 创建管理脚本..."

# 启动脚本
cat > start.sh << 'STARTSCRIPT'
#!/bin/bash
cd "$(dirname "$0")"

echo "🚀 启动服务..."

# 启动后端
cd server
source venv/bin/activate
nohup python main.py > backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > backend.pid
echo "✅ 后端已启动 (PID: $BACKEND_PID)"
deactivate

# 启动前端
cd ../client
nohup npm run preview -- --host 0.0.0.0 --port 5173 > frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > frontend.pid
echo "✅ 前端已启动 (PID: $FRONTEND_PID)"

cd ..

sleep 2

VM_IP=$(curl -s ifconfig.me 2>/dev/null || echo "localhost")

echo ""
echo "========================================"
echo "🎉 服务已启动!"
echo "========================================"
echo ""
echo "🌐 访问地址:"
echo "   前端: http://$VM_IP:5173"
echo "   后端: http://$VM_IP:8000"
echo "   API文档: http://$VM_IP:8000/docs"
echo ""
echo "👤 管理员账号:"
echo "   用户名: admin"
echo "   密码: admin123"
echo ""
echo "📋 其他命令:"
echo "   停止服务: ./stop.sh"
echo "   重启服务: ./restart.sh"
echo "   查看状态: ./status.sh"
echo "   查看日志: ./logs.sh"
echo ""
STARTSCRIPT

# 停止脚本
cat > stop.sh << 'STOPSCRIPT'
#!/bin/bash
cd "$(dirname "$0")"

echo "⏹️ 停止服务..."

# 停止后端
if [ -f server/backend.pid ]; then
    PID=$(cat server/backend.pid)
    if kill $PID 2>/dev/null; then
        echo "✅ 后端已停止 (PID: $PID)"
    fi
    rm server/backend.pid
fi

# 停止前端
if [ -f client/frontend.pid ]; then
    PID=$(cat client/frontend.pid)
    if kill $PID 2>/dev/null; then
        echo "✅ 前端已停止 (PID: $PID)"
    fi
    rm client/frontend.pid
fi

# 清理任何残留进程
pkill -f "python main.py" 2>/dev/null && echo "🧹 清理后端残留进程"
pkill -f "vite preview" 2>/dev/null && echo "🧹 清理前端残留进程"

echo "✅ 所有服务已停止"
STOPSCRIPT

# 重启脚本
cat > restart.sh << 'RESTARTSCRIPT'
#!/bin/bash
cd "$(dirname "$0")"

echo "🔄 重启服务..."
./stop.sh
sleep 2
./start.sh
RESTARTSCRIPT

# 状态检查脚本
cat > status.sh << 'STATUSSCRIPT'
#!/bin/bash
cd "$(dirname "$0")"

echo "📊 服务状态检查"
echo "========================================"

# 检查后端
if [ -f server/backend.pid ]; then
    PID=$(cat server/backend.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "✅ 后端运行中 (PID: $PID)"
        echo "   端口: $(sudo netstat -tlnp 2>/dev/null | grep $PID | grep -oP ':\K[0-9]+' | head -1 || echo '?')"
    else
        echo "❌ 后端未运行 (PID文件存在但进程不存在)"
    fi
else
    echo "❌ 后端未运行 (无PID文件)"
fi

# 检查前端
if [ -f client/frontend.pid ]; then
    PID=$(cat client/frontend.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "✅ 前端运行中 (PID: $PID)"
        echo "   端口: $(sudo netstat -tlnp 2>/dev/null | grep $PID | grep -oP ':\K[0-9]+' | head -1 || echo '?')"
    else
        echo "❌ 前端未运行 (PID文件存在但进程不存在)"
    fi
else
    echo "❌ 前端未运行 (无PID文件)"
fi

echo ""
echo "🌐 端口监听状态:"
sudo netstat -tlnp 2>/dev/null | grep -E ':(8000|5173) ' || echo "   无相关端口监听"

echo ""
VM_IP=$(curl -s ifconfig.me 2>/dev/null || echo "localhost")
echo "🔗 访问地址:"
echo "   http://$VM_IP:5173"
echo "   http://$VM_IP:8000/docs"
STATUSSCRIPT

# 日志查看脚本
cat > logs.sh << 'LOGSSCRIPT'
#!/bin/bash
cd "$(dirname "$0")"

if [ "$1" == "backend" ]; then
    echo "📋 后端日志 (按 Ctrl+C 退出):"
    tail -f server/backend.log
elif [ "$1" == "frontend" ]; then
    echo "📋 前端日志 (按 Ctrl+C 退出):"
    tail -f client/frontend.log
else
    echo "📋 最近的日志:"
    echo ""
    echo "=== 后端日志 (最后20行) ==="
    tail -20 server/backend.log 2>/dev/null || echo "无日志"
    echo ""
    echo "=== 前端日志 (最后20行) ==="
    tail -20 client/frontend.log 2>/dev/null || echo "无日志"
    echo ""
    echo "💡 查看实时日志:"
    echo "   ./logs.sh backend   # 查看后端日志"
    echo "   ./logs.sh frontend  # 查看前端日志"
fi
LOGSSCRIPT

chmod +x start.sh stop.sh restart.sh status.sh logs.sh

echo ""
echo "========================================"
echo "✅ 部署完成!"
echo "========================================"
echo ""
echo "🚀 启动服务: ./start.sh"
echo "📊 查看状态: ./status.sh"
echo "📋 查看日志: ./logs.sh"
echo ""
echo "⚠️ 重要提示:"
echo "1. 确保 GCP 防火墙已开放端口 8000 和 5173"
echo "2. 管理员账号: admin / admin123"
echo "3. 首次访问建议清除浏览器缓存"
echo ""


