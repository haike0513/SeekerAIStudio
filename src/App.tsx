import { createSignal, Show } from "solid-js";
import { Router, Route, useLocation } from "@solidjs/router";
import { useTheme } from "./lib/theme";
import Sidebar from "./components/Sidebar";
import { routes } from "./routes";
import ChatHomePage from "./components/ChatHomePage";
import ChatSessionPage from "./routes/chat";
import { WorkflowEditorPage } from "./components/WorkflowEditorPage";
import "./App.css";

function Layout(props: { children: any }) {
  // 初始化主题（useTheme hook 会自动应用主题）
  useTheme();
  
  // Sidebar 模式状态
  const [sidebarMode, setSidebarMode] = createSignal<import('./components/Sidebar').SidebarMode>('expanded');
  const isSidebarCollapsed = () => sidebarMode() !== 'expanded';
  
  // 浮动位置状态
  const [position, setPosition] = createSignal({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = createSignal(false);
  const [dragOffset, setDragOffset] = createSignal({ x: 0, y: 0 });

  const handleMouseDown = (e: MouseEvent) => {
    // 只有在折叠状态下，且点击的不是按钮时才允许拖拽
    // 简单的判定：如果点击的是 button 或 button 内部，则不拖拽
    if (!isSidebarCollapsed()) return;
    
    // 向上寻找最近的 button 祖先
    const target = e.target as HTMLElement;
    const button = target.closest('button');
    if (button) return;

    if (e.target instanceof Element && (e.target.closest('a') || e.target.closest('input'))) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position().x,
      y: e.clientY - position().y
    });
    
    // 防止选中文本
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging()) {
      setPosition({
        x: e.clientX - dragOffset().x,
        y: e.clientY - dragOffset().y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 全局监听鼠标事件以处理拖拽释放
  // 注意：在真实应用中最好使用 window.addEventListener 并在 cleanup 时移除
  // 这里简化处理，直接放在外层 div 上
  
  // 检查当前路由，决定是否使用 container
  const location = useLocation();
  const isFullScreenPage = () => 
    (location.pathname.startsWith("/workflow/") && location.pathname !== "/workflow") ||
    (location.pathname.startsWith("/novel/") && location.pathname !== "/novel") ||
    (location.pathname.startsWith("/comic/") && location.pathname !== "/comic") ||
    (location.pathname.startsWith("/audio/") && location.pathname !== "/audio") ||
    (location.pathname.startsWith("/video/") && location.pathname !== "/video");

  return (
    <div 
      class="flex h-screen w-screen overflow-hidden bg-background relative"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Sidebar - Fixed Position for Floating Effect */}
      <div 
        class={`fixed z-50 transition-all duration-300 ease-out ${
          isSidebarCollapsed() ? 'w-auto cursor-move' : 'w-64 h-full left-0 top-0 cursor-default'
        }`}
        style={isSidebarCollapsed() ? {
            left: `${position().x}px`,
            top: `${position().y}px`,
            height: 'auto',
            'max-height': '80vh'
        } : {}}
        onMouseDown={handleMouseDown}
      >
        <Sidebar 
          mode={sidebarMode()}
          setMode={setSidebarMode}
          isCollapsed={isSidebarCollapsed}
        />
      </div>

      {/* Main Content - Padded based on sidebar state */}
      <main 
        class={`flex-1 h-full overflow-y-auto transition-all duration-300 ease-in-out ${
          isSidebarCollapsed() ? 'ml-0' : 'ml-64'
        }`}
      >
        <Show 
          when={!isFullScreenPage()}
          fallback={props.children}
        >
          <div class="container mx-auto p-4 lg:p-6 max-w-7xl pt-4">
             {/* Add top padding to account for potential float overlap if needed, though usually standard padding is enough */}
             {/* If collapsed, it overlays. We might want to add a spacer or just let it overlay. 
                 Given 'provide more space', overlay is likely desired. 
                 But to avoid obscuring content, we might want a small margin or just rely on the user to collapse/expand. 
                 Let's stick to ml-0 for collapsed to truly float over.
              */}
            <div class={`transition-all duration-300`}>
                {props.children}
            </div>
          </div>
        </Show>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router root={(props) => <Layout>{props.children}</Layout>}>
      {routes
        .filter((route) => route.path !== "/chat") // 过滤掉旧的/chat路由
        .map((route) => (
          <Route path={route.path} component={route.component} />
        ))}
      {/* Chat首页 - 默认展示推荐内容 */}
      <Route path="/chat" component={ChatHomePage} />
      {/* Chat会话页面 - 有sessionId时显示 */}
      <Route path="/chat/:sessionId" component={ChatSessionPage} />
      {/* 工作流编辑页面 - 有id时显示 */}
      <Route path="/workflow/:id" component={WorkflowEditorPage} />
    </Router>
  );
}

export default App;
