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
  
  // Sidebar 折叠状态
  const [isSidebarCollapsed, setIsSidebarCollapsed] = createSignal(false);
  
  // 检查当前路由，决定是否使用 container
  const location = useLocation();
  const isFullScreenPage = () => 
    (location.pathname.startsWith("/workflow/") && location.pathname !== "/workflow") ||
    (location.pathname.startsWith("/novel/") && location.pathname !== "/novel");

  return (
    <div class="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        setIsCollapsed={setIsSidebarCollapsed} 
      />
      <main 
        class="flex-1 overflow-y-auto duration-300 ease-in-out"
      >
        <Show 
          when={!isFullScreenPage()}
          fallback={props.children}
        >
          <div class="container mx-auto p-4 lg:p-6 max-w-7xl">
            {props.children}
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
