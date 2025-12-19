use crate::commands::common::*;
use crate::inference::InferenceService;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;
use tracing::{debug, error, info};

use ai_base::models::qwen3vl::inference::Qwen3VLInferenceEngine;
use ai_base::models::qwen3vl::Qwen3VLConfig;
use candle_core::Device;

/// 初始化 qwen3vl-8b 模型
#[tauri::command]
pub async fn init_qwen3vl_model(
    state: State<'_, Arc<InferenceService>>,
    request: InitModelRequest,
) -> Result<InitModelResponse, String> {
    info!("开始初始化 Qwen3VL 模型");
    info!(
        "模型路径: {}, Tokenizer 路径: {}",
        request.model_path, request.tokenizer_path
    );
    let model_path = PathBuf::from(&request.model_path);
    let config_path = model_path.join("../config.json");

    tracing::info!("config_path: {}", config_path.display());

    let config_str = std::fs::read_to_string(config_path).unwrap();

    let config: Qwen3VLConfig = serde_json::from_str(&config_str).unwrap();
    let engine = Qwen3VLInferenceEngine::new(
        request.model_path.as_str(),
        request.tokenizer_path.as_str(),
        config,
        Device::Cpu,
    );
    tracing::debug!("Qwen3VL 模型初始化成功");

    let tokenizer_path = PathBuf::from(&request.tokenizer_path);

    // 如果模型路径是目录，尝试自动查找模型文件
    let final_model_path = if model_path.is_dir() {
        // 尝试查找 safetensors 文件
        let safetensors = model_path.join("model.safetensors");
        if safetensors.exists() {
            safetensors
        } else {
            // 查找其他可能的模型文件
            let model_files: Vec<PathBuf> = std::fs::read_dir(&model_path)
                .ok()
                .and_then(|dir| {
                    dir.filter_map(|entry| {
                        entry.ok().and_then(|e| {
                            let path = e.path();
                            if path.extension().and_then(|s| s.to_str()) == Some("safetensors") {
                                Some(path)
                            } else {
                                None
                            }
                        })
                    })
                    .collect::<Vec<_>>()
                    .into()
                })
                .unwrap_or_default();

            if let Some(first_file) = model_files.first() {
                first_file.clone()
            } else {
                model_path
            }
        }
    } else {
        model_path
    };

    // 如果 tokenizer 路径是目录，尝试自动查找 tokenizer 文件
    let final_tokenizer_path = if tokenizer_path.is_dir() {
        let tokenizer_json = tokenizer_path.join("tokenizer.json");
        if tokenizer_json.exists() {
            tokenizer_json
        } else {
            tokenizer_path
        }
    } else {
        tokenizer_path
    };

    // 尝试从模型目录加载配置
    let model_dir = if final_model_path.is_file() {
        final_model_path
            .parent()
            .unwrap_or(&final_model_path)
            .to_path_buf()
    } else {
        final_model_path.clone()
    };

    let model_config = match crate::inference::create_qwen3vl_config_from_dir(&model_dir) {
        Ok(config) => config,
        Err(e) => {
            return Ok(InitModelResponse {
                success: false,
                message: format!(
                    "无法加载模型配置: {}. \
                    请确保模型目录包含有效的 config.json 文件，或手动提供 Config 结构体。\
                    模型目录: {:?}",
                    e, model_dir
                ),
            });
        }
    };

    // 初始化模型
    info!("开始加载模型文件");
    match state.init_model(
        final_model_path.clone(),
        final_tokenizer_path.clone(),
        model_config,
    ) {
        Ok(_) => {
            info!("Qwen3VL-8B 模型初始化成功");
            Ok(InitModelResponse {
                success: true,
                message: "Qwen3VL-8B 模型初始化成功".to_string(),
            })
        }
        Err(e) => {
            error!("模型初始化失败: {}", e);
            Ok(InitModelResponse {
                success: false,
                message: format!("模型初始化失败: {}", e),
            })
        }
    }
}

/// 执行推理
#[tauri::command]
pub async fn generate_text(
    state: State<'_, Arc<InferenceService>>,
    request: InferenceRequest,
) -> Result<InferenceResponse, String> {
    let max_tokens = request.max_tokens.unwrap_or(512);
    debug!(
        "收到文本推理请求，prompt 长度: {}, max_tokens: {}",
        request.prompt.len(),
        max_tokens
    );

    match state.generate(&request.prompt, max_tokens) {
        Ok(text) => {
            info!("文本推理成功，生成长度: {}", text.len());
            Ok(InferenceResponse {
                text,
                success: true,
                error: None,
            })
        }
        Err(e) => {
            error!("文本推理失败: {}", e);
            Ok(InferenceResponse {
                text: String::new(),
                success: false,
                error: Some(format!("推理失败: {}", e)),
            })
        }
    }
}

/// 检查模型是否已加载
#[tauri::command]
pub async fn is_model_loaded(state: State<'_, Arc<InferenceService>>) -> Result<bool, String> {
    let loaded = state.is_loaded();
    debug!("检查模型加载状态: {}", loaded);
    Ok(loaded)
}

/// 多模态推理（图像 + 文本）
#[tauri::command]
pub async fn generate_multimodal(
    state: State<'_, Arc<InferenceService>>,
    request: MultimodalInferenceRequest,
) -> Result<InferenceResponse, String> {
    let max_tokens = request.max_tokens.unwrap_or(512);
    let image_path = PathBuf::from(&request.image_path);
    info!(
        "收到多模态推理请求，图像路径: {}, prompt 长度: {}, max_tokens: {}",
        request.image_path,
        request.prompt.len(),
        max_tokens
    );

    match state.generate_multimodal(image_path.clone(), &request.prompt, max_tokens) {
        Ok(text) => {
            info!("多模态推理成功，生成长度: {}", text.len());
            Ok(InferenceResponse {
                text,
                success: true,
                error: None,
            })
        }
        Err(e) => {
            error!("多模态推理失败: {}", e);
            Ok(InferenceResponse {
                text: String::new(),
                success: false,
                error: Some(format!("多模态推理失败: {}", e)),
            })
        }
    }
}

/// 多模态推理（从图像字节数据）
#[tauri::command]
pub async fn generate_multimodal_from_bytes(
    state: State<'_, Arc<InferenceService>>,
    request: MultimodalInferenceFromBytesRequest,
) -> Result<InferenceResponse, String> {
    let max_tokens = request.max_tokens.unwrap_or(512);
    info!(
        "收到多模态推理请求（字节数据），图像数据大小: {} bytes, prompt 长度: {}, max_tokens: {}",
        request.image_data.len(),
        request.prompt.len(),
        max_tokens
    );

    match state.generate_multimodal_from_bytes(&request.image_data, &request.prompt, max_tokens) {
        Ok(text) => {
            info!("多模态推理（字节数据）成功，生成长度: {}", text.len());
            Ok(InferenceResponse {
                text,
                success: true,
                error: None,
            })
        }
        Err(e) => {
            error!("多模态推理（字节数据）失败: {}", e);
            Ok(InferenceResponse {
                text: String::new(),
                success: false,
                error: Some(format!("多模态推理失败: {}", e)),
            })
        }
    }
}
