mod inference;
mod commands;

use std::sync::{Arc, Mutex};
use tracing::info;
use tracing_subscriber::{fmt, EnvFilter, layer::SubscriberExt, reload, util::SubscriberInitExt};
use inference::{InferenceService, GGUFInferenceService};
use commands::api::spawn_axum_server;
use commands::logging::LogHandle;

/// 初始化日志系统，返回 reload handle 以便动态更改日志级别
fn init_logger() -> Option<LogHandle> {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));
    
    let (filter, reload_handle) = reload::Layer::new(filter);
    
    tracing_subscriber::registry()
        .with(filter)
        .with(
            fmt::layer()
                .with_target(false)
                .with_thread_ids(false)
                .with_thread_names(false)
                .compact(),
        )
        .init();
    
    info!("日志系统初始化完成");
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
    // 初始化日志系统
    let log_reload_handle = init_logger();
    
    info!("正在启动 Tauri 应用程序...");
    
    // 启动 Axum 服务器
    spawn_axum_server();
    
    // 创建推理服务
    info!("正在创建推理服务...");
    let inference_service = Arc::new(InferenceService::new());
    let gguf_inference_service = Arc::new(GGUFInferenceService::new());
    info!("推理服务创建完成");
    
    // 创建日志级别管理状态
    let log_handle_state = Arc::new(Mutex::new(log_reload_handle));
    
    info!("正在初始化 Tauri 应用...");
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(inference_service)
        .manage(gguf_inference_service)
        .manage(log_handle_state)
        .invoke_handler(tauri::generate_handler![
            greet,
            // 日志相关命令
            commands::logging::get_log_level,
            commands::logging::set_log_level,
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
