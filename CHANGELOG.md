# 变更日志

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范。

---

## [未发布]

### 新增
- 初始化项目框架
- AI SDK 核心集成 (OpenAI, Anthropic, Google)
- Ollama 本地模型支持
- 基础对话功能
- 模型管理界面
- 工作流编辑器基础
- 小说模块路由
- 漫画模块路由
- 音频模块路由
- 视频模块路由
- **Chat Store** - 完整的聊天会话和消息持久化管理
- **Model Store** - AI 模型提供商配置管理
- **Provider Factory** - 动态创建 AI SDK provider 实例
- **useChatSession Hook** - 增强版聊天 Hook，支持流式生成和消息持久化
- **StreamingText 组件** - 流式文本显示，支持打字机效果和 Markdown 渲染
- **ChatMessage 组件** - 增强版聊天消息组件，支持复制、重新生成、点赞
- **OllamaManager 组件** - Ollama 服务状态检测和模型管理
- **useOllama Hook** - Ollama 服务管理，支持模型拉取和删除
- **Tauri 命令封装** - 类型安全的 Tauri 命令调用接口
- **Storage 后端命令** - Rust 后端文件读写、设置管理等功能
- **EnhancedChatPage** - 增强版聊天页面，集成新的 Store 系统

### 文档
- 产品设计文档 (PRD)
- 技术架构文档
- UI/UX 设计系统
- 产品路线图
- API 参考文档
- 贡献指南
- 小说/漫画/音频/视频模块文档
- 游戏开发模块文档

---

## [0.1.0] - 2026-02-28 (计划)

### 新增
- Alpha 版本首次发布
- 基础对话功能完善
- 模型管理完善
- 流式响应 UI
- 会话历史持久化

---

## 版本规划

| 版本 | 预计日期 | 主要内容 |
|------|---------|---------|
| v0.1.0 | 2026-02-28 | Alpha - 基础对话、模型管理 |
| v0.2.0 | 2026-04-30 | Beta - 工具调用、工作流 |
| v0.3.0 | 2026-06-30 | Novel Preview - 小说编辑器 |
| v0.4.0 | 2026-08-15 | Novel GA - 小说助手完整版 |
| v0.5.0 | 2026-09-30 | Comic Preview - 漫画编辑器 |
| v0.6.0 | 2026-11-30 | Audio Preview - 音频编辑器 |
| v0.7.0 | 2027-01-31 | Video Preview - 视频编辑器 |
| v1.0.0 | 2027-03-31 | GA - 正式版发布 |
