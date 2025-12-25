/**
 * 聊天首页
 * 默认展示页面，包含推荐内容和输入框
 * 用户输入并提交后创建新session并跳转
 */

import { createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useI18n } from "@/lib/i18n";
import { useSessions } from "@/lib/solidjs/use-sessions";
import {
  PromptInput,
  PromptInputProvider,
  usePromptInputController,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { MessageSquare, Sparkles, Lightbulb, FileText, Code, Globe, Search } from "lucide-solid";
import { cn } from "@/lib/utils";

// 推荐内容示例
const RECOMMENDATIONS = [
  {
    icon: Sparkles,
    title: "创意写作",
    description: "帮我写一个关于未来科技的故事",
    prompt: "帮我写一个关于未来科技的故事",
  },
  {
    icon: Code,
    title: "代码生成",
    description: "用TypeScript实现一个二分查找算法",
    prompt: "用TypeScript实现一个二分查找算法",
  },
  {
    icon: FileText,
    title: "文档总结",
    description: "总结一下这段文字的主要内容",
    prompt: "总结一下这段文字的主要内容",
  },
  {
    icon: Search,
    title: "信息查询",
    description: "解释一下量子计算的基本原理",
    prompt: "解释一下量子计算的基本原理",
  },
];

// 模型列表（示例数据，可以从配置或 API 获取）
const MODELS = [
  { id: "qwen/qwen3-vl-8b", name: "Qwen3-VL 8B", provider: "qwen", chef: "Qwen", chefSlug: "qwen", providers: ["qwen"] },
  { id: "gpt-4", name: "GPT-4", provider: "openai", chef: "OpenAI", chefSlug: "openai", providers: ["openai", "azure"] },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "openai", chef: "OpenAI", chefSlug: "openai", providers: ["openai", "azure"] },
  { id: "claude-3-opus", name: "Claude 3 Opus", provider: "anthropic", chef: "Anthropic", chefSlug: "anthropic", providers: ["anthropic", "azure"] },
  { id: "claude-3-sonnet", name: "Claude 3 Sonnet", provider: "anthropic", chef: "Anthropic", chefSlug: "anthropic", providers: ["anthropic", "azure"] },
];

export default function ChatHomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { createSession } = useSessions();
  const [selectedModel, setSelectedModel] = createSignal(MODELS[0].id);

  const handleRecommendationClick = (prompt: string) => {
    // 创建新session并跳转
    const sessionId = createSession(selectedModel());
    navigate(`/chat/${sessionId}?prompt=${encodeURIComponent(prompt)}`);
  };

  return (
    <PromptInputProvider>
      <div class="flex flex-col h-[calc(100vh-2rem)] -mx-4 -my-4 lg:-mx-6 lg:-my-6">
        {/* 主要内容区域 */}
        <div class="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div class="w-full max-w-3xl space-y-8">
            {/* 欢迎标题 */}
            <div class="text-center space-y-2">
              <h1 class="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                AI 对话助手
              </h1>
              <p class="text-muted-foreground text-lg">
                开始对话，或选择一个推荐主题
              </p>
            </div>

            {/* 推荐内容网格 */}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <For each={RECOMMENDATIONS}>
                {(item) => (
                  <button
                    onClick={() => handleRecommendationClick(item.prompt)}
                    class={cn(
                      "group relative p-4 rounded-xl border border-border/60",
                      "bg-background/50 backdrop-blur-sm",
                      "hover:border-primary/50 hover:bg-primary/5",
                      "transition-all duration-200",
                      "text-left"
                    )}
                  >
                    <div class="flex items-start gap-3">
                      <div class="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <item.icon size={20} class="text-primary" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <h3 class="font-semibold text-sm mb-1">{item.title}</h3>
                        <p class="text-xs text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>

        {/* 输入区域 - 固定在底部 */}
        <div class="bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 border-t">
          <div class="max-w-3xl mx-auto w-full px-4 pt-4 pb-6">
            <ChatHomeInput
              onSend={(text) => {
                const sessionId = createSession(selectedModel());
                navigate(`/chat/${sessionId}?prompt=${encodeURIComponent(text)}`);
              }}
            />
          </div>
        </div>
      </div>
    </PromptInputProvider>
  );
}

// 输入组件
function ChatHomeInput(props: { onSend: (text: string) => void }) {
  const controller = usePromptInputController();

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const text = controller.textInput.value().trim();
    if (!text) return;

    props.onSend(text);
    controller.textInput.clear();
  };

  return (
    <div class="relative">
      <PromptInput
        status="ready"
        onSubmit={handleSubmit}
        class="group"
      >
        {/* 统一的输入容器 */}
        <div class="relative flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/80 backdrop-blur-sm shadow-sm shadow-black/5 transition-all duration-300 focus-within:border-primary/60 focus-within:shadow-md focus-within:shadow-primary/10 focus-within:bg-background">
          <PromptInputBody class="px-4 pt-4 pb-2">
            <PromptInputTextarea
              placeholder="输入消息开始对话..."
              class="min-h-[60px] border-0 px-0 py-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
            />
          </PromptInputBody>

          {/* 底部工具栏 */}
          <div class="flex items-center justify-end gap-2 px-4 pb-3 pt-2.5">
            <PromptInputSubmit
              status="ready"
              class="h-8 w-8 p-0 shrink-0 shadow-sm hover:shadow-md transition-shadow"
            />
          </div>
        </div>
      </PromptInput>
    </div>
  );
}

