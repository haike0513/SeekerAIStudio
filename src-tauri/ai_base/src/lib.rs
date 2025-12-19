use anyhow::{Context, Result};
use candle_core::{DType, Device, Tensor};
use candle_nn::VarBuilder;
use candle_transformers::models::llama as model;
use std::path::PathBuf;
use tokenizers::Tokenizer;
pub mod models;

pub mod vision;
pub use vision::{ImagePreprocessConfig, ImagePreprocessor};

pub mod gguf;
pub use gguf::{GGUFConfig, GGUFInferenceEngine};

pub mod utils;

/// 推理引擎结构体
pub struct InferenceEngine {
    device: Device,
    model: model::Llama,
    tokenizer: Tokenizer,
    config: InferenceConfig,
    model_config: model::Config,
    image_preprocessor: Option<ImagePreprocessor>,
}

/// 推理配置
#[derive(Debug, Clone)]
pub struct InferenceConfig {
    /// 模型路径（safetensors 文件）
    pub model_path: PathBuf,
    /// Tokenizer 路径
    pub tokenizer_path: PathBuf,
    /// 模型配置（手动指定或从文件加载）
    pub model_config: Option<model::Config>,
    /// 最大序列长度
    pub max_seq_len: usize,
    /// 温度参数（用于采样）
    pub temperature: f64,
    /// Top-p 采样参数
    pub top_p: f64,
    /// Top-k 采样参数
    pub top_k: usize,
    /// 图像预处理配置（用于多模态模型）
    pub image_preprocess_config: Option<ImagePreprocessConfig>,
}

impl Default for InferenceConfig {
    fn default() -> Self {
        Self {
            model_path: PathBuf::from("model.safetensors"),
            tokenizer_path: PathBuf::from("tokenizer.json"),
            model_config: None,
            max_seq_len: 2048,
            temperature: 0.8,
            top_p: 0.9,
            top_k: 40,
            image_preprocess_config: None,
        }
    }
}

impl InferenceEngine {
    /// 创建新的推理引擎
    ///
    /// 注意：model_config 需要手动构建或从其他地方获取
    pub fn new(config: InferenceConfig, model_config: model::Config) -> Result<Self> {
        Self::new_with_device(config, model_config, None)
    }

    /// 创建新的推理引擎（支持指定设备）
    ///
    /// - `device`: 如果为 None，则自动选择（优先 CUDA，否则 CPU）
    pub fn new_with_device(
        config: InferenceConfig,
        model_config: model::Config,
        device: Option<Device>,
    ) -> Result<Self> {
        let device = device.unwrap_or_else(|| {
            // 尝试使用 CUDA，如果不可用则使用 CPU
            Device::cuda_if_available(0).unwrap_or_else(|_| Device::Cpu)
        });

        // 加载 tokenizer
        let tokenizer = Tokenizer::from_file(&config.tokenizer_path)
            .map_err(|e| anyhow::anyhow!("无法加载 tokenizer: {}", e))?;

        // 加载模型权重
        // 使用 VarBuilder 直接加载 safetensors 文件
        let dtype = DType::F32; // 使用 F32 作为默认 dtype，可以根据需要调整
        let vb = unsafe {
            VarBuilder::from_mmaped_safetensors(&[config.model_path.clone()], dtype, &device)?
        };

        // 创建模型
        let model = model::Llama::load(vb, &model_config).context("无法加载模型")?;

        // 创建图像预处理器（如果配置了图像预处理）
        let image_preprocessor = config
            .image_preprocess_config
            .as_ref()
            .map(|img_config| ImagePreprocessor::new(img_config.clone()));

        Ok(Self {
            device,
            model,
            tokenizer,
            config,
            model_config,
            image_preprocessor,
        })
    }

