/**
 * 聊天历史列表组件
 * 显示和管理AI对话会话历史
 */

import { For, Show, type Component } from "solid-js";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSessions, type ChatSession } from "@/lib/solidjs/use-sessions";
import { MessageSquare, Plus, Trash2, Clock } from "lucide-solid";

export interface ChatHistoryListProps {
  class?: string;
  currentSessionId: () => string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
}

export const ChatHistoryList: Component<ChatHistoryListProps> = (props) => {
  const { sessions, deleteSession } = useSessions();

  const formatTime = (timestamp: number) => {
    try {
      const now = Date.now();
      const diff = now - timestamp;
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        return `${days} 天前`;
      } else if (hours > 0) {
        return `${hours} 小时前`;
      } else if (minutes > 0) {
        return `${minutes} 分钟前`;
      } else {
        return "刚刚";
      }
    } catch {
      return "未知时间";
    }
  };

  const handleDelete = (e: Event, sessionId: string) => {
    e.stopPropagation();
    if (confirm("确定要删除这个对话吗？")) {
      deleteSession(sessionId);
    }
  };

  return (
    <div class={cn("flex flex-col h-full", props.class)}>
      {/* 头部 - 新建按钮 */}
      <div class="p-4 border-b border-border/50">
        <Button
          variant="default"
          class="w-full gap-2"
          onClick={() => props.onNewSession()}
        >
          <Plus size={16} />
          <span>新对话</span>
        </Button>
      </div>

      {/* 会话列表 */}
      <div class="flex-1 overflow-y-auto">
        <div class="p-2 space-y-1">
          <Show
            when={sessions().length > 0}
            fallback={
              <div class="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
                <MessageSquare size={32} class="mb-2 opacity-50" />
                <p>还没有对话历史</p>
                <p class="text-xs mt-1">点击上方按钮开始新对话</p>
              </div>
            }
          >
            <For each={sessions()}>
              {(session: ChatSession) => {
                const isActive = () => props.currentSessionId() === session.id;
                return (
                  <div
                    class={cn(
                      "group relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                      isActive()
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-accent/50 text-foreground"
                    )}
                    onClick={() => props.onSessionSelect(session.id)}
                  >
                    <MessageSquare
                      size={16}
                      class={cn(
                        "shrink-0",
                        isActive() ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <div class="flex-1 min-w-0">
                      <p
                        class={cn(
                          "text-sm font-medium truncate",
                          isActive() && "text-primary"
                        )}
                      >
                        {session.title}
                      </p>
                      <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-xs text-muted-foreground">
                          {session.messageCount} 条消息
                        </span>
                        <span class="text-xs text-muted-foreground">·</span>
                        <span class="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={10} />
                          {formatTime(session.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      class={cn(
                        "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0",
                        "hover:bg-destructive/10 hover:text-destructive"
                      )}
                      onClick={(e) => handleDelete(e, session.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                );
              }}
            </For>
          </Show>
        </div>
      </div>
    </div>
  );
};

