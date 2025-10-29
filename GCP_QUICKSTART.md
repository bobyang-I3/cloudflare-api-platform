# 🚀 GCP 部署快速指南

**3步完成部署** - 仅需 10-15 分钟

---

## 📋 准备工作

- **GCP账号**: bob.yang@intelligencecubed.com ✅
- **项目文件**: 在你的本地 `/Users/chunyiyang/I3/api-billing-platform` ✅

---

## 🎯 部署步骤

### 第1步：创建 VM (3分钟)

1. **登录 GCP**: https://console.cloud.google.com
2. **进入 Compute Engine → VM 实例**
3. **点击"创建实例"**，使用以下配置：

```
名称: cloudflare-api
区域: us-west1 (或任意)
机器类型: e2-medium (2 vCPU, 4GB)
启动磁盘: Ubuntu 22.04 LTS, 20GB
防火墙: ✅ 允许 HTTP 和 HTTPS 流量
```

4. **点击"创建"**，等待1-2分钟

### 第2步：配置防火墙 (2分钟)

1. **左侧菜单 → VPC 网络 → 防火墙**
2. **创建两个防火墙规则**：

**规则1** - 允许后端 (端口 8000):
```
名称: allow-backend-8000
目标: 网络中的所有实例
来源 IPv4: 0.0.0.0/0
协议和端口: tcp:8000
```

**规则2** - 允许前端 (端口 5173):
```
名称: allow-frontend-5173  
目标: 网络中的所有实例
来源 IPv4: 0.0.0.0/0
协议和端口: tcp:5173
```

### 第3步：部署应用 (8分钟)

#### 3.1 上传项目文件

**在你的本地 Mac 终端**运行：

```bash
# 安装 gcloud CLI (如果还没有)
# 访问: https://cloud.google.com/sdk/docs/install
# 或使用 Homebrew: brew install --cask google-cloud-sdk

# 认证登录
gcloud auth login

# 设置你的项目ID (替换为你的实际项目ID)
gcloud config set project YOUR_PROJECT_ID

# 上传项目到 VM
cd /Users/chunyiyang/I3
gcloud compute scp --recurse api-billing-platform cloudflare-api:~ --zone=us-west1-a

# 连接到 VM
gcloud compute ssh cloudflare-api --zone=us-west1-a
```

#### 3.2 运行部署脚本

**在 VM 的 SSH 终端**运行：

```bash
cd ~/api-billing-platform
chmod +x deploy-simple.sh
./deploy-simple.sh
```

等待 5-8 分钟，脚本会自动：
- ✅ 安装 Python 3.11
- ✅ 安装 Node.js 18
- ✅ 安装所有依赖
- ✅ 初始化数据库
- ✅ 创建管理员账号
- ✅ 构建前端

#### 3.3 启动服务

```bash
./start.sh
```

屏幕会显示：
```
✅ 后端已启动
✅ 前端已启动

🌐 访问地址:
   前端: http://YOUR_VM_IP:5173
   后端: http://YOUR_VM_IP:8000
   API文档: http://YOUR_VM_IP:8000/docs

👤 管理员账号:
   用户名: admin
   密码: admin123
```

---

## 🎉 完成！

**访问你的应用**: http://YOUR_VM_IP:5173

**管理员登录**:
- 用户名: `admin`
- 密码: `admin123`

---

## 🔧 常用管理命令

```bash
# 在 VM 上的 ~/api-billing-platform 目录

./start.sh       # 启动服务
./stop.sh        # 停止服务
./restart.sh     # 重启服务
./status.sh      # 查看状态
./logs.sh        # 查看日志
```

---

## ❓ 找不到 VM IP？

**方法1** - GCP Console:
- VM 实例页面 → 找到 "外部 IP" 列

**方法2** - 在 VM 上运行:
```bash
curl ifconfig.me
```

---

## 🆘 遇到问题？

### 问题1: 无法访问前端/后端

**检查防火墙规则是否创建**:
```bash
gcloud compute firewall-rules list | grep -E 'allow-(backend|frontend)'
```

如果没有，在 VM 上运行:
```bash
sudo ufw allow 8000
sudo ufw allow 5173
```

### 问题2: 服务未启动

**查看状态**:
```bash
./status.sh
```

**查看日志**:
```bash
./logs.sh
```

### 问题3: 端口被占用

**清理进程**:
```bash
./stop.sh
sudo pkill -f python
sudo pkill -f node
./start.sh
```

---

## 📞 支持

如果遇到问题：

1. **查看日志**: `./logs.sh`
2. **检查状态**: `./status.sh`  
3. **重启服务**: `./restart.sh`

提供以下信息有助于快速解决：
- VM 外部 IP
- 错误日志 (`./logs.sh`)
- 服务状态 (`./status.sh`)

---

## 🔐 安全建议

上线后建议：

1. **修改管理员密码**
2. **限制防火墙源IP**（如果只有特定用户访问）
3. **配置 HTTPS**（如果有域名）
4. **定期备份数据库**: `cp server/app.db server/app.db.backup`

---

## 📊 监控使用情况

- **Admin面板**: 登录后点击 "🔧 Admin" 标签
- **Usage面板**: 查看个人使用统计
- **后端日志**: `tail -f server/backend.log`

---

## ⚡ 性能优化（可选）

### 使用更大的 VM
```
机器类型: e2-standard-2 (2 vCPU, 8GB) 或更高
```

### 设置开机自启动
```bash
# 在 VM 上运行
sudo nano /etc/rc.local
```

添加：
```bash
#!/bin/bash
sleep 10
cd /home/YOUR_USERNAME/api-billing-platform && ./start.sh
```

```bash
sudo chmod +x /etc/rc.local
```

---

**祝部署顺利！** 🚀

