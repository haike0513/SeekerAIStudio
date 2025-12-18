mod inference;

use axum::{
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;
use inference::{InferenceService, GGUFInferenceService};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// 推理请求
#[derive(Debug, Serialize, Deserialize)]
pub struct InferenceRequest {
    pub prompt: String,
    pub max_tokens: Option<usize>,
}

/// 多模态推理请求（图像 + 文本）
#[derive(Debug, Serialize, Deserialize)]
pub struct MultimodalInferenceRequest {
    pub image_path: String,
    pub prompt: String,
    pub max_tokens: Option<usize>,
}

/// 多模态推理请求（从图像字节数据）
#[derive(Debug, Serialize, Deserialize)]
pub struct MultimodalInferenceFromBytesRequest {
    pub image_data: Vec<u8>, // base64 编码的图像数据
    pub prompt: String,
    pub max_tokens: Option<usize>,
}

/// 推理响应
#[derive(Debug, Serialize, Deserialize)]
pub struct InferenceResponse {
    pub text: String,
    pub success: bool,
    pub error: Option<String>,
}

/// 初始化模型请求
#[derive(Debug, Serialize, Deserialize)]
pub struct InitModelRequest {
    pub model_path: String,
    pub tokenizer_path: String,
}

/// 初始化模型响应
#[derive(Debug, Serialize, Deserialize)]
pub struct InitModelResponse {
    pub success: bool,
    pub message: String,
}

/// GGUF 初始化模型请求（从本地文件）
#[derive(Debug, Serialize, Deserialize)]
pub struct InitGGUFFileRequest {
    pub model_path: String,
    pub tokenizer_path: Option<String>,
}

/// GGUF 初始化模型请求（从 HuggingFace Hub）
#[derive(Debug, Serialize, Deserialize)]
pub struct InitGGUFHubRequest {
    pub hf_repo: String,
    pub hf_filename: String,
    pub tokenizer_path: Option<String>,
}

/// 初始化 qwen3vl-8b 模型
#[tauri::command]
async fn init_qwen3vl_model(
    state: tauri::State<'_, Arc<InferenceService>>,
    request: InitModelRequest,
) -> Result<InitModelResponse, String> {
    let model_path = PathBuf::from(&request.model_path);
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
    // 注意：由于 Config 结构体比较复杂，这里尝试从模型目录加载
    // 如果加载失败，返回错误提示用户
    let model_dir = if final_model_path.is_file() {
        final_model_path.parent().unwrap_or(&final_model_path).to_path_buf()
    } else {
        final_model_path.clone()
    };
    
    let model_config = match inference::create_qwen3vl_config_from_dir(&model_dir) {
        Ok(config) => config,
        Err(e) => {
            return Ok(InitModelResponse {
                success: false,
                message: format!(
                    "无法加载模型配置: {}. \
                    请确保模型目录包含有效的 config.json 文件，或手动提供 Config 结构体。\
                    模型目录: {:?}", e, model_dir
                ),
            });
        }
    };
    
    // 初始化模型
    match state.init_model(final_model_path, final_tokenizer_path, model_config) {
        Ok(_) => Ok(InitModelResponse {
            success: true,
            message: "Qwen3VL-8B 模型初始化成功".to_string(),
        }),
        Err(e) => Ok(InitModelResponse {
            success: false,
            message: format!("模型初始化失败: {}", e),
        }),
    }
}

/// 执行推理
#[tauri::command]
async fn generate_text(
    state: tauri::State<'_, Arc<InferenceService>>,
    request: InferenceRequest,
) -> Result<InferenceResponse, String> {
    let max_tokens = request.max_tokens.unwrap_or(512);
    
    match state.generate(&request.prompt, max_tokens) {
        Ok(text) => Ok(InferenceResponse {
            text,
            success: true,
            error: None,
        }),
        Err(e) => Ok(InferenceResponse {
            text: String::new(),
            success: false,
            error: Some(format!("推理失败: {}", e)),
        }),
    }
}

/// 检查模型是否已加载
#[tauri::command]
async fn is_model_loaded(
    state: tauri::State<'_, Arc<InferenceService>>,
) -> Result<bool, String> {
    Ok(state.is_loaded())
}

/// 多模态推理（图像 + 文本）
#[tauri::command]
async fn generate_multimodal(
    state: tauri::State<'_, Arc<InferenceService>>,
    request: MultimodalInferenceRequest,
) -> Result<InferenceResponse, String> {
    let max_tokens = request.max_tokens.unwrap_or(512);
    let image_path = PathBuf::from(&request.image_path);
    
    match state.generate_multimodal(image_path, &request.prompt, max_tokens) {
        Ok(text) => Ok(InferenceResponse {
            text,
            success: true,
            error: None,
        }),
        Err(e) => Ok(InferenceResponse {
            text: String::new(),
            success: false,
            error: Some(format!("多模态推理失败: {}", e)),
        }),
    }
}

/// 多模态推理（从图像字节数据）
#[tauri::command]
async fn generate_multimodal_from_bytes(
    state: tauri::State<'_, Arc<InferenceService>>,
    request: MultimodalInferenceFromBytesRequest,
) -> Result<InferenceResponse, String> {
    let max_tokens = request.max_tokens.unwrap_or(512);
    
    // 解码 base64 图像数据（如果前端传入的是 base64）
    // 注意：这里假设传入的是原始字节数据，如果前端传的是 base64，需要先解码
    match state.generate_multimodal_from_bytes(&request.image_data, &request.prompt, max_tokens) {
        Ok(text) => Ok(InferenceResponse {
            text,
            success: true,
            error: None,
        }),
        Err(e) => Ok(InferenceResponse {
            text: String::new(),
            success: false,
            error: Some(format!("多模态推理失败: {}", e)),
        }),
    }
}

// ========== GGUF 模型相关命令 ==========

/// 从本地文件初始化 GGUF 模型
#[tauri::command]
async fn init_gguf_model_from_file(
    state: tauri::State<'_, Arc<GGUFInferenceService>>,
    request: InitGGUFFileRequest,
) -> Result<InitModelResponse, String> {
    let model_path = PathBuf::from(&request.model_path);
    let tokenizer_path = request.tokenizer_path.map(PathBuf::from);
    
    match state.init_model_from_file(model_path, tokenizer_path) {
        Ok(_) => Ok(InitModelResponse {
            success: true,
            message: "GGUF 模型初始化成功".to_string(),
        }),
        Err(e) => Ok(InitModelResponse {
            success: false,
            message: format!("GGUF 模型初始化失败: {}", e),
        }),
    }
}

/// 从 HuggingFace Hub 下载并初始化 GGUF 模型
#[tauri::command]
async fn init_gguf_model_from_hub(
    state: tauri::State<'_, Arc<GGUFInferenceService>>,
    request: InitGGUFHubRequest,
) -> Result<InitModelResponse, String> {
    let tokenizer_path = request.tokenizer_path.map(PathBuf::from);
    
    match state.init_model_from_hf_hub(
        request.hf_repo,
        request.hf_filename,
        tokenizer_path,
    ) {
        Ok(_) => Ok(InitModelResponse {
            success: true,
            message: "GGUF 模型从 HuggingFace Hub 下载并初始化成功".to_string(),
        }),
        Err(e) => Ok(InitModelResponse {
            success: false,
            message: format!("GGUF 模型初始化失败: {}", e),
        }),
    }
}

/// 执行 GGUF 模型推理
#[tauri::command]
async fn generate_gguf_text(
    state: tauri::State<'_, Arc<GGUFInferenceService>>,
    request: InferenceRequest,
) -> Result<InferenceResponse, String> {
    let max_tokens = request.max_tokens.unwrap_or(512);
    
    match state.generate(&request.prompt, max_tokens) {
        Ok(text) => Ok(InferenceResponse {
            text,
            success: true,
            error: None,
        }),
        Err(e) => Ok(InferenceResponse {
            text: String::new(),
            success: false,
            error: Some(format!("GGUF 推理失败: {}", e)),
        }),
    }
}

/// 检查 GGUF 模型是否已加载
#[tauri::command]
async fn is_gguf_model_loaded(
    state: tauri::State<'_, Arc<GGUFInferenceService>>,
) -> Result<bool, String> {
    Ok(state.is_loaded())
}

/// 测试 GGUF 模型前向传播
#[tauri::command]
async fn test_gguf_forward(
    state: tauri::State<'_, Arc<GGUFInferenceService>>,
    seq_len: Option<usize>,
) -> Result<String, String> {
    let seq_len = seq_len.unwrap_or(128);
    
    match state.test_forward(seq_len) {
        Ok(_) => Ok(format!("前向传播测试成功 (序列长度: {})", seq_len)),
        Err(e) => Err(format!("前向传播测试失败: {}", e)),
    }
}

#[derive(Serialize, Deserialize)]
struct ApiResponse {
    message: String,
    status: String,
}

#[derive(Serialize, Deserialize)]
struct GreetRequest {
    name: String,
}

// Axum 路由处理函数
async fn health_check() -> Json<ApiResponse> {
    Json(ApiResponse {
        message: "Service is running".to_string(),
        status: "ok".to_string(),
    })
}

async fn greet_api(Json(payload): Json<GreetRequest>) -> Result<Json<ApiResponse>, StatusCode> {
    Ok(Json(ApiResponse {
        message: format!("Hello, {}! You've been greeted from Rust API!", payload.name),
        status: "success".to_string(),
    }))
}

// 创建并启动 Axum 服务器
async fn start_axum_server() -> Result<(), Box<dyn std::error::Error>> {
    // 创建路由
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/greet", post(greet_api))
        .layer(CorsLayer::permissive()); // 允许所有跨域请求

    // 绑定到本地地址，默认端口 8080
    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
    let listener = TcpListener::bind(addr).await?;
    
    println!("Axum server running on http://{}", addr);
    
    // 启动服务器
    axum::serve(listener, app).await?;
    
    Ok(())
}

// 在后台启动 Axum 服务器
fn spawn_axum_server() {
    // 在独立线程中创建并运行 tokio runtime
    std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
        rt.block_on(async {
            if let Err(e) = start_axum_server().await {
                eprintln!("Axum server error: {}", e);
            }
        });
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 启动 Axum 服务器
    spawn_axum_server();
    
    // 创建推理服务
    let inference_service = Arc::new(InferenceService::new());
    let gguf_inference_service = Arc::new(GGUFInferenceService::new());
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(inference_service)
        .manage(gguf_inference_service)
        .invoke_handler(tauri::generate_handler![
            greet,
            init_qwen3vl_model,
            generate_text,
            is_model_loaded,
            generate_multimodal,
            generate_multimodal_from_bytes,
            // GGUF 相关命令
            init_gguf_model_from_file,
            init_gguf_model_from_hub,
            generate_gguf_text,
            is_gguf_model_loaded,
            test_gguf_forward
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
