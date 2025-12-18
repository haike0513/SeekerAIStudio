import { createSignal, Show, createMemo } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem, RadioGroupItemInput, RadioGroupItemLabel, RadioGroupItems, RadioGroupItemControl, RadioGroupItemIndicator } from "@/components/ui/radio-group";
import { Slider, SliderTrack, SliderFill, SliderThumb } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Loader2 } from "lucide-solid";
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
  const [ggufModelPathCustom, setGgufModelPathCustom] = createSignal(false);
  const [ggufTokenizerPathCustom, setGgufTokenizerPathCustom] = createSignal(false);

  // 默认的 GGUF 模型路径选项
  const defaultGgufModelPaths = createMemo(() => [
    { value: "", label: t("inference.selectDefaultPath") },
    { value: "models/Qwen3-VL-8B-Instruct-Q4_K_M.gguf", label: "Qwen3-VL-8B-Instruct-Q4_K_M.gguf" },
    { value: "models/mmproj-Qwen3-VL-8B-Instruct-F16.gguf", label: "mmproj-Qwen3-VL-8B-Instruct-F16" },
    { value: "./models/llama-2-7b-chat-q4_0.gguf", label: "Llama 2 7B Chat (Q4_0)" },
    { value: "./models/mistral-7b-instruct-v0.2-q4_0.gguf", label: "Mistral 7B Instruct (Q4_0)" },
    { value: "./models/qwen2.5-7b-instruct-q4_0.gguf", label: "Qwen2.5 7B Instruct (Q4_0)" },
    { value: "custom", label: t("inference.customPath") },
  ]);

  // 默认的 Tokenizer 路径选项
  const defaultTokenizerPaths = createMemo(() => [
    { value: "", label: t("inference.selectDefaultPath") },
    { value: "./tokenizers/smollm2-360m-instruct", label: "SmolLM2-360M-Instruct Tokenizer" },
    { value: "./tokenizers/llama-2-7b-chat", label: "Llama 2 7B Chat Tokenizer" },
    { value: "./tokenizers/mistral-7b-instruct", label: "Mistral 7B Instruct Tokenizer" },
    { value: "./tokenizers/qwen2.5-7b-instruct", label: "Qwen2.5 7B Instruct Tokenizer" },
    { value: "custom", label: t("inference.customPath") },
  ]);

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
      // 注意：这里需要安装 @tauri-apps/plugin-dialog
      // 暂时使用简单的输入方式，后续可以改进为文件选择器
      const path = window.prompt(`请输入 ${type} 文件路径:`);
      if (path) {
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
    }
  }

  // 页面加载时检查模型状态
  checkModelStatus();

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
                      when={ggufModelPathCustom()} 
                      fallback={
                        <Select
                          options={defaultGgufModelPaths()}
                          value={(() => {
                            const currentPath = ggufModelPath();
                            if (!currentPath) return "";
                            const found = defaultGgufModelPaths().find(p => p.value === currentPath);
                            return found ? currentPath : "custom";
                          })()}
                          onChange={(value) => {
                            if (value === null || value === undefined) return;
                            const pathValue = typeof value === 'object' && 'value' in value 
                              ? (value as any).value 
                              : value;
                            if (pathValue === "custom") {
                              setGgufModelPathCustom(true);
                              if (!ggufModelPath()) {
                                setGgufModelPath("");
                              }
                            } else if (pathValue) {
                              setGgufModelPath(pathValue as string);
                              setGgufModelPathCustom(false);
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
                        >
                          <SelectTrigger class="flex-1">
                            <SelectValue<string>>{() => {
                              const currentPath = ggufModelPath();
                              if (!currentPath) return t("inference.selectDefaultPath") as string;
                              const selected = defaultGgufModelPaths().find(p => p.value === currentPath);
                              if (selected) return selected.label;
                              return t("inference.customPath") as string;
                            }}</SelectValue>
                          </SelectTrigger>
                          <SelectPortal>
                            <SelectContent />
                          </SelectPortal>
                        </Select>
                      }
                    >
                      <Input
                        type="text"
                        value={ggufModelPath()}
                        onInput={(e) => setGgufModelPath(e.currentTarget.value)}
                        placeholder={t("inference.placeholder.ggufModelPath")}
                        class="flex-1"
                      />
                    </Show>
                    <Button onClick={() => selectFile("model")} variant="outline">
                      {t("inference.select")}
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
                    when={ggufTokenizerPathCustom()} 
                    fallback={
                      <Select
                        options={defaultTokenizerPaths()}
                        value={(() => {
                          const currentPath = ggufTokenizerPath();
                          if (!currentPath) return "";
                          const found = defaultTokenizerPaths().find(p => p.value === currentPath);
                          return found ? currentPath : "custom";
                        })()}
                        onChange={(value) => {
                          if (value === null || value === undefined) return;
                          const pathValue = typeof value === 'object' && 'value' in value 
                            ? (value as any).value 
                            : value;
                          if (pathValue === "custom") {
                            setGgufTokenizerPathCustom(true);
                            if (!ggufTokenizerPath()) {
                              setGgufTokenizerPath("");
                            }
                          } else if (pathValue) {
                            setGgufTokenizerPath(pathValue as string);
                            setGgufTokenizerPathCustom(false);
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
                      >
                        <SelectTrigger class="flex-1">
                          <SelectValue<string>>{() => {
                            const currentPath = ggufTokenizerPath();
                            if (!currentPath) return t("inference.selectDefaultPath") as string;
                            const selected = defaultTokenizerPaths().find(p => p.value === currentPath);
                            if (selected) return selected.label;
                            return t("inference.customPath") as string;
                          }}</SelectValue>
                        </SelectTrigger>
                        <SelectPortal>
                          <SelectContent />
                        </SelectPortal>
                      </Select>
                    }
                  >
                    <Input
                      type="text"
                      value={ggufTokenizerPath()}
                      onInput={(e) => setGgufTokenizerPath(e.currentTarget.value)}
                      placeholder={t("inference.placeholder.tokenizerPathOptional")}
                      class="flex-1"
                    />
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
                  <Input
                    type="text"
                    value={modelPath()}
                    onInput={(e) => setModelPath(e.currentTarget.value)}
                    placeholder={t("inference.placeholder.modelPath")}
                    class="flex-1"
                  />
                  <Button onClick={() => selectFile("model")} variant="outline">
                    {t("inference.select")}
                  </Button>
                </div>
              </div>

              <div class="space-y-2">
                <Label>{t("inference.tokenizerPath")}:</Label>
                <div class="flex gap-2">
                  <Input
                    type="text"
                    value={tokenizerPath()}
                    onInput={(e) => setTokenizerPath(e.currentTarget.value)}
                    placeholder={t("inference.placeholder.tokenizerPath")}
                    class="flex-1"
                  />
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

