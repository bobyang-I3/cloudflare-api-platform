# 🚨 紧急修复清单

## 问题列表
1. ❌ Dark Mode 不完整 - 只改变部分颜色
2. ❌ Charts 数据一直为 0
3. ❌ ThemeToggle 图标比其他图标大
4. ❌ Chat 没有流式传输
5. ❌ Token exceed 错误频繁

## 修复方案

### 1. Dashboard 完全支持 Dark Mode
- 移除所有硬编码颜色
- 使用 CSS 变量替换所有内联样式
- Header 背景改用变量

### 2. 后端 Charts API 修复
- 检查数据库是否有记录
- 修复 SQL 查询的日期格式问题

### 3. 图标统一
- ThemeToggle: 16px (与 LogOut 一致)

### 4. Chat 流式传输恢复
- 检查 ChatPanel 是否保留流式逻辑

### 5. Token Limit 修复
- 增加上下文窗口大小
- 添加自动截断逻辑

