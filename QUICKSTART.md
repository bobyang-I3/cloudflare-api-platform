# ⚡ 快速开始指南

5分钟内启动并运行Cloudflare API平台！

## 🚀 一键启动

```bash
cd /Users/chunyiyang/I3/api-billing-platform
./start.sh
```

就这么简单！脚本会自动：
- ✅ 启动后端服务器（端口8000）
- ✅ 启动前端开发服务器（端口5173）
- ✅ 自动打开浏览器

## 📝 首次使用

### 1. 注册账户 (10秒)

访问 `http://localhost:5173`，你会看到登录页面。

- 点击 **"Don't have an account? Register"**
- 填写：
  - 用户名：任意（例如：demo）
  - 邮箱：任意（例如：demo@example.com）
  - 密码：任意（例如：password123）
- 点击 **Register**

### 2. 选择模型 (5秒)

登录后，你会看到聊天界面。

- 在顶部找到 **Select Model** 下拉框
- 你会看到80+个模型，按任务类型分组：
  - 💬 Text Generation（文本生成）
  - 🎨 Text-to-Image（图像生成）
  - 🎤 Automatic Speech Recognition（语音识别）
  - 等等...
- 推荐首次选择：**Llama 3.1 8B Instruct** （默认已选中）

### 3. 开始聊天 (1秒)

- 在底部输入框输入任何内容，例如：
  ```
  Hello! Can you explain what you are?
  ```
- 点击 **📤 Send** 或按 **Enter**
- 等待AI回复（通常1-3秒）
- 查看回复，支持：
  - ✅ Markdown格式
  - ✅ 代码块高亮
  - ✅ Token统计

### 4. 创建多个对话 (可选)

- 点击左侧栏的 **➕ New Chat**
- 每个对话独立保存
- 可随时切换、重命名、删除

### 5. 查看使用统计 (可选)

- 点击顶部的 **📊 Usage** 标签
- 查看：
  - 总Token使用量
  - 按任务类型统计
  - 按模型统计
  - 最近活动日志

## 💡 使用技巧

### 快捷键
- `Enter` - 发送消息
- `Shift + Enter` - 换行

### 模型选择建议

**文本对话**：
- 快速响应：Llama 3.1 8B Instruct
- 高质量：GPT-OSS 120B
- 代码相关：Qwen2.5 Coder 32B

**图像生成**：
- 快速：FLUX.1 Schnell
- 高质量：Leonardo Phoenix 1.0

**语音转文字**：
- 英文：Whisper Large V3 Turbo
- 多语言：Deepgram Nova 3

### 对话管理
- 对话会自动保存
- 刷新页面后会恢复上次对话
- 可折叠侧边栏节省空间（点击◀️）

## 🛠️ 常见问题

### 端口被占用？

```bash
# 脚本会自动处理，但如果仍有问题：
lsof -ti:8000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
./start.sh
```

### 没有启动脚本权限？

```bash
chmod +x /Users/chunyiyang/I3/api-billing-platform/start.sh
```

### 想手动启动？

**后端**：
```bash
cd /Users/chunyiyang/I3/api-billing-platform/server
source venv/bin/activate
python main.py
```

**前端**（新终端）：
```bash
cd /Users/chunyiyang/I3/api-billing-platform/client
npm run dev
```

### 如何停止服务？

- 如果用启动脚本：按 `Ctrl+C`
- 如果手动启动：在各自终端按 `Ctrl+C`

## 📚 下一步

- 📖 阅读 [README.md](README.md) 了解更多功能
- 📄 查看 [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) 了解技术细节
- 🔍 访问 http://localhost:8000/docs 查看API文档

## 🎯 核心功能一览

| 功能 | 描述 | 位置 |
|------|------|------|
| 聊天 | 与80+个AI模型对话 | 💬 Chat标签 |
| 对话管理 | 保存、切换、重命名对话 | 左侧栏 |
| 模型选择 | 按任务类型浏览模型 | Select Model下拉框 |
| 使用统计 | 查看Token使用量和历史 | 📊 Usage标签 |
| API Key | 获取API密钥用于外部调用 | 🔑 API Key标签 |

## 🌟 享受使用！

有问题？查看 README.md 或直接查看代码注释。

祝你使用愉快！🎉
