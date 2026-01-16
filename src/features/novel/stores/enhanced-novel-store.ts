/**
 * 增强版小说 Store
 * 
 * 支持：
 * - 多项目管理
 * - 本地持久化
 * - AI 生成功能
 * - 导出功能
 */

import { createStore, produce } from "solid-js/store";
import { makePersisted } from "@solid-primitives/storage";
import { nanoid } from "nanoid";

// ============ 类型定义 ============

/** 小说类型/风格 */
export type NovelGenre =
    | "fantasy"
    | "scifi"
    | "romance"
    | "mystery"
    | "thriller"
    | "horror"
    | "literary"
    | "historical"
    | "wuxia"      // 武侠
    | "xianxia"    // 仙侠
    | "xuanhuan"   // 玄幻
    | "other";

/** 小说语言 */
export type NovelLanguage = "zh-CN" | "en-US" | "ja-JP";

/** 写作风格 */
export type WritingStyle =
    | "literary"      // 文学性
    | "popular"       // 通俗
    | "suspenseful"   // 悬疑
    | "humorous"      // 幽默
    | "poetic"        // 诗意
    | "concise";      // 简洁

/** 书籍元数据 */
export interface NovelMetadata {
    title: string;
    subtitle?: string;
    author: string;
    genre: NovelGenre;
    language: NovelLanguage;
    description: string;
    tags: string[];
    coverImage?: string;
    targetWordCount?: number;
    createdAt: number;
    updatedAt: number;
}

/** 创意想法 */
export interface NovelIdea {
    premise: string;          // 核心前提/概念
    theme: string;            // 主题
    setting: string;          // 背景设定
    conflict: string;         // 核心冲突
    targetAudience?: string;  // 目标读者
    inspiration?: string;     // 灵感来源
}

/** 角色 */
export interface NovelCharacter {
    id: string;
    name: string;
    role: "protagonist" | "antagonist" | "supporting" | "minor";
    age?: string;
    gender?: string;
    appearance?: string;
    personality: string;
    background: string;
    motivation: string;
    arc?: string;            // 角色成长弧线
    relationships?: string;  // 与其他角色的关系
}

/** 世界观/设定 */
export interface WorldSetting {
    overview: string;
    geography?: string;
    history?: string;
    society?: string;
    magic?: string;         // 魔法/力量体系
    technology?: string;
    rules?: string[];       // 世界规则
}

/** 章节大纲 */
export interface ChapterOutline {
    id: string;
    order: number;
    title: string;
    summary: string;
    keyEvents: string[];
    characters: string[];    // 出场角色 ID
    wordCountTarget?: number;
}

/** 章节内容 */
export interface NovelChapter {
    id: string;
    outlineId: string;       // 关联的大纲 ID
    order: number;
    title: string;
    content: string;
    wordCount: number;
    status: "outline" | "draft" | "revision" | "final";
    notes?: string;
    lastModified: number;
}

/** 小说项目 */
export interface NovelProject {
    id: string;
    metadata: NovelMetadata;
    idea: NovelIdea;
    characters: NovelCharacter[];
    worldSetting?: WorldSetting;
    outline: ChapterOutline[];
    chapters: NovelChapter[];
    currentChapterId: string | null;
    status: "ideation" | "outlining" | "writing" | "editing" | "completed";
    writingStyle: WritingStyle;
}

/** Store 状态 */
export interface NovelStoreState {
    projects: NovelProject[];
    currentProjectId: string | null;
}

// ============ 默认值 ============

const defaultIdea: NovelIdea = {
    premise: "",
    theme: "",
    setting: "",
    conflict: "",
};

const defaultMetadata: NovelMetadata = {
    title: "未命名小说",
    author: "作者",
    genre: "fantasy",
    language: "zh-CN",
    description: "",
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
};

// ============ Store 实现 ============

const [state, setState] = makePersisted(
    createStore<NovelStoreState>({
        projects: [],
        currentProjectId: null,
    }),
    { name: "novel-projects" }
);

// ============ 项目管理 ============

