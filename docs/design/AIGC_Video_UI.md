# AIGC 视频创作助手 - UI/UX 设计文档

## 1. 界面布局 (Layout)

### 1.1 概览
采用现代视频剪辑软件布局 (如 CapCut PC, Premiere Pro)。黑色系背景，强调画面内容。

### 1.2 上半部分：预览与资源
- **左侧：资源库 (Media Pool)**
  - **Generated**: 刚刚生成的视频片段。
  - **Uploads**: 用户上传的素材。
  - **Keyframes**: 静态关键帧图片。
- **中间：播放器 (Player)**
  - 预览当前时间轴的合成画面。
  - 支持 Play/Pause, Frame Step 操作。
- **右侧：生成控制面板 (Generator)**
  - **Prompt 输入框**: 描述画面内容。
  - **Params**: 设定 Seed, Steps, Motion Bucket Id。
  - **History**: 生成历史记录列表。

### 1.3 下半部分：时间轴 (Timeline)
- **Video Track**: 显示缩略图的视频条。
- **Audio Track**: 显示波形的音频条。
- **操作栏**: Split (剪切), Delete, Transition 等工具。

## 2. 关键交互 (Key Interactions)

### 2.1 I2V 工作流 (Image-to-Video)
1. 在资源库右键点击一张图片 -> "Animate this"。
2. 图片自动填入 Generator 的参考图槽位。
3. 设置 "Camera Zoom In"。
4. 点击 Generate。
5. 结果出现在 Generated 列表，可直接拖入时间轴。

### 2.2 扩展视频 (Video Extension)
1. 选中时间轴上的一个片段，将鼠标移动到末尾。
2. 出现 "Extend with AI" 按钮。
3. 点击后，AI 基于该片段的最后一帧继续生成后续内容。

## 3. 视觉风格
- **Neon Highlights**: 选中状态使用高亮边框。
- **Dark UI**: 深灰背景 (#1e1e1e)，减少视觉干扰。
