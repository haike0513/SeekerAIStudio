import type { Component } from "solid-js";
import InferencePanel from "@/components/InferencePanel";
import SettingsPage from "@/components/SettingsPage";
import WorkflowPage from "@/components/WorkflowPage";
import ModelManagementPage from "@/components/ModelManagementPage";
import AIChatPage from "@/components/AIChatPage";

// 路由配置接口
export interface RouteConfig {
  path: string;
  component: Component;
  name?: string;
}

// 路由配置数组
export const routes: RouteConfig[] = [
  {
    path: "/",
    component: InferencePanel,
    name: "inference",
  },
  {
    path: "/settings",
    component: SettingsPage,
    name: "settings",
  },
  {
    path: "/workflow",
    component: WorkflowPage,
    name: "workflow",
  },
  {
    path: "/models",
    component: ModelManagementPage,
    name: "models",
  },
  {
    path: "/chat",
    component: AIChatPage,
    name: "chat",
  },
];

// 根据路径获取路由配置
export const getRouteByPath = (path: string): RouteConfig | undefined => {
  return routes.find((route) => route.path === path);
};

// 根据名称获取路由配置
export const getRouteByName = (name: string): RouteConfig | undefined => {
  return routes.find((route) => route.name === name);
};

