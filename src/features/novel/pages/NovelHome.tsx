/**
 * 小说模块首页
 * 
 * 显示所有小说项目，支持创建新项目
 */

import { Component, Show, For, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  BookOpen,
  Trash2,
  FileEdit,
  Download,
  Calendar,
  FileText,
  Sparkles,
} from "lucide-solid";
import {
  createProject,
  deleteProject,
  getAllProjects,
  getProjectProgress,
  type NovelGenre,
} from "../stores/enhanced-novel-store";

// 类型标签配置
const GENRE_LABELS: Record<NovelGenre, { label: string; color: string }> = {
  fantasy: { label: "奇幻", color: "bg-purple-500" },
  scifi: { label: "科幻", color: "bg-blue-500" },
  romance: { label: "言情", color: "bg-pink-500" },
  mystery: { label: "悬疑", color: "bg-amber-500" },
  thriller: { label: "惊悚", color: "bg-red-500" },
  horror: { label: "恐怖", color: "bg-gray-700" },
  literary: { label: "文学", color: "bg-emerald-500" },
  historical: { label: "历史", color: "bg-orange-500" },
  wuxia: { label: "武侠", color: "bg-cyan-500" },
  xianxia: { label: "仙侠", color: "bg-indigo-500" },
  xuanhuan: { label: "玄幻", color: "bg-violet-500" },
  other: { label: "其他", color: "bg-gray-500" },
};

const STATUS_LABELS = {
  ideation: { label: "构思中", color: "bg-blue-100 text-blue-800" },
  outlining: { label: "大纲中", color: "bg-yellow-100 text-yellow-800" },
  writing: { label: "写作中", color: "bg-green-100 text-green-800" },
  editing: { label: "编辑中", color: "bg-purple-100 text-purple-800" },
  completed: { label: "已完成", color: "bg-gray-100 text-gray-800" },
};

