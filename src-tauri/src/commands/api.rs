use axum::{
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;
use tracing::{debug, error, info};

#[derive(Serialize, Deserialize)]
pub struct ApiResponse {
    pub message: String,
    pub status: String,
}

#[derive(Serialize, Deserialize)]
pub struct GreetRequest {
    pub name: String,
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

// 创建并启动 Axum 服务器
pub async fn start_axum_server() -> Result<(), Box<dyn std::error::Error>> {
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
    
    // 启动服务器
    axum::serve(listener, app).await?;
    
    Ok(())
}

// 在后台启动 Axum 服务器
pub fn spawn_axum_server() {
    info!("在后台线程中启动 Axum 服务器");
    // 在独立线程中创建并运行 tokio runtime
    std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
        rt.block_on(async {
            if let Err(e) = start_axum_server().await {
                error!("Axum 服务器错误: {}", e);
            }
        });
    });
}

