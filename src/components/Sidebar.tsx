import { Show, For, createSignal } from "solid-js";
import { A } from "@solidjs/router";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Brain, 
  Settings, 
  Database, 
  History,
  GitBranch,
  ChevronLeft, 
  ChevronRight,
  Menu,
  X
} from "lucide-solid";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface SidebarItem {
  id: string;
  icon: any;
  label: string;
  onClick?: () => void;
  children?: SidebarItem[];
}

interface SidebarProps {
  isCollapsed: () => boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar(props: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = createSignal(false);
  const { t } = useI18n();

  const sidebarItems: SidebarItem[] = [
    {
      id: "inference",
      icon: Brain,
      label: t("app.sidebar.inference"),
      onClick: () => {
        // 导航到推理页面
        setIsMobileOpen(false);
      },
    },
    {
      id: "workflow",
      icon: GitBranch,
      label: t("app.sidebar.workflow"),
      onClick: () => {
        // 导航到工作流页面
        setIsMobileOpen(false);
      },
    },
    {
      id: "models",
      icon: Database,
      label: t("app.sidebar.models"),
      onClick: () => {
        // 导航到模型管理页面
        setIsMobileOpen(false);
      },
    },
    {
      id: "history",
      icon: History,
      label: t("app.sidebar.history"),
      onClick: () => {
        // 导航到历史记录页面
        setIsMobileOpen(false);
      },
    },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        class="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsMobileOpen(!isMobileOpen())}
      >
        <Show when={isMobileOpen()} fallback={<Menu class="h-5 w-5" />}>
          <X class="h-5 w-5" />
        </Show>
      </Button>

      {/* Sidebar */}
      <aside
        class={cn(
          "relative h-screen transition-all duration-300 ease-in-out",
          "bg-card border-r border-border",
          props.isCollapsed() ? "w-16" : "w-64",
          "hidden lg:flex lg:flex-col lg:shrink-0"
        )}
      >
        <div class="flex h-full flex-col">
          {/* Header */}
          <div class="flex h-16 items-center border-b border-border px-4">
            <Show when={!props.isCollapsed()}>
              <h2 class="text-lg font-semibold">{t("app.title")}</h2>
            </Show>
          </div>

          {/* Navigation */}
          <nav class="flex-1 overflow-y-auto p-4 space-y-1">
            <For each={sidebarItems}>
              {(item) => {
                const href = item.id === "inference" ? "/" : `/${item.id}`;
                return (
                  <A href={href} class="block">
                    <Button
                      variant="ghost"
                      class={cn(
                        "w-full justify-start gap-3",
                        props.isCollapsed() ? "px-2" : "px-3"
                      )}
                      onClick={item.onClick}
                    >
                      <item.icon class={cn("h-5 w-5 shrink-0", props.isCollapsed() && "mx-auto")} />
                      <Show when={!props.isCollapsed()}>
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
                  props.isCollapsed() ? "px-2" : "px-3"
                )}
              >
                <Settings class={cn("h-5 w-5 shrink-0", props.isCollapsed() && "mx-auto")} />
                <Show when={!props.isCollapsed()}>
                  <span class="truncate">{t("app.sidebar.settings")}</span>
                </Show>
              </Button>
            </A>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => props.setIsCollapsed(!props.isCollapsed())}
              class={cn(
                "w-full",
                props.isCollapsed() ? "px-2" : "px-3 justify-start gap-3"
              )}
            >
              <Show when={props.isCollapsed()} fallback={<ChevronLeft class="h-4 w-4" />}>
                <ChevronRight class="h-4 w-4" />
              </Show>
              <Show when={!props.isCollapsed()}>
                <span class="truncate">{t("app.sidebar.collapse")}</span>
              </Show>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      <Show when={isMobileOpen()}>
        <div
          class="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
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
            <div class="flex h-16 items-center justify-between border-b border-border px-4">
              <h2 class="text-lg font-semibold">{t("app.title")}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileOpen(false)}
              >
                <X class="h-5 w-5" />
              </Button>
            </div>
            <nav class="flex-1 overflow-y-auto p-4 space-y-1">
              <For each={sidebarItems}>
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


