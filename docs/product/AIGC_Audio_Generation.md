# AIGC 音频创作助手 (AIGC Audio Studio) - 产品需求文档 (PRD)

## 1. 产品概述
**AIGC 音频创作助手** 是 SeekerAIStudio 的听觉叙事模块，旨在为创作者提供全流程的音频内容生产工具。它结合 Text-to-Speech (TTS)、Text-to-Audio (SFX) 和 AI Music Generation 技术，帮助用户制作广播剧、有声书、播客和游戏音效。

## 2. 目标用户
- **有声书主播/制作人**: 需要多角色配音和背景音效。
- **视频创作者**: 需要无版权背景音乐 (BGM) 和音效。
- **游戏开发者**: 快速生成资产。

## 3. 核心功能模块

### 3.1 智能语音合成 (Smart TTS Studio)
- **多角色分配**: 自动识别文本中的对话，分配给不同的 AI 语音模型（如 "旁白-深沉男声", "女主-甜美"）。
- **情感控制**: 支持调整语音的情感（开心、悲伤、愤怒）和语速。
- **语音克隆 (Voice Cloning)**: 允许用户录制自己的声音作为参考音频 (Few-shot learning)。

### 3.2 智能音效生成 (AI Sound Effects)
- **文本转音效 (Text-to-SFX)**: 输入 "footsteps on graved", "laser gun shot"，生成对应的音效文件。
- **环境音生成**: 输入 "rainy cafe ambience"，生成循环的环境底噪。

### 3.3 背景音乐生成 (AI Music Generation)
- **风格化生成**: 选择情绪 (Happy, Sad, Epic) 和乐器 (Piano, Synth)，生成 BGM。
- **时长控制**: 指定生成的音乐时长，支持 Loop 模式。

### 3.4 混音编辑器 (Timeline Mixer)
- **多轨编辑**: 独立的 Voice, SFX, Music 轨道。
- **自动化**: 自动闪避 (Auto-ducking)，当人声出现时自动降低背景音乐音量。
- **导出**: 支持 MP3, WAV, FLAC 格式导出，或导出为 工程文件。

## 4. 用户流程 (User Flow)
1. **创建项目**: 选择项目类型（有声书 / 播客 / 音乐）。
2. **导入脚本**: 粘贴文本，系统自动识别角色。
3. **分配声音**: 为每个角色选择 Voice Actor。
4. **生成语音**: 批量生成 TTS 片段，排列在时间轴上。
5. **添加音效**: 选中特定时间点，输入 Prompt 生成音效 (e.g., "door slam")。
6. **生成配乐**: 描述氛围，生成 BGM 并铺底。
7. **调整混音**: 调节各轨道音量平衡。
8. **导出成品**。

## 5. 差异化优势
- **全栈音频生成**: 可以在一个 App 内完成人声、音效、音乐的所有生成。
- **本地隐私**: 支持本地运行 TTS (如 VITS, ChatTTS) 和 MusicGen 模型，无需上传数据。
