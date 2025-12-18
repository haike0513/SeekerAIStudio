mod inference;
mod commands;

use std::sync::{Arc, Mutex};
use tracing::info;
use tracing_subscriber::{fmt, EnvFilter, layer::SubscriberExt, reload, util::SubscriberInitExt};
use inference::{InferenceService, GGUFInferenceService};
use commands::api::ServerHandle;
use commands::logging::LogHandle;

/// 初始化日志系统，返回 reload handle 以便动态更改日志级别
/// 使用轻量级配置以加快启动速度
fn init_logger() -> Option<LogHandle> {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));
    
    let (filter, reload_handle) = reload::Layer::new(filter);
    
    // 使用轻量级日志配置，减少初始化时间
    tracing_subscriber::registry()
        .with(filter)
        .with(
            fmt::layer()
                .with_target(false)
                .with_thread_ids(false)
                .with_thread_names(false)
                .with_file(false)
                .with_line_number(false)
                .compact(),
        )
        .init();
    
    Some(reload_handle)
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    use tracing::{debug, info};
    info!("收到 greet 命令，name: {}", name);
    let result = format!("Hello, {}! You've been greeted from Rust!", name);
    debug!("greet 命令返回: {}", result);
    result
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化日志系统（必须在启动前完成，因为需要记录日志）
    let log_reload_handle = init_logger();
    
    // 创建推理服务（轻量级操作，只是创建空服务）
    let inference_service = Arc::new(InferenceService::new());
    let gguf_inference_service = Arc::new(GGUFInferenceService::new());
    
    // 创建日志级别管理状态
    let log_handle_state = Arc::new(Mutex::new(log_reload_handle));
    
    // 创建服务器状态管理（默认关闭）
    let server_handle_state = Arc::new(Mutex::new(None::<ServerHandle>));
    
    info!("正在初始化 Tauri 应用...");
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(inference_service)
        .manage(gguf_inference_service)
        .manage(log_handle_state)
        .manage(server_handle_state)
        .invoke_handler(tauri::generate_handler![
            greet,
            // 日志相关命令
            commands::logging::get_log_level,
            commands::logging::set_log_level,
            // 服务器控制相关命令
            commands::api::get_server_status,
            commands::api::start_server,
            commands::api::stop_server,
            // Qwen3VL 相关命令
            commands::qwen3vl::init_qwen3vl_model,
            commands::qwen3vl::generate_text,
            commands::qwen3vl::is_model_loaded,
            commands::qwen3vl::generate_multimodal,
            commands::qwen3vl::generate_multimodal_from_bytes,
            // GGUF 相关命令
            commands::gguf::init_gguf_model_from_file,
            commands::gguf::init_gguf_model_from_hub,
            commands::gguf::generate_gguf_text,
            commands::gguf::is_gguf_model_loaded,
            commands::gguf::test_gguf_forward,
            // 模型管理相关命令
            commands::models::get_local_models,
            commands::models::search_remote_models,
            commands::models::download_model
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    
    info!("Tauri 应用程序已关闭");
}
