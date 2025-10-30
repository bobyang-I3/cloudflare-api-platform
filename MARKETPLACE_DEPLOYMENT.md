# API Resource Marketplace - 部署指南

## 🚀 功能概览

成功实现了 **API 资源交易市场**，用户可以在平台上买卖API资源，实现资源共享和交易。

### 核心功能

#### 1. 资源市场 (Marketplace)
- 📊 浏览所有可用的API资源
- 🔍 搜索和筛选（按模型、提供商、价格）
- 💰 查看实时价格和折扣
- ⭐ 查看卖家评分和评价
- 🛒 一键购买资源

#### 2. 我的资源 (My Resources)
- 📦 上架自己的API资源
- ✏️ 编辑价格和描述
- 📊 查看销售统计
- ⏸️ 暂停/激活资源
- 💵 实时收益跟踪

#### 3. 交易记录 (Transactions)
- 📜 查看所有购买和销售记录
- 💳 详细的token使用情况
- 📈 收入和支出统计
- 🔄 交易状态跟踪

### 商业模式

```
交易分成（每笔交易）：
├─ 卖家收入: 85%
├─ 平台抽成: 10%
└─ 风险准备金: 5%
```

---

## 📦 部署步骤

### Step 1: 在VM上拉取最新代码

```bash
# SSH 到你的 VM
gcloud compute ssh instance-20251029-181616 --zone=us-west1-b

# 进入项目目录
cd ~/api-billing-platform

# 拉取最新代码
git pull origin main
```

### Step 2: 更新后端

```bash
# 进入 server 目录
cd ~/api-billing-platform/server

# 激活虚拟环境
source venv/bin/activate

# 数据库会自动创建新表（已集成到 init_db）
# 无需手动迁移

# 重启后端服务
sudo systemctl restart backend

# 检查状态
sudo systemctl status backend

# 查看日志确认没有错误
sudo journalctl -u backend -n 50
```

### Step 3: 构建并部署前端

```bash
# 返回项目根目录
cd ~/api-billing-platform

# 进入 client 目录
cd client

# 构建前端
npm run build

# 重启前端服务
sudo systemctl restart frontend

# 检查状态
sudo systemctl status frontend
```

### Step 4: 验证部署

```bash
# 测试后端 API
curl http://localhost:8000/api/marketplace/stats

# 测试前端（在浏览器中访问）
# http://104.154.208.245:5173/
```

---

## 🎨 使用指南

### 卖家流程

1. **上架资源**
   - 点击 "My Resources" 标签
   - 点击 "List New Resource"
   - 填写模型信息、定价、配额等
   - 点击 "Create Listing"

2. **管理资源**
   - 查看销售统计（收入、订单数、评分）
   - 编辑价格和描述
   - 暂停/激活资源
   - 删除资源

3. **查看收益**
   - "Transactions" 标签查看销售记录
   - 每笔交易85%收入自动到账
   - Credit余额可用于购买其他资源

### 买家流程

1. **浏览市场**
   - 点击 "Marketplace" 标签
   - 使用搜索和筛选找到所需资源
   - 对比价格、评分、折扣

2. **购买资源**
   - 点击资源卡片
   - 输入购买金额
   - 查看将获得的tokens数量
   - 确认购买（使用Credit支付）

3. **使用资源**
   - 购买后tokens自动到账
   - 可在Chat界面使用相应模型
   - "Transactions" 查看使用情况

---

## 🔧 技术架构

### 数据库模型

新增4个表：

1. **resource_listings** - 资源列表
   - 模型信息、定价、库存
   - 卖家信息、状态
   - 统计数据（销量、评分）

2. **resource_transactions** - 交易记录
   - 买卖双方、交易金额
   - Token购买量和使用情况
   - 费用分成明细

3. **resource_reviews** - 评价
   - 评分（总体、速度、可靠性、性价比）
   - 评论内容
   - 验证状态

4. **api_key_vault** - API密钥保管
   - 加密存储（待实现）
   - 配额跟踪
   - 验证状态

### API 路由

新增 `/api/marketplace` 路由组：

```
GET  /api/marketplace/stats                 # 市场统计
GET  /api/marketplace/listings              # 获取资源列表
GET  /api/marketplace/my-listings           # 我的资源
POST /api/marketplace/listings              # 创建资源
PATCH /api/marketplace/listings/{id}        # 更新资源
DELETE /api/marketplace/listings/{id}       # 删除资源
POST /api/marketplace/purchase              # 购买资源
GET  /api/marketplace/transactions          # 交易记录
POST /api/marketplace/reviews               # 创建评价
GET  /api/marketplace/reviews/{listing_id}  # 获取评价
```

### 前端组件

3个新组件：

1. **MarketplacePanel.tsx** - 市场大厅
2. **MyResourcesPanel.tsx** - 资源管理
3. **ResourceTransactionsPanel.tsx** - 交易历史

---

## 📊 市场统计示例

```json
{
  "total_listings": 15,
  "total_sellers": 8,
  "total_transactions": 42,
  "total_volume": 1234.56,
  "avg_discount": 25.3,
  "active_models": 12
}
```

---

## 🚨 常见问题

### Q: 如果后端启动失败？

```bash
# 查看详细日志
sudo journalctl -u backend -n 100

# 常见问题：
# 1. 数据库连接失败 - 检查 DATABASE_URL
# 2. 导入错误 - 确保所有新模型文件存在
# 3. 端口占用 - 检查 8000 端口
```

### Q: 前端编译失败？

```bash
# 检查 TypeScript 错误
cd ~/api-billing-platform/client
npm run build

# 常见问题：
# 1. 类型错误 - 检查 interface 定义
# 2. 导入错误 - 确保所有组件文件存在
```

### Q: 购买后余额没变化？

- 检查 Credit 系统是否正常工作
- 查看后端日志中的交易记录
- 确认 `credit_service.py` 正常运行

---

## 🎯 下一步优化

### Phase 2 功能（可选）

1. **智能路由系统**
   - 用户发送AI请求时自动选择最优资源
   - 基于价格/速度/可靠性的智能算法

2. **API密钥托管**
   - 卖家API Key加密存储
   - 平台代理所有请求
   - 防止卖家跑路

3. **高级统计**
   - 价格走势图表
   - 市场趋势分析
   - 卖家dashboard优化

4. **自动化功能**
   - 自动补货提醒
   - 价格自动调整
   - 智能推荐系统

---

## ✅ 部署检查清单

- [ ] 代码已拉取到VM
- [ ] 后端服务重启成功
- [ ] 前端构建并重启成功
- [ ] 数据库表自动创建
- [ ] 可以访问 Marketplace 标签
- [ ] 可以创建资源列表
- [ ] 可以购买资源
- [ ] Credit 正确扣除和增加
- [ ] 交易记录正确显示

---

## 🎉 完成！

现在你的平台已经具备完整的 **API 资源交易市场** 功能！

用户可以：
- 🛒 购买便宜的API资源
- 💰 出售闲置配额赚钱
- 📊 实时查看市场数据
- ⭐ 评价和选择优质卖家

**祝贺你成功搭建了API界的"共享经济平台"！** 🚀

