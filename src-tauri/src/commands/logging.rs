use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tracing::{error, info};
use tracing_subscriber::{EnvFilter, reload, Registry};

/// 日志级别
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Trace,
    Debug,
    Info,
    Warn,
    Error,
}

impl LogLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            LogLevel::Trace => "trace",
            LogLevel::Debug => "debug",
            LogLevel::Info => "info",
            LogLevel::Warn => "warn",
            LogLevel::Error => "error",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "trace" => Some(LogLevel::Trace),
            "debug" => Some(LogLevel::Debug),
            "info" => Some(LogLevel::Info),
            "warn" => Some(LogLevel::Warn),
            "error" => Some(LogLevel::Error),
            _ => None,
        }
    }
}

/// 日志级别设置响应
#[derive(Debug, Serialize, Deserialize)]
pub struct LogLevelResponse {
    pub success: bool,
    pub message: String,
    pub current_level: LogLevel,
}

/// 日志句柄类型别名
pub type LogHandle = reload::Handle<EnvFilter, Registry>;

/// 获取当前日志级别
#[tauri::command]
pub async fn get_log_level(
    _state: tauri::State<'_, Arc<Mutex<Option<LogHandle>>>>,
) -> Result<LogLevel, String> {
    // 默认返回 info 级别
    Ok(LogLevel::Info)
}

/// 设置日志级别
#[tauri::command]
pub async fn set_log_level(
    level: LogLevel,
    state: tauri::State<'_, Arc<Mutex<Option<LogHandle>>>>
) -> Result<LogLevelResponse, String> {
    info!("收到设置日志级别请求: {:?}", level);
    
    let level_str = level.as_str();
    let filter = EnvFilter::new(level_str);
    
    let handle_guard = state.lock().map_err(|e| format!("获取日志句柄锁失败: {}", e))?;
    
    if let Some(handle) = handle_guard.as_ref() {
        handle
            .reload(filter)
            .map_err(|e| format!("更新日志级别失败: {}", e))?;
        
        info!("日志级别已更新为: {}", level_str);
        Ok(LogLevelResponse {
            success: true,
            message: format!("日志级别已设置为: {}", level_str),
            current_level: level,
        })
    } else {
        error!("日志句柄未初始化");
        Err("日志系统未正确初始化".to_string())
    }
}