    /// 执行文本生成推理
    pub fn generate(&self, prompt: &str, max_new_tokens: usize) -> Result<String> {
        // 编码输入文本
        let tokens = self
            .tokenizer
            .encode(prompt, true)
            .map_err(|e| anyhow::anyhow!("编码失败: {}", e))?;

        let input_ids: Vec<u32> = tokens.get_ids().iter().map(|&id| id as u32).collect();
        let input_len = input_ids.len();

        if input_len > self.config.max_seq_len {
            return Err(anyhow::anyhow!(
                "输入序列长度 {} 超过最大长度 {}",
                input_len,
                self.config.max_seq_len
            ));
        }

        // 转换为 Tensor
        let input_tensor = Tensor::new(input_ids.as_slice(), &self.device)?.unsqueeze(0)?;

        // 执行推理
        let mut generated_tokens = Vec::new();
        let dtype = DType::F32; // 使用与模型相同的 dtype
        let mut cache = model::Cache::new(true, dtype, &self.model_config, &self.device)?;

        // 获取结束标记 ID
        let eos_token_id = self
            .tokenizer
            .token_to_id("<|endoftext|>")
            .unwrap_or_else(|| {
                // 如果找不到结束标记，使用 vocab_size 作为默认值
                let vocab_size = self.tokenizer.get_vocab_size(true);
                vocab_size.try_into().unwrap_or(u32::MAX)
            });

        // 初始前向传播处理输入序列
        let mut index_pos = 0;
        let logits = self.model.forward(&input_tensor, index_pos, &mut cache)?;
        index_pos += input_len;

        // 获取最后一个 token 的 logits 并生成第一个 token
        let seq_len = logits.dim(1)?;
        let mut last_logits = logits.narrow(1, seq_len - 1, 1)?.squeeze(1)?;

        // 生成循环
        for _ in 0..max_new_tokens {
            // 采样下一个 token
            let next_token = self.sample_token(&last_logits)?;

            // 检查是否到达结束标记
            if next_token == eos_token_id {
                break;
            }

            generated_tokens.push(next_token);

            // 准备下一个 token 的输入（只包含单个 token）
            let next_token_tensor = Tensor::new(&[next_token], &self.device)?.unsqueeze(0)?;

            // 前向传播（只处理新生成的 token，利用 cache）
            let logits = self
                .model
                .forward(&next_token_tensor, index_pos, &mut cache)?;
            index_pos += 1;

            // 获取最后一个 token 的 logits（应该是新生成的 token 的 logits）
            let seq_len = logits.dim(1)?;
            last_logits = logits.narrow(1, seq_len - 1, 1)?.squeeze(1)?;
        }

        // 解码生成的文本
        let generated_text = self
            .tokenizer
            .decode(&generated_tokens, true)
            .map_err(|e| anyhow::anyhow!("解码失败: {}", e))?;

        Ok(generated_text)
    }

    /// 采样下一个 token（支持 top-k 和 top-p 采样）
    fn sample_token(&self, logits: &Tensor) -> Result<u32> {
        let vocab_size = logits.dim(logits.dims().len() - 1)?;

        // 应用温度
        let logits = if self.config.temperature > 0.0 && self.config.temperature != 1.0 {
            (logits / self.config.temperature as f64)?
        } else {
            logits.clone()
        };

        // 应用 softmax 获取概率分布
        let probs = candle_nn::ops::softmax_last_dim(&logits)?;
        let mut probs_vec: Vec<(usize, f32)> =
            probs.to_vec1::<f32>()?.into_iter().enumerate().collect();

        // Top-k 采样：只保留 top-k 个 token
        if self.config.top_k > 0 && self.config.top_k < vocab_size {
            probs_vec
                .sort_by(|(_, a), (_, b)| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal));
            probs_vec.truncate(self.config.top_k);
        }

