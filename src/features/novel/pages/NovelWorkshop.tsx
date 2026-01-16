/**
 * 小说创作工作坊页面
 * 
 * 小说创作的完整流程：
 * 1. 创意想法输入
 * 2. AI 辅助扩展
 * 3. 大纲生成
 * 4. 角色设计
 * 5. 章节写作
 * 6. 导出 EPUB
 */

import { Component, Show, For, createSignal, createEffect, onMount } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Lightbulb,
    BookOpen,
    Users,
    FileText,
    Download,
    Sparkles,
    ChevronRight,
    ChevronLeft,
    Loader2,
    PenTool,
} from "lucide-solid";

// Stores & Services
import {
    createProject,
    getCurrentProject,
    updateProject,
    setCurrentProject,
    setOutline,
    addCharacter,
    updateChapter,
    getProjectProgress,
    type NovelProject,
    type NovelGenre,
    type NovelIdea,
} from "../stores/enhanced-novel-store";

import {
    expandIdea,
    generateOutline,
    generateCharacters,
    writeChapter,
    type GenerationOptions,
} from "../stores/novel-ai-service";

import { downloadEpub, getExportPreview } from "../stores/epub-export";
import { getAllAvailableModels, modelStore } from "@/lib/store";

// ============ 类型定义 ============

type WorkshopStep = "idea" | "outline" | "characters" | "writing" | "export";

const STEPS: { id: WorkshopStep; label: string; icon: typeof Lightbulb }[] = [
    { id: "idea", label: "创意构思", icon: Lightbulb },
    { id: "outline", label: "大纲规划", icon: BookOpen },
    { id: "characters", label: "角色设计", icon: Users },
    { id: "writing", label: "章节写作", icon: PenTool },
    { id: "export", label: "导出发布", icon: Download },
];

const GENRES: { value: NovelGenre; label: string }[] = [
    { value: "fantasy", label: "奇幻" },
    { value: "scifi", label: "科幻" },
    { value: "romance", label: "言情" },
    { value: "mystery", label: "悬疑" },
    { value: "thriller", label: "惊悚" },
    { value: "wuxia", label: "武侠" },
    { value: "xianxia", label: "仙侠" },
    { value: "xuanhuan", label: "玄幻" },
    { value: "historical", label: "历史" },
    { value: "literary", label: "文学" },
];

// ============ 主组件 ============

