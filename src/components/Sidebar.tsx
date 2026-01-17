import { Show, For, createSignal, createMemo } from "solid-js";
import { A } from "@solidjs/router";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Brain, 
  Settings, 
  Database, 
  History,
  GitBranch,
  MessageSquare,
  ChevronLeft, 
  ChevronRight,
  Menu,
  X,
  Book,
  Palette,
  Music,
  Film
} from "lucide-solid";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useFeatures, type FeatureId } from "@/lib/features";

interface SidebarItem {
  id: FeatureId;
  icon: any;
  label: string;
  onClick?: () => void;
  children?: SidebarItem[];
}

export type SidebarMode = 'expanded' | 'collapsed' | 'minimized';

interface SidebarProps {
  mode: SidebarMode;
  setMode: (mode: SidebarMode) => void;
  isCollapsed: () => boolean; // Keep for mobile and other internal logic if needed, but better to rely on mode
}

export default function Sidebar(props: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = createSignal(false);
  const { t } = useI18n();
  const { isFeatureEnabled } = useFeatures();

  // 使用 createMemo 确保 sidebarItems 响应语言变化
  const sidebarItems = createMemo<SidebarItem[]>(() => [
    {
      id: "inference" as FeatureId,
      icon: Brain,
      label: t("app.sidebar.inference"),
      onClick: () => {
        setIsMobileOpen(false);
      },
    },
    {
      id: "chat" as FeatureId,
      icon: MessageSquare,
      label: t("app.sidebar.chat"),
      onClick: () => {
        setIsMobileOpen(false);
      },
    },
    {
      id: "workflow" as FeatureId,
      icon: GitBranch,
      label: t("app.sidebar.workflow"),
      onClick: () => {
        setIsMobileOpen(false);
      },
    },
    {
      id: "novel" as FeatureId,
      icon: Book,
      label: t("app.sidebar.novel"),
      onClick: () => {
        setIsMobileOpen(false);
      },
    },
    {
      id: "comic" as FeatureId,
      icon: Palette,
      label: t("app.sidebar.comic"),
      onClick: () => {
        setIsMobileOpen(false);
      },
    },
    {
      id: "audio" as FeatureId,
      icon: Music,
      label: t("app.sidebar.audio"),
      onClick: () => {
        setIsMobileOpen(false);
      },
    },
    {
      id: "video" as FeatureId,
      icon: Film,
      label: t("app.sidebar.video"),
      onClick: () => {
        setIsMobileOpen(false);
      },
    },
    {
      id: "models" as FeatureId,
      icon: Database,
      label: t("app.sidebar.models"),
      onClick: () => {
        setIsMobileOpen(false);
      },
    },
    {
      id: "history" as FeatureId,
      icon: History,
      label: t("app.sidebar.history"),
      onClick: () => {
        setIsMobileOpen(false);
      },
    },
  ]);

  // 过滤出已启用的功能模块
  const enabledSidebarItems = createMemo(() => 
    sidebarItems().filter(item => isFeatureEnabled(item.id))
  );

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        class="sm:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsMobileOpen(!isMobileOpen())}
      >
        <Show when={isMobileOpen()} fallback={<Menu class="h-5 w-5" />}>
          <X class="h-5 w-5" />
        </Show>
      </Button>

      {/* Sidebar */}
      <aside
        class={cn(
          "relative transition-all duration-300 ease-in-out",
          "bg-card border-r border-border",
          props.mode === 'minimized' ? "w-12 h-12 rounded-full shadow-2xl border bg-card flex items-center justify-center overflow-hidden cursor-pointer hover:bg-muted" :
          props.mode === 'collapsed' ? "w-16 shadow-2xl border-none bg-card/90 backdrop-blur-sm rounded-xl overflow-hidden" : "w-64 h-screen",
          "hidden sm:flex sm:flex-col sm:shrink-0"
        )}
        onMouseDown={(e) => {
            // Track start position for click detection in minimized mode
            if (props.mode === 'minimized') {
                 // Store coordinates on the element dataset or a transient variable if possible
                 // Using data attributes for stateless handling in event bubbling catch
                 const target = e.currentTarget as HTMLElement;
                 target.dataset.startX = e.clientX.toString();
                 target.dataset.startY = e.clientY.toString();
            }
        }}
        onClick={(e) => {
            if (props.mode === 'minimized') {
                e.stopPropagation(); 
                
                // Check drag distance
                const target = e.currentTarget as HTMLElement;
                const startX = parseFloat(target.dataset.startX || "0");
                const startY = parseFloat(target.dataset.startY || "0");
                const dist = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));

                if (dist < 5) {
                    props.setMode('collapsed');
                }
            }
        }}
      >
        <Show when={props.mode !== 'minimized'} fallback={
             <img src="/icon.png" alt="App" class="h-8 w-8 object-contain pointer-events-none" />
        }>
            <div class="flex h-full flex-col">
              {/* Header */}
              <div class="flex h-16 items-center border-b border-border px-4 gap-3 min-w-0">
                <button 
                    class="cursor-pointer bg-transparent border-none p-0 outline-none flex items-center" 
                    onClick={() => props.setMode('minimized')} 
                    title="Minimize to Icon"
                >
                    <img 
                      src="/icon.png" 
                      alt="App Icon" 
                      class={cn(
                        "h-8 w-8 shrink-0 object-contain hover:scale-110 transition-transform",
                        props.mode === 'collapsed' && "mx-auto"
                      )} 
                    />
                </button>
                <Show when={props.mode === 'expanded'}>
                  <h2 class="text-lg font-semibold truncate min-w-0">{t("app.title")}</h2>
                </Show>
              </div>
    
              {/* Navigation */}
              <nav class="flex-1 overflow-y-auto space-y-1">
                <For each={enabledSidebarItems()}>
                  {(item) => {
                    const href = item.id === "inference" ? "/" : `/${item.id}`;
                    return (
                      <A href={href} class="block">
                        <Button
                          variant="ghost"
                          class={cn(
                            "w-full justify-start gap-3",
                            props.mode === 'collapsed' ? "px-2" : "px-3"
                          )}
                          onClick={item.onClick}
                        >
                          <item.icon class={cn("h-5 w-5 shrink-0", props.mode === 'collapsed' && "mx-auto")} />
                          <Show when={props.mode === 'expanded'}>
                            <span class="truncate">{item.label}</span>
                          </Show>
                        </Button>
                      </A>
                    );
                  }}
                </For>
              </nav>
    
              <Separator />
    
              {/* Footer - Settings and Collapse Button */}
              <div class="p-4 space-y-1">
                <A href="/settings" class="block">
                  <Button
                    variant="ghost"
                    class={cn(
                      "w-full justify-start gap-3",
                      props.mode === 'collapsed' ? "px-2" : "px-3"
                    )}
                  >
                    <Settings class={cn("h-5 w-5 shrink-0", props.mode === 'collapsed' && "mx-auto")} />
                    <Show when={props.mode === 'expanded'}>
                      <span class="truncate">{t("app.sidebar.settings")}</span>
                    </Show>
                  </Button>
                </A>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => props.setMode(props.mode === 'expanded' ? 'collapsed' : 'expanded')}
                  class={cn(
                    "w-full",
                    props.mode === 'collapsed' ? "px-2" : "px-3 justify-start gap-3"
                  )}
                >
                  <Show when={props.mode === 'collapsed'} fallback={<ChevronLeft class="h-4 w-4" />}>
                    <ChevronRight class="h-4 w-4" />
                  </Show>
                  <Show when={props.mode === 'expanded'}>
                    <span class="truncate">{t("app.sidebar.collapse")}</span>
                  </Show>
                </Button>
              </div>
            </div>
        </Show>
      </aside>

      {/* Mobile sidebar overlay */}
      <Show when={isMobileOpen()}>
        <div
          class="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm sm:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
        <aside
          class={cn(
            "fixed left-0 top-0 z-40 h-screen w-64 transition-transform duration-300",
            "bg-card border-r border-border",
            isMobileOpen() ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div class="flex h-full flex-col">
            <div class="flex h-16 items-center justify-between border-b border-border px-4 gap-3 min-w-0">
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <img 
                  src="/icon.png" 
                  alt="App Icon" 
                  class="h-8 w-8 shrink-0 object-contain" 
                />
                <h2 class="text-lg font-semibold truncate min-w-0">{t("app.title")}</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                class="shrink-0"
                onClick={() => setIsMobileOpen(false)}
              >
                <X class="h-5 w-5" />
              </Button>
            </div>
            <nav class="flex-1 overflow-y-auto p-4 space-y-1">
              <For each={enabledSidebarItems()}>
                {(item) => {
                  const href = item.id === "inference" ? "/" : `/${item.id}`;
                  return (
                    <A href={href} onClick={item.onClick} class="block">
                      <Button
                        variant="ghost"
                        class="w-full justify-start gap-3 px-3"
                      >
                        <item.icon class="h-5 w-5" />
                        <span>{item.label}</span>
                      </Button>
                    </A>
                  );
                }}
              </For>
            </nav>
            <Separator />
            <div class="p-4">
              <A href="/settings" onClick={() => setIsMobileOpen(false)}>
                <Button
                  variant="ghost"
                  class="w-full justify-start gap-3 px-3"
                >
                  <Settings class="h-5 w-5" />
                  <span>{t("app.sidebar.settings")}</span>
                </Button>
              </A>
            </div>
          </div>
        </aside>
      </Show>
    </>
  );
}