        // Top-p (nucleus) 采样：累积概率直到达到 top_p
        if self.config.top_p < 1.0 && self.config.top_p > 0.0 {
            probs_vec
                .sort_by(|(_, a), (_, b)| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal));
            let mut cumsum = 0.0;
            let mut cutoff_idx = probs_vec.len();
            for (idx, (_, prob)) in probs_vec.iter().enumerate() {
                cumsum += prob;
                if cumsum >= self.config.top_p as f32 {
                    cutoff_idx = idx + 1;
                    break;
                }
            }
            probs_vec.truncate(cutoff_idx);
        }

        // 归一化概率
        let total_prob: f32 = probs_vec.iter().map(|(_, p)| p).sum();
        if total_prob > 0.0 {
            for (_, prob) in probs_vec.iter_mut() {
                *prob /= total_prob;
            }
        }

        // 根据概率分布采样
        if self.config.temperature == 0.0 {
            // 贪婪采样：选择概率最高的
            Ok(probs_vec
                .iter()
                .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
                .map(|(idx, _)| *idx)
                .unwrap_or(0) as u32)
        } else {
            // 随机采样：根据概率分布
            use rand::prelude::*;
            let mut rng = rand::thread_rng();
            let rand_val: f32 = rng.gen();
            let mut cumsum = 0.0;
            let last_idx = probs_vec.last().map(|(idx, _)| *idx).unwrap_or(0);
            for (idx, prob) in probs_vec {
                cumsum += prob;
                if rand_val <= cumsum {
                    return Ok(idx as u32);
                }
            }
            // 如果由于浮点误差没有匹配到，返回最后一个
            Ok(last_idx as u32)
        }
    }

    /// 获取设备信息
    pub fn device(&self) -> &Device {
        &self.device
    }

    /// 获取配置
    pub fn config(&self) -> &InferenceConfig {
        &self.config
    }

    /// 获取模型配置
    pub fn model_config(&self) -> &model::Config {
        &self.model_config
    }

    /// 预处理图像（用于多模态输入）
    ///
    /// 如果图像预处理器未配置，返回错误
    pub fn preprocess_image<P: AsRef<std::path::Path>>(&self, image_path: P) -> Result<Tensor> {
        let preprocessor = self.image_preprocessor.as_ref().ok_or_else(|| {
            anyhow::anyhow!(
                "图像预处理器未配置，请在 InferenceConfig 中设置 image_preprocess_config"
            )
        })?;

        preprocessor.load_and_preprocess(image_path, &self.device)
    }

    /// 从字节数据预处理图像
    pub fn preprocess_image_from_bytes(&self, image_data: &[u8]) -> Result<Tensor> {
        let preprocessor = self.image_preprocessor.as_ref().ok_or_else(|| {
            anyhow::anyhow!(
                "图像预处理器未配置，请在 InferenceConfig 中设置 image_preprocess_config"
            )
        })?;

        preprocessor.preprocess_from_bytes(image_data, &self.device)
    }

    /// 多模态生成（图像 + 文本）
    ///
    /// 注意：此方法假设模型已经支持多模态输入。
    /// 对于 Qwen3-VL，通常需要在文本 prompt 中插入图像占位符 token。
    ///
    /// 参数：
    /// - `image_path`: 图像文件路径
    /// - `prompt`: 文本提示词（可能包含图像占位符，如 `<image>`）
    /// - `max_new_tokens`: 最大生成 token 数
    pub fn generate_multimodal<P: AsRef<std::path::Path>>(
        &self,
        image_path: P,
        prompt: &str,
        max_new_tokens: usize,
    ) -> Result<String> {
        // 预处理图像
        let _image_tensor = self.preprocess_image(image_path)?;

        // 注意：实际的 Qwen3-VL 模型可能需要在 prompt 中插入特殊的图像 token
        // 例如：prompt = format!("<image>\n{}", prompt)
        // 这里我们先使用原始的 prompt，具体的 token 插入需要根据实际的 tokenizer 来确定

        // 目前先使用文本生成方法（这需要模型支持多模态输入）
        // TODO: 需要根据实际的 Qwen3-VL 模型结构来实现图像特征的融合
        self.generate(prompt, max_new_tokens)
    }

    /// 多模态生成（从图像字节数据）
    pub fn generate_multimodal_from_bytes(
        &self,
        image_data: &[u8],
        prompt: &str,
        max_new_tokens: usize,
    ) -> Result<String> {
        // 预处理图像
        let _image_tensor = self.preprocess_image_from_bytes(image_data)?;

        // TODO: 将图像特征与文本输入融合，然后调用模型生成
        // 对于 Qwen3-VL，通常需要在 prompt 中插入图像 token（如 <image>）
        // 实际的图像特征融合需要在模型的 forward 方法中实现
        // 目前先使用文本生成方法作为占位符
        self.generate(prompt, max_new_tokens)
    }

    /// 从 HuggingFace 模型目录加载配置（如果 Config 支持 serde）
    ///
    /// 注意：此方法需要 candle-transformers 的 Config 类型支持 serde::Deserialize
    /// 如果您的版本不支持，请手动构建 Config
    #[allow(dead_code)]
    pub fn load_config_from_dir(_model_dir: impl AsRef<std::path::Path>) -> Result<model::Config> {
        // 注意：candle-transformers 的 Config 可能不支持直接反序列化
        // 您需要根据模型类型手动构建 Config
        // 这里提供一个占位符实现
        Err(anyhow::anyhow!(
            "Config 反序列化需要手动实现。请根据您的模型类型构建 Config"
        ))
    }
}

/// 便捷函数：创建推理引擎（需要提供模型配置）
pub fn create_inference_engine(
    model_path: impl Into<PathBuf>,
    tokenizer_path: impl Into<PathBuf>,
    model_config: model::Config,
) -> Result<InferenceEngine> {
    let config = InferenceConfig {
        model_path: model_path.into(),
        tokenizer_path: tokenizer_path.into(),
        model_config: None,
        ..Default::default()
    };
    InferenceEngine::new(config, model_config)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_inference_config_default() {
        let config = InferenceConfig::default();
        assert_eq!(config.max_seq_len, 2048);
        assert_eq!(config.temperature, 0.8);
    }
}
