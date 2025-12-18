use anyhow::{Context, Result};
use candle_core::{Device, Tensor};
use candle_core::quantized::gguf_file;
use candle_nn;
use candle_transformers::models::quantized_llama::ModelWeights;
use std::fs::File;
use std::path::PathBuf;
use tokenizers::Tokenizer;

/// GGUF 模型配置
#[derive(Debug, Clone)]
pub struct GGUFConfig {
    /// 模型路径（本地文件路径或 HuggingFace 模型标识符）
    pub model_path: PathBuf,
    /// Tokenizer 路径
    pub tokenizer_path: Option<PathBuf>,
    /// HuggingFace 模型仓库标识符（如果从 HF Hub 下载）
    pub hf_repo: Option<String>,
    /// HuggingFace 模型文件名（如果从 HF Hub 下载）
    pub hf_filename: Option<String>,
    /// 最大序列长度
    pub max_seq_len: usize,
    /// 温度参数（用于采样）
    pub temperature: f64,
    /// Top-p 采样参数
    pub top_p: f64,
    /// Top-k 采样参数
    pub top_k: usize,
}

impl Default for GGUFConfig {
    fn default() -> Self {
        Self {
            model_path: PathBuf::from("model.gguf"),
            tokenizer_path: None,
            hf_repo: None,
            hf_filename: None,
            max_seq_len: 2048,
            temperature: 0.8,
            top_p: 0.9,
            top_k: 40,
        }
    }
}

/// GGUF 量化模型推理引擎
pub struct GGUFInferenceEngine {
    device: Device,
    model: ModelWeights,
    tokenizer: Option<Tokenizer>,
    config: GGUFConfig,
}

impl GGUFInferenceEngine {
    /// 从本地文件加载 GGUF 模型
    pub fn from_file(config: GGUFConfig) -> Result<Self> {
        Self::from_file_with_device(config, None)
    }

    /// 从本地文件加载 GGUF 模型（支持指定设备）
    pub fn from_file_with_device(
        config: GGUFConfig,
        device: Option<Device>,
    ) -> Result<Self> {
        let device = device.unwrap_or_else(|| {
            Device::cuda_if_available(0).unwrap_or_else(|_| Device::Cpu)
        });

        // 打开 GGUF 文件
        let mut file = File::open(&config.model_path)
            .with_context(|| format!("无法打开模型文件: {:?}", config.model_path))?;

        // 读取 GGUF 内容
        let ct = gguf_file::Content::read(&mut file)
            .with_context(|| format!("无法读取 GGUF 文件内容，文件路径: {:?}", config.model_path))?;

        // 加载模型权重
        let model = ModelWeights::from_gguf(ct, &mut file, &device)
            .map_err(|e| {
                anyhow::anyhow!(
                    "无法从 GGUF 文件加载模型权重\n\
                    文件路径: {:?}\n\
                    设备: {:?}\n\
                    原始错误: {}\n\
                    \n\
                    这可能是因为:\n\
                    1. GGUF 文件格式不兼容（例如，Qwen3-VL 是视觉语言模型，可能不支持标准的 Llama 量化格式）\n\
                    2. 文件损坏或不完整\n\
                    3. 文件路径不正确\n\
                    4. 设备初始化失败\n\
                    \n\
                    请检查:\n\
                    - 文件是否存在且可读\n\
                    - 文件是否为有效的 GGUF 格式\n\
                    - 模型架构是否与 quantized_llama::ModelWeights 兼容",
                    config.model_path, device, e
                )
            })?;

        // 加载 tokenizer（如果提供了路径）
        let tokenizer = if let Some(ref tokenizer_path) = config.tokenizer_path {
            Some(
                Tokenizer::from_file(tokenizer_path)
                    .map_err(|e| anyhow::anyhow!("无法加载 tokenizer: {}", e))?
            )
        } else {
            None
        };

        Ok(Self {
            device,
            model,
            tokenizer,
            config,
        })
    }

    /// 从 HuggingFace Hub 下载并加载 GGUF 模型
    pub fn from_hf_hub(
        hf_repo: impl Into<String>,
        hf_filename: impl Into<String>,
        tokenizer_path: Option<PathBuf>,
    ) -> Result<Self> {
        Self::from_hf_hub_with_device(hf_repo, hf_filename, tokenizer_path, None)
    }

