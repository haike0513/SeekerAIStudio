//! 存储相关命令
//!
//! 提供文件读写、数据持久化等功能

use serde::Serialize;
use std::path::PathBuf;
use tauri::Manager;
use tracing::{debug, info};

/// 获取应用数据目录
fn get_app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("无法获取应用数据目录: {}", e))
}

/// 确保目录存在
fn ensure_dir_exists(path: &PathBuf) -> Result<(), String> {
    if !path.exists() {
        std::fs::create_dir_all(path).map_err(|e| format!("创建目录失败: {}", e))?;
    }
    Ok(())
}

/// 获取应用路径信息
#[derive(Debug, Serialize)]
pub struct AppPaths {
    pub config: String,
    pub data: String,
    pub cache: String,
    pub logs: String,
    pub models: String,
}

/// 获取应用路径
#[tauri::command]
pub async fn get_app_paths(app: tauri::AppHandle) -> Result<AppPaths, String> {
    let data_dir = get_app_data_dir(&app)?;
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("无法获取配置目录: {}", e))?;
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("无法获取缓存目录: {}", e))?;
    let log_dir = app
        .path()
        .app_log_dir()
        .map_err(|e| format!("无法获取日志目录: {}", e))?;

    let models_dir = data_dir.join("models");

    // 确保目录存在
    ensure_dir_exists(&data_dir)?;
    ensure_dir_exists(&config_dir)?;
    ensure_dir_exists(&cache_dir)?;
    ensure_dir_exists(&log_dir)?;
    ensure_dir_exists(&models_dir)?;

    Ok(AppPaths {
        config: config_dir.to_string_lossy().to_string(),
        data: data_dir.to_string_lossy().to_string(),
        cache: cache_dir.to_string_lossy().to_string(),
        logs: log_dir.to_string_lossy().to_string(),
        models: models_dir.to_string_lossy().to_string(),
    })
}

/// 读取文件内容
#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    debug!("读取文件: {}", path);

    // 安全检查：防止路径遍历
    let path = PathBuf::from(&path);
    if path
        .components()
        .any(|c| matches!(c, std::path::Component::ParentDir))
    {
        return Err("不允许路径遍历".to_string());
    }

    std::fs::read_to_string(&path).map_err(|e| format!("读取文件失败: {}", e))
}

/// 写入文件内容
#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    debug!("写入文件: {}", path);

    let path = PathBuf::from(&path);

    // 安全检查
    if path
        .components()
        .any(|c| matches!(c, std::path::Component::ParentDir))
    {
        return Err("不允许路径遍历".to_string());
    }

    // 确保父目录存在
    if let Some(parent) = path.parent() {
        ensure_dir_exists(&parent.to_path_buf())?;
    }

    std::fs::write(&path, content).map_err(|e| format!("写入文件失败: {}", e))
}

/// 文件/目录信息
#[derive(Debug, Serialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: u64,
    pub modified_at: Option<u64>,
}