const NovelHome: Component = () => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = createSignal(false);
  const [newTitle, setNewTitle] = createSignal("");
  const [newGenre, setNewGenre] = createSignal<NovelGenre>("fantasy");

  const projects = () => getAllProjects();

  const handleCreateProject = () => {
    if (!newTitle().trim()) return;

    const id = createProject({
      title: newTitle().trim(),
      genre: newGenre(),
    });

    setNewTitle("");
    setIsCreating(false);
    navigate(`/novel/workshop/${id}`);
  };

  const handleDeleteProject = (id: string, e: Event) => {
    e.stopPropagation();
    if (confirm("确定要删除这个项目吗？此操作不可撤销。")) {
      deleteProject(id);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div class="space-y-6">
      {/* 头部 */}
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BookOpen class="w-8 h-8 text-primary" />
            小说创作
          </h1>
          <p class="text-muted-foreground mt-1">
            AI 驱动的小说创作工作坊，从想法到成书
          </p>
        </div>

        <Dialog open={isCreating()} onOpenChange={setIsCreating}>
          <DialogTrigger as={Button}>
            <Plus class="mr-2 h-4 w-4" />
            新建项目
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建小说项目</DialogTitle>
              <DialogDescription>
                开始你的创作之旅
              </DialogDescription>
            </DialogHeader>
            <div class="space-y-4 py-4">
              <div>
                <label class="text-sm font-medium mb-1 block">小说标题</label>
                <Input
                  value={newTitle()}
                  onInput={(e) => setNewTitle(e.currentTarget.value)}
                  placeholder="输入小说标题"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateProject();
                  }}
                />
              </div>
              <div>
                <label class="text-sm font-medium mb-1 block">类型</label>
                <select
                  class="w-full h-10 px-3 rounded-md border bg-background"
                  value={newGenre()}
                  onChange={(e) => setNewGenre(e.currentTarget.value as NovelGenre)}
                >
                  <For each={Object.entries(GENRE_LABELS)}>
                    {([value, { label }]) => (
                      <option value={value}>{label}</option>
                    )}
                  </For>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                取消
              </Button>
              <Button onClick={handleCreateProject} disabled={!newTitle().trim()}>
                <Sparkles class="w-4 h-4 mr-2" />
                开始创作
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 项目列表 */}
      <Show
        when={projects().length > 0}
        fallback={
          <Card class="border-dashed">
            <CardContent class="py-12 text-center">
              <BookOpen class="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 class="text-lg font-medium mb-2">还没有项目</h3>
              <p class="text-muted-foreground mb-4">
                点击上方"新建项目"按钮开始你的第一部小说
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus class="w-4 h-4 mr-2" />
                创建第一个项目
              </Button>
            </CardContent>
          </Card>
        }
      >
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <For each={projects()}>
            {(project) => {
              const progress = getProjectProgress(project.id);
              const genreInfo = GENRE_LABELS[project.metadata.genre];
              const statusInfo = STATUS_LABELS[project.status];

              return (
                <Card
                  class="group cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                  onClick={() => navigate(`/novel/workshop/${project.id}`)}
                >
                  <CardHeader class="pb-2">
                    <div class="flex items-start justify-between">
                      <div class="flex-1 min-w-0">
                        <CardTitle class="text-lg truncate group-hover:text-primary transition-colors">
                          {project.metadata.title}
                        </CardTitle>
                        <CardDescription class="mt-1">
                          {project.metadata.author}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => handleDeleteProject(project.id, e)}
                      >
                        <Trash2 class="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent class="space-y-3">
                    {/* 标签 */}
                    <div class="flex items-center gap-2">
                      <Badge class={`${genreInfo.color} text-white`}>
                        {genreInfo.label}
                      </Badge>
                      <Badge variant="outline" class={statusInfo.color}>
                        {statusInfo.label}
                      </Badge>
                    </div>

                    {/* 统计信息 */}
                    <div class="flex items-center gap-4 text-sm text-muted-foreground">
                      <div class="flex items-center gap-1">
                        <FileText class="w-3.5 h-3.5" />
                        <span>{progress.totalChapters} 章</span>
                      </div>
                      <div class="flex items-center gap-1">
                        <FileEdit class="w-3.5 h-3.5" />
                        <span>{progress.totalWords.toLocaleString()} 字</span>
                      </div>
                    </div>

                    {/* 进度条 */}
                    <Show when={progress.totalChapters > 0}>
                      <div class="space-y-1">
                        <div class="flex items-center justify-between text-xs text-muted-foreground">
                          <span>进度</span>
                          <span>{Math.round(progress.percentage)}%</span>
                        </div>
                        <div class="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            class="h-full bg-primary transition-all"
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                      </div>
                    </Show>
                  </CardContent>
                  <CardFooter class="pt-0">
                    <div class="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar class="w-3 h-3" />
                      <span>更新于 {formatDate(project.metadata.updatedAt)}</span>
                    </div>
                  </CardFooter>
                </Card>
              );
            }}
          </For>
        </div>
      </Show>

      {/* 功能介绍 */}
      <div class="mt-12">
        <h2 class="text-xl font-semibold mb-4">创作流程</h2>
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card class="text-center p-4">
            <Sparkles class="w-8 h-8 mx-auto mb-2 text-primary" />
            <h3 class="font-medium">创意构思</h3>
            <p class="text-xs text-muted-foreground mt-1">
              输入想法，AI 帮你扩展
            </p>
          </Card>
          <Card class="text-center p-4">
            <BookOpen class="w-8 h-8 mx-auto mb-2 text-primary" />
            <h3 class="font-medium">大纲规划</h3>
            <p class="text-xs text-muted-foreground mt-1">
              自动生成章节大纲
            </p>
          </Card>
          <Card class="text-center p-4">
            <FileEdit class="w-8 h-8 mx-auto mb-2 text-primary" />
            <h3 class="font-medium">角色设计</h3>
            <p class="text-xs text-muted-foreground mt-1">
              创建丰满的角色
            </p>
          </Card>
          <Card class="text-center p-4">
            <FileText class="w-8 h-8 mx-auto mb-2 text-primary" />
            <h3 class="font-medium">章节写作</h3>
            <p class="text-xs text-muted-foreground mt-1">
              AI 辅助写作内容
            </p>
          </Card>
          <Card class="text-center p-4">
            <Download class="w-8 h-8 mx-auto mb-2 text-primary" />
            <h3 class="font-medium">导出发布</h3>
            <p class="text-xs text-muted-foreground mt-1">
              导出为 EPUB 电子书
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NovelHome;