/** 创建新项目 */
export function createProject(options?: {
    title?: string;
    genre?: NovelGenre;
    idea?: Partial<NovelIdea>;
}): string {
    const id = nanoid();
    const now = Date.now();

    const project: NovelProject = {
        id,
        metadata: {
            ...defaultMetadata,
            title: options?.title || "未命名小说",
            genre: options?.genre || "fantasy",
            createdAt: now,
            updatedAt: now,
        },
        idea: {
            ...defaultIdea,
            ...options?.idea,
        },
        characters: [],
        outline: [],
        chapters: [],
        currentChapterId: null,
        status: "ideation",
        writingStyle: "popular",
    };

    setState("projects", (projects) => [...projects, project]);
    setState("currentProjectId", id);

    return id;
}

/** 获取当前项目 */
export function getCurrentProject(): NovelProject | null {
    if (!state.currentProjectId) return null;
    return state.projects.find((p) => p.id === state.currentProjectId) || null;
}

/** 获取项目 */
export function getProject(id: string): NovelProject | null {
    return state.projects.find((p) => p.id === id) || null;
}

/** 设置当前项目 */
export function setCurrentProject(id: string): void {
    setState("currentProjectId", id);
}

/** 更新项目 */
export function updateProject(
    id: string,
    updates: {
        metadata?: Partial<NovelMetadata>;
        idea?: Partial<NovelIdea>;
        status?: NovelProject["status"];
        writingStyle?: WritingStyle;
        worldSetting?: WorldSetting;
    }
): void {
    setState(
        "projects",
        (p) => p.id === id,
        produce((project) => {
            if (updates.metadata) {
                Object.assign(project.metadata, updates.metadata);
                project.metadata.updatedAt = Date.now();
            }
            if (updates.idea) {
                Object.assign(project.idea, updates.idea);
            }
            if (updates.status) {
                project.status = updates.status;
            }
            if (updates.writingStyle) {
                project.writingStyle = updates.writingStyle;
            }
            if (updates.worldSetting) {
                project.worldSetting = updates.worldSetting;
            }
        })
    );
}

/** 删除项目 */
export function deleteProject(id: string): void {
    setState("projects", (projects) => projects.filter((p) => p.id !== id));
    if (state.currentProjectId === id) {
        setState("currentProjectId", state.projects[0]?.id || null);
    }
}

// ============ 角色管理 ============

/** 添加角色 */
export function addCharacter(projectId: string, character: Omit<NovelCharacter, "id">): string {
    const id = nanoid();
    setState(
        "projects",
        (p) => p.id === projectId,
        "characters",
        (chars) => [...chars, { ...character, id }]
    );
    return id;
}

/** 更新角色 */
export function updateCharacter(
    projectId: string,
    characterId: string,
    updates: Partial<Omit<NovelCharacter, "id">>
): void {
    setState(
        "projects",
        (p) => p.id === projectId,
        "characters",
        (c) => c.id === characterId,
        produce((character) => {
            Object.assign(character, updates);
        })
    );
}

/** 删除角色 */
export function deleteCharacter(projectId: string, characterId: string): void {
    setState(
        "projects",
        (p) => p.id === projectId,
        "characters",
        (chars) => chars.filter((c) => c.id !== characterId)
    );
}

// ============ 大纲管理 ============

/** 设置大纲 */
export function setOutline(projectId: string, outline: Omit<ChapterOutline, "id">[]): void {
    const outlineWithIds = outline.map((o, index) => ({
        ...o,
        id: nanoid(),
        order: index + 1,
    }));

    setState(
        "projects",
        (p) => p.id === projectId,
        "outline",
        outlineWithIds
    );

    // 同时创建对应的章节
    const chapters: NovelChapter[] = outlineWithIds.map((o) => ({
        id: nanoid(),
        outlineId: o.id,
        order: o.order,
        title: o.title,
        content: "",
        wordCount: 0,
        status: "outline",
        lastModified: Date.now(),
    }));

    setState(
        "projects",
        (p) => p.id === projectId,
        "chapters",
        chapters
    );

    if (chapters.length > 0) {
        setState(
            "projects",
            (p) => p.id === projectId,
            "currentChapterId",
            chapters[0].id
        );
    }
}

/** 添加大纲条目 */
export function addOutlineItem(
    projectId: string,
    item: Omit<ChapterOutline, "id" | "order">
): string {
    const project = getProject(projectId);
    if (!project) return "";

    const id = nanoid();
    const order = project.outline.length + 1;

    const newOutline: ChapterOutline = {
        ...item,
        id,
        order,
    };

    setState(
        "projects",
        (p) => p.id === projectId,
        "outline",
        (outline) => [...outline, newOutline]
    );

    // 创建对应章节
    const chapterId = nanoid();
    const newChapter: NovelChapter = {
        id: chapterId,
        outlineId: id,
        order,
        title: item.title,
        content: "",
        wordCount: 0,
        status: "outline",
        lastModified: Date.now(),
    };

    setState(
        "projects",
        (p) => p.id === projectId,
        "chapters",
        (chapters) => [...chapters, newChapter]
    );

    return id;
}

