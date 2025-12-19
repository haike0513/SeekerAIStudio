import { createSignal, Show, createMemo, onMount } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { createForm } from "@tanstack/solid-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider, SliderTrack, SliderFill, SliderThumb } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-solid";
import { useI18n } from "@/lib/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

interface InferenceResponse {
  text: string;
  success: boolean;
  error?: string;
}

interface UnifiedInferenceRequest {
  model_path: string;
  model_type: string;
  tokenizer_path?: string;
  prompt: string;
  max_tokens?: number;
}

interface LocalModelInfo {
  name: string;
  path: string;
  size: number;
  model_type: string;
  modified_time?: string;
  tokenizer_path?: string;
}

interface ModelOption {
  value: string;
  label: string;
  modelType: "gguf" | "safetensors";
  tokenizerPath?: string;
}

interface InferenceFormData {
  modelPath: string;
  prompt: string;
  maxTokens: number;
}

export default function InferencePanel() {
  const { t } = useI18n();
  const [loading, setLoading] = createSignal(false);
  const [message, setMessage] = createSignal("");
  const [response, setResponse] = createSignal("");
  const [modelLoaded, setModelLoaded] = createSignal(false);
  const [localModels, setLocalModels] = createSignal<LocalModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = createSignal(false);

  // 表单提交处理函数
  async function handleSubmit(values: InferenceFormData) {
    // 清除之前的消息
    setMessage("");
    console.log("values", values);

    console.log("model", allModels());
    if (!values.prompt || values.prompt.trim() === "") {
      setMessage(t("inference.pleaseEnterPrompt"));
      return;
    }

    if (!values.modelPath || values.modelPath.trim() === "") {
      setMessage(t("inference.pleaseLoadModel"));
      return;
    }

    const model = allModels().find(m => m.value === values.modelPath);

    if (!model) {
      setMessage(t("inference.pleaseLoadModel"));
      return;
    }

    setLoading(true);
    setResponse("");
    setMessage(t("inference.generating"));

    try {
      const request: UnifiedInferenceRequest = {
        model_path: model.value,
        model_type: model.modelType,
        tokenizer_path: model.tokenizerPath,
        prompt: values.prompt,
        max_tokens: values.maxTokens,
      };

      const result = await invoke<InferenceResponse>("unified_inference", {
        request,
      });

      if (result.success) {
        setResponse(result.text);
        setMessage(t("inference.generateComplete"));
        setModelLoaded(true);
      } else {
        setMessage(`${t("inference.generateFailed")}: ${result.error || t("inference.unknownError")}`);
      }
    } catch (error) {
      console.error("推理失败:", error);
      setMessage(`${t("inference.error")}: ${error}`);
    } finally {
      setLoading(false);
    }
  }

  // 创建表单实例
  const form = createForm(() => ({
    defaultValues: {
      modelPath: "",
      prompt: "",
      maxTokens: 512,
    } as InferenceFormData,
    onSubmit: async ({ value }) => {
      await handleSubmit(value);
    },
  }));

  // 从文件路径提取文件名（用于显示）
  function getFileName(path: string): string {
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || path;
  }

  // 合并所有模型到一个列表
  const allModels = createMemo(() => {
    const models = localModels();
    // 按模型名称和类型分组
    const groups = new Map<string, typeof models>();
    models.forEach(m => {
      const key = `${m.name}_${m.model_type}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(m);
    });

    // 生成选项列表
    return Array.from(groups.values()).flatMap((files) => {
      const modelName = files[0].name;
      const modelType = files[0].model_type as "gguf" | "safetensors";
      
      if (files.length === 1) {
        return [{
          value: files[0].path,
          label: `${modelName} [${modelType.toUpperCase()}]`,
          modelType,
          tokenizerPath: files[0].tokenizer_path
        }];
      } else {
        // 多个文件，显示文件名区分
        return files.map(f => ({
          value: f.path,
          label: `${modelName} (${getFileName(f.path)}) [${modelType.toUpperCase()}]`,
          modelType,
          tokenizerPath: f.tokenizer_path
        }));
      }
    });
  });

  // 从后端加载模型列表
  async function loadModels() {
    setLoadingModels(true);
    try {
      const models = await invoke<LocalModelInfo[]>("get_local_models");
      setLocalModels(models);
    } catch (error) {
      console.error("加载模型列表失败:", error);
      setMessage(`${t("inference.error")}: ${error}`);
    } finally {
      setLoadingModels(false);
    }
  }

  // 处理模型选择变化
  function handleModelChange(value: string | null) {
    if (!value) {
      setModelLoaded(false);
      return;
    }

    // 清除之前的消息和加载状态
    setModelLoaded(false);
    setMessage("");
    
    // 验证模型是否存在
    const model = allModels().find(m => m.value === value);
    if (model) {
      console.log("模型已选择:", model.label);
    }
  }

  // 页面加载时加载模型列表
  onMount(() => {
    loadModels();
  });

  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold mb-6">{t("inference.title")}</h1>

      {/* 模型选择 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("inference.modelInit")}</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label>{t("inference.modelPath")}:</Label>
            <div class="flex gap-2">
              <form.Field name="modelPath">
                {(field) => {
                  // 使用 createMemo 确保响应式更新
                  const currentValue = () => field().state.value || "";
                  const selectedModelOption = createMemo(() => {
                    const value = currentValue();
                    if (!value) return null;
                    return allModels().find(m => m.value === value);
                  });

                  return (
                    <Select
                      options={allModels()}
                      value={currentValue() || undefined}
                      onChange={(value) => {
                        console.log("Select onChange:", value, typeof value);
                        // Kobalte Select 的 onChange 直接返回选项的值（字符串）
                        if (value === null || value === undefined) {
                          field().handleChange("");
                          handleModelChange(null);
                        } else {
                          // value 应该是字符串（模型路径）
                          const pathValue = String((value as any)?.value || "");
                          field().handleChange(pathValue);
                          handleModelChange(pathValue);
                        }
                      }}
                      placeholder={t("inference.placeholder.modelPath")}
                      optionValue={"value" as any}
                      optionTextValue={"label" as any}
                      itemComponent={(props) => {
                        const option = props.item.rawValue as unknown as ModelOption;
                        return (
                          <SelectItem item={props.item}>
                            {option.label}
                          </SelectItem>
                        );
                      }}
                      class="flex-1"
                      disabled={loadingModels() || loading()}
                    >
                      <SelectTrigger class="flex-1">
                        <SelectValue<string>>{() => {
                          const selected = selectedModelOption();
                          if (!selected) return t("inference.placeholder.modelPath") as string;
                          return selected.label;
                        }}</SelectValue>
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectContent />
                      </SelectPortal>
                    </Select>
                  );
                }}
              </form.Field>
              <Button
                onClick={loadModels}
                variant="outline"
                size="sm"
                disabled={loadingModels()}
                title={t("inference.refreshModels")}
              >
                <Show when={loadingModels()} fallback={<RefreshCw class="h-4 w-4" />}>
                  <Loader2 class="h-4 w-4 animate-spin" />
                </Show>
              </Button>
            </div>
          </div>

          <Show when={modelLoaded()}>
            <Alert variant="default" class="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
              <CheckCircle2 class="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle class="text-green-800 dark:text-green-200">{t("inference.modelLoaded")}</AlertTitle>
            </Alert>
          </Show>

          <Show when={message()}>
            <Alert>
              <AlertDescription>{message()}</AlertDescription>
            </Alert>
          </Show>
        </CardContent>
      </Card>

      {/* 推理区域 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("inference.inference")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            class="space-y-4"
          >
            {/* 提示词输入 */}
            <form.Field name="prompt">
              {(field) => (
                <div class="space-y-2">
                  <Label for={field().name}>{t("inference.prompt")}:</Label>
                  <Textarea
                    id={field().name}
                    name={field().name}
                    value={field().state.value}
                    onInput={(e) => field().handleChange(e.currentTarget.value)}
                    placeholder={t("inference.placeholder.prompt")}
                    rows="4"
                  />
                  <Show when={field().state.meta.errors.length > 0}>
                    <p class="text-sm text-destructive">
                      {field().state.meta.errors[0]}
                    </p>
                  </Show>
                </div>
              )}
            </form.Field>

            {/* 参数设置 */}
            <form.Field name="maxTokens">
              {(field) => (
                <div class="space-y-2">
                  <Label>{t("inference.maxTokens")}: {field().state.value}</Label>
                  <Slider
                    value={[field().state.value]}
                    onChange={(values: number[]) => field().handleChange(values[0])}
                    minValue={1}
                    maxValue={2048}
                    step={1}
                  >
                    <SliderTrack>
                      <SliderFill />
                      <SliderThumb />
                    </SliderTrack>
                  </Slider>
                </div>
              )}
            </form.Field>

            {/* 生成按钮 */}
            <Button
              type="submit"
              disabled={loading() || form.state.isSubmitting}
              variant="default"
              size="lg"
              class="w-full"
            >
              <Show when={loading() || form.state.isSubmitting} fallback={t("inference.generate")}>
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {t("inference.generating")}
              </Show>
            </Button>
          </form>

          {/* 结果展示 */}
          <Show when={response()}>
            <div class="mt-6 space-y-2">
              <h3 class="text-lg font-semibold">{t("inference.result")}:</h3>
              <Card>
                <CardContent class="pt-6">
                  <pre class="whitespace-pre-wrap text-sm">{response()}</pre>
                </CardContent>
              </Card>
            </div>
          </Show>
        </CardContent>
      </Card>
    </div>
  );
}

