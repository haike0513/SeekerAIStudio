use ai_base::{InferenceEngine, InferenceConfig, ImagePreprocessConfig, GGUFInferenceEngine, GGUFConfig};
use candle_transformers::models::llama::Config;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use anyhow::{Result, Context};

/// 推理服务状态
pub struct InferenceService {
    engine: Arc<Mutex<Option<InferenceEngine>>>,
}

impl InferenceService {
    pub fn new() -> Self {
        Self {
            engine: Arc::new(Mutex::new(None)),
        }
    }

    /// 初始化模型
    pub fn init_model(
        &self,
        model_path: PathBuf,
        tokenizer_path: PathBuf,
        model_config: Config,
    ) -> Result<()> {
        // 验证文件是否存在
        if !model_path.exists() {
            return Err(anyhow::anyhow!("模型文件不存在: {:?}", model_path));
        }
        if !tokenizer_path.exists() {
            return Err(anyhow::anyhow!("Tokenizer 文件不存在: {:?}", tokenizer_path));
        }

        // 为 Qwen3-VL 配置图像预处理
        let image_preprocess_config = ImagePreprocessConfig {
            image_size: 448, // Qwen3-VL 通常使用 448x448
            mean: [0.485, 0.456, 0.406],
            std: [0.229, 0.224, 0.225],
        };
        
        let config = InferenceConfig {
            model_path: model_path.clone(),
            tokenizer_path: tokenizer_path.clone(),
            model_config: None,
            max_seq_len: 32768, // qwen3vl-8b 支持最长 32K 上下文
            temperature: 0.7,
            top_p: 0.9,
            top_k: 50,
            image_preprocess_config: Some(image_preprocess_config),
        };

        println!("正在加载模型: {:?}", model_path);
        let engine = InferenceEngine::new(config, model_config)
            .with_context(|| format!("加载模型失败: {:?}", model_path))?;
        
        println!("模型加载成功");
        let mut guard = self.engine.lock().unwrap();
        *guard = Some(engine);
        
        Ok(())
    }

    /// 执行推理
    pub fn generate(&self, prompt: &str, max_tokens: usize) -> Result<String> {
        let guard = self.engine.lock().unwrap();
        let engine = guard.as_ref()
            .ok_or_else(|| anyhow::anyhow!("模型未初始化，请先调用 init_model"))?;
        
        engine.generate(prompt, max_tokens)
    }

    /// 检查模型是否已加载
    pub fn is_loaded(&self) -> bool {
        let guard = self.engine.lock().unwrap();
        guard.is_some()
    }

    /// 多模态生成（图像 + 文本）
    pub fn generate_multimodal(
        &self,
        image_path: PathBuf,
        prompt: &str,
        max_tokens: usize,
    ) -> Result<String> {
        let guard = self.engine.lock().unwrap();
        let engine = guard.as_ref()
            .ok_or_else(|| anyhow::anyhow!("模型未初始化，请先调用 init_model"))?;
        
        engine.generate_multimodal(image_path, prompt, max_tokens)
    }

    /// 多模态生成（从图像字节数据）
    pub fn generate_multimodal_from_bytes(
        &self,
        image_data: &[u8],
        prompt: &str,
        max_tokens: usize,
    ) -> Result<String> {
        let guard = self.engine.lock().unwrap();
        let engine = guard.as_ref()
            .ok_or_else(|| anyhow::anyhow!("模型未初始化，请先调用 init_model"))?;
        
        engine.generate_multimodal_from_bytes(image_data, prompt, max_tokens)
    }
}

impl Default for InferenceService {
    fn default() -> Self {
        Self::new()
    }
}

/// 从模型目录自动检测并创建配置
/// 
/// 尝试从模型目录读取 config.json 并创建配置
/// 注意：由于 Config 结构体比较复杂，建议直接使用模型目录的 config.json
/// 如果无法从文件加载，此函数会返回错误，提示用户需要手动提供配置
pub fn create_qwen3vl_config_from_dir(model_dir: &PathBuf) -> Result<Config> {
    let config_path = model_dir.join("config.json");
    
    if config_path.exists() {
        println!("找到配置文件: {:?}", config_path);
        // 注意：candle-transformers 的 Config 可能不直接支持从 JSON 反序列化
        // 这里返回错误，提示用户需要手动构建 Config 或使用其他方法
        return Err(anyhow::anyhow!(
            "Config 结构体不支持直接从 JSON 反序列化。\
            请参考 candle-transformers 文档手动构建 Config，或使用其他配置加载方法。\
            配置文件路径: {:?}", config_path
        ));
    }
    
    Err(anyhow::anyhow!(
        "未找到配置文件 config.json: {:?}。\
        请确保模型目录包含配置文件，或手动提供 Config 结构", model_dir
    ))
}

