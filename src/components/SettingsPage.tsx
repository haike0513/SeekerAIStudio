import { For } from "solid-js";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useI18n, type Language } from "@/lib/i18n";
import { useTheme, type Theme } from "@/lib/theme";
import { ArrowLeft } from "lucide-solid";
import { useNavigate } from "@solidjs/router";

export default function SettingsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
        >
          <ArrowLeft class="h-5 w-5" />
        </Button>
        <div>
          <h1 class="text-3xl font-bold">{t("app.sidebar.settings")}</h1>
          <p class="text-muted-foreground">管理应用程序设置和首选项</p>
        </div>
      </div>

      <Separator />

      {/* Settings Content */}
      <div class="space-y-6">
        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle>主题设置</CardTitle>
            <CardDescription>选择您喜欢的主题模式</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeSelector />
          </CardContent>
        </Card>

        {/* Language Settings */}
        <Card>
          <CardHeader>
            <CardTitle>语言设置</CardTitle>
            <CardDescription>选择应用程序显示语言</CardDescription>
          </CardHeader>
          <CardContent>
            <LanguageSelector />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ThemeSelector() {
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  
  const themes: { value: Theme; label: string; description: string }[] = [
    { 
      value: "light", 
      label: t("app.theme.light"),
      description: "使用浅色主题"
    },
    { 
      value: "dark", 
      label: t("app.theme.dark"),
      description: "使用深色主题"
    },
    { 
      value: "auto", 
      label: t("app.theme.auto"),
      description: "跟随系统设置"
    },
  ];

  return (
    <div class="space-y-4">
      <For each={themes}>
        {(themeOption) => (
          <div class="flex items-center justify-between rounded-lg border p-4">
            <div class="space-y-0.5">
              <Label class="text-base font-medium">{themeOption.label}</Label>
              <p class="text-sm text-muted-foreground">{themeOption.description}</p>
            </div>
            <Button
              variant={theme() === themeOption.value ? "default" : "outline"}
              onClick={() => setTheme(themeOption.value)}
            >
              {theme() === themeOption.value ? "已选择" : "选择"}
            </Button>
          </div>
        )}
      </For>
    </div>
  );
}

function LanguageSelector() {
  const { t, locale, setLocale } = useI18n();
  
  const languages: { value: Language; label: string; description: string }[] = [
    { 
      value: "zh-CN", 
      label: t("app.language.zh-CN"),
      description: "简体中文"
    },
    { 
      value: "en-US", 
      label: t("app.language.en-US"),
      description: "English"
    },
    { 
      value: "ja-JP", 
      label: t("app.language.ja-JP"),
      description: "日本語"
    },
  ];

  return (
    <div class="space-y-4">
      <For each={languages}>
        {(lang) => (
          <div class="flex items-center justify-between rounded-lg border p-4">
            <div class="space-y-0.5">
              <Label class="text-base font-medium">{lang.label}</Label>
              <p class="text-sm text-muted-foreground">{lang.description}</p>
            </div>
            <Button
              variant={locale() === lang.value ? "default" : "outline"}
              onClick={() => setLocale(lang.value)}
            >
              {locale() === lang.value ? "已选择" : "选择"}
            </Button>
          </div>
        )}
      </For>
    </div>
  );
}

