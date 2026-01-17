import { createSignal, createEffect } from "solid-js";
import { makePersisted } from "@solid-primitives/storage";

export type FeatureId = 
  | "inference" 
  | "chat" 
  | "workflow" 
  | "novel" 
  | "comic" 
  | "audio" 
  | "video" 
  | "models" 
  | "history";

export type EnabledFeatures = Record<FeatureId, boolean>;

// 默认所有功能都启用
const defaultFeatures: EnabledFeatures = {
  inference: true,
  chat: true,
  workflow: true,
  novel: true,
  comic: true,
  audio: true,
  video: true,
  models: true,
  history: true,
};

// 创建全局共享的功能启用状态
const [globalEnabledFeatures, setGlobalEnabledFeatures] = makePersisted(
  createSignal<EnabledFeatures>(defaultFeatures),
  { name: "enabledFeatures" }
);

export function useFeatures() {
  return {
    enabledFeatures: globalEnabledFeatures,
    setEnabledFeatures: setGlobalEnabledFeatures,
    isFeatureEnabled: (featureId: FeatureId) => {
      return globalEnabledFeatures()[featureId] ?? true;
    },
    toggleFeature: (featureId: FeatureId, enabled: boolean) => {
      setGlobalEnabledFeatures((prev) => ({
        ...prev,
        [featureId]: enabled,
      }));
    },
  };
}
