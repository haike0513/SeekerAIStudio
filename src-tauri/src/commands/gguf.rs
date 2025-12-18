use crate::commands::common::*;
use crate::inference::GGUFInferenceService;
use std::path::PathBuf;
use std::sync::Arc;
use tracing::{debug, error, info};
use tauri::State;

/// 从本地文件初始化 GGUF 模型
#[tauri::command]
pub async fn init_gguf_model_from_file(
    state: State<'_, Arc<GGUFInferenceService>>,
    request: InitGGUFFileRequest,
) -> Result<InitModelResponse, String> {
    info!("开始从本地文件初始化 GGUF 模型");
    info!("模型路径: {}, Tokenizer 路径: {:?}", request.model_path, request.tokenizer_path);
    
    let model_path = PathBuf::from(&request.model_path);
    let tokenizer_path = request.tokenizer_path.map(PathBuf::from);
    
    match state.init_model_from_file(model_path.clone(), tokenizer_path.clone()) {
        Ok(_) => {
            info!("GGUF 模型初始化成功");
            Ok(InitModelResponse {
                success: true,
                message: "GGUF 模型初始化成功".to_string(),
            })
        },
        Err(e) => {
            error!("GGUF 模型初始化失败: {}", e);
            Ok(InitModelResponse {
                success: false,
                message: format!("GGUF 模型初始化失败: {}", e),
            })
        },
    }
}

/// 从 HuggingFace Hub 下载并初始化 GGUF 模型
#[tauri::command]
pub async fn init_gguf_model_from_hub(
    state: State<'_, Arc<GGUFInferenceService>>,
    request: InitGGUFHubRequest,
) -> Result<InitModelResponse, String> {
    info!("开始从 HuggingFace Hub 下载并初始化 GGUF 模型");
    info!("仓库: {}, 文件名: {}, Tokenizer 路径: {:?}", 
          request.hf_repo, request.hf_filename, request.tokenizer_path);
    
    let tokenizer_path = request.tokenizer_path.map(PathBuf::from);
    
    match state.init_model_from_hf_hub(
        request.hf_repo.clone(),
        request.hf_filename.clone(),
        tokenizer_path.clone(),
    ) {
        Ok(_) => {
            info!("GGUF 模型从 HuggingFace Hub 下载并初始化成功");
            Ok(InitModelResponse {
                success: true,
                message: "GGUF 模型从 HuggingFace Hub 下载并初始化成功".to_string(),
            })
        },
        Err(e) => {
            error!("GGUF 模型从 HuggingFace Hub 初始化失败: {}", e);
            Ok(InitModelResponse {
                success: false,
                message: format!("GGUF 模型初始化失败: {}", e),
            })
        },
    }
}

/// 执行 GGUF 模型推理
#[tauri::command]
pub async fn generate_gguf_text(
    state: State<'_, Arc<GGUFInferenceService>>,
    request: InferenceRequest,
) -> Result<InferenceResponse, String> {
    let max_tokens = request.max_tokens.unwrap_or(512);
    debug!("收到 GGUF 文本推理请求，prompt 长度: {}, max_tokens: {}", request.prompt.len(), max_tokens);
    
    match state.generate(&request.prompt, max_tokens) {
        Ok(text) => {
            info!("GGUF 文本推理成功，生成长度: {}", text.len());
            Ok(InferenceResponse {
                text,
                success: true,
                error: None,
            })
        },
        Err(e) => {
            error!("GGUF 文本推理失败: {}", e);
            Ok(InferenceResponse {
                text: String::new(),
                success: false,
                error: Some(format!("GGUF 推理失败: {}", e)),
            })
        },
    }
}

/// 检查 GGUF 模型是否已加载
#[tauri::command]
pub async fn is_gguf_model_loaded(
    state: State<'_, Arc<GGUFInferenceService>>,
) -> Result<bool, String> {
    let loaded = state.is_loaded();
    debug!("检查 GGUF 模型加载状态: {}", loaded);
    Ok(loaded)
}

/// 测试 GGUF 模型前向传播
#[tauri::command]
pub async fn test_gguf_forward(
    state: State<'_, Arc<GGUFInferenceService>>,
    seq_len: Option<usize>,
) -> Result<String, String> {
    let seq_len = seq_len.unwrap_or(128);
    info!("开始测试 GGUF 模型前向传播，序列长度: {}", seq_len);
    
    match state.test_forward(seq_len) {
        Ok(_) => {
            info!("前向传播测试成功 (序列长度: {})", seq_len);
            Ok(format!("前向传播测试成功 (序列长度: {})", seq_len))
        },
        Err(e) => {
            error!("前向传播测试失败: {}", e);
            Err(format!("前向传播测试失败: {}", e))
        },
    }
}

