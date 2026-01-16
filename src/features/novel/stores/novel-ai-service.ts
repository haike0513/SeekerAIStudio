/**
 * 小说 AI 生成服务
 * 
 * 提供 AI 辅助小说创作的各种功能：
 * - 想法扩展
 * - 大纲生成
 * - 角色创建
 * - 章节写作
 * - 内容润色
 */

import { streamText } from "ai";
import { getLanguageModel } from "@/lib/ai/provider-factory";
import type {
    NovelIdea,
    NovelCharacter,
    ChapterOutline,
    NovelGenre,
    WritingStyle,
    NovelLanguage,
    WorldSetting,
} from "./enhanced-novel-store";

// ============ 类型定义 ============

export interface GenerationOptions {
    modelId: string;
    language?: NovelLanguage;
    onProgress?: (text: string) => void;
    abortSignal?: AbortSignal;
}

export interface OutlineGenerationInput {
    idea: NovelIdea;
    genre: NovelGenre;
    chapterCount?: number;
    targetWordCount?: number;
}

export interface ChapterGenerationInput {
    projectTitle: string;
    genre: NovelGenre;
    writingStyle: WritingStyle;
    outline: ChapterOutline;
    previousContext?: string;
    characters: NovelCharacter[];
    worldSetting?: WorldSetting;
    wordCountTarget?: number;
}

// ============ Prompt 模板 ============

