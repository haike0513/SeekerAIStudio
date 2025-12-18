import { For, createMemo } from "solid-js";
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
          <h1 class="text-3xl font-bold">{t("app.settings.title")}</h1>
          <p class="text-muted-foreground">{t("app.settings.description")}</p>
        </div>
      </div>

      <Separator />

      {/* Settings Content */}
      <div class="space-y-6">
        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t("app.settings.theme.title")}</CardTitle>
            <CardDescription>{t("app.settings.theme.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeSelector />
          </CardContent>
        </Card>

        {/* Language Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t("app.settings.language.title")}</CardTitle>
            <CardDescription>{t("app.settings.language.description")}</CardDescription>
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
  
  // 使用 createMemo 确保 themes 响应语言变化
  const themes = createMemo(() => [
    { 
      value: "light" as Theme, 
      label: t("app.theme.light"),
      description: t("app.settings.theme.lightDescription")
    },
    { 
      value: "dark" as Theme, 
      label: t("app.theme.dark"),
      description: t("app.settings.theme.darkDescription")
    },
    { 
      value: "auto" as Theme, 
      label: t("app.theme.auto"),
      description: t("app.settings.theme.autoDescription")
    },
  ]);

  return (
    <div class="space-y-4">
      <For each={themes()}>
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
              {theme() === themeOption.value ? t("app.settings.theme.selected") : t("app.settings.theme.select")}
            </Button>
          </div>
        )}
      </For>
    </div>
  );
}

function LanguageSelector() {
  const { t, locale, setLocale } = useI18n();
  
  // 使用 createMemo 确保 languages 响应语言变化
  const languages = createMemo(() => [
    { 
      value: "zh-CN" as Language, 
      label: t("app.language.zh-CN"),
      description: t("app.language.zh-CN")
    },
    { 
      value: "en-US" as Language, 
      label: t("app.language.en-US"),
      description: t("app.language.en-US")
    },
    { 
      value: "ja-JP" as Language, 
      label: t("app.language.ja-JP"),
      description: t("app.language.ja-JP")
    },
  ]);

  return (
    <div class="space-y-4">
      <For each={languages()}>
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
              {locale() === lang.value ? t("app.settings.language.selected") : t("app.settings.language.select")}
            </Button>
          </div>
        )}
      </For>
    </div>
  );
}

