# AIGC 漫画创作助手 - UI/UX 设计文档

## 1. 界面布局 (Layout)

### 1.1 概览
采用 **左-中-右** 经典生产力工具布局，类似 Figma 或 PowerPoint。

### 1.2 左侧栏：大纲与资产 (Outline & Assets)
- **Script Tab**: 显示原始剧本，支持高亮当前正在制作的段落。
- **Layouts Tab**: 预设的分镜模板库，拖拽上画布。
- **Characters Tab**: 角色参考图库，拖拽图片到 Prompt 输入框可作为参考底图。

### 1.3 中间区：无限画布 (Infinite Canvas)
- **Page View**: 显示当前的漫画页。
- **Panels**: 每一个格子是一个交互容器。
  - **点击格子**: 选中该分镜，右侧属性栏显示该分镜的生成参数。
  - **双击文字**: 编辑气泡台词。
- **工具栏 (Top Toolbar)**: 移动, 选区, 添加气泡, 笔刷(简单的修补)。

### 1.4 右侧栏：生成与属性 (Generation & Properties)
- **Prompt 面板**:
  - Positive Prompt (AI 自动填充 + 用户修改)
  - Negative Prompt
- **Control 面板**:
  - 角色选择 (应用 LoRA)
  - 构图参考图 (ControlNet Depth/OpenPose)
- **生成按钮**: "Generate Panel" (带有消耗计算/Loading 进度)。
- **历史记录**: 当前格子生成的历史版本，可回滚。

## 2. 关键交互 (Key Interactions)

### 2.1 智能拆解 (Auto-Split)
1. 用户在 Script Tab 选中一段话。
2. 拖拽到画布空白处。
3. 系统自动创建一个新的 Panel，并预填 Prompt。

### 2.2 角色一致性 (Consistency)
1. 在右侧栏选择 "Active Character: Alice"。
2. 生成时，系统自动在 Prompt 前置加入 Alice 的 Trigger Words (e.g., "1girl, pink hair, blue eyes, white dress")。
3. 可选：自动挂载对应的 LoRA 模型。

### 2.3 气泡编辑
1. 选中气泡，周围出现控制点 (Resize)。
2. 气泡尾巴 (Tail) 可拖拽指向说话的角色。

## 3. 视觉风格
- **Dark Mode**: 默认深色，突出画面的色彩。
- **Accent Color**: 使用 **青色 (Cyan)** 作为高亮色，区别于小说模块的紫色。
