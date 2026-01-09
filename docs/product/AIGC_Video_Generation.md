# AIGC 视频创作助手 (AIGC Video Studio) - 产品需求文档 (PRD)

## 1. 产品概述
**AIGC 视频创作助手** 是 SeekerAIStudio 的核心视频生成模块，旨在通过 text-to-video 和 image-to-video 技术，让用户无需拍摄即可从剧本生成完整的短视频或微电影。它集成了生成、剪辑、特效于一体。

## 2. 目标用户
- **自媒体创作者**: 快速制作 story-telling 类型的短视频。
- **影视广告从业者**: 制作动态 Storyboard 或 Mood film。
- **教育工作者**: 制作生动的教学演示视频。

## 3. 核心功能模块

### 3.1 剧本转视频 (Script to Video)
- **智能分镜**: 将输入的长文本剧本拆解为一连串的 Shot List (镜头表)。
- **资产生成**: 自动为每个 Shot 生成描述 Prompt，并调用 T2V 模型。

### 3.2 视频生成工作台 (Generation Workbench)
- **Text-to-Video (T2V)**: 输入 Prompt 生成 2-4秒 的短视频。
- **Image-to-Video (I2V)**: 上传一张参考图（或使用 Comic 模块生成的图），让图动起来。
- **运动控制 (Motion Control)**: 控制摄像机运镜 (Pan, Zoom, Tilt) 和运动幅度 (Motion Score)。

### 3.3 非线性编辑器 (NLE Timeline)
- **多轨剪辑**: 视频轨、音频轨、字幕轨。
- **AI 转场**: 自动在两个片段之间生成平滑转场。
- **自动配音配乐**: 联动 Audio 模块，自动生成旁白和 BGM。

### 3.4 视频特效与修复
- **超分 (Upscale)**: 将低分辨率的生成视频放大到 1080p/4k。
- **插帧 (Interpolation)**: 将低帧率视频补帧到 60fps。

## 4. 用户流程 (User Flow)
1. **创建项目**: 设定分辨率 (16:9 或 9:16)。
2. **导入剧本**: 输入故事文本。
3. **生成镜头**: 
   - 步骤 A: 先生成关键帧图片 (T2I) 确认构图。
   - 步骤 B: 将关键帧转为视频 (I2V)。
4. **剪辑**: 将生成的片段拖入时间轴。
5. **精修**: 添加旁白、字幕、音效。
6. **导出**: 合成为 MP4。

## 5. 技术栈与优势
- **模型支持**: 兼容 Stable Video Diffusion (SVD), AnimateDiff, Sora (API), Runway (API)。
- **本地+云端**: 支持本地显卡推理小模型预览，云端渲染高质量成品。
