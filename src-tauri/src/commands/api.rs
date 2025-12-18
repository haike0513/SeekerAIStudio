use axum::{
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use tokio::net::TcpListener;
use tokio::sync::oneshot;
use tower_http::cors::CorsLayer;
use tracing::{debug, error, info, warn};

#[derive(Serialize, Deserialize)]
pub struct ApiResponse {
    pub message: String,
    pub status: String,
}

#[derive(Serialize, Deserialize)]
pub struct GreetRequest {
    pub name: String,
}

#[derive(Serialize, Deserialize)]
pub struct ServerStatus {
    pub is_running: bool,
    pub address: Option<String>,
}

// 服务器句柄，用于停止服务器
pub struct ServerHandle {
    shutdown_tx: Option<oneshot::Sender<()>>,
    thread_handle: Option<std::thread::JoinHandle<()>>,
}

impl ServerHandle {
    pub fn new(shutdown_tx: oneshot::Sender<()>, thread_handle: std::thread::JoinHandle<()>) -> Self {
        Self {
            shutdown_tx: Some(shutdown_tx),
            thread_handle: Some(thread_handle),
        }
    }

    pub fn stop(&mut self) -> Result<(), String> {
        if let Some(tx) = self.shutdown_tx.take() {
            tx.send(()).map_err(|_| "发送停止信号失败：接收端已关闭".to_string())?;
            info!("已发送服务器停止信号");
        }
        
        if let Some(handle) = self.thread_handle.take() {
            handle.join().map_err(|e| format!("等待服务器线程结束失败: {:?}", e))?;
            info!("服务器线程已结束");
        }
        
        Ok(())
    }
}

// Axum 路由处理函数
async fn health_check() -> Json<ApiResponse> {
    debug!("收到健康检查请求");
    Json(ApiResponse {
        message: "Service is running".to_string(),
        status: "ok".to_string(),
    })
}

async fn greet_api(Json(payload): Json<GreetRequest>) -> Result<Json<ApiResponse>, StatusCode> {
    info!("收到 API greet 请求，name: {}", payload.name);
    Ok(Json(ApiResponse {
        message: format!("Hello, {}! You've been greeted from Rust API!", payload.name),
        status: "success".to_string(),
    }))
}

// 创建并启动 Axum 服务器（带停止信号）
async fn start_axum_server_with_shutdown(
    mut shutdown_rx: oneshot::Receiver<()>,
) -> Result<(), Box<dyn std::error::Error>> {
    info!("正在启动 Axum 服务器...");
    
    // 创建路由
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/greet", post(greet_api))
        .layer(CorsLayer::permissive()); // 允许所有跨域请求

    // 绑定到本地地址，默认端口 8080
    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
    let listener = TcpListener::bind(addr).await?;
    
    info!("Axum 服务器运行在 http://{}", addr);
    
    // 启动服务器，支持优雅关闭
    axum::serve(listener, app)
        .with_graceful_shutdown(async {
            let _ = shutdown_rx.await;
            info!("收到停止信号，正在关闭服务器...");
        })
        .await?;
    
    info!("Axum 服务器已关闭");
    Ok(())
}

// 在后台启动 Axum 服务器，返回句柄用于停止
pub fn spawn_axum_server() -> Result<ServerHandle, String> {
    info!("在后台线程中启动 Axum 服务器");
    
    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();
    
    let thread_handle = std::thread::spawn(move || {
        let rt = match tokio::runtime::Runtime::new() {
            Ok(rt) => rt,
            Err(e) => {
                error!("创建 tokio runtime 失败: {}", e);
                return;
            }
        };
        
        rt.block_on(async {
            if let Err(e) = start_axum_server_with_shutdown(shutdown_rx).await {
                error!("Axum 服务器错误: {}", e);
            }
        });
    });
    
    Ok(ServerHandle::new(shutdown_tx, thread_handle))
}

// 获取服务器状态
#[tauri::command]
pub async fn get_server_status(
    state: tauri::State<'_, Arc<Mutex<Option<ServerHandle>>>>,
) -> Result<ServerStatus, String> {
    let guard = state.lock().map_err(|e| format!("获取服务器状态锁失败: {}", e))?;
    
    if guard.is_some() {
        Ok(ServerStatus {
            is_running: true,
            address: Some("http://127.0.0.1:8080".to_string()),
        })
    } else {
        Ok(ServerStatus {
            is_running: false,
            address: None,
        })
    }
}

// 启动服务器
#[tauri::command]
pub async fn start_server(
    state: tauri::State<'_, Arc<Mutex<Option<ServerHandle>>>>,
) -> Result<ServerStatus, String> {
    let mut guard = state.lock().map_err(|e| format!("获取服务器状态锁失败: {}", e))?;
    
    // 如果服务器已经在运行，返回当前状态
    if guard.is_some() {
        warn!("服务器已经在运行中");
        return Ok(ServerStatus {
            is_running: true,
            address: Some("http://127.0.0.1:8080".to_string()),
        });
    }
    
    // 启动服务器
    match spawn_axum_server() {
        Ok(handle) => {
            *guard = Some(handle);
            info!("服务器启动成功");
            Ok(ServerStatus {
                is_running: true,
                address: Some("http://127.0.0.1:8080".to_string()),
            })
        }
        Err(e) => {
            error!("启动服务器失败: {}", e);
            Err(format!("启动服务器失败: {}", e))
        }
    }
}

// 停止服务器
#[tauri::command]
pub async fn stop_server(
    state: tauri::State<'_, Arc<Mutex<Option<ServerHandle>>>>,
) -> Result<ServerStatus, String> {
    let mut guard = state.lock().map_err(|e| format!("获取服务器状态锁失败: {}", e))?;
    
    if let Some(mut handle) = guard.take() {
        match handle.stop() {
            Ok(_) => {
                info!("服务器已停止");
                Ok(ServerStatus {
                    is_running: false,
                    address: None,
                })
            }
            Err(e) => {
                error!("停止服务器失败: {}", e);
                Err(format!("停止服务器失败: {}", e))
            }
        }
    } else {
        warn!("服务器未运行");
        Ok(ServerStatus {
            is_running: false,
            address: None,
        })
    }
}