/// 创建 qwen3vl-8b 的默认配置
/// 
/// 注意：这个方法需要手动构建完整的 Config 结构体。
/// 由于 Config 包含很多字段且可能因版本而异，
/// 建议从模型的 config.json 文件手动读取字段并构建 Config。
/// 
/// 这是一个占位符实现，实际使用时应该：
/// 1. 从 config.json 读取各个字段的值
/// 2. 使用这些值构建 Config 结构体
pub fn create_qwen3vl_config() -> Config {
    // TODO: 实现从 config.json 加载配置的逻辑
    // 由于 Config 结构体的字段较多且可能因版本变化，这里暂时 panic
    // 用户需要根据实际的 candle-transformers 版本和模型配置手动构建
    panic!(
        "create_qwen3vl_config 需要手动实现。\
        请从模型的 config.json 文件读取配置并手动构建 Config 结构体，\
        或使用其他配置加载方法。\
        参考: https://github.com/huggingface/candle/tree/main/candle-transformers"
    )
}

/// GGUF 模型推理服务
pub struct GGUFInferenceService {
    engine: Arc<Mutex<Option<GGUFInferenceEngine>>>,
}

impl GGUFInferenceService {
    pub fn new() -> Self {
        Self {
            engine: Arc::new(Mutex::new(None)),
        }
    }

    /// 从本地文件初始化 GGUF 模型
    pub fn init_model_from_file(
        &self,
        model_path: PathBuf,
        tokenizer_path: Option<PathBuf>,
    ) -> Result<()> {
        // 验证文件是否存在
        if !model_path.exists() {
            return Err(anyhow::anyhow!("模型文件不存在: {:?}", model_path));
        }

        if let Some(ref tokenizer_path) = tokenizer_path {
            if !tokenizer_path.exists() {
                return Err(anyhow::anyhow!("Tokenizer 文件不存在: {:?}", tokenizer_path));
            }
        }

        let config = GGUFConfig {
            model_path: model_path.clone(),
            tokenizer_path: tokenizer_path.clone(),
            max_seq_len: 2048,
            temperature: 0.7,
            top_p: 0.9,
            top_k: 50,
            ..Default::default()
        };

        tracing::info!("正在加载 GGUF 模型: {:?}", model_path);
        tracing::info!("模型文件是否存在: {}", model_path.exists());
        if model_path.exists() {
            if let Ok(metadata) = std::fs::metadata(&model_path) {
                tracing::info!("模型文件大小: {} 字节", metadata.len());
            }
        }
        
        let engine = GGUFInferenceEngine::from_file(config)
            .with_context(|| format!("加载 GGUF 模型失败，模型路径: {:?}", model_path))?;
        
        tracing::info!("GGUF 模型加载成功");
        let mut guard = self.engine.lock().unwrap();
        *guard = Some(engine);

        Ok(())
    }

    /// 从 HuggingFace Hub 下载并初始化 GGUF 模型
    pub fn init_model_from_hf_hub(
        &self,
        hf_repo: impl Into<String>,
        hf_filename: impl Into<String>,
        tokenizer_path: Option<PathBuf>,
    ) -> Result<()> {
        let hf_repo_str = hf_repo.into();
        let hf_filename_str = hf_filename.into();

        if let Some(ref tokenizer_path) = tokenizer_path {
            if !tokenizer_path.exists() {
                return Err(anyhow::anyhow!("Tokenizer 文件不存在: {:?}", tokenizer_path));
            }
        }

        println!("正在从 HuggingFace Hub 下载 GGUF 模型: {}/{}", hf_repo_str, hf_filename_str);
        let engine = GGUFInferenceEngine::from_hf_hub(
            hf_repo_str.clone(),
            hf_filename_str.clone(),
            tokenizer_path,
        )
        .with_context(|| format!("从 HuggingFace Hub 加载 GGUF 模型失败: {}/{}", hf_repo_str, hf_filename_str))?;

        println!("GGUF 模型下载并加载成功");
        let mut guard = self.engine.lock().unwrap();
        *guard = Some(engine);

        Ok(())
    }

    /// 执行推理
    pub fn generate(&self, prompt: &str, max_tokens: usize) -> Result<String> {
        let mut guard = self.engine.lock().unwrap();
        let engine = guard.as_mut()
            .ok_or_else(|| anyhow::anyhow!("模型未初始化，请先调用 init_model_from_file 或 init_model_from_hf_hub"))?;

        engine.generate(prompt, max_tokens)
    }

    /// 检查模型是否已加载
    pub fn is_loaded(&self) -> bool {
        let guard = self.engine.lock().unwrap();
        guard.is_some()
    }

    /// 测试模型前向传播
    pub fn test_forward(&self, seq_len: usize) -> Result<()> {
        let mut guard = self.engine.lock().unwrap();
        let engine = guard.as_mut()
            .ok_or_else(|| anyhow::anyhow!("模型未初始化，请先调用 init_model_from_file 或 init_model_from_hf_hub"))?;

        engine.test_forward(seq_len)
    }
}

impl Default for GGUFInferenceService {
    fn default() -> Self {
        Self::new()
    }
}


