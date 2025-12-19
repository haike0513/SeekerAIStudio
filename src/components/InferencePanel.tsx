import { createSignal, Show, createMemo, onMount } from "solid-js";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem, RadioGroupItemInput, RadioGroupItemLabel, RadioGroupItems, RadioGroupItemControl, RadioGroupItemIndicator } from "@/components/ui/radio-group";
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

interface InitModelRequest {
  model_path: string;
  tokenizer_path: string;
}

interface InferenceRequest {
  prompt: string;
  max_tokens?: number;
}

interface MultimodalInferenceRequest {
  image_path: string;
  prompt: string;
  max_tokens?: number;
}

interface InferenceResponse {
  text: string;
  success: boolean;
  error?: string;
}

interface InitModelResponse {
  success: boolean;
  message: string;
}

interface InitGGUFFileRequest {
  model_path: string;
  tokenizer_path?: string;
}

interface InitGGUFHubRequest {
  hf_repo: string;
  hf_filename: string;
  tokenizer_path?: string;
}

interface LocalModelInfo {
  name: string;
  path: string;
  size: number;
  model_type: string;
  modified_time?: string;
  tokenizer_path?: string;
}

interface TokenizerInfo {
  name: string;
  path: string;
  modified_time?: string;
}

export default function InferencePanel() {
  const { t } = useI18n();
  const [modelLoaded, setModelLoaded] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [message, setMessage] = createSignal("");
  const [prompt, setPrompt] = createSignal("");
  const [response, setResponse] = createSignal("");
  const [modelPath, setModelPath] = createSignal("");
  const [tokenizerPath, setTokenizerPath] = createSignal("");
  const [imagePath, setImagePath] = createSignal("");
  const [maxTokens, setMaxTokens] = createSignal(512);
  const [isMultimodal, setIsMultimodal] = createSignal(false);
  const [modelType, setModelType] = createSignal<"safetensors" | "gguf">("gguf");
  const [ggufModelPath, setGgufModelPath] = createSignal("");
  const [ggufTokenizerPath, setGgufTokenizerPath] = createSignal("");
  const [ggufHfRepo, setGgufHfRepo] = createSignal("HuggingFaceTB/SmolLM2-360M-Instruct-GGUF");
  const [ggufHfFilename, setGgufHfFilename] = createSignal("smollm2-360m-instruct-q8_0.gguf");
  const [ggufLoadFromHub, setGgufLoadFromHub] = createSignal(false);
  const [ggufModelLoaded, setGgufModelLoaded] = createSignal(false);
  const [localModels, setLocalModels] = createSignal<LocalModelInfo[]>([]);
  const [localTokenizers, setLocalTokenizers] = createSignal<TokenizerInfo[]>([]);
  const [loadingModels, setLoadingModels] = createSignal(false);

  // 从文件路径提取文件名（用于显示）
  function getFileName(path: string): string {
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || path;
  }

  // 从后端获取的 GGUF 模型列表
  // 按模型名称分组，显示模型名称和文件名
  const ggufModels = createMemo(() => {
    const models = localModels().filter(m => m.model_type === "gguf");
    // 按模型名称分组
    const groups = new Map<string, typeof models>();
    models.forEach(m => {
      if (!groups.has(m.name)) {
        groups.set(m.name, []);
      }
      groups.get(m.name)!.push(m);
    });

    // 如果同一模型有多个文件，显示为 "模型名称 (文件名)"
    return Array.from(groups.entries()).flatMap(([modelName, files]) => {
      if (files.length === 1) {
        return [{
          value: files[0].path,
          label: modelName,
          tokenizerPath: files[0].tokenizer_path
        }];
      } else {
        // 多个文件，显示文件名区分
        return files.map(f => ({
          value: f.path,
          label: `${modelName} (${getFileName(f.path)})`,
          tokenizerPath: f.tokenizer_path
        }));
      }
    });
  });

  // 从后端获取的 Safetensors 模型列表
  const safetensorsModels = createMemo(() => {
    const models = localModels().filter(m => m.model_type === "safetensors");
    // 按模型名称分组
    const groups = new Map<string, typeof models>();
    models.forEach(m => {
      if (!groups.has(m.name)) {
        groups.set(m.name, []);
      }
      groups.get(m.name)!.push(m);
    });

    // 如果同一模型有多个文件，显示为 "模型名称 (文件名)"
    return Array.from(groups.entries()).flatMap(([modelName, files]) => {
      if (files.length === 1) {
        return [{
          value: files[0].path,
          label: modelName,
          tokenizerPath: files[0].tokenizer_path
        }];
      } else {
        // 多个文件，显示文件名区分
        return files.map(f => ({
          value: f.path,
          label: `${modelName} (${getFileName(f.path)})`,
          tokenizerPath: f.tokenizer_path
        }));
      }
    });
  });

  // 从后端获取的 Tokenizer 列表
  const tokenizerPaths = createMemo(() => {
    const tokenizers = localTokenizers();
    return tokenizers.map(t => ({ value: t.path, label: t.name }));
  });

  // 从后端加载模型列表和 tokenizer 列表
  async function loadModels() {
    setLoadingModels(true);
    try {
      const [models, tokenizers] = await Promise.all([
        invoke<LocalModelInfo[]>("get_local_models"),
        invoke<TokenizerInfo[]>("get_local_tokenizers"),
      ]);
      setLocalModels(models);
      setLocalTokenizers(tokenizers);
    } catch (error) {
      console.error("加载模型列表失败:", error);
      setMessage(`${t("inference.error")}: ${error}`);
    } finally {
      setLoadingModels(false);
    }
  }

  // 检查模型状态
  async function checkModelStatus() {
    try {
      if (modelType() === "gguf") {
        const loaded = await invoke<boolean>("is_gguf_model_loaded");
        setGgufModelLoaded(loaded);
        if (loaded) {
          setMessage(t("inference.ggufModelLoaded"));
        }
      } else {
        const loaded = await invoke<boolean>("is_model_loaded");
        setModelLoaded(loaded);
        if (loaded) {
          setMessage(t("inference.modelLoaded"));
        }
      }
    } catch (error) {
      console.error("检查模型状态失败:", error);
      setMessage(`${t("inference.error")}: ${error}`);
    }
  }

  // 初始化模型
  async function initModel() {
    if (modelType() === "gguf") {
      await initGGUFModel();
    } else {
      await initSafetensorsModel();
    }
  }

  // 初始化 Safetensors 模型
  async function initSafetensorsModel() {
    if (!modelPath() || !tokenizerPath()) {
      setMessage(t("inference.pleaseProvidePaths"));
      return;
    }

    setLoading(true);
    setMessage(t("inference.loading"));

    try {
      const request: InitModelRequest = {
        model_path: modelPath(),
        tokenizer_path: tokenizerPath(),
      };

      const result = await invoke<InitModelResponse>("init_qwen3vl_model", {
        request,
      });

      if (result.success) {
        setModelLoaded(true);
        setMessage(result.message);
      } else {
        setMessage(`初始化失败: ${result.message}`);
      }
    } catch (error) {
      console.error("模型初始化失败:", error);
      setMessage(`错误: ${error}`);
    } finally {
      setLoading(false);
    }
  }

  // 初始化 GGUF 模型
  async function initGGUFModel() {
    setLoading(true);
    setMessage(t("inference.loading"));

    try {
      if (ggufLoadFromHub()) {
        // 从 HuggingFace Hub 加载
        if (!ggufHfRepo() || !ggufHfFilename()) {
          setMessage(t("inference.pleaseProvideHFInfo"));
          setLoading(false);
          return;
        }

        const request: InitGGUFHubRequest = {
          hf_repo: ggufHfRepo(),
          hf_filename: ggufHfFilename(),
          tokenizer_path: ggufTokenizerPath() || undefined,
        };

        const result = await invoke<InitModelResponse>("init_gguf_model_from_hub", {
          request,
        });

        if (result.success) {
          setGgufModelLoaded(true);
          setMessage(result.message);
        } else {
          setMessage(`初始化失败: ${result.message}`);
        }
      } else {
        // 从本地文件加载
        if (!ggufModelPath()) {
          setMessage(t("inference.pleaseProvideGGUFPath"));
          setLoading(false);
          return;
        }

        const request: InitGGUFFileRequest = {
          model_path: ggufModelPath(),
          tokenizer_path: ggufTokenizerPath() || undefined,
        };

        const result = await invoke<InitModelResponse>("init_gguf_model_from_file", {
          request,
        });

        if (result.success) {
          setGgufModelLoaded(true);
          setMessage(result.message);
        } else {
          setMessage(`初始化失败: ${result.message}`);
        }
      }
    } catch (error) {
      console.error("GGUF 模型初始化失败:", error);
      setMessage(`错误: ${error}`);
    } finally {
      setLoading(false);
    }
  }

  // 执行文本推理
  async function generateText() {
    if (!prompt()) {
      setMessage(t("inference.pleaseEnterPrompt"));
      return;
    }

    if (modelType() === "gguf") {
      if (!ggufModelLoaded()) {
        setMessage(t("inference.pleaseLoadGGUFModel"));
        return;
      }
    } else {
      if (!modelLoaded()) {
        setMessage(t("inference.pleaseLoadModel"));
        return;
      }
    }

    setLoading(true);
    setResponse("");
    setMessage(t("inference.generating"));

    try {
      const request: InferenceRequest = {
        prompt: prompt(),
        max_tokens: maxTokens(),
      };

      const command = modelType() === "gguf" ? "generate_gguf_text" : "generate_text";
      const result = await invoke<InferenceResponse>(command, {
        request,
      });

      if (result.success) {
        setResponse(result.text);
        setMessage(t("inference.generateComplete"));
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

  // 执行多模态推理（仅支持 safetensors 模型）
  async function generateMultimodal() {
    if (modelType() === "gguf") {
      setMessage(t("inference.ggufNotSupportMultimodal"));
      return;
    }

    if (!prompt()) {
      setMessage(t("inference.pleaseEnterPrompt"));
      return;
    }

    if (!imagePath()) {
      setMessage(t("inference.pleaseSelectImage"));
      return;
    }

    if (!modelLoaded()) {
      setMessage(t("inference.pleaseLoadModel"));
      return;
    }

    setLoading(true);
    setResponse("");
    setMessage(t("inference.generating"));

    try {
      const request: MultimodalInferenceRequest = {
        image_path: imagePath(),
        prompt: prompt(),
        max_tokens: maxTokens(),
      };

      const result = await invoke<InferenceResponse>("generate_multimodal", {
        request,
      });

      if (result.success) {
        setResponse(result.text);
        setMessage(t("inference.generateComplete"));
      } else {
        setMessage(`${t("inference.generateFailed")}: ${result.error || t("inference.unknownError")}`);
      }
    } catch (error) {
      console.error("多模态推理失败:", error);
      setMessage(`${t("inference.error")}: ${error}`);
    } finally {
      setLoading(false);
    }
  }

  // 选择文件（使用 Tauri 的 dialog API）
  async function selectFile(type: "model" | "tokenizer" | "image") {
    try {
      const filters = [];
      if (type === "image") {
        filters.push({ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] });
      } else if (type === "model") {
        if (modelType() === "gguf") {
          filters.push({ name: "GGUF Models", extensions: ["gguf"] });
        } else {
          filters.push({ name: "Safetensors Models", extensions: ["safetensors"] });
        }
      } else if (type === "tokenizer") {
        filters.push({ name: "Tokenizer", extensions: ["json"] });
      }

      const selected = await open({
        multiple: false,
        directory: false,
        filters,
      });

      if (selected) {
        // selected 为文件路径字符串 (因为 multiple: false)
        const path = selected;

        if (type === "model") {
          if (modelType() === "gguf") {
            setGgufModelPath(path);
          } else {
            setModelPath(path);
          }
        } else if (type === "tokenizer") {
          if (modelType() === "gguf") {
            setGgufTokenizerPath(path);
          } else {
            setTokenizerPath(path);
          }
        } else if (type === "image") {
          setImagePath(path);
        }
      }
    } catch (error) {
      console.error("选择文件失败:", error);
      setMessage(`${t("inference.error")}: ${error}`);
    }
  }

  // 页面加载时检查模型状态并加载模型列表
  onMount(() => {
    checkModelStatus();
    loadModels();
  });

  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold mb-6">{t("inference.title")}</h1>

      {/* 模型类型选择 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("inference.modelType")}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={modelType()}
            onChange={(value) => setModelType(value as "gguf" | "safetensors")}
          >
            <RadioGroupItems>
              <RadioGroupItem value="gguf">
                <RadioGroupItemInput />
                <RadioGroupItemControl>
                  <RadioGroupItemIndicator />
                </RadioGroupItemControl>
                <RadioGroupItemLabel>{t("inference.ggufModel")}</RadioGroupItemLabel>
              </RadioGroupItem>
              <RadioGroupItem value="safetensors">
                <RadioGroupItemInput />
                <RadioGroupItemControl>
                  <RadioGroupItemIndicator />
                </RadioGroupItemControl>
                <RadioGroupItemLabel>{t("inference.safetensorsModel")}</RadioGroupItemLabel>
              </RadioGroupItem>
            </RadioGroupItems>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* 模型初始化区域 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("inference.modelInit")}</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          {/* GGUF 模型初始化 */}
          <Show when={modelType() === "gguf"}>
            <div class="space-y-4">
              <RadioGroup
                value={ggufLoadFromHub() ? "hub" : "file"}
                onChange={(value) => setGgufLoadFromHub(value === "hub")}
              >
                <RadioGroupItems>
                  <RadioGroupItem value="file">
                    <RadioGroupItemInput />
                    <RadioGroupItemControl>
                      <RadioGroupItemIndicator />
                    </RadioGroupItemControl>
                    <RadioGroupItemLabel>{t("inference.loadFromFile")}</RadioGroupItemLabel>
                  </RadioGroupItem>
                  <RadioGroupItem value="hub">
                    <RadioGroupItemInput />
                    <RadioGroupItemControl>
                      <RadioGroupItemIndicator />
                    </RadioGroupItemControl>
                    <RadioGroupItemLabel>{t("inference.loadFromHub")}</RadioGroupItemLabel>
                  </RadioGroupItem>
                </RadioGroupItems>
              </RadioGroup>

              <Show when={!ggufLoadFromHub()}>
                <div class="space-y-2">
                  <Label>{t("inference.modelPath")}:</Label>
                  <div class="flex gap-2">
                    <Show
                      when={ggufModels().length > 0}
                      fallback={
                        <Input
                          type="text"
                          value={ggufModelPath()}
                          onInput={(e) => setGgufModelPath(e.currentTarget.value)}
                          placeholder={t("inference.placeholder.ggufModelPath")}
                          class="flex-1"
                        />
                      }
                    >
                      <Select
                        options={ggufModels()}
                        value={ggufModelPath()}
                        onChange={(value) => {
                          if (value === null || value === undefined) return;
                          const pathValue = typeof value === 'object' && 'value' in value
                            ? (value as any).value
                            : value;
                          if (pathValue) {
                            setGgufModelPath(pathValue as string);
                            // 如果模型有关联的 tokenizer，自动填充
                            const selectedModel = ggufModels().find(m => m.value === pathValue);
                            if (selectedModel?.tokenizerPath) {
                              setGgufTokenizerPath(selectedModel.tokenizerPath);
                            }
                          }
                        }}
                        placeholder={t("inference.placeholder.ggufModelPath")}
                        optionValue={"value" as any}
                        optionTextValue={"label" as any}
                        itemComponent={(props) => {
                          const option = props.item.rawValue as unknown as { value: string; label: string };
                          return (
                            <SelectItem item={props.item}>
                              {option.label}
                            </SelectItem>
                          );
                        }}
                        class="flex-1"
                        disabled={loadingModels()}
                      >
                        <SelectTrigger class="flex-1">
                          <SelectValue<string>>{() => {
                            const currentPath = ggufModelPath();
                            if (!currentPath) return t("inference.placeholder.ggufModelPath") as string;
                            const selected = ggufModels().find(p => p.value === currentPath);
                            return selected ? selected.label : currentPath;
                          }}</SelectValue>
                        </SelectTrigger>
                        <SelectPortal>
                          <SelectContent />
                        </SelectPortal>
                      </Select>
                    </Show>
                    <Button onClick={() => selectFile("model")} variant="outline">
                      {t("inference.select")}
                    </Button>
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
              </Show>

              <Show when={ggufLoadFromHub()}>
                <div class="space-y-4">
                  <div class="space-y-2">
                    <Label>{t("inference.hfRepo")}:</Label>
                    <Input
                      type="text"
                      value={ggufHfRepo()}
                      onInput={(e) => setGgufHfRepo(e.currentTarget.value)}
                      placeholder={t("inference.placeholder.hfRepo")}
                    />
                  </div>
                  <div class="space-y-2">
                    <Label>{t("inference.modelFilename")}:</Label>
                    <Input
                      type="text"
                      value={ggufHfFilename()}
                      onInput={(e) => setGgufHfFilename(e.currentTarget.value)}
                      placeholder={t("inference.placeholder.hfFilename")}
                    />
                  </div>
                </div>
              </Show>

              <div class="space-y-2">
                <Label>{t("inference.tokenizerPathOptional")}:</Label>
                <div class="flex gap-2">
                  <Show
                    when={tokenizerPaths().length > 0}
                    fallback={
                      <Input
                        type="text"
                        value={ggufTokenizerPath()}
                        onInput={(e) => setGgufTokenizerPath(e.currentTarget.value)}
                        placeholder={t("inference.placeholder.tokenizerPathOptional")}
                        class="flex-1"
                      />
                    }
                  >
                    <Select
                      options={tokenizerPaths()}
                      value={ggufTokenizerPath()}
                      onChange={(value) => {
                        if (value === null || value === undefined) return;
                        const pathValue = typeof value === 'object' && 'value' in value
                          ? (value as any).value
                          : value;
                        if (pathValue) {
                          setGgufTokenizerPath(pathValue as string);
                        }
                      }}
                      placeholder={t("inference.placeholder.tokenizerPathOptional")}
                      optionValue={"value" as any}
                      optionTextValue={"label" as any}
                      itemComponent={(props) => {
                        const option = props.item.rawValue as unknown as { value: string; label: string };
                        return (
                          <SelectItem item={props.item}>
                            {option.label}
                          </SelectItem>
                        );
                      }}
                      class="flex-1"
                      disabled={loadingModels()}
                    >
                      <SelectTrigger class="flex-1">
                        <SelectValue<string>>{() => {
                          const currentPath = ggufTokenizerPath();
                          if (!currentPath) return t("inference.placeholder.tokenizerPathOptional") as string;
                          const selected = tokenizerPaths().find(p => p.value === currentPath);
                          return selected ? selected.label : currentPath;
                        }}</SelectValue>
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectContent />
                      </SelectPortal>
                    </Select>
                  </Show>
                  <Button onClick={() => selectFile("tokenizer")} variant="outline">
                    {t("inference.select")}
                  </Button>
                </div>
              </div>

              <div class="flex gap-2">
                <Button
                  onClick={initModel}
                  disabled={loading()}
                  variant="default"
                >
                  <Show when={loading()} fallback={t("inference.initModel")}>
                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                    {t("inference.loading")}
                  </Show>
                </Button>
                <Button onClick={checkModelStatus} variant="secondary">
                  {t("inference.checkStatus")}
                </Button>
              </div>
            </div>
          </Show>

          {/* Safetensors 模型初始化 */}
          <Show when={modelType() === "safetensors"}>
            <div class="space-y-4">
              <div class="space-y-2">
                <Label>{t("inference.modelPath")}:</Label>
                <div class="flex gap-2">
                  <Show
                    when={safetensorsModels().length > 0}
                    fallback={
                      <Input
                        type="text"
                        value={modelPath()}
                        onInput={(e) => setModelPath(e.currentTarget.value)}
                        placeholder={t("inference.placeholder.modelPath")}
                        class="flex-1"
                      />
                    }
                  >
                    <Select
                      options={safetensorsModels()}
                      value={modelPath()}
                      onChange={(value) => {
                        if (value === null || value === undefined) return;
                        const pathValue = typeof value === 'object' && 'value' in value
                          ? (value as any).value
                          : value;
                        if (pathValue) {
                          setModelPath(pathValue as string);
                          // 如果模型有关联的 tokenizer，自动填充
                          const selectedModel = safetensorsModels().find(m => m.value === pathValue);
                          if (selectedModel?.tokenizerPath) {
                            setTokenizerPath(selectedModel.tokenizerPath);
                          }
                        }
                      }}
                      placeholder={t("inference.placeholder.modelPath")}
                      optionValue={"value" as any}
                      optionTextValue={"label" as any}
                      itemComponent={(props) => {
                        const option = props.item.rawValue as unknown as { value: string; label: string };
                        return (
                          <SelectItem item={props.item}>
                            {option.label}
                          </SelectItem>
                        );
                      }}
                      class="flex-1"
                      disabled={loadingModels()}
                    >
                      <SelectTrigger class="flex-1">
                        <SelectValue<string>>{() => {
                          const currentPath = modelPath();
                          if (!currentPath) return t("inference.placeholder.modelPath") as string;
                          const selected = safetensorsModels().find(p => p.value === currentPath);
                          return selected ? selected.label : currentPath;
                        }}</SelectValue>
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectContent />
                      </SelectPortal>
                    </Select>
                  </Show>
                  <Button onClick={() => selectFile("model")} variant="outline">
                    {t("inference.select")}
                  </Button>
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

              <div class="space-y-2">
                <Label>{t("inference.tokenizerPath")}:</Label>
                <div class="flex gap-2">
                  <Show
                    when={tokenizerPaths().length > 0}
                    fallback={
                      <Input
                        type="text"
                        value={tokenizerPath()}
                        onInput={(e) => setTokenizerPath(e.currentTarget.value)}
                        placeholder={t("inference.placeholder.tokenizerPath")}
                        class="flex-1"
                      />
                    }
                  >
                    <Select
                      options={tokenizerPaths()}
                      value={tokenizerPath()}
                      onChange={(value) => {
                        if (value === null || value === undefined) return;
                        const pathValue = typeof value === 'object' && 'value' in value
                          ? (value as any).value
                          : value;
                        if (pathValue) {
                          setTokenizerPath(pathValue as string);
                        }
                      }}
                      placeholder={t("inference.placeholder.tokenizerPath")}
                      optionValue={"value" as any}
                      optionTextValue={"label" as any}
                      itemComponent={(props) => {
                        const option = props.item.rawValue as unknown as { value: string; label: string };
                        return (
                          <SelectItem item={props.item}>
                            {option.label}
                          </SelectItem>
                        );
                      }}
                      class="flex-1"
                      disabled={loadingModels()}
                    >
                      <SelectTrigger class="flex-1">
                        <SelectValue<string>>{() => {
                          const currentPath = tokenizerPath();
                          if (!currentPath) return t("inference.placeholder.tokenizerPath") as string;
                          const selected = tokenizerPaths().find(p => p.value === currentPath);
                          return selected ? selected.label : currentPath;
                        }}</SelectValue>
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectContent />
                      </SelectPortal>
                    </Select>
                  </Show>
                  <Button onClick={() => selectFile("tokenizer")} variant="outline">
                    {t("inference.select")}
                  </Button>
                </div>
              </div>

              <div class="flex gap-2">
                <Button
                  onClick={initModel}
                  disabled={loading()}
                  variant="default"
                >
                  <Show when={loading()} fallback={t("inference.initModel")}>
                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                    {t("inference.loading")}
                  </Show>
                </Button>
                <Button onClick={checkModelStatus} variant="secondary">
                  {t("inference.checkStatus")}
                </Button>
              </div>
            </div>
          </Show>

          <Show when={modelType() === "gguf" && ggufModelLoaded()}>
            <Alert variant="default" class="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
              <CheckCircle2 class="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle class="text-green-800 dark:text-green-200">{t("inference.ggufModelLoaded")}</AlertTitle>
            </Alert>
          </Show>

          <Show when={modelType() === "safetensors" && modelLoaded()}>
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
        <CardContent class="space-y-4">
          {/* 模式选择（仅 safetensors 模型支持多模态） */}
          <Show when={modelType() === "safetensors"}>
            <RadioGroup
              value={isMultimodal() ? "multimodal" : "text"}
              onChange={(value) => setIsMultimodal(value === "multimodal")}
            >
              <RadioGroupItems>
                <RadioGroupItem value="text">
                  <RadioGroupItemInput />
                  <RadioGroupItemControl>
                    <RadioGroupItemIndicator />
                  </RadioGroupItemControl>
                  <RadioGroupItemLabel>{t("inference.textInference")}</RadioGroupItemLabel>
                </RadioGroupItem>
                <RadioGroupItem value="multimodal">
                  <RadioGroupItemInput />
                  <RadioGroupItemControl>
                    <RadioGroupItemIndicator />
                  </RadioGroupItemControl>
                  <RadioGroupItemLabel>{t("inference.multimodalInference")}</RadioGroupItemLabel>
                </RadioGroupItem>
              </RadioGroupItems>
            </RadioGroup>
          </Show>

          {/* 图像输入（仅多模态模式） */}
          <Show when={isMultimodal()}>
            <div class="space-y-2">
              <Label>{t("inference.imagePath")}:</Label>
              <div class="flex gap-2">
                <Input
                  type="text"
                  value={imagePath()}
                  onInput={(e) => setImagePath(e.currentTarget.value)}
                  placeholder={t("inference.placeholder.imagePath")}
                  class="flex-1"
                />
                <Button onClick={() => selectFile("image")} variant="outline">
                  {t("inference.select")}
                </Button>
              </div>
              <Show when={imagePath()}>
                <div class="mt-2 text-center border rounded-md p-2 bg-muted/20">
                  <img src={convertFileSrc(imagePath())} alt="Preview" class="max-h-64 mx-auto rounded-md object-contain" />
                </div>
              </Show>
            </div>
          </Show>

          {/* 提示词输入 */}
          <div class="space-y-2">
            <Label>{t("inference.prompt")}:</Label>
            <Textarea
              value={prompt()}
              onInput={(e) => setPrompt(e.currentTarget.value)}
              placeholder={t("inference.placeholder.prompt")}
              rows="4"
            />
          </div>

          {/* 参数设置 */}
          <div class="space-y-2">
            <Label>{t("inference.maxTokens")}: {maxTokens()}</Label>
            <Slider
              value={[maxTokens()]}
              onChange={(values: number[]) => setMaxTokens(values[0])}
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

          {/* 生成按钮 */}
          <Button
            onClick={() => {
              if (modelType() === "gguf") {
                generateText();
              } else {
                isMultimodal() ? generateMultimodal() : generateText();
              }
            }}
            disabled={
              loading() ||
              (modelType() === "gguf" ? !ggufModelLoaded() : !modelLoaded())
            }
            variant="default"
            size="lg"
            class="w-full"
          >
            <Show when={loading()} fallback={t("inference.generate")}>
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {t("inference.generating")}
            </Show>
          </Button>

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