    /// 从 HuggingFace Hub 下载并加载 GGUF 模型（支持指定设备）
    pub fn from_hf_hub_with_device(
        hf_repo: impl Into<String>,
        hf_filename: impl Into<String>,
        tokenizer_path: Option<PathBuf>,
        device: Option<Device>,
    ) -> Result<Self> {
        use hf_hub::api::sync::Api;

        let hf_repo_str = hf_repo.into();
        let hf_filename_str = hf_filename.into();

        // 创建 HuggingFace API
        let api = Api::new()
            .context("无法创建 HuggingFace API")?;

        // 获取模型仓库
        let repo = api.model(hf_repo_str.clone());

        // 下载模型文件
        let model_path = repo.get(&hf_filename_str)
            .with_context(|| format!("无法从 HuggingFace Hub 下载模型: {}/{}", hf_repo_str, hf_filename_str))?;

        let config = GGUFConfig {
            model_path: model_path.clone(),
            tokenizer_path,
            hf_repo: Some(hf_repo_str),
            hf_filename: Some(hf_filename_str),
            ..Default::default()
        };

        Self::from_file_with_device(config, device)
    }

    /// 执行前向传播
    pub fn forward(&mut self, input_ids: &Tensor, index_pos: usize) -> Result<Tensor> {
        self.model.forward(input_ids, index_pos)
            .context("模型前向传播失败")
    }

    /// 执行文本生成推理
    pub fn generate(&mut self, prompt: &str, max_new_tokens: usize) -> Result<String> {
        // 提前提取所有需要的信息，避免借用冲突
        let (input_ids, eos_token_id) = {
            let tokenizer = self.tokenizer.as_ref()
                .ok_or_else(|| anyhow::anyhow!("Tokenizer 未加载，无法执行文本生成"))?;

            // 编码输入文本
            let tokens = tokenizer
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

            // 获取结束标记 ID
            let eos_token_id = tokenizer.token_to_id("<|endoftext|>")
                .or_else(|| tokenizer.token_to_id("</s>"))
                .or_else(|| tokenizer.token_to_id("<|im_end|>"))
                .unwrap_or_else(|| {
                    let vocab_size = tokenizer.get_vocab_size(true);
                    vocab_size.try_into().unwrap_or(u32::MAX)
                });

            (input_ids, eos_token_id)
        };

        let input_len = input_ids.len();

        // 转换为 Tensor（在独立作用域中借用 device）
        let input_tensor = {
            let device = &self.device;
            Tensor::new(
                input_ids.as_slice(),
                device
            )?.unsqueeze(0)?
        };

        // 执行推理
        let mut generated_tokens = Vec::new();
        let mut index_pos = 0;

        // 初始前向传播处理输入序列
        let logits = self.forward(&input_tensor, index_pos)?;
        index_pos += input_len;

        // 获取最后一个 token 的 logits 并生成第一个 token
        let seq_len = logits.dim(1)?;
        let mut last_logits = logits
            .narrow(1, seq_len - 1, 1)?
            .squeeze(1)?;

        // 生成循环
        for _ in 0..max_new_tokens {
            // 采样下一个 token（在独立作用域中借用 config，避免与后续的 &mut self 冲突）
            let next_token = {
                let config = &self.config;
                sample_token_from_logits(&last_logits, config)?
            };

            // 检查是否到达结束标记
            if next_token == eos_token_id {
                break;
            }

            generated_tokens.push(next_token);

            // 准备下一个 token 的输入（只包含单个 token，在独立作用域中借用 device）
            let next_token_tensor = {
                let device = &self.device;
                Tensor::new(&[next_token], device)?
                    .unsqueeze(0)?
            };

            // 前向传播（只处理新生成的 token）
            let logits = self.forward(&next_token_tensor, index_pos)?;
            index_pos += 1;

            // 获取最后一个 token 的 logits
            let seq_len = logits.dim(1)?;
            last_logits = logits
                .narrow(1, seq_len - 1, 1)?
                .squeeze(1)?;
        }

        // 解码生成的文本
        let generated_text = {
            let tokenizer = self.tokenizer.as_ref()
                .ok_or_else(|| anyhow::anyhow!("Tokenizer 未加载"))?;
            tokenizer
                .decode(&generated_tokens, true)
                .map_err(|e| anyhow::anyhow!("解码失败: {}", e))?
        };

        Ok(generated_text)
    }