const PROMPTS = {
    expandIdea: (idea: Partial<NovelIdea>, genre: NovelGenre, language: NovelLanguage) => {
        const lang = language === "zh-CN" ? "中文" : language === "ja-JP" ? "日语" : "英文";
        return `你是一位资深的小说策划专家。请根据以下初步想法，帮助完善一个${genre === "fantasy" ? "奇幻" : genre === "scifi" ? "科幻" : genre === "romance" ? "言情" : genre === "mystery" ? "悬疑" : genre === "wuxia" ? "武侠" : genre === "xianxia" ? "仙侠" : genre === "xuanhuan" ? "玄幻" : ""}小说的核心创意。

用户的初步想法：
${idea.premise || "暂无"}

请用${lang}输出以下内容（JSON 格式）：
{
  "premise": "核心前提（一句话概括故事的核心冲突和吸引力）",
  "theme": "主题（故事想要探讨的深层主题）",
  "setting": "背景设定（时代、地点、世界观等）",
  "conflict": "核心冲突（推动故事发展的主要矛盾）",
  "targetAudience": "目标读者（适合什么样的读者群体）",
  "hooks": ["卖点1", "卖点2", "卖点3"]
}

只输出 JSON，不要其他内容。`;
    },

    generateOutline: (input: OutlineGenerationInput, language: NovelLanguage) => {
        const lang = language === "zh-CN" ? "中文" : language === "ja-JP" ? "日语" : "英文";
        const chapterCount = input.chapterCount || 10;

        return `你是一位经验丰富的小说大纲策划师。请根据以下小说创意，生成一个完整的章节大纲。

## 小说信息
- 类型：${input.genre}
- 核心前提：${input.idea.premise}
- 主题：${input.idea.theme}
- 背景设定：${input.idea.setting}
- 核心冲突：${input.idea.conflict}
${input.targetWordCount ? `- 目标总字数：${input.targetWordCount}字` : ""}

## 要求
1. 生成 ${chapterCount} 个章节的大纲
2. 每章包含：标题、摘要、关键事件
3. 遵循三幕剧结构（开端-发展-高潮-结局）
4. 确保情节连贯、冲突递进、高潮迭起
5. 用${lang}输出

请输出 JSON 数组格式：
[
  {
    "title": "第一章：章节标题",
    "summary": "章节摘要（100-200字）",
    "keyEvents": ["关键事件1", "关键事件2", "关键事件3"]
  }
]

只输出 JSON 数组，不要其他内容。`;
    },

    generateCharacters: (idea: NovelIdea, genre: NovelGenre, count: number, language: NovelLanguage) => {
        const lang = language === "zh-CN" ? "中文" : language === "ja-JP" ? "日语" : "英文";

        return `你是一位擅长角色设计的小说作家。请根据以下小说创意，设计 ${count} 个核心角色。

## 小说信息
- 类型：${genre}
- 核心前提：${idea.premise}
- 背景设定：${idea.setting}
- 核心冲突：${idea.conflict}

## 要求
1. 包含主角、反派和重要配角
2. 每个角色都要有鲜明的性格特点和明确的动机
3. 角色之间要有张力和关系网络
4. 用${lang}输出

请输出 JSON 数组格式：
[
  {
    "name": "角色名",
    "role": "protagonist/antagonist/supporting",
    "age": "年龄",
    "gender": "性别",
    "personality": "性格特点描述",
    "background": "背景故事",
    "motivation": "核心动机",
    "arc": "角色成长弧线",
    "relationships": "与其他角色的关系"
  }
]

只输出 JSON 数组，不要其他内容。`;
    },

    generateWorldSetting: (idea: NovelIdea, genre: NovelGenre, language: NovelLanguage) => {
        const lang = language === "zh-CN" ? "中文" : language === "ja-JP" ? "日语" : "英文";

        return `你是一位世界观架构师。请根据以下小说创意，设计详细的世界观设定。

## 小说信息
- 类型：${genre}
- 核心前提：${idea.premise}
- 背景设定：${idea.setting}

## 要求
1. 创建一个独特且自洽的世界观
2. 包含地理、历史、社会、力量体系等方面
3. 世界观要能支撑故事的发展
4. 用${lang}输出

请输出 JSON 格式：
{
  "overview": "世界观概述",
  "geography": "地理环境",
  "history": "历史背景",
  "society": "社会结构",
  "magic": "力量/魔法体系（如果有）",
  "technology": "科技水平",
  "rules": ["世界规则1", "世界规则2", "世界规则3"]
}

只输出 JSON，不要其他内容。`;
    },

    writeChapter: (input: ChapterGenerationInput, language: NovelLanguage) => {
        const lang = language === "zh-CN" ? "中文" : language === "ja-JP" ? "日语" : "英文";
        const styleGuide = {
            literary: "文学性强，注重修辞和意境",
            popular: "通俗易懂，节奏明快",
            suspenseful: "悬念迭起，扣人心弦",
            humorous: "幽默风趣，轻松愉快",
            poetic: "诗意盎然，语言优美",
            concise: "简洁有力，干净利落",
        };

        const characterInfo = input.characters.map((c) =>
            `${c.name}（${c.role}）：${c.personality}`
        ).join("\n");

        return `你是一位才华横溢的小说作家。请根据以下信息，撰写一个精彩的章节。

## 小说信息
- 书名：${input.projectTitle}
- 类型：${input.genre}
- 写作风格：${styleGuide[input.writingStyle]}

## 角色信息
${characterInfo}

## 本章大纲
- 标题：${input.outline.title}
- 摘要：${input.outline.summary}
- 关键事件：${input.outline.keyEvents.join("、")}

${input.previousContext ? `## 前情回顾\n${input.previousContext}\n` : ""}

${input.worldSetting ? `## 世界观设定\n${input.worldSetting.overview}\n` : ""}

## 写作要求
1. 用${lang}写作
2. 字数目标：${input.wordCountTarget || 3000}字左右
3. 遵循"展示而非讲述"的原则
4. 包含生动的对话和场景描写
5. 章节开头要能抓住读者注意力
6. 结尾要有悬念或转折

请直接输出章节正文，不需要额外说明。`;
    },

    polishContent: (content: string, style: WritingStyle, language: NovelLanguage) => {
        const lang = language === "zh-CN" ? "中文" : language === "ja-JP" ? "日语" : "英文";

        return `你是一位专业的小说编辑。请润色以下内容，提升文字质量。

## 原文
${content}

## 润色要求
1. 保持用${lang}
2. 优化语言表达，使其更加流畅
3. 增强描写的生动性
4. 确保逻辑通顺
5. 保持原有情节和风格不变

请直接输出润色后的内容，不需要额外说明。`;
    },

    continueWriting: (content: string, hint?: string, wordCount?: number) => {
        return `你是一位小说作家。请继续以下内容的写作。

## 现有内容
${content}

${hint ? `## 写作提示\n${hint}\n` : ""}

## 要求
1. 自然衔接前文
2. 继续发展情节
3. 字数约 ${wordCount || 500} 字
4. 保持风格一致

请直接输出续写内容，不需要额外说明。`;
    },
};

// ============ 生成函数 ============

/** 扩展创意想法 */
export async function expandIdea(
    idea: Partial<NovelIdea>,
    genre: NovelGenre,
    options: GenerationOptions
): Promise<NovelIdea & { hooks: string[] }> {
    const model = getLanguageModel(options.modelId);
    if (!model) throw new Error("模型不可用");

    const language = options.language || "zh-CN";
    const prompt = PROMPTS.expandIdea(idea, genre, language);

    let fullText = "";

    const result = await streamText({
        model,
        messages: [{ role: "user", content: prompt }],
        abortSignal: options.abortSignal,
        onChunk: ({ chunk }) => {
            if (chunk.type === "text-delta") {
                const text = (chunk as any).text || (chunk as any).textDelta || "";
                fullText += text;
                options.onProgress?.(fullText);
            }
        },
    });

    const finalText = await result.text;

    // 解析 JSON
    const jsonMatch = finalText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("无法解析生成结果");

    return JSON.parse(jsonMatch[0]);
}

/** 生成大纲 */
export async function generateOutline(
    input: OutlineGenerationInput,
    options: GenerationOptions
): Promise<Omit<ChapterOutline, "id">[]> {
    const model = getLanguageModel(options.modelId);
    if (!model) throw new Error("模型不可用");

    const language = options.language || "zh-CN";
    const prompt = PROMPTS.generateOutline(input, language);

    let fullText = "";

    const result = await streamText({
        model,
        messages: [{ role: "user", content: prompt }],
        abortSignal: options.abortSignal,
        onChunk: ({ chunk }) => {
            if (chunk.type === "text-delta") {
                const text = (chunk as any).text || (chunk as any).textDelta || "";
                fullText += text;
                options.onProgress?.(fullText);
            }
        },
    });

    const finalText = await result.text;

    // 解析 JSON
    const jsonMatch = finalText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("无法解析生成结果");

    const outline = JSON.parse(jsonMatch[0]);

    return outline.map((item: any, index: number) => ({
        order: index + 1,
        title: item.title,
        summary: item.summary,
        keyEvents: item.keyEvents || [],
        characters: [],
    }));
}

/** 生成角色 */
export async function generateCharacters(
    idea: NovelIdea,
    genre: NovelGenre,
    count: number,
    options: GenerationOptions
): Promise<Omit<NovelCharacter, "id">[]> {
    const model = getLanguageModel(options.modelId);
    if (!model) throw new Error("模型不可用");

    const language = options.language || "zh-CN";
    const prompt = PROMPTS.generateCharacters(idea, genre, count, language);

    let fullText = "";

    const result = await streamText({
        model,
        messages: [{ role: "user", content: prompt }],
        abortSignal: options.abortSignal,
        onChunk: ({ chunk }) => {
            if (chunk.type === "text-delta") {
                const text = (chunk as any).text || (chunk as any).textDelta || "";
                fullText += text;
                options.onProgress?.(fullText);
            }
        },
    });

    const finalText = await result.text;

    // 解析 JSON
    const jsonMatch = finalText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("无法解析生成结果");

    return JSON.parse(jsonMatch[0]);
}

/** 生成世界观设定 */
export async function generateWorldSetting(
    idea: NovelIdea,
    genre: NovelGenre,
    options: GenerationOptions
): Promise<WorldSetting> {
    const model = getLanguageModel(options.modelId);
    if (!model) throw new Error("模型不可用");

    const language = options.language || "zh-CN";
    const prompt = PROMPTS.generateWorldSetting(idea, genre, language);

    let fullText = "";

    const result = await streamText({
        model,
        messages: [{ role: "user", content: prompt }],
        abortSignal: options.abortSignal,
        onChunk: ({ chunk }) => {
            if (chunk.type === "text-delta") {
                const text = (chunk as any).text || (chunk as any).textDelta || "";
                fullText += text;
                options.onProgress?.(fullText);
            }
        },
    });

    const finalText = await result.text;

    // 解析 JSON
    const jsonMatch = finalText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("无法解析生成结果");

    return JSON.parse(jsonMatch[0]);
}

/** 写章节 */
export async function writeChapter(
    input: ChapterGenerationInput,
    options: GenerationOptions
): Promise<string> {
    const model = getLanguageModel(options.modelId);
    if (!model) throw new Error("模型不可用");

    const language = options.language || "zh-CN";
    const prompt = PROMPTS.writeChapter(input, language);

    let fullText = "";

    const result = await streamText({
        model,
        messages: [{ role: "user", content: prompt }],
        abortSignal: options.abortSignal,
        onChunk: ({ chunk }) => {
            if (chunk.type === "text-delta") {
                const text = (chunk as any).text || (chunk as any).textDelta || "";
                fullText += text;
                options.onProgress?.(fullText);
            }
        },
    });

    return await result.text;
}

/** 润色内容 */
export async function polishContent(
    content: string,
    style: WritingStyle,
    options: GenerationOptions
): Promise<string> {
    const model = getLanguageModel(options.modelId);
    if (!model) throw new Error("模型不可用");

    const language = options.language || "zh-CN";
    const prompt = PROMPTS.polishContent(content, style, language);

    let fullText = "";

    const result = await streamText({
        model,
        messages: [{ role: "user", content: prompt }],
        abortSignal: options.abortSignal,
        onChunk: ({ chunk }) => {
            if (chunk.type === "text-delta") {
                const text = (chunk as any).text || (chunk as any).textDelta || "";
                fullText += text;
                options.onProgress?.(fullText);
            }
        },
    });

    return await result.text;
}

/** 继续写作 */
export async function continueWriting(
    content: string,
    options: GenerationOptions & { hint?: string; wordCount?: number }
): Promise<string> {
    const model = getLanguageModel(options.modelId);
    if (!model) throw new Error("模型不可用");

    const prompt = PROMPTS.continueWriting(content, options.hint, options.wordCount);

    let fullText = "";

    const result = await streamText({
        model,
        messages: [{ role: "user", content: prompt }],
        abortSignal: options.abortSignal,
        onChunk: ({ chunk }) => {
            if (chunk.type === "text-delta") {
                const text = (chunk as any).text || (chunk as any).textDelta || "";
                fullText += text;
                options.onProgress?.(fullText);
            }
        },
    });

    return await result.text;
}

export default {
    expandIdea,
    generateOutline,
    generateCharacters,
    generateWorldSetting,
    writeChapter,
    polishContent,
    continueWriting,
};
