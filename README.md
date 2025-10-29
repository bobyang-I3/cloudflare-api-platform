# 🚀 Cloudflare API Billing Platform

一个功能完整的 AI API 代理和使用跟踪平台，支持 80+ 个 Cloudflare Workers AI 模型。

## ✨ 主要特性

- 🤖 **80+ AI模型支持** - 文本生成、图像生成、语音识别、文本转语音等
- 💬 **GPT风格聊天界面** - 现代化的对话体验，支持Markdown和代码高亮
- 📚 **对话历史管理** - 创建、保存、切换多个对话
- 📊 **详细使用统计** - 按模型、按任务类型的Token使用追踪
- 🔐 **完整认证系统** - 用户注册、登录、API Key管理
- 🎨 **精美UI设计** - 响应式布局，平滑动画

## 🎯 快速开始

### 前置要求

- Python 3.8+
- Node.js 16+
- npm或yarn

### 安装和运行

#### 方式一：自动启动（推荐）

```bash
cd /Users/chunyiyang/I3/api-billing-platform

# 一键启动（后端+前端）
./start.sh
```

#### 方式二：手动启动

**1. 启动后端服务器**

```bash
cd /Users/chunyiyang/I3/api-billing-platform/server

# 激活虚拟环境
source venv/bin/activate

# 安装依赖（首次运行）
pip install -r requirements.txt

# 启动服务器
python main.py
```

服务器将在 `http://localhost:8000` 运行

**2. 启动前端开发服务器**（新终端）

```bash
cd /Users/chunyiyang/I3/api-billing-platform/client

# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev
```

前端将在 `http://localhost:5173` 运行

**3. 打开浏览器**

访问 `http://localhost:5173` 开始使用！

## 📖 使用指南

### 1. 注册账户

- 访问平台并点击"Register"
- 填写用户名、邮箱和密码
- 点击注册完成账户创建

### 2. 开始聊天

- 登录后默认进入聊天界面
- 从模型选择器中选择你想要的AI模型（80+个可选）
- 模型按任务类型分组：💬 文本生成、🎨 图像生成、🎤 语音识别等
- 输入消息并点击发送

### 3. 管理对话

- 点击"➕ New Chat"创建新对话
- 在左侧栏查看所有对话历史
- 点击对话可切换
- 点击✏️重命名对话
- 点击🗑️删除对话
- 点击◀️折叠/展开侧边栏

### 4. 查看使用统计

- 切换到"📊 Usage"标签页
- 查看总Token使用量
- 按任务类型和模型查看详细统计
- 查看最近的API调用日志
- 选择时间范围（7/30/90/365天）

### 5. 管理API Key

- 切换到"🔑 API Key"标签页
- 查看你的API Key
- 生成新的API Key（如需要）
- 使用API Key进行外部API调用

## 🎨 支持的模型类型

### 💬 文本生成（37个模型）
- GPT-OSS 120B
- Llama 4 Scout 17B
- Llama 3.3 70B / 3.1 8B
- Qwen 2.5 32B / QwQ 32B
- Mistral Small 3.1 24B
- Gemma 3 12B
- 等等...

### 🎨 文本转图像（8个模型）
- FLUX.1 Schnell
- Leonardo Lucid Origin
- Leonardo Phoenix 1.0
- Stable Diffusion XL
- Dreamshaper 8 LCM
- 等等...

### 🎤 语音识别（5个模型）
- Whisper Large V3 Turbo
- Whisper (Tiny EN)
- Deepgram Flux
- Deepgram Nova 3

### 🔊 文本转语音（4个模型）
- Deepgram Aura 2 (EN/ES)
- MeloTTS

### 🔢 文本嵌入（6个模型）
- BGE M3
- BGE Large/Base/Small EN
- EmbeddingGemma 300M
- PLaMo Embedding 1B

### 其他
- 🖼️ 图像转文本
- 🌐 翻译
- 📝 摘要
- 📊 分类
- 🔍 物体检测
- 等等...

## 🔧 技术栈

### Backend
- FastAPI - 现代Python Web框架
- SQLAlchemy - ORM
- SQLite/PostgreSQL - 数据库
- JWT - 身份验证
- Cloudflare Workers AI - AI模型API

### Frontend
- React 18 + TypeScript
- Vite - 构建工具
- CSS3 - 样式和动画

## 📁 项目结构

```
api-billing-platform/
├── server/                    # Backend
│   ├── main.py               # 主应用
│   ├── cloudflare_client.py  # AI客户端
│   ├── routers/              # API路由
│   └── ...
├── client/                    # Frontend
│   ├── src/
│   │   ├── pages/            # 页面组件
│   │   └── components/       # UI组件
│   └── ...
├── README.md                  # 本文件
└── IMPLEMENTATION_COMPLETE.md # 详细实现文档
```

## 📊 API端点

### 认证
- `POST /auth/register` - 注册新用户
- `POST /auth/login` - 用户登录

### AI
- `GET /ai/models` - 获取所有模型列表
- `POST /ai/chat` - 文本聊天
- `POST /ai/chat/stream` - 流式聊天
- `POST /ai/vision-chat` - 图像+文本聊天
- `POST /ai/transcribe` - 音频转文字
- `POST /ai/generate-image` - 文字生成图像

### 使用统计
- `GET /usage/stats` - 获取使用统计
- `GET /usage/logs` - 获取使用日志

完整API文档：启动服务器后访问 `http://localhost:8000/docs`

## 🔐 环境配置

后端配置文件位于 `server/.env`：

```bash
# Cloudflare配置
CLOUDFLARE_API_KEY=your_api_key_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here

# 数据库配置
DATABASE_URL=sqlite:///./app.db

# JWT配置
JWT_SECRET_KEY=your_secret_key_here
```

## 🐛 故障排除

### 端口被占用

如果端口8000或5173被占用：

```bash
# 查找并终止占用端口的进程
lsof -ti:8000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### 依赖安装失败

```bash
# 后端
cd server
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 前端
cd client
rm -rf node_modules package-lock.json
npm install
```

### 数据库问题

```bash
# 重置数据库
cd server
rm app.db
python main.py  # 将自动创建新数据库
```

## 📈 使用统计

系统会自动追踪：
- 总请求数
- Token使用量（输入/输出/总计）
- 按模型的使用分布
- 按任务类型的使用分布
- 每次请求的响应时间

## 🎁 特色功能

### 1. 智能模型选择器
- 按任务类型分组显示
- 显示模型状态（verified/beta/deprecated）
- 实时显示模型描述

### 2. 对话管理
- 自动保存对话历史
- 基于首条消息自动命名
- 页面刷新后恢复上次对话
- localStorage持久化

### 3. GPT风格界面
- 消息气泡设计
- 头像系统（用户/助手）
- Markdown渲染
- 代码块语法高亮
- 平滑动画效果

### 4. 实时反馈
- Loading动画
- Token使用量实时显示
- 错误提示
- 成功反馈

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📞 支持

如有问题，请查阅：
- `IMPLEMENTATION_COMPLETE.md` - 完整实现文档
- API文档：`http://localhost:8000/docs`
- 源代码注释

---

**版本**: 2.0  
**最后更新**: 2025-10-28  
**作者**: AI Assistant

🌟 **Star this project if you find it useful!**
