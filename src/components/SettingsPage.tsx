import { createMemo, createSignal, onMount } from "solid-js";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectPortal,
  SelectTrigger, 
  SelectValue
} from "@/components/ui/select";
import { 
  Switch, 
  SwitchControl, 
  SwitchInput, 
  SwitchLabel,
  SwitchThumb 
} from "@/components/ui/switch";
import { useI18n, type Language } from "@/lib/i18n";
import { useTheme, type Theme } from "@/lib/theme";
import { useFeatures, type FeatureId } from "@/lib/features";
import { ArrowLeft } from "lucide-solid";
import { useNavigate } from "@solidjs/router";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { SeekerSwitch } from "./SeekerSwitch";

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

        {/* Log Level Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t("app.settings.logging.title")}</CardTitle>
            <CardDescription>{t("app.settings.logging.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <LogLevelSelector />
          </CardContent>
        </Card>

        {/* Server Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t("app.settings.server.title")}</CardTitle>
            <CardDescription>{t("app.settings.server.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ServerControl />
          </CardContent>
        </Card>

        {/* Feature Modules Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t("app.settings.features.title")}</CardTitle>
            <CardDescription>{t("app.settings.features.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <FeatureModulesControl />
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

  const currentTheme = createMemo(() => 
    themes().find(t => t.value === theme()) || themes()[0]
  );

  return (
    <div class="space-y-2">
      <Label>{t("app.settings.theme.title")}</Label>
      <Select
        options={themes()}
        value={theme()}
        onChange={(value) => {
          console.log("Theme onChange:", value, typeof value);
          if (value !== null && value !== undefined) {
            // 如果 value 是对象，提取 value 属性；否则直接使用
            const themeValue = typeof value === 'object' && 'value' in value 
              ? (value as any).value 
              : value;
            setTheme(themeValue as Theme);
          }
        }}
        placeholder={t("app.settings.theme.select")}
        optionValue={"value" as any}
        optionTextValue={"label" as any}
        itemComponent={(props) => {
          const option = props.item.rawValue as unknown as { value: Theme; label: string; description: string };
          return (
            <SelectItem item={props.item}>
              <div class="flex flex-col">
                <span>{option.label}</span>
                <span class="text-xs text-muted-foreground">{option.description}</span>
              </div>
            </SelectItem>
          );
        }}
      >
        <SelectTrigger class="w-full">
          <SelectValue<Theme>>{() => 
            currentTheme()?.label || t("app.settings.theme.select")
          }</SelectValue>
        </SelectTrigger>
        <SelectPortal>
          <SelectContent />
        </SelectPortal>
      </Select>
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

  const currentLanguage = createMemo(() => 
    languages().find(l => l.value === locale()) || languages()[0]
  );

  return (
    <div class="space-y-2">
      <Label>{t("app.settings.language.title")}</Label>
      <Select
        options={languages()}
        value={locale()}
        onChange={(value) => {
          console.log("Language onChange:", value, typeof value);
          if (value !== null && value !== undefined) {
            // 如果 value 是对象，提取 value 属性；否则直接使用
            const langValue = typeof value === 'object' && 'value' in value 
              ? (value as any).value 
              : value;
            setLocale(langValue as Language);
          }
        }}
        placeholder={t("app.settings.language.select")}
        optionValue={"value" as any}
        optionTextValue={"label" as any}
        itemComponent={(props) => {
          const option = props.item.rawValue as unknown as { value: Language; label: string; description: string };
          return (
            <SelectItem item={props.item}>
              <div class="flex flex-col">
                <span>{option.label}</span>
                <span class="text-xs text-muted-foreground">{option.description}</span>
              </div>
            </SelectItem>
          );
        }}
      >
        <SelectTrigger class="w-full">
          <SelectValue<Language>>{() => 
            currentLanguage()?.label || t("app.settings.language.select")
          }</SelectValue>
        </SelectTrigger>
        <SelectPortal>
          <SelectContent />
        </SelectPortal>
      </Select>
    </div>
  );
}

type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

function LogLevelSelector() {
  const { t } = useI18n();
  const [logLevel, setLogLevel] = createSignal<LogLevel>("info");
  const [isLoading, setIsLoading] = createSignal(false);

  // 加载当前日志级别
  onMount(async () => {
    try {
      const currentLevel = await invoke<LogLevel>("get_log_level");
      setLogLevel(currentLevel);
    } catch (error) {
      console.error("获取日志级别失败:", error);
    }
  });

  // 使用 createMemo 确保 log levels 响应语言变化
  const logLevels = createMemo(() => [
    { 
      value: "trace" as LogLevel, 
      label: t("app.settings.logging.trace"),
      description: t("app.settings.logging.traceDescription")
    },
    { 
      value: "debug" as LogLevel, 
      label: t("app.settings.logging.debug"),
      description: t("app.settings.logging.debugDescription")
    },
    { 
      value: "info" as LogLevel, 
      label: t("app.settings.logging.info"),
      description: t("app.settings.logging.infoDescription")
    },
    { 
      value: "warn" as LogLevel, 
      label: t("app.settings.logging.warn"),
      description: t("app.settings.logging.warnDescription")
    },
    { 
      value: "error" as LogLevel, 
      label: t("app.settings.logging.error"),
      description: t("app.settings.logging.errorDescription")
    },
  ]);

  const currentLogLevel = createMemo(() => 
    logLevels().find(l => l.value === logLevel()) || logLevels()[2]
  );

  const handleSetLogLevel = async (level: LogLevel | null) => {
    console.log("LogLevel onChange:", level, typeof level);
    if (level === null || level === undefined) return;
    // 如果 level 是对象，提取 value 属性；否则直接使用
    const logLevelValue = typeof level === 'object' && 'value' in level 
      ? (level as any).value 
      : level;
    setIsLoading(true);
    try {
      await invoke("set_log_level", { level: logLevelValue });
      setLogLevel(logLevelValue as LogLevel);
      console.log(t("app.settings.logging.setSuccess"));
    } catch (error) {
      console.error(t("app.settings.logging.setFailed"), error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div class="space-y-2">
      <Label>{t("app.settings.logging.title")}</Label>
      <Select
        options={logLevels()}
        value={logLevel()}
        onChange={handleSetLogLevel}
        placeholder={t("app.settings.logging.select")}
        optionValue={"value" as any}
        optionTextValue={"label" as any}
        disabled={isLoading()}
        itemComponent={(props) => {
          const option = props.item.rawValue as unknown as { value: LogLevel; label: string; description: string };
          return (
            <SelectItem item={props.item}>
              <div class="flex flex-col">
                <span>{option.label}</span>
                <span class="text-xs text-muted-foreground">{option.description}</span>
              </div>
            </SelectItem>
          );
        }}
      >
        <SelectTrigger class="w-full">
          <SelectValue<LogLevel>>{() => 
            currentLogLevel()?.label || t("app.settings.logging.select")
          }</SelectValue>
        </SelectTrigger>
        <SelectPortal>
          <SelectContent />
        </SelectPortal>
      </Select>
    </div>
  );
}

interface ServerStatus {
  is_running: boolean;
  address: string | null;
}

function ServerControl() {
  const { t } = useI18n();
  const [isRunning, setIsRunning] = createSignal(false);
  const [serverAddress, setServerAddress] = createSignal<string | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);

  // 加载服务器状态
  const loadServerStatus = async () => {
    try {
      const status = await invoke<ServerStatus>("get_server_status");
      setIsRunning(status.is_running);
      setServerAddress(status.address || null);
    } catch (error) {
      console.error("获取服务器状态失败:", error);
      setIsRunning(false);
      setServerAddress(null);
    }
  };

  // 组件挂载时加载状态
  onMount(() => {
    loadServerStatus();
  });

  // 处理服务器开关切换
  const handleServerToggle = (checked: boolean) => {
    setIsLoading(true);
    // 使用异步函数处理
    (async () => {
      try {
        if (checked) {
          // 启动服务器
          const status = await invoke<ServerStatus>("start_server");
          setIsRunning(status.is_running);
          setServerAddress(status.address || null);
          if (status.is_running) {
            console.log(t("app.settings.server.startSuccess"));
          } else {
            console.error(t("app.settings.server.startFailed"));
          }
        } else {
          // 停止服务器
          const status = await invoke<ServerStatus>("stop_server");
          setIsRunning(status.is_running);
          setServerAddress(status.address || null);
          if (!status.is_running) {
            console.log(t("app.settings.server.stopSuccess"));
          } else {
            console.error(t("app.settings.server.stopFailed"));
          }
        }
      } catch (error) {
        console.error("服务器操作失败:", error);
        // 操作失败后重新加载状态
        await loadServerStatus();
      } finally {
        setIsLoading(false);
      }
    })();
  };

  return (
    <div class="space-y-4">
      <div class="space-y-2">
        <Switch
          checked={isRunning()}
          onChange={handleServerToggle}
          disabled={isLoading()}
          class="flex items-center gap-x-2"
        >
          <SwitchInput />
          <SwitchControl>
            <SwitchThumb />
          </SwitchControl>
          <SwitchLabel>{t("app.settings.server.enabled")}</SwitchLabel>
        </Switch>
        <p class="text-sm text-muted-foreground pl-10">
          {isRunning() 
            ? t("app.settings.server.enabledDescription")
            : t("app.settings.server.disabledDescription")
          }
        </p>
      </div>

      {isLoading() && (
        <p class="text-sm text-muted-foreground">
          {isRunning() 
            ? t("app.settings.server.stopping")
            : t("app.settings.server.starting")
          }
        </p>
      )}

      {isRunning() && serverAddress() && (
        <div class="space-y-2 rounded-lg border p-3 bg-muted/50">
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">{t("app.settings.server.status")}:</span>
            <span class="font-medium text-green-600 dark:text-green-400">
              {t("app.settings.server.running")}
            </span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">{t("app.settings.server.address")}:</span>
            <span class="font-mono text-xs">{serverAddress()}</span>
          </div>
        </div>
      )}

      {!isRunning() && !isLoading() && (
        <div class="space-y-2 rounded-lg border p-3 bg-muted/50">
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">{t("app.settings.server.status")}:</span>
            <span class="font-medium text-muted-foreground">
              {t("app.settings.server.stopped")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface FeatureModule {
  id: FeatureId;
  name: string;
  description: string;
}

function FeatureModulesControl() {
  const { t } = useI18n();
  const { enabledFeatures, toggleFeature } = useFeatures();
  
  // 定义所有功能模块
  const featureModules = createMemo<FeatureModule[]>(() => [
    {
      id: "inference" as FeatureId,
      name: t("app.settings.features.inference"),
      description: t("app.settings.features.inferenceDescription"),
    },
    {
      id: "chat" as FeatureId,
      name: t("app.settings.features.chat"),
      description: t("app.settings.features.chatDescription"),
    },
    {
      id: "workflow" as FeatureId,
      name: t("app.settings.features.workflow"),
      description: t("app.settings.features.workflowDescription"),
    },
    {
      id: "novel" as FeatureId,
      name: t("app.settings.features.novel"),
      description: t("app.settings.features.novelDescription"),
    },
    {
      id: "comic" as FeatureId,
      name: t("app.settings.features.comic"),
      description: t("app.settings.features.comicDescription"),
    },
    {
      id: "audio" as FeatureId,
      name: t("app.settings.features.audio"),
      description: t("app.settings.features.audioDescription"),
    },
    {
      id: "video" as FeatureId,
      name: t("app.settings.features.video"),
      description: t("app.settings.features.videoDescription"),
    },
    {
      id: "models" as FeatureId,
      name: t("app.settings.features.models"),
      description: t("app.settings.features.modelsDescription"),
    },
    {
      id: "history" as FeatureId,
      name: t("app.settings.features.history"),
      description: t("app.settings.features.historyDescription"),
    },
  ]);

  return (
    <div class="space-y-4">
      {featureModules().map((feature) => (
        <div class="flex items-start justify-between gap-4 py-2">
          <div class="flex-1 space-y-1">
            <div class="font-medium">{feature.name}</div>
            <div class="text-sm text-muted-foreground">{feature.description}</div>
          </div>
          <SeekerSwitch
            checked={enabledFeatures()[feature.id] ?? true}
            class="flex items-center gap-x-2"
          />
          <Switch
            checked={enabledFeatures()[feature.id] ?? true}
            onChange={(checked) => toggleFeature(feature.id, checked)}
            class="flex items-center gap-x-2"
          >
            <SwitchInput />
            <SwitchControl>
              <SwitchThumb />
            </SwitchControl>
          </Switch>
        </div>
      ))}
    </div>
  );
}

