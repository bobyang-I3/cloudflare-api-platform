# 🚀 Admin功能快速上手指南

## ⚡ 5分钟快速开始

### 1. 确认服务运行 ✅
```bash
# 检查后端
curl http://localhost:8000/health

# 检查前端
# 浏览器访问: http://localhost:5173
```

**当前状态**:
- ✅ 后端运行中: http://localhost:8000
- ✅ 前端运行中: http://localhost:5173
- ✅ 数据库已迁移
- ✅ Admin账户已创建

---

### 2. 使用Admin账户登录 🔐

访问 http://localhost:5173 并登录:

```
Username: admin
Password: admin123
```

登录后你会看到多了一个 **🔧 Admin** 标签页！

---

### 3. 探索Admin功能 🔧

#### 查看平台统计 📊
点击 **🔧 Admin** 标签页，你会看到：
- 📈 总用户数、活跃用户数
- 📊 总请求数、总token数
- 🔥 今日使用情况
- 🏆 热门模型排行

#### 管理用户 👥
在用户列表中，每个用户显示：
- 基本信息（用户名、邮箱、角色）
- 账户状态（Active/Inactive）
- 使用统计（总请求、总tokens、今日使用）
- 配额限制状态

#### 可执行操作 ⚙️
对任意用户（非admin）可以：
- **Edit Limits**: 设置配额限制
- **Disable/Enable**: 禁用或启用账户
- **Delete**: 删除用户

---

### 4. 设置用户配额示例 📝

#### 场景：限制测试用户每天只能用1000个tokens

1. 找到目标用户，点击 **Edit Limits**
2. 勾选 **✅ Enable Limits**
3. 设置:
   ```
   Max Requests per Day: 100
   Max Tokens per Day: 1000
   Max Tokens per Month: 10000
   ```
4. 点击 **Save Changes**

#### 场景：给VIP用户无限配额

1. 点击用户的 **Edit Limits**
2. 取消勾选 **☑️ Enable Limits**
3. 或者设置所有值为 `0`（0 = 无限）
4. 点击 **Save Changes**

---

## 🎯 常见任务

### 禁用某个用户
1. 在用户列表找到该用户
2. 点击 **Disable** 按钮
3. 确认操作
4. ✅ 用户立即无法使用API

### 删除某个用户
1. 在用户列表找到该用户
2. 点击 **Delete** 按钮
3. 确认删除提示
4. ✅ 用户及其所有数据被删除

### 查看平台使用情况
1. 打开 **🔧 Admin** 标签页
2. 查看顶部的统计卡片
3. 查看热门模型列表（按请求数排序）

---

## 📱 当前可用模型（5个）

### 💬 文本生成（4个）
1. **Llama 3.1 8B Instruct** ⭐ 推荐
2. **Llama 3 8B Instruct**
3. **Llama 2 7B Chat FP16**
4. **Mistral 7B Instruct**

### 🎨 图像生成（1个）
5. **FLUX.1 Schnell** - 超快速，4步生成

---

## 🔑 创建新Admin账户

如果需要创建额外的admin账户：

```bash
cd /Users/chunyiyang/I3/api-billing-platform/server
source venv/bin/activate
python create_admin.py <username> <email> <password>
```

例如：
```bash
python create_admin.py super_admin super@example.com SecureP@ss123
```

---

## 🆘 故障排除

### 问题1: 看不到Admin标签页
**原因**: 当前用户不是admin
**解决**: 
- 使用admin账户登录（username: `admin`, password: `admin123`）
- 或者在数据库中将用户的`is_admin`字段设为`1`

### 问题2: Admin API返回403错误
**原因**: JWT token不包含admin权限
**解决**: 
- 重新登录以获取新的token
- 确认用户的`is_admin=True`和`role='admin'`

### 问题3: 无法删除admin用户
**原因**: 这是故意的安全保护
**解决**: 
- Admin用户不能被删除或禁用
- 如需删除，直接在数据库中操作

### 问题4: 修改配额后没生效
**原因**: 配额检查尚未实现（仅UI管理）
**解决**: 
- 当前版本仅支持配额设置，不强制执行
- 需要在AI请求处理中添加配额检查逻辑

---

## 📸 功能截图说明

### Admin Dashboard
- **平台统计区**: 6个彩色卡片，实时数据
- **用户管理表**: 完整的用户信息和操作
- **配额编辑**: 弹窗式表单，直观易用

### 权限控制
- **普通用户**: 只能看到 💬 Chat, 📊 Usage, 🔑 API Key
- **Admin用户**: 额外看到 🔧 Admin 标签页

---

## 🎓 技术细节

### Admin API端点
- `GET /api/admin/users` - 获取所有用户
- `GET /api/admin/stats` - 平台统计
- `GET /api/admin/user/{id}/usage` - 用户详细使用
- `PUT /api/admin/user/{id}/limit` - 更新配额
- `PUT /api/admin/user/{id}/status` - 启用/禁用
- `DELETE /api/admin/user/{id}` - 删除用户

### 数据库表
- `users` - 新增`is_admin`, `role`字段
- `user_limits` - 新表，存储配额限制
- `usage_logs` - 使用记录（已存在）

### 权限验证
- 使用`require_admin`依赖注入
- 基于JWT token中的用户信息
- 前端通过`user.is_admin`控制UI显示

---

## 🎉 开始使用！

**立即访问**: http://localhost:5173

1. 使用 `admin` / `admin123` 登录
2. 点击 **🔧 Admin** 标签页
3. 开始管理你的平台！

---

**需要帮助?** 查看详细文档: `ADMIN_FEATURE_COMPLETE.md`

