# SeekerAIStudio 文档中心

欢迎来到 SeekerAIStudio 文档中心！本目录包含项目的所有文档资料。

---

## 📚 文档索引

### 产品文档 (Product)
理解产品愿景、功能规划和用户需求。

| 文档 | 描述 | 状态 |
|------|------|------|
| [PRD.md](product/PRD.md) | 产品设计主文档，包含愿景、市场分析、功能概览 | ✅ 完整 |
| [AIGC_Novel_Generation.md](product/AIGC_Novel_Generation.md) | 小说创作助手产品需求 | ✅ 完整 |
| [AIGC_Comic_Generation.md](product/AIGC_Comic_Generation.md) | 漫画创作助手产品需求 | ✅ 完整 |
| [AIGC_Audio_Generation.md](product/AIGC_Audio_Generation.md) | 音频创作助手产品需求 | ✅ 完整 |
| [AIGC_Video_Generation.md](product/AIGC_Video_Generation.md) | 视频创作助手产品需求 | ✅ 完整 |
| [AIGC_Game_Generation.md](product/AIGC_Game_Generation.md) | 游戏开发助手产品需求 | ✅ 完整 |

### 技术文档 (Technical)
了解系统架构、API 设计和技术实现。

| 文档 | 描述 | 状态 |
|------|------|------|
| [Architecture.md](technical/Architecture.md) | 整体技术架构，包含系统设计和模块划分 | ✅ 完整 |
| [API_Reference.md](technical/API_Reference.md) | 前后端 API 参考文档 | ✅ 完整 |
| [AIGC_Novel_Architecture.md](technical/AIGC_Novel_Architecture.md) | 小说模块技术架构 | ✅ 完整 |
| [AIGC_Comic_Architecture.md](technical/AIGC_Comic_Architecture.md) | 漫画模块技术架构 | ✅ 完整 |
| [AIGC_Audio_Architecture.md](technical/AIGC_Audio_Architecture.md) | 音频模块技术架构 | ✅ 完整 |
| [AIGC_Video_Architecture.md](technical/AIGC_Video_Architecture.md) | 视频模块技术架构 | ✅ 完整 |
| [AIGC_Game_Architecture.md](technical/AIGC_Game_Architecture.md) | 游戏模块技术架构 | 📝 待创建 |

### 设计文档 (Design)
查阅 UI/UX 设计规范和视觉指南。

| 文档 | 描述 | 状态 |
|------|------|------|
| [UIUX.md](design/UIUX.md) | UI/UX 设计系统，包含色彩、排版、组件规范 | ✅ 完整 |
| [AIGC_Novel_UI.md](design/AIGC_Novel_UI.md) | 小说模块 UI 设计 | ✅ 完整 |
| [AIGC_Comic_UI.md](design/AIGC_Comic_UI.md) | 漫画模块 UI 设计 | ✅ 完整 |
| [AIGC_Audio_UI.md](design/AIGC_Audio_UI.md) | 音频模块 UI 设计 | ✅ 完整 |
| [AIGC_Video_UI.md](design/AIGC_Video_UI.md) | 视频模块 UI 设计 | ✅ 完整 |

### 路线图 (Roadmap)
查看项目进度和未来规划。

| 文档 | 描述 | 状态 |
|------|------|------|
| [Roadmap.md](roadmap/Roadmap.md) | 产品路线图，包含里程碑和发布计划 | ✅ 完整 |

### 国际化 (i18n)
了解多语言支持指南。

| 文档 | 描述 | 状态 |
|------|------|------|
| [i18n-guidelines.md](i18n-guidelines.md) | 国际化实施指南 | ✅ 完整 |

---

## 🗂️ 目录结构

```
docs/
├── README.md                 # 本文件 - 文档索引
│
├── product/                  # 产品文档
│   ├── PRD.md                # 产品设计主文档
│   ├── AIGC_Novel_Generation.md
│   ├── AIGC_Comic_Generation.md
│   ├── AIGC_Audio_Generation.md
│   ├── AIGC_Video_Generation.md
│   └── AIGC_Game_Generation.md
│
├── technical/                # 技术文档
│   ├── Architecture.md       # 整体技术架构
│   ├── API_Reference.md      # API 参考
│   ├── AIGC_Novel_Architecture.md
│   ├── AIGC_Comic_Architecture.md
│   ├── AIGC_Audio_Architecture.md
│   ├── AIGC_Video_Architecture.md
│   └── AIGC_Game_Architecture.md
│
├── design/                   # 设计文档
│   ├── UIUX.md               # UI/UX 设计系统
│   ├── AIGC_Novel_UI.md
│   ├── AIGC_Comic_UI.md
│   ├── AIGC_Audio_UI.md
│   └── AIGC_Video_UI.md
│
├── roadmap/                  # 路线图
│   └── Roadmap.md
│
└── i18n-guidelines.md        # 国际化指南
```

---

## 📖 阅读建议

### 如果你是...

#### 产品经理 / 商务人员
1. 从 [PRD.md](product/PRD.md) 开始，了解产品愿景
2. 查看 [Roadmap.md](roadmap/Roadmap.md) 了解发布计划
3. 阅读各模块的产品文档了解详细功能

#### 开发者
1. 从 [Architecture.md](technical/Architecture.md) 了解系统架构
2. 查看 [API_Reference.md](technical/API_Reference.md) 熟悉接口
3. 阅读 [agents.md](../agents.md) 了解开发规范
4. 按需阅读各模块的技术架构文档

#### UI/UX 设计师
1. 从 [UIUX.md](design/UIUX.md) 了解设计系统
2. 查看各模块的 UI 设计文档
3. 参考 Figma 组件库 (链接待添加)

#### 新贡献者
1. 阅读 [README.md](../README.md) 了解项目概况
2. 查看 [CONTRIBUTING.md](../CONTRIBUTING.md) 了解贡献流程
3. 阅读 [agents.md](../agents.md) 了解开发规范

---

## 📝 文档编写规范

### 命名规范
- 产品文档: `AIGC_<模块>_Generation.md`
- 技术文档: `AIGC_<模块>_Architecture.md` 或 `<主题>.md`
- 设计文档: `AIGC_<模块>_UI.md` 或 `<主题>.md`

### 格式规范
- 使用 Markdown 格式
- 标题层级清晰 (H1 仅用于文档标题)
- 包含目录 (对于长文档)
- 代码块标注语言
- 使用表格整理结构化信息
- 添加 Mermaid 图表说明复杂流程

### 版本信息
每个文档应在开头包含:
```markdown
> 版本: x.x
> 最后更新: YYYY-MM-DD
> 状态: Draft / Active / Deprecated
```

---

## 🔄 更新记录

| 日期 | 变更 |
|------|------|
| 2026-01-16 | 创建文档索引 |
| 2026-01-16 | 大幅更新 PRD、Architecture、UIUX、Roadmap |
| 2026-01-16 | 新增 API_Reference、Game_Generation 文档 |
