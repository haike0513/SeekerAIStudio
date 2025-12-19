import { createSignal } from "solid-js";
import { Router, Route } from "@solidjs/router";
import { useTheme } from "./lib/theme";
import Sidebar from "./components/Sidebar";
import { routes } from "./routes";
import "./App.css";

function Layout(props: { children: any }) {
  // 初始化主题（useTheme hook 会自动应用主题）
  useTheme();
  
  // Sidebar 折叠状态
  const [isSidebarCollapsed, setIsSidebarCollapsed] = createSignal(false);

  return (
    <div class="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        setIsCollapsed={setIsSidebarCollapsed} 
      />
      <main 
        class="flex-1 overflow-y-auto duration-300 ease-in-out"
      >
        <div class="container mx-auto p-4 lg:p-6 max-w-7xl">
          {props.children}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router root={(props) => <Layout>{props.children}</Layout>}>
      {routes.map((route) => (
        <Route path={route.path} component={route.component} />
      ))}
    </Router>
  );
}

export default App;