    /// 获取设备信息
    pub fn device(&self) -> &Device {
        &self.device
    }

    /// 获取配置
    pub fn config(&self) -> &GGUFConfig {
        &self.config
    }

    /// 测试模型前向传播（用于验证模型加载是否成功）
    pub fn test_forward(&mut self, seq_len: usize) -> Result<()> {
        let input_tensor = Tensor::arange(0u32, seq_len as u32, &self.device)?
            .reshape((1, seq_len))?;

        let start = std::time::Instant::now();
        let _logits = self.forward(&input_tensor, 0)?;
        let elapsed = start.elapsed();

        println!("前向传播耗时: {} ms (序列长度: {})", elapsed.as_millis(), seq_len);
        Ok(())
    }
}

/// 采样下一个 token（支持 top-k 和 top-p 采样）
fn sample_token_from_logits(logits: &Tensor, config: &GGUFConfig) -> Result<u32> {
    let vocab_size = logits.dim(logits.dims().len() - 1)?;

    // 应用温度
    let logits = if config.temperature > 0.0 && config.temperature != 1.0 {
        (logits / config.temperature as f64)?
    } else {
        logits.clone()
    };

    // 应用 softmax 获取概率分布
    let probs = candle_nn::ops::softmax_last_dim(&logits)?;
    let mut probs_vec: Vec<(usize, f32)> = probs
        .to_vec1::<f32>()?
        .into_iter()
        .enumerate()
        .collect();

    // Top-k 采样：只保留 top-k 个 token
    if config.top_k > 0 && config.top_k < vocab_size {
        probs_vec.sort_by(|(_, a), (_, b)| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal));
        probs_vec.truncate(config.top_k);
    }

    // Top-p (nucleus) 采样：累积概率直到达到 top_p
    if config.top_p < 1.0 && config.top_p > 0.0 {
        probs_vec.sort_by(|(_, a), (_, b)| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal));
        let mut cumsum = 0.0;
        let mut cutoff_idx = probs_vec.len();
        for (idx, (_, prob)) in probs_vec.iter().enumerate() {
            cumsum += prob;
            if cumsum >= config.top_p as f32 {
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
    if config.temperature == 0.0 {
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

/// 示例：从 HuggingFace Hub 下载并测试 GGUF 模型
/// 
/// 这个函数展示了如何从 HuggingFace Hub 下载 GGUF 模型并测试前向传播，
/// 类似于用户提供的示例代码。
/// 
/// # 示例
/// ```no_run
/// use ai_base::gguf::GGUFInferenceEngine;
/// 
/// fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
///     // 从 HuggingFace Hub 下载并加载模型
///     let mut engine = GGUFInferenceEngine::from_hf_hub(
///         "HuggingFaceTB/SmolLM2-360M-Instruct-GGUF",
///         "smollm2-360m-instruct-q8_0.gguf",
///         None, // tokenizer_path
///     )?;
///     
///     // 测试前向传播（序列长度 128）
///     engine.test_forward(128)?;
///     
///     Ok(())
/// }
/// ```
pub fn example_load_and_test_gguf() -> Result<()> {
    // 从 HuggingFace Hub 下载并加载模型
    let mut engine = GGUFInferenceEngine::from_hf_hub(
        "HuggingFaceTB/SmolLM2-360M-Instruct-GGUF",
        "smollm2-360m-instruct-q8_0.gguf",
        None, // tokenizer_path
    )?;
    
    // 测试前向传播（序列长度 128）
    engine.test_forward(128)?;
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gguf_config_default() {
        let config = GGUFConfig::default();
        assert_eq!(config.max_seq_len, 2048);
        assert_eq!(config.temperature, 0.8);
    }
}

