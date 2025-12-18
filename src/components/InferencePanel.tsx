import { createSignal, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";

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

  // 检查模型状态
  async function checkModelStatus() {
    try {
      if (modelType() === "gguf") {
        const loaded = await invoke<boolean>("is_gguf_model_loaded");
        setGgufModelLoaded(loaded);
        if (loaded) {
          setMessage("GGUF 模型已加载");
        }
      } else {
        const loaded = await invoke<boolean>("is_model_loaded");
        setModelLoaded(loaded);
        if (loaded) {
          setMessage("模型已加载");
        }
      }
    } catch (error) {
      console.error("检查模型状态失败:", error);
      setMessage(`错误: ${error}`);
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
      setMessage("请提供模型路径和 tokenizer 路径");
      return;
    }

    setLoading(true);
    setMessage("正在初始化模型...");

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
    setMessage("正在初始化 GGUF 模型...");

    try {
      if (ggufLoadFromHub()) {
        // 从 HuggingFace Hub 加载
        if (!ggufHfRepo() || !ggufHfFilename()) {
          setMessage("请提供 HuggingFace 仓库和文件名");
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
          setMessage("请提供 GGUF 模型路径");
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
      setMessage("请输入提示词");
      return;
    }

    if (modelType() === "gguf") {
      if (!ggufModelLoaded()) {
        setMessage("请先加载 GGUF 模型");
        return;
      }
    } else {
      if (!modelLoaded()) {
        setMessage("请先加载模型");
        return;
      }
    }

    setLoading(true);
    setResponse("");
    setMessage("正在生成...");

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
        setMessage("生成完成");
      } else {
        setMessage(`生成失败: ${result.error || "未知错误"}`);
      }
    } catch (error) {
      console.error("推理失败:", error);
      setMessage(`错误: ${error}`);
    } finally {
      setLoading(false);
    }
  }

  // 执行多模态推理（仅支持 safetensors 模型）
  async function generateMultimodal() {
    if (modelType() === "gguf") {
      setMessage("GGUF 模型暂不支持多模态推理");
      return;
    }

    if (!prompt()) {
      setMessage("请输入提示词");
      return;
    }

    if (!imagePath()) {
      setMessage("请选择图像文件");
      return;
    }

    if (!modelLoaded()) {
      setMessage("请先加载模型");
      return;
    }

    setLoading(true);
    setResponse("");
    setMessage("正在生成...");

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
        setMessage("生成完成");
      } else {
        setMessage(`生成失败: ${result.error || "未知错误"}`);
      }
    } catch (error) {
      console.error("多模态推理失败:", error);
      setMessage(`错误: ${error}`);
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
    <div style="padding: 20px; max-width: 1200px; margin: 0 auto;">
      <h1>AI 推理界面</h1>

      {/* 模型类型选择 */}
      <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
        <h2>模型类型</h2>
        <div style="display: flex; gap: 20px;">
          <label>
            <input
              type="radio"
              checked={modelType() === "gguf"}
              onChange={() => setModelType("gguf")}
              style="margin-right: 5px;"
            />
            GGUF 模型
          </label>
          <label>
            <input
              type="radio"
              checked={modelType() === "safetensors"}
              onChange={() => setModelType("safetensors")}
              style="margin-right: 5px;"
            />
            Safetensors 模型 (Qwen3-VL)
          </label>
        </div>
      </div>

      {/* 模型初始化区域 */}
      <div style="margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2>模型初始化</h2>

        {/* GGUF 模型初始化 */}
        <Show when={modelType() === "gguf"}>
          <div style="margin-bottom: 15px;">
            <label style="margin-right: 20px;">
              <input
                type="radio"
                checked={!ggufLoadFromHub()}
                onChange={() => setGgufLoadFromHub(false)}
                style="margin-right: 5px;"
              />
              从本地文件加载
            </label>
            <label>
              <input
                type="radio"
                checked={ggufLoadFromHub()}
                onChange={() => setGgufLoadFromHub(true)}
                style="margin-right: 5px;"
              />
              从 HuggingFace Hub 下载
            </label>
          </div>

          <Show when={!ggufLoadFromHub()}>
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px;">GGUF 模型路径:</label>
              <div style="display: flex; gap: 10px;">
                <input
                  type="text"
                  value={ggufModelPath()}
                  onInput={(e) => setGgufModelPath(e.currentTarget.value)}
                  placeholder="GGUF 模型文件路径 (如: model.gguf)"
                  style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
                />
                <button
                  onClick={() => selectFile("model")}
                  style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;"
                >
                  选择
                </button>
              </div>
            </div>
          </Show>

          <Show when={ggufLoadFromHub()}>
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px;">HuggingFace 仓库:</label>
              <input
                type="text"
                value={ggufHfRepo()}
                onInput={(e) => setGgufHfRepo(e.currentTarget.value)}
                placeholder="HuggingFace 仓库 (如: HuggingFaceTB/SmolLM2-360M-Instruct-GGUF)"
                style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
              />
            </div>
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px;">模型文件名:</label>
              <input
                type="text"
                value={ggufHfFilename()}
                onInput={(e) => setGgufHfFilename(e.currentTarget.value)}
                placeholder="模型文件名 (如: smollm2-360m-instruct-q8_0.gguf)"
                style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
              />
            </div>
          </Show>

          <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px;">Tokenizer 路径 (可选):</label>
            <div style="display: flex; gap: 10px;">
              <input
                type="text"
                value={ggufTokenizerPath()}
                onInput={(e) => setGgufTokenizerPath(e.currentTarget.value)}
                placeholder="Tokenizer 文件路径 (可选)"
                style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
              />
              <button
                onClick={() => selectFile("tokenizer")}
                style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;"
              >
                选择
              </button>
            </div>
          </div>
        </Show>

        {/* Safetensors 模型初始化 */}
        <Show when={modelType() === "safetensors"}>
          <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px;">模型路径:</label>
            <div style="display: flex; gap: 10px;">
              <input
                type="text"
                value={modelPath()}
                onInput={(e) => setModelPath(e.currentTarget.value)}
                placeholder="模型文件路径 (如: model.safetensors 或模型目录)"
                style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
              />
              <button
                onClick={() => selectFile("model")}
                style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;"
              >
                选择
              </button>
            </div>
          </div>

          <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px;">Tokenizer 路径:</label>
            <div style="display: flex; gap: 10px;">
              <input
                type="text"
                value={tokenizerPath()}
                onInput={(e) => setTokenizerPath(e.currentTarget.value)}
                placeholder="Tokenizer 文件路径 (如: tokenizer.json 或目录)"
                style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
              />
              <button
                onClick={() => selectFile("tokenizer")}
                style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;"
              >
                选择
              </button>
            </div>
          </div>

          <div style="margin-bottom: 15px;">
            <button
              onClick={initModel}
              disabled={loading()}
              style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;"
            >
              {loading() ? "加载中..." : "初始化模型"}
            </button>
            <button
              onClick={checkModelStatus}
              style="margin-left: 10px; padding: 10px 20px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;"
            >
              检查状态
            </button>
          </div>
        </Show>

        <Show when={modelType() === "gguf" && ggufModelLoaded()}>
          <div style="padding: 10px; background: #d4edda; color: #155724; border-radius: 4px; margin-top: 10px;">
            ✓ GGUF 模型已加载
          </div>
        </Show>

        <Show when={modelType() === "safetensors" && modelLoaded()}>
          <div style="padding: 10px; background: #d4edda; color: #155724; border-radius: 4px; margin-top: 10px;">
            ✓ 模型已加载
          </div>
        </Show>

        <Show when={message()}>
          <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px; color: #333;">
            {message()}
          </div>
        </Show>
      </div>

      {/* 推理区域 */}
      <div style="padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2>推理</h2>

        {/* 模式选择（仅 safetensors 模型支持多模态） */}
        <Show when={modelType() === "safetensors"}>
          <div style="margin-bottom: 15px;">
            <label style="margin-right: 20px;">
              <input
                type="radio"
                checked={!isMultimodal()}
                onChange={() => setIsMultimodal(false)}
                style="margin-right: 5px;"
              />
              文本推理
            </label>
            <label>
              <input
                type="radio"
                checked={isMultimodal()}
                onChange={() => setIsMultimodal(true)}
                style="margin-right: 5px;"
              />
              多模态推理（图像 + 文本）
            </label>
          </div>
        </Show>

        {/* 图像输入（仅多模态模式） */}
        <Show when={isMultimodal()}>
          <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px;">图像路径:</label>
            <div style="display: flex; gap: 10px;">
              <input
                type="text"
                value={imagePath()}
                onInput={(e) => setImagePath(e.currentTarget.value)}
                placeholder="图像文件路径"
                style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
              />
              <button
                onClick={() => selectFile("image")}
                style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;"
              >
                选择
              </button>
            </div>
          </div>
        </Show>

        {/* 提示词输入 */}
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px;">提示词:</label>
          <textarea
            value={prompt()}
            onInput={(e) => setPrompt(e.currentTarget.value)}
            placeholder="输入你的提示词..."
            rows="4"
            style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-family: inherit;"
          />
        </div>

        {/* 参数设置 */}
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px;">
            最大 token 数: {maxTokens()}
          </label>
          <input
            type="range"
            min="1"
            max="2048"
            value={maxTokens()}
            onInput={(e) => setMaxTokens(parseInt(e.currentTarget.value))}
            style="width: 100%;"
          />
        </div>

        {/* 生成按钮 */}
        <div style="margin-bottom: 15px;">
          <button
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
            style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; disabled: opacity: 0.5;"
          >
            {loading() ? "生成中..." : "生成"}
          </button>
        </div>

        {/* 结果展示 */}
        <Show when={response()}>
          <div style="margin-top: 20px;">
            <h3>生成结果:</h3>
            <div
              style="padding: 15px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; white-space: pre-wrap; min-height: 100px;"
            >
              {response()}
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}

