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

export function useI18n() {
  const [currentLang, setCurrentLang] = makePersisted(
    createSignal<Language>(defaultLang),
    { name: "language" }
  );
  
  // 创建翻译函数 - 直接访问 currentLang() 确保响应式更新
  const t = translator(() => {
    // 直接访问 currentLang() 以确保追踪语言变化
    const lang = currentLang();
    return flatten(dict[lang]);
  });
  
  const updateLanguage = (newLang: Language) => {
    setCurrentLang(newLang);
  };

  return {
    t,
    locale: currentLang,
    setLocale: updateLanguage,
  };
}