const NovelWorkshop: Component = () => {
    const navigate = useNavigate();
    const params = useParams<{ id?: string }>();

    // 状态
    const [currentStep, setCurrentStep] = createSignal<WorkshopStep>("idea");
    const [isGenerating, setIsGenerating] = createSignal(false);
    const [generatingText, setGeneratingText] = createSignal("");
    const [error, setError] = createSignal<string | null>(null);

    // AI 模型
    const [selectedModelId, setSelectedModelId] = createSignal(
        modelStore.state.defaultProviderId + ":" + modelStore.state.defaultModelId
    );

    // 项目状态
    const project = () => getCurrentProject();

    // 初始化
    onMount(() => {
        if (params.id) {
            setCurrentProject(params.id);
        } else if (!project()) {
            // 创建新项目
            const newId = createProject({ title: "新小说项目" });
            navigate(`/novel/workshop/${newId}`, { replace: true });
        }
    });

    // 根据项目状态设置初始步骤
    createEffect(() => {
        const p = project();
        if (p) {
            if (p.chapters.length > 0 && p.chapters.some(c => c.content)) {
                setCurrentStep("writing");
            } else if (p.outline.length > 0) {
                setCurrentStep("outline");
            } else if (p.idea.premise) {
                setCurrentStep("idea");
            }
        }
    });

    // 获取生成选项
    const getGenerationOptions = (): GenerationOptions => ({
        modelId: selectedModelId(),
        language: project()?.metadata.language || "zh-CN",
        onProgress: setGeneratingText,
    });

    // 步骤导航
    const goToStep = (step: WorkshopStep) => {
        setCurrentStep(step);
        setError(null);
        setGeneratingText("");
    };

    const currentStepIndex = () => STEPS.findIndex(s => s.id === currentStep());

    const canGoNext = () => currentStepIndex() < STEPS.length - 1;
    const canGoPrev = () => currentStepIndex() > 0;

    const goNext = () => {
        if (canGoNext()) {
            goToStep(STEPS[currentStepIndex() + 1].id);
        }
    };

    const goPrev = () => {
        if (canGoPrev()) {
            goToStep(STEPS[currentStepIndex() - 1].id);
        }
    };

    return (
        <div class="min-h-screen bg-background">
            {/* 顶部工具栏 */}
            <header class="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
                <div class="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => navigate("/novel")}>
                            <ChevronLeft class="w-4 h-4 mr-1" />
                            返回
                        </Button>
                        <div>
                            <h1 class="text-lg font-semibold">{project()?.metadata.title || "小说工作坊"}</h1>
                            <p class="text-sm text-muted-foreground">
                                {project()?.metadata.genre ? GENRES.find(g => g.value === project()?.metadata.genre)?.label : ""}
                            </p>
                        </div>
                    </div>

                    <div class="flex items-center gap-3">
                        {/* 模型选择 */}
                        <Select
                            options={getAllAvailableModels()}
                            value={selectedModelId()}
                            onChange={(value: any) => {
                                if (value) {
                                    const modelId = typeof value === 'object' && 'fullId' in value
                                        ? value.fullId
                                        : String(value);
                                    setSelectedModelId(modelId);
                                }
                            }}
                            optionValue={"fullId" as any}
                            optionTextValue={"model.name" as any}
                            placeholder="选择 AI 模型"
                            itemComponent={(props: any) => {
                                const item = props.item.rawValue;
                                return (
                                    <SelectItem item={props.item}>
                                        <span>{item.model.name}</span>
                                    </SelectItem>
                                );
                            }}
                        >
                            <SelectTrigger class="w-[180px]">
                                <SelectValue<any>>
                                    {() => {
                                        const models = getAllAvailableModels();
                                        const selected = models.find(m => m.fullId === selectedModelId());
                                        return <span>{selected?.model.name || "选择模型"}</span>;
                                    }}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent />
                        </Select>

                        <Show when={project()}>
                            <Badge variant="outline">
                                {getProjectProgress(project()!.id).totalWords} 字
                            </Badge>
                        </Show>
                    </div>
                </div>
            </header>

            {/* 步骤指示器 */}
            <div class="border-b bg-muted/30">
                <div class="container mx-auto px-4 py-4">
                    <div class="flex items-center justify-between">
                        <For each={STEPS}>
                            {(step, index) => (
                                <button
                                    class={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentStep() === step.id
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-muted"
                                        }`}
                                    onClick={() => goToStep(step.id)}
                                >
                                    <step.icon class="w-4 h-4" />
                                    <span class="hidden sm:inline">{step.label}</span>
                                    <Show when={index() < STEPS.length - 1}>
                                        <ChevronRight class="w-4 h-4 ml-2 text-muted-foreground" />
                                    </Show>
                                </button>
                            )}
                        </For>
                    </div>
                </div>
            </div>

            {/* 主内容区 */}
            <main class="container mx-auto px-4 py-6">
                {/* 错误提示 */}
                <Show when={error()}>
                    <div class="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg">
                        {error()}
                    </div>
                </Show>

                <Show when={project()}>
                    {/* 步骤内容 */}
                    <Show when={currentStep() === "idea"}>
                        <IdeaStep
                            project={project()!}
                            isGenerating={isGenerating()}
                            generatingText={generatingText()}
                            onGenerate={async (idea) => {
                                setIsGenerating(true);
                                setError(null);
                                try {
                                    const expanded = await expandIdea(idea, project()!.metadata.genre, getGenerationOptions());
                                    updateProject(project()!.id, {
                                        idea: expanded,
                                    });
                                } catch (err) {
                                    setError(err instanceof Error ? err.message : "生成失败");
                                } finally {
                                    setIsGenerating(false);
                                    setGeneratingText("");
                                }
                            }}
                            onUpdate={(updates) => {
                                updateProject(project()!.id, updates);
                            }}
                        />
                    </Show>

                    <Show when={currentStep() === "outline"}>
                        <OutlineStep
                            project={project()!}
                            isGenerating={isGenerating()}
                            generatingText={generatingText()}
                            onGenerate={async () => {
                                setIsGenerating(true);
                                setError(null);
                                try {
                                    const outline = await generateOutline(
                                        {
                                            idea: project()!.idea,
                                            genre: project()!.metadata.genre,
                                            chapterCount: 10,
                                        },
                                        getGenerationOptions()
                                    );
                                    setOutline(project()!.id, outline);
                                    updateProject(project()!.id, { status: "outlining" });
                                } catch (err) {
                                    setError(err instanceof Error ? err.message : "生成失败");
                                } finally {
                                    setIsGenerating(false);
                                    setGeneratingText("");
                                }
                            }}
                        />
                    </Show>

                    <Show when={currentStep() === "characters"}>
                        <CharactersStep
                            project={project()!}
                            isGenerating={isGenerating()}
                            generatingText={generatingText()}
                            onGenerate={async (count) => {
                                setIsGenerating(true);
                                setError(null);
                                try {
                                    const characters = await generateCharacters(
                                        project()!.idea,
                                        project()!.metadata.genre,
                                        count,
                                        getGenerationOptions()
                                    );
                                    // 添加生成的角色
                                    for (const char of characters) {
                                        addCharacter(project()!.id, char);
                                    }
                                } catch (err) {
                                    setError(err instanceof Error ? err.message : "生成失败");
                                } finally {
                                    setIsGenerating(false);
                                    setGeneratingText("");
                                }
                            }}
                        />
                    </Show>

                    <Show when={currentStep() === "writing"}>
                        <WritingStep
                            project={project()!}
                            isGenerating={isGenerating()}
                            generatingText={generatingText()}
                            modelId={selectedModelId()}
                            onGenerate={async (chapterId) => {
                                setIsGenerating(true);
                                setError(null);
                                try {
                                    const p = project()!;
                                    const chapter = p.chapters.find(c => c.id === chapterId);
                                    const outline = p.outline.find(o => o.id === chapter?.outlineId);

                                    if (!chapter || !outline) throw new Error("章节不存在");

                                    // 获取前一章内容作为上下文
                                    const prevChapter = p.chapters.find(c => c.order === chapter.order - 1);
                                    const previousContext = prevChapter?.content?.slice(-500);

                                    const content = await writeChapter(
                                        {
                                            projectTitle: p.metadata.title,
                                            genre: p.metadata.genre,
                                            writingStyle: p.writingStyle,
                                            outline,
                                            previousContext,
                                            characters: p.characters,
                                            worldSetting: p.worldSetting,
                                            wordCountTarget: 3000,
                                        },
                                        getGenerationOptions()
                                    );

                                    updateChapter(p.id, chapterId, {
                                        content,
                                        status: "draft",
                                    });
                                    updateProject(p.id, { status: "writing" });
                                } catch (err) {
                                    setError(err instanceof Error ? err.message : "生成失败");
                                } finally {
                                    setIsGenerating(false);
                                    setGeneratingText("");
                                }
                            }}
                            onUpdateChapter={(chapterId, content) => {
                                updateChapter(project()!.id, chapterId, { content });
                            }}
                        />
                    </Show>

                    <Show when={currentStep() === "export"}>
                        <ExportStep
                            project={project()!}
                            onExport={async () => {
                                try {
                                    await downloadEpub(project()!);
                                } catch (err) {
                                    setError(err instanceof Error ? err.message : "导出失败");
                                }
                            }}
                        />
                    </Show>
                </Show>

                {/* 底部导航 */}
                <div class="mt-8 flex items-center justify-between">
                    <Button
                        variant="outline"
                        onClick={goPrev}
                        disabled={!canGoPrev()}
                    >
                        <ChevronLeft class="w-4 h-4 mr-1" />
                        上一步
                    </Button>

                    <Button
                        onClick={goNext}
                        disabled={!canGoNext()}
                    >
                        下一步
                        <ChevronRight class="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </main>
        </div>
    );
};

// ============ 子组件 ============

// 创意步骤
const IdeaStep: Component<{
    project: NovelProject;
    isGenerating: boolean;
    generatingText: string;
    onGenerate: (idea: Partial<NovelIdea>) => Promise<void>;
    onUpdate: (updates: { metadata?: Partial<NovelProject["metadata"]>; idea?: Partial<NovelIdea> }) => void;
}> = (props) => {
    const [localIdea, setLocalIdea] = createSignal(props.project.idea.premise || "");

    return (
        <div class="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle class="flex items-center gap-2">
                        <Lightbulb class="w-5 h-5" />
                        创意构思
                    </CardTitle>
                    <CardDescription>
                        描述你的小说创意，AI 将帮助你扩展和完善
                    </CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                    {/* 基本信息 */}
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-sm font-medium mb-1 block">小说标题</label>
                            <Input
                                value={props.project.metadata.title}
                                onInput={(e) => props.onUpdate({ metadata: { title: e.currentTarget.value } })}
                                placeholder="输入小说标题"
                            />
                        </div>
                        <div>
                            <label class="text-sm font-medium mb-1 block">类型</label>
                            <select
                                class="w-full h-10 px-3 rounded-md border bg-background"
                                value={props.project.metadata.genre}
                                onChange={(e) => props.onUpdate({ metadata: { genre: e.currentTarget.value as NovelGenre } })}
                            >
                                <For each={GENRES}>
                                    {(genre) => <option value={genre.value}>{genre.label}</option>}
                                </For>
                            </select>
                        </div>
                    </div>

                    {/* 核心创意 */}
                    <div>
                        <label class="text-sm font-medium mb-1 block">核心创意</label>
                        <Textarea
                            value={localIdea()}
                            onInput={(e) => setLocalIdea(e.currentTarget.value)}
                            placeholder="描述你的小说创意，例如：一个失忆的剑客发现自己是被通缉的叛徒，但他不记得自己做过什么..."
                            class="min-h-[120px]"
                        />
                    </div>

                    <Button
                        onClick={() => props.onGenerate({ premise: localIdea() })}
                        disabled={props.isGenerating || !localIdea().trim()}
                    >
                        <Show when={props.isGenerating} fallback={<Sparkles class="w-4 h-4 mr-2" />}>
                            <Loader2 class="w-4 h-4 mr-2 animate-spin" />
                        </Show>
                        AI 扩展创意
                    </Button>
                </CardContent>
            </Card>

            {/* 扩展后的创意 */}
            <Show when={props.project.idea.premise}>
                <Card>
                    <CardHeader>
                        <CardTitle>创意详情</CardTitle>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <div>
                            <label class="text-sm font-medium text-muted-foreground">核心前提</label>
                            <p class="mt-1">{props.project.idea.premise}</p>
                        </div>
                        <div>
                            <label class="text-sm font-medium text-muted-foreground">主题</label>
                            <p class="mt-1">{props.project.idea.theme}</p>
                        </div>
                        <div>
                            <label class="text-sm font-medium text-muted-foreground">背景设定</label>
                            <p class="mt-1">{props.project.idea.setting}</p>
                        </div>
                        <div>
                            <label class="text-sm font-medium text-muted-foreground">核心冲突</label>
                            <p class="mt-1">{props.project.idea.conflict}</p>
                        </div>
                    </CardContent>
                </Card>
            </Show>

            {/* 生成中预览 */}
            <Show when={props.isGenerating && props.generatingText}>
                <Card>
                    <CardHeader>
                        <CardTitle class="flex items-center gap-2">
                            <Loader2 class="w-4 h-4 animate-spin" />
                            正在生成...
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre class="whitespace-pre-wrap text-sm text-muted-foreground">
                            {props.generatingText}
                        </pre>
                    </CardContent>
                </Card>
            </Show>
        </div>
    );
};

// 大纲步骤
const OutlineStep: Component<{
    project: NovelProject;
    isGenerating: boolean;
    generatingText: string;
    onGenerate: () => Promise<void>;
}> = (props) => {
    return (
        <div class="space-y-6">
            <Card>
                <CardHeader>
                    <div class="flex items-center justify-between">
                        <div>
                            <CardTitle class="flex items-center gap-2">
                                <BookOpen class="w-5 h-5" />
                                章节大纲
                            </CardTitle>
                            <CardDescription>
                                AI 将根据你的创意生成完整的章节大纲
                            </CardDescription>
                        </div>
                        <Button
                            onClick={props.onGenerate}
                            disabled={props.isGenerating || !props.project.idea.premise}
                        >
                            <Show when={props.isGenerating} fallback={<Sparkles class="w-4 h-4 mr-2" />}>
                                <Loader2 class="w-4 h-4 mr-2 animate-spin" />
                            </Show>
                            {props.project.outline.length > 0 ? "重新生成" : "生成大纲"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Show
                        when={props.project.outline.length > 0}
                        fallback={
                            <div class="text-center py-12 text-muted-foreground">
                                <BookOpen class="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>点击上方按钮生成章节大纲</p>
                            </div>
                        }
                    >
                        <div class="space-y-3">
                            <For each={props.project.outline}>
                                {(item) => (
                                    <div class="p-4 border rounded-lg">
                                        <h3 class="font-medium">{item.title}</h3>
                                        <p class="text-sm text-muted-foreground mt-1">{item.summary}</p>
                                        <Show when={item.keyEvents.length > 0}>
                                            <div class="flex flex-wrap gap-1 mt-2">
                                                <For each={item.keyEvents}>
                                                    {(event) => (
                                                        <Badge variant="outline" class="text-xs">{event}</Badge>
                                                    )}
                                                </For>
                                            </div>
                                        </Show>
                                    </div>
                                )}
                            </For>
                        </div>
                    </Show>
                </CardContent>
            </Card>

            {/* 生成中预览 */}
            <Show when={props.isGenerating && props.generatingText}>
                <Card>
                    <CardHeader>
                        <CardTitle class="flex items-center gap-2">
                            <Loader2 class="w-4 h-4 animate-spin" />
                            正在生成大纲...
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre class="whitespace-pre-wrap text-sm text-muted-foreground max-h-96 overflow-y-auto">
                            {props.generatingText}
                        </pre>
                    </CardContent>
                </Card>
            </Show>
        </div>
    );
};

// 角色步骤
const CharactersStep: Component<{
    project: NovelProject;
    isGenerating: boolean;
    generatingText: string;
    onGenerate: (count: number) => Promise<void>;
}> = (props) => {
    const [characterCount, setCharacterCount] = createSignal(4);

    const getRoleLabel = (role: string) => {
        switch (role) {
            case "protagonist": return "主角";
            case "antagonist": return "反派";
            case "supporting": return "配角";
            default: return "其他";
        }
    };

    return (
        <div class="space-y-6">
            <Card>
                <CardHeader>
                    <div class="flex items-center justify-between">
                        <div>
                            <CardTitle class="flex items-center gap-2">
                                <Users class="w-5 h-5" />
                                角色设计
                            </CardTitle>
                            <CardDescription>
                                创建和管理你的小说角色
                            </CardDescription>
                        </div>
                        <div class="flex items-center gap-2">
                            <Input
                                type="number"
                                min={1}
                                max={10}
                                value={characterCount()}
                                onInput={(e) => setCharacterCount(parseInt(e.currentTarget.value) || 4)}
                                class="w-20"
                            />
                            <Button
                                onClick={() => props.onGenerate(characterCount())}
                                disabled={props.isGenerating || !props.project.idea.premise}
                            >
                                <Show when={props.isGenerating} fallback={<Sparkles class="w-4 h-4 mr-2" />}>
                                    <Loader2 class="w-4 h-4 mr-2 animate-spin" />
                                </Show>
                                生成角色
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Show
                        when={props.project.characters.length > 0}
                        fallback={
                            <div class="text-center py-12 text-muted-foreground">
                                <Users class="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>点击上方按钮生成角色</p>
                            </div>
                        }
                    >
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <For each={props.project.characters}>
                                {(character) => (
                                    <Card>
                                        <CardHeader class="pb-2">
                                            <div class="flex items-center justify-between">
                                                <CardTitle class="text-base">{character.name}</CardTitle>
                                                <Badge variant={character.role === "protagonist" ? "default" : "outline"}>
                                                    {getRoleLabel(character.role)}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent class="text-sm space-y-2">
                                            <p><strong>性格：</strong>{character.personality}</p>
                                            <p class="text-muted-foreground">{character.background}</p>
                                            <p><strong>动机：</strong>{character.motivation}</p>
                                        </CardContent>
                                    </Card>
                                )}
                            </For>
                        </div>
                    </Show>
                </CardContent>
            </Card>

            {/* 生成中预览 */}
            <Show when={props.isGenerating && props.generatingText}>
                <Card>
                    <CardHeader>
                        <CardTitle class="flex items-center gap-2">
                            <Loader2 class="w-4 h-4 animate-spin" />
                            正在生成角色...
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre class="whitespace-pre-wrap text-sm text-muted-foreground max-h-96 overflow-y-auto">
                            {props.generatingText}
                        </pre>
                    </CardContent>
                </Card>
            </Show>
        </div>
    );
};

// 写作步骤
const WritingStep: Component<{
    project: NovelProject;
    isGenerating: boolean;
    generatingText: string;
    modelId: string;
    onGenerate: (chapterId: string) => Promise<void>;
    onUpdateChapter: (chapterId: string, content: string) => void;
}> = (props) => {
    const [selectedChapterId, setSelectedChapterId] = createSignal<string | null>(
        props.project.currentChapterId
    );

    const selectedChapter = () =>
        props.project.chapters.find(c => c.id === selectedChapterId());

    return (
        <div class="grid grid-cols-4 gap-6">
            {/* 章节列表 */}
            <div class="col-span-1 space-y-2">
                <h3 class="font-medium mb-3">章节列表</h3>
                <For each={props.project.chapters}>
                    {(chapter) => (
                        <button
                            class={`w-full text-left p-3 rounded-lg border transition-colors ${selectedChapterId() === chapter.id
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                                }`}
                            onClick={() => setSelectedChapterId(chapter.id)}
                        >
                            <div class="font-medium text-sm truncate">{chapter.title}</div>
                            <div class="text-xs opacity-70 mt-1">
                                {chapter.wordCount} 字
                                <Show when={chapter.status === "draft"}>
                                    <Badge variant="secondary" class="ml-2 text-xs">草稿</Badge>
                                </Show>
                            </div>
                        </button>
                    )}
                </For>
            </div>

            {/* 编辑区域 */}
            <div class="col-span-3">
                <Show
                    when={selectedChapter()}
                    fallback={
                        <div class="text-center py-12 text-muted-foreground">
                            <PenTool class="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>选择一个章节开始写作</p>
                        </div>
                    }
                >
                    <Card>
                        <CardHeader>
                            <div class="flex items-center justify-between">
                                <CardTitle>{selectedChapter()!.title}</CardTitle>
                                <Button
                                    onClick={() => props.onGenerate(selectedChapterId()!)}
                                    disabled={props.isGenerating}
                                >
                                    <Show when={props.isGenerating} fallback={<Sparkles class="w-4 h-4 mr-2" />}>
                                        <Loader2 class="w-4 h-4 mr-2 animate-spin" />
                                    </Show>
                                    AI 生成本章
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Show when={props.isGenerating && props.generatingText}>
                                <div class="mb-4 p-4 bg-muted rounded-lg">
                                    <div class="flex items-center gap-2 mb-2">
                                        <Loader2 class="w-4 h-4 animate-spin" />
                                        <span class="text-sm font-medium">正在生成...</span>
                                    </div>
                                    <pre class="whitespace-pre-wrap text-sm max-h-48 overflow-y-auto">
                                        {props.generatingText}
                                    </pre>
                                </div>
                            </Show>

                            <Textarea
                                value={selectedChapter()!.content}
                                onInput={(e) => props.onUpdateChapter(selectedChapterId()!, e.currentTarget.value)}
                                placeholder="开始写作..."
                                class="min-h-[400px] font-serif text-base leading-relaxed"
                                disabled={props.isGenerating}
                            />

                            <div class="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                                <span>{selectedChapter()!.wordCount} 字</span>
                                <span>最后修改：{new Date(selectedChapter()!.lastModified).toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                </Show>
            </div>
        </div>
    );
};

// 导出步骤
const ExportStep: Component<{
    project: NovelProject;
    onExport: () => Promise<void>;
}> = (props) => {
    const preview = () => getExportPreview(props.project);
    const [isExporting, setIsExporting] = createSignal(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await props.onExport();
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div class="max-w-2xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle class="flex items-center gap-2">
                        <Download class="w-5 h-5" />
                        导出 EPUB
                    </CardTitle>
                    <CardDescription>
                        将你的小说导出为 EPUB 格式，可以在电子书阅读器上阅读
                    </CardDescription>
                </CardHeader>
                <CardContent class="space-y-6">
                    {/* 预览信息 */}
                    <div class="grid grid-cols-2 gap-4">
                        <div class="p-4 bg-muted rounded-lg">
                            <div class="text-sm text-muted-foreground">书名</div>
                            <div class="font-medium">{preview().title}</div>
                        </div>
                        <div class="p-4 bg-muted rounded-lg">
                            <div class="text-sm text-muted-foreground">作者</div>
                            <div class="font-medium">{preview().author}</div>
                        </div>
                        <div class="p-4 bg-muted rounded-lg">
                            <div class="text-sm text-muted-foreground">章节数</div>
                            <div class="font-medium">{preview().chapterCount} 章</div>
                        </div>
                        <div class="p-4 bg-muted rounded-lg">
                            <div class="text-sm text-muted-foreground">总字数</div>
                            <div class="font-medium">{preview().totalWords.toLocaleString()} 字</div>
                        </div>
                    </div>

                    {/* 进度提示 */}
                    <Show when={props.project.chapters.some(c => !c.content)}>
                        <div class="p-4 bg-yellow-500/10 text-yellow-600 rounded-lg">
                            <p class="text-sm">
                                ⚠️ 部分章节尚未完成，导出的 EPUB 可能包含空白章节
                            </p>
                        </div>
                    </Show>
                </CardContent>
                <CardFooter>
                    <Button
                        class="w-full"
                        size="lg"
                        onClick={handleExport}
                        disabled={isExporting() || props.project.chapters.length === 0}
                    >
                        <Show when={isExporting()} fallback={<Download class="w-4 h-4 mr-2" />}>
                            <Loader2 class="w-4 h-4 mr-2 animate-spin" />
                        </Show>
                        导出为 EPUB（约 {preview().estimatedFileSize}）
                    </Button>
                </CardFooter>
            </Card>

            {/* 其他导出选项 */}
            <Card>
                <CardHeader>
                    <CardTitle class="text-base">更多选项</CardTitle>
                </CardHeader>
                <CardContent class="space-y-3">
                    <Button variant="outline" class="w-full" disabled>
                        <FileText class="w-4 h-4 mr-2" />
                        导出为 TXT（开发中）
                    </Button>
                    <Button variant="outline" class="w-full" disabled>
                        <FileText class="w-4 h-4 mr-2" />
                        导出为 PDF（开发中）
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default NovelWorkshop;