/** 更新大纲条目 */
export function updateOutlineItem(
    projectId: string,
    outlineId: string,
    updates: Partial<Omit<ChapterOutline, "id">>
): void {
    setState(
        "projects",
        (p) => p.id === projectId,
        "outline",
        (o) => o.id === outlineId,
        produce((item) => {
            Object.assign(item, updates);
        })
    );

    // 同步更新章节标题
    if (updates.title) {
        setState(
            "projects",
            (p) => p.id === projectId,
            "chapters",
            (c) => c.outlineId === outlineId,
            "title",
            updates.title
        );
    }
}

// ============ 章节管理 ============

/** 获取当前章节 */
export function getCurrentChapter(projectId: string): NovelChapter | null {
    const project = getProject(projectId);
    if (!project || !project.currentChapterId) return null;
    return project.chapters.find((c) => c.id === project.currentChapterId) || null;
}

/** 设置当前章节 */
export function setCurrentChapter(projectId: string, chapterId: string): void {
    setState(
        "projects",
        (p) => p.id === projectId,
        "currentChapterId",
        chapterId
    );
}

/** 更新章节内容 */
export function updateChapter(
    projectId: string,
    chapterId: string,
    updates: Partial<Pick<NovelChapter, "content" | "title" | "status" | "notes">>
): void {
    setState(
        "projects",
        (p) => p.id === projectId,
        "chapters",
        (c) => c.id === chapterId,
        produce((chapter) => {
            if (updates.content !== undefined) {
                chapter.content = updates.content;
                chapter.wordCount = countWords(updates.content);
            }
            if (updates.title !== undefined) {
                chapter.title = updates.title;
            }
            if (updates.status !== undefined) {
                chapter.status = updates.status;
            }
            if (updates.notes !== undefined) {
                chapter.notes = updates.notes;
            }
            chapter.lastModified = Date.now();
        })
    );

    // 更新项目修改时间
    setState(
        "projects",
        (p) => p.id === projectId,
        "metadata",
        "updatedAt",
        Date.now()
    );
}

// ============ 工具函数 ============

/** 统计字数（中文和英文） */
export function countWords(text: string): number {
    if (!text) return 0;

    // 中文字符
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;

    // 英文单词
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;

    return chineseChars + englishWords;
}

/** 获取项目总字数 */
export function getProjectWordCount(projectId: string): number {
    const project = getProject(projectId);
    if (!project) return 0;

    return project.chapters.reduce((total, chapter) => total + chapter.wordCount, 0);
}

/** 获取项目进度 */
export function getProjectProgress(projectId: string): {
    completedChapters: number;
    totalChapters: number;
    totalWords: number;
    percentage: number;
} {
    const project = getProject(projectId);
    if (!project) {
        return { completedChapters: 0, totalChapters: 0, totalWords: 0, percentage: 0 };
    }

    const completedChapters = project.chapters.filter(
        (c) => c.status === "final" || c.status === "revision"
    ).length;
    const totalChapters = project.chapters.length;
    const totalWords = getProjectWordCount(projectId);
    const percentage = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0;

    return { completedChapters, totalChapters, totalWords, percentage };
}

/** 获取所有项目（按更新时间排序） */
export function getAllProjects(): NovelProject[] {
    return [...state.projects].sort(
        (a, b) => b.metadata.updatedAt - a.metadata.updatedAt
    );
}

// ============ 导出 ============

export const novelStore = {
    state,
    // 项目
    createProject,
    getCurrentProject,
    getProject,
    setCurrentProject,
    updateProject,
    deleteProject,
    getAllProjects,
    // 角色
    addCharacter,
    updateCharacter,
    deleteCharacter,
    // 大纲
    setOutline,
    addOutlineItem,
    updateOutlineItem,
    // 章节
    getCurrentChapter,
    setCurrentChapter,
    updateChapter,
    // 工具
    countWords,
    getProjectWordCount,
    getProjectProgress,
};

export default novelStore;
