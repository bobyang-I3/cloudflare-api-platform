# 🚀 快速部署指南 - GCP

**GCP账号**: bob.yang@intelligencecubed.com

---

## 📋 第一步：创建 VM（在GCP控制台）

1. **访问**: https://console.cloud.google.com

2. **登录**: bob.yang@intelligencecubed.com

3. **创建VM实例**:
   - 左侧菜单 → **Compute Engine** → **VM 实例**
   - 点击 **"创建实例"**
   
   **配置**:
   ```
   名称: cloudflare-api
   区域: us-west1 (或离你最近的)
   机器类型: e2-medium (2 vCPU, 4GB RAM)
   
   启动磁盘:
   - 操作系统: Ubuntu
   - 版本: Ubuntu 22.04 LTS
   - 磁盘大小: 20 GB
   
   防火墙:
   ✅ 允许 HTTP 流量
   ✅ 允许 HTTPS 流量
   ```

4. **点击"创建"** → 等待VM启动（约1分钟）

---

## 🔥 第二步：配置防火墙

1. **左侧菜单** → **VPC 网络** → **防火墙**

2. **创建规则1** - 后端端口:
   ```
   名称: allow-api-backend
   目标: 网络中的所有实例
   来源 IP 范围: 0.0.0.0/0
   协议和端口: tcp:8000
   ```
   点击"创建"

3. **创建规则2** - 前端端口:
   ```
   名称: allow-api-frontend
   目标: 网络中的所有实例
   来源 IP 范围: 0.0.0.0/0
   协议和端口: tcp:5173
   ```
   点击"创建"

---

## 💻 第三步：本地上传代码

**在你的Mac终端执行**:

```bash
# 1. 安装 gcloud（如果还没有）
# 访问: https://cloud.google.com/sdk/docs/install
# 或使用 Homebrew:
brew install google-cloud-sdk

# 2. 登录GCP
gcloud auth login
# 会打开浏览器，使用 bob.yang@intelligencecubed.com 登录

# 3. 设置项目（替换为你的项目ID）
gcloud config set project YOUR_PROJECT_ID
# 项目ID可以在GCP控制台顶部看到

# 4. 上传项目到VM
cd /Users/chunyiyang/I3
gcloud compute scp --recurse api-billing-platform cloudflare-api:~ --zone=us-west1-a

# 5. SSH到VM
gcloud compute ssh cloudflare-api --zone=us-west1-a
```

---

## 🛠️ 第四步：在VM上部署

**现在你已经SSH到VM了，执行**:

```bash
# 进入项目目录
cd ~/api-billing-platform

# 运行一键部署脚本
chmod +x deploy-simple.sh
./deploy-simple.sh
```

**等待5-10分钟**，脚本会自动：
- 安装Python、Node.js
- 安装所有依赖
- 配置环境变量
- 初始化数据库
- 创建管理员账户
- 构建前端
- 创建管理脚本

---

## ✅ 第五步：启动服务

```bash
# 启动
./start.sh

# 查看状态
./status.sh
```

**获取你的服务器IP**:
```bash
curl ifconfig.me
```

**访问地址**:
- 前端: `http://YOUR_VM_IP:5173`
- 后端: `http://YOUR_VM_IP:8000`
- API文档: `http://YOUR_VM_IP:8000/docs`

**管理员账号**:
- 用户名: `admin`
- 密码: `admin123`

---

## 🔄 如何更新代码（上线后）

### 方法1: 从本地推送更新（推荐）

```bash
# 在本地Mac上
cd /Users/chunyiyang/I3/api-billing-platform

# 上传更新的文件
gcloud compute scp --recurse server cloudflare-api:~/api-billing-platform/ --zone=us-west1-a
gcloud compute scp --recurse client cloudflare-api:~/api-billing-platform/ --zone=us-west1-a

# SSH到服务器
gcloud compute ssh cloudflare-api --zone=us-west1-a

# 重启服务
cd ~/api-billing-platform
./restart.sh
```

### 方法2: 在服务器上直接修改

```bash
# SSH到服务器
gcloud compute ssh cloudflare-api --zone=us-west1-a

# 编辑文件
cd ~/api-billing-platform
nano server/main.py  # 或其他文件

# 重启服务
./restart.sh
```

### 方法3: 使用Git（最佳实践）

**一次性设置**:
```bash
# 在本地
cd /Users/chunyiyang/I3/api-billing-platform
git init
git add .
git commit -m "Initial deployment"

# 推送到GitHub（创建private仓库）
git remote add origin https://github.com/你的用户名/cloudflare-api.git
git push -u origin main
```

**以后更新**:
```bash
# 在本地修改代码后
git add .
git commit -m "Update features"
git push

# SSH到服务器
gcloud compute ssh cloudflare-api --zone=us-west1-a

# 拉取更新
cd ~/api-billing-platform
git pull

# 重启服务
./restart.sh
```

---

## 📊 管理命令

```bash
# 启动服务
./start.sh

# 停止服务
./stop.sh

# 重启服务
./restart.sh

# 查看状态
./status.sh

# 查看日志
./logs.sh              # 查看最近日志
./logs.sh backend      # 实时后端日志
./logs.sh frontend     # 实时前端日志
```

---

## 🔒 安全建议

### 1. 修改管理员密码

```bash
cd ~/api-billing-platform/server
source venv/bin/activate
python

>>> from database import SessionLocal
>>> from models import User
>>> from auth import hash_password
>>> db = SessionLocal()
>>> admin = db.query(User).filter(User.username == "admin").first()
>>> admin.password_hash = hash_password("你的新密码")
>>> db.commit()
>>> exit()
```

### 2. 限制防火墙规则（可选）

如果只需要特定IP访问，修改防火墙规则：
```
来源 IP 范围: 你的办公室IP/32
```

### 3. 设置HTTPS（可选，需要域名）

见 `DEPLOY_TO_GCP.md` 的 "配置域名" 部分

---

## 🆘 常见问题

### Q: 找不到项目ID怎么办？
A: 在GCP控制台顶部可以看到，格式类似 `my-project-123456`

### Q: Zone应该选哪个？
A: 
- 美国西部: `us-west1-a`
- 美国东部: `us-east1-b`
- 亚洲: `asia-east1-a`

### Q: 服务无法访问？
A: 
```bash
# 检查防火墙
gcloud compute firewall-rules list

# 检查服务状态
./status.sh

# 查看日志
./logs.sh
```

### Q: 如何查看VM的外部IP？
A: 
- GCP控制台 → Compute Engine → VM 实例
- 或在VM上执行: `curl ifconfig.me`

---

## 📞 快速参考

```bash
# 连接到VM
gcloud compute ssh cloudflare-api --zone=us-west1-a

# 上传文件
gcloud compute scp 本地文件 cloudflare-api:远程路径 --zone=us-west1-a

# 查看VM列表
gcloud compute instances list

# 停止VM（省钱）
gcloud compute instances stop cloudflare-api --zone=us-west1-a

# 启动VM
gcloud compute instances start cloudflare-api --zone=us-west1-a
```

---

## 🎉 完成！

现在你的Cloudflare API平台已经上线！

**分享给团队**:
```
前端地址: http://YOUR_VM_IP:5173
管理员: admin / admin123

请立即修改管理员密码！
```

**上线后可以随时更新**，更新流程只需3步：
1. 上传新代码
2. 运行 `./restart.sh`
3. 完成！

有问题随时查看 `DEPLOY_TO_GCP.md` 详细文档！


