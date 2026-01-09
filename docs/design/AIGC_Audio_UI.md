# AIGC 音频创作助手 - UI/UX 设计文档

## 1. 界面布局 (Layout)

### 1.1 概览
采用 **数字音频工作站 (DAW)** 风格布局，类似 Audacity 或 Adobe Audition，但简化了专业参数，强调 AI 生成。

### 1.2 左侧栏：资产库 (Assets Library)
- **Voices Tab**: 预设的 AI 语音角色列表，可试听。
- **Generated Tab**: 存放所有已生成的音频片段 (TTS, SFX, Music)。
- **Script Tab**: 剧本试图，点击剧本句子可快速定位到时间轴对应的 Clips。

### 1.3 底部/主区域：多轨时间轴 (Multi-track Timeline)
- **Track Header**: 轨道名称 (e.g., "Narrator", "Background Music")，Mute/Solo 按钮，音量推子。
- **Clips**: 显示波形图 (Waveform)，支持拖拽移动、裁剪边缘。
- **Playhead**: 播放指针，支持空格键播放/暂停。

### 1.4 右侧栏：生成与属性 (Generation & Properties)
- **根据选中对象动态变化**:
  - **未选中**: 显示全局项目设置 (BPM, 采样率)。
  - **选中 Voice Track**: 显示 TTS 输入框、Speaker 选择、Style/Emotion 滑块。
  - **选中 Music Track**: 显示 MusicGen Prompt 输入框、时长设置、风格 Tag。
  - **选中 Clip**: 显示 Clip 属性 (音量增益, 变速)。

## 2. 关键交互 (Key Interactions)

### 2.1 文本驱动生成 (Script-Driven TTS)
1. 用户在 Script Tab 粘贴一段对话。
2. 系统解析：
   ```
   Alice: Hello!
   Bob: Hi there.
   ```
3. 用户点击 "Generate All"。
4. 系统自动在 "Alice Track" 和 "Bob Track" 对应位置生成音频 Clip。

### 2.2 拖拽生成音效 (Drag-to-Generate SFX)
1. 在时间轴空白处划选一个时间范围 (Region Selection)。
2. 弹出悬浮框："Generate Sound..."。
3. 输入 "Dog barking"。
4. AI 生成并自动填充该区域。

## 3. 视觉风格
- **Neon Waveforms**: 波形图采用高饱和度颜色 (绿色/粉色/青色) 在深色背景上，增强科技感。
- **Real-time Visualization**: 播放时显示频谱跳动 (Spectrum Analyzer) 动效。
