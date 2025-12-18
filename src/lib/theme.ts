import { createSignal, onMount } from "solid-js";
import { makePersisted } from "@solid-primitives/storage";

export type Theme = "light" | "dark" | "auto";

export function useTheme() {
  const [currentTheme, setCurrentTheme] = makePersisted(
    createSignal<Theme>("auto"),
    { name: "theme" }
  );

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    const actualTheme = newTheme === "auto" 
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : newTheme;

    if (actualTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  const updateTheme = (newTheme: Theme) => {
    setCurrentTheme(newTheme);
    applyTheme(newTheme);
  };

  onMount(() => {
    applyTheme(currentTheme());
    
    // 监听系统主题变化
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (currentTheme() === "auto") {
        applyTheme("auto");
      }
    };
    
    mediaQuery.addEventListener("change", handleChange);
    
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  });

  return {
    theme: currentTheme,
    setTheme: updateTheme,
  };
}

