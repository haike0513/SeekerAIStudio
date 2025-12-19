import { translator, flatten } from "@solid-primitives/i18n";
import { makePersisted } from "@solid-primitives/storage";
import { createSignal } from "solid-js";
import zhCN from "./zh-CN";
import enUS from "./en-US";
import jaJP from "./ja-JP";

export type Language = "zh-CN" | "en-US" | "ja-JP";

const dict = {
  "zh-CN": zhCN,
  "en-US": enUS,
  "ja-JP": jaJP,
};

const defaultLang: Language = "zh-CN";

// 创建全局共享的语言 signal，确保所有组件使用同一个状态
const [globalLocale, setGlobalLocale] = makePersisted(
  createSignal<Language>(defaultLang),
  { name: "language" }
);

// 创建全局共享的翻译函数，追踪全局语言变化
const globalT = translator(() => {
  const lang = globalLocale();
  return flatten(dict[lang]);
});

export function useI18n() {
  return {
    t: globalT,
    locale: globalLocale,
    setLocale: setGlobalLocale,
  };
}

