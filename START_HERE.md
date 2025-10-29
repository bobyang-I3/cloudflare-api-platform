# 🚀 开始部署到GCP

**只需3个步骤，15分钟搞定！**

---

## ✅ 准备工作（2分钟）

- [ ] GCP账号: bob.yang@intelligencecubed.com
- [ ] 电脑上安装gcloud: `brew install google-cloud-sdk`
- [ ] 登录GCP: `gcloud auth login`

---

## 📋 步骤1: 创建VM（3分钟）

1. 访问 https://console.cloud.google.com
2. Compute Engine → VM实例 → 创建实例
3. 配置:
   - 名称: `cloudflare-api`
   - 机器: `e2-medium`
   - 系统: `Ubuntu 22.04 LTS`
   - 防火墙: ✅ HTTP, ✅ HTTPS
4. 创建

---

## 🔥 步骤2: 开放端口（2分钟）

VPC网络 → 防火墙 → 创建规则 (2个):

**规则1:**
- 名称: `allow-api-backend`
- 端口: `tcp:8000`
- 来源: `0.0.0.0/0`

**规则2:**
- 名称: `allow-api-frontend`  
- 端口: `tcp:5173`
- 来源: `0.0.0.0/0`

---

## 💻 步骤3: 部署代码（10分钟）

**在Mac终端执行:**

```bash
# 1. 设置GCP项目
gcloud config set project YOUR_PROJECT_ID

# 2. 上传代码
cd /Users/chunyiyang/I3
gcloud compute scp --recurse api-billing-platform cloudflare-api:~ --zone=us-west1-a

# 3. SSH到服务器
gcloud compute ssh cloudflare-api --zone=us-west1-a

# 4. 部署（在VM上执行）
cd ~/api-billing-platform
chmod +x deploy-simple.sh
./deploy-simple.sh

# 5. 启动
./start.sh
```

---

## 🎉 完成！

**获取服务器IP:**
```bash
curl ifconfig.me
```

**访问你的平台:**
- 🌐 前端: `http://YOUR_IP:5173`
- 🔧 API: `http://YOUR_IP:8000/docs`

**登录管理:**
- 用户名: `admin`
- 密码: `admin123`

---

## 🔄 如何更新？

**超简单！只需2步:**

```bash
# 1. 本地上传新代码
cd /Users/chunyiyang/I3/api-billing-platform
gcloud compute scp --recurse server client cloudflare-api:~/api-billing-platform/ --zone=us-west1-a

# 2. SSH到服务器重启
gcloud compute ssh cloudflare-api --zone=us-west1-a
cd ~/api-billing-platform
./restart.sh
```

**就是这么简单！** ✨

---

## 📚 详细文档

- 完整部署指南: `QUICK_DEPLOY.md`
- GCP详细说明: `DEPLOY_TO_GCP.md`
- 限额功能说明: `LIMIT_ENFORCEMENT_FIX.md`

---

## 🆘 遇到问题？

```bash
# 查看服务状态
./status.sh

# 查看日志
./logs.sh

# 重启服务
./restart.sh
```

---

**现在就开始吧！** 🚀