/// 列出目录内容
#[tauri::command]
pub async fn list_directory(path: String) -> Result<Vec<FileEntry>, String> {
    debug!("列出目录: {}", path);

    let path = PathBuf::from(&path);

    if !path.exists() {
        return Err("目录不存在".to_string());
    }

    if !path.is_dir() {
        return Err("路径不是目录".to_string());
    }

    let mut entries = Vec::new();

    let read_dir = std::fs::read_dir(&path).map_err(|e| format!("读取目录失败: {}", e))?;

    for entry in read_dir {
        let entry = entry.map_err(|e| format!("读取条目失败: {}", e))?;
        let metadata = entry
            .metadata()
            .map_err(|e| format!("获取元数据失败: {}", e))?;

        let modified_at = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs());

        entries.push(FileEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            is_directory: metadata.is_dir(),
            size: metadata.len(),
            modified_at,
        });
    }

    // 排序：目录优先，然后按名称
    entries.sort_by(|a, b| match (a.is_directory, b.is_directory) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

/// 创建目录
#[tauri::command]
pub async fn create_directory(path: String) -> Result<(), String> {
    debug!("创建目录: {}", path);

    let path = PathBuf::from(&path);

    std::fs::create_dir_all(&path).map_err(|e| format!("创建目录失败: {}", e))
}

/// 删除文件或目录
#[tauri::command]
pub async fn delete_file(path: String, recursive: bool) -> Result<(), String> {
    info!("删除文件/目录: {}, recursive: {}", path, recursive);

    let path = PathBuf::from(&path);

    if !path.exists() {
        return Ok(());
    }

    if path.is_dir() {
        if recursive {
            std::fs::remove_dir_all(&path).map_err(|e| format!("删除目录失败: {}", e))?;
        } else {
            std::fs::remove_dir(&path).map_err(|e| format!("删除空目录失败: {}", e))?;
        }
    } else {
        std::fs::remove_file(&path).map_err(|e| format!("删除文件失败: {}", e))?;
    }

    Ok(())
}

/// 检查文件是否存在
#[tauri::command]
pub async fn file_exists(path: String) -> bool {
    PathBuf::from(&path).exists()
}

/// 获取系统信息
#[derive(Debug, Serialize)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub total_memory: u64,
    pub available_memory: u64,
    pub cpu_count: usize,
}

/// 获取系统信息
#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo, String> {
    // 简化版本：不使用 sysinfo 库
    // 如需详细信息，可以添加 sysinfo 依赖
    let cpu_count = std::thread::available_parallelism()
        .map(|p| p.get())
        .unwrap_or(1);

    Ok(SystemInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        total_memory: 0,     // 需要 sysinfo 才能获取
        available_memory: 0, // 需要 sysinfo 才能获取
        cpu_count,
    })
}

/// 保存设置
#[tauri::command]
pub async fn save_setting(app: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("无法获取配置目录: {}", e))?;

    ensure_dir_exists(&config_dir)?;

    let settings_file = config_dir.join("settings.json");

    // 读取现有设置
    let mut settings: serde_json::Value = if settings_file.exists() {
        let content = std::fs::read_to_string(&settings_file)
            .map_err(|e| format!("读取设置文件失败: {}", e))?;
        serde_json::from_str(&content).unwrap_or(serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    // 更新设置
    if let Some(obj) = settings.as_object_mut() {
        obj.insert(key, serde_json::Value::String(value));
    }

    // 保存设置
    let content =
        serde_json::to_string_pretty(&settings).map_err(|e| format!("序列化设置失败: {}", e))?;

    std::fs::write(&settings_file, content).map_err(|e| format!("保存设置文件失败: {}", e))?;

    Ok(())
}

/// 读取设置
#[tauri::command]
pub async fn get_setting(
    app: tauri::AppHandle,
    key: String,
    default_value: Option<String>,
) -> Result<Option<String>, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("无法获取配置目录: {}", e))?;

    let settings_file = config_dir.join("settings.json");

    if !settings_file.exists() {
        return Ok(default_value);
    }

    let content =
        std::fs::read_to_string(&settings_file).map_err(|e| format!("读取设置文件失败: {}", e))?;

    let settings: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("解析设置文件失败: {}", e))?;

    if let Some(value) = settings.get(&key) {
        if let Some(s) = value.as_str() {
            return Ok(Some(s.to_string()));
        }
    }

    Ok(default_value)
}

/// 获取所有设置
#[tauri::command]
pub async fn get_all_settings(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("无法获取配置目录: {}", e))?;

    let settings_file = config_dir.join("settings.json");

    if !settings_file.exists() {
        return Ok(serde_json::json!({}));
    }

    let content =
        std::fs::read_to_string(&settings_file).map_err(|e| format!("读取设置文件失败: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("解析设置文件失败: {}", e))
}
