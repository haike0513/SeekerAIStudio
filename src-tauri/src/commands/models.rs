use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tracing::{error, info};
use anyhow::{Context, Result};

/// 本地模型信息
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LocalModelInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub model_type: String, // "gguf" or "safetensors"
    pub modified_time: Option<String>,
}

/// 远程模型信息（HuggingFace）
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RemoteModelInfo {
    pub id: String,
    pub author: String,
    pub downloads: Option<u64>,
    pub likes: Option<u64>,
    pub tags: Vec<String>,
    pub model_type: Option<String>,
    pub files: Vec<ModelFileInfo>,
}

/// 模型文件信息
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelFileInfo {
    pub filename: String,
    pub size: Option<u64>,
    pub r#type: String, // "gguf", "safetensors", "tokenizer", etc.
}

/// 搜索远程模型请求
#[derive(Debug, Serialize, Deserialize)]
pub struct SearchRemoteModelsRequest {
    pub query: String,
    pub limit: Option<usize>,
    pub model_type: Option<String>, // "gguf" or "safetensors"
}

/// 搜索远程模型响应
#[derive(Debug, Serialize, Deserialize)]
pub struct SearchRemoteModelsResponse {
    pub models: Vec<RemoteModelInfo>,
    pub success: bool,
    pub error: Option<String>,
}

/// 下载模型请求
#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadModelRequest {
    pub repo_id: String,
    pub filename: String,
    pub save_path: Option<String>, // 可选的自定义保存路径
}

/// 下载模型响应
#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadModelResponse {
    pub success: bool,
    pub message: String,
    pub local_path: Option<String>,
    pub error: Option<String>,
}

/// 获取本地模型列表
#[tauri::command]
pub async fn get_local_models() -> Result<Vec<LocalModelInfo>, String> {
    info!("开始获取本地模型列表");
    
    let models_dir = get_models_directory();
    let mut models = Vec::new();
    
    if !models_dir.exists() {
        info!("模型目录不存在，创建目录: {}", models_dir.display());
        if let Err(e) = fs::create_dir_all(&models_dir) {
            error!("创建模型目录失败: {}", e);
            return Err(format!("创建模型目录失败: {}", e));
        }
        return Ok(models);
    }
    
    match scan_directory_for_models(&models_dir) {
        Ok(mut found_models) => {
            models.append(&mut found_models);
        }
        Err(e) => {
            error!("扫描模型目录失败: {}", e);
            return Err(format!("扫描模型目录失败: {}", e));
        }
    }
    
    info!("找到 {} 个本地模型", models.len());
    Ok(models)
}

/// 扫描目录查找模型文件
fn scan_directory_for_models(dir: &Path) -> Result<Vec<LocalModelInfo>> {
    let mut models = Vec::new();
    
    if !dir.is_dir() {
        return Ok(models);
    }
    
    let entries = fs::read_dir(dir)
        .context("无法读取目录")?;
    
    for entry in entries {
        let entry = entry.context("无法读取目录项")?;
        let path = entry.path();
        
        if path.is_file() {
            let extension = path.extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("");
            
            let model_type = match extension {
                "gguf" => Some("gguf"),
                "safetensors" => Some("safetensors"),
                _ => None,
            };
            
            if let Some(mt) = model_type {
                let metadata = fs::metadata(&path)
                    .context(format!("无法获取文件元数据: {}", path.display()))?;
                
                let name = path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("未知模型")
                    .to_string();
                
                let modified_time = metadata.modified()
                    .ok()
                    .and_then(|time| {
                        chrono::DateTime::<chrono::Local>::from(time)
                            .format("%Y-%m-%d %H:%M:%S")
                            .to_string()
                            .into()
                    });
                
                models.push(LocalModelInfo {
                    name: name.clone(),
                    path: path.to_string_lossy().to_string(),
                    size: metadata.len(),
                    model_type: mt.to_string(),
                    modified_time,
                });
            }
        } else if path.is_dir() {
            // 递归扫描子目录
            let mut sub_models = scan_directory_for_models(&path)?;
            models.append(&mut sub_models);
        }
    }
    
    Ok(models)
}

/// 获取模型目录路径
fn get_models_directory() -> PathBuf {
    // 优先使用项目根目录下的 models 文件夹
    if let Ok(current_dir) = std::env::current_dir() {
        let project_models = current_dir.join("models");
        if project_models.exists() {
            return project_models;
        }
    }
    
    // 否则使用用户目录下的 models 文件夹
    if let Some(home_dir) = dirs::home_dir() {
        return home_dir.join("SeekerAiTools").join("models");
    }
    
    // 最后使用当前目录
    PathBuf::from("models")
}

/// 搜索远程模型（HuggingFace）
#[tauri::command]
pub async fn search_remote_models(
    request: SearchRemoteModelsRequest,
) -> Result<SearchRemoteModelsResponse, String> {
    info!("开始搜索远程模型，查询: {}", request.query);
    
    let limit = request.limit.unwrap_or(20);
    let query = request.query.trim();
    
    if query.is_empty() {
        return Ok(SearchRemoteModelsResponse {
            models: Vec::new(),
            success: false,
            error: Some("搜索查询不能为空".to_string()),
        });
    }
    
    // 构建 HuggingFace API 搜索 URL
    let mut url = format!(
        "https://huggingface.co/api/models?search={}&limit={}",
        urlencoding::encode(query),
        limit
    );
    
    // 如果指定了模型类型，添加过滤
    if let Some(ref model_type) = request.model_type {
        if model_type == "gguf" {
            url = format!("{}&filter=gguf", url);
        } else if model_type == "safetensors" {
            url = format!("{}&filter=safetensors", url);
        }
    }
    
    info!("请求 URL: {}", url);
    
    // 发送 HTTP 请求
    let client = reqwest::Client::new();
    let response = match client
        .get(&url)
        .header("User-Agent", "SeekerAiTools/1.0")
        .send()
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            error!("HTTP 请求失败: {}", e);
            return Ok(SearchRemoteModelsResponse {
                models: Vec::new(),
                success: false,
                error: Some(format!("网络请求失败: {}", e)),
            });
        }
    };
    
    if !response.status().is_success() {
        let status = response.status();
        error!("HTTP 请求失败，状态码: {}", status);
        return Ok(SearchRemoteModelsResponse {
            models: Vec::new(),
            success: false,
            error: Some(format!("HTTP 请求失败，状态码: {}", status)),
        });
    }
    
    let json: Vec<serde_json::Value> = match response.json().await {
        Ok(data) => data,
        Err(e) => {
            error!("解析 JSON 响应失败: {}", e);
            return Ok(SearchRemoteModelsResponse {
                models: Vec::new(),
                success: false,
                error: Some(format!("解析响应失败: {}", e)),
            });
        }
    };
    
    let mut models = Vec::new();
    
    for item in json {
        let id = item["id"].as_str().unwrap_or("").to_string();
        let author = item["author"].as_str().unwrap_or("").to_string();
        let downloads = item["downloads"].as_u64();
        let likes = item["likes"].as_u64();
        
        let tags = item["tags"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default();
        
        let model_type = item["model_type"].as_str().map(|s| s.to_string());
        
        // 获取文件列表（需要额外的 API 调用）
        let files = get_model_files(&id).await.unwrap_or_default();
        
        models.push(RemoteModelInfo {
            id,
            author,
            downloads,
            likes,
            tags,
            model_type,
            files,
        });
    }
    
    info!("找到 {} 个远程模型", models.len());
    
    Ok(SearchRemoteModelsResponse {
        models,
        success: true,
        error: None,
    })
}

/// 获取模型文件列表
async fn get_model_files(repo_id: &str) -> Result<Vec<ModelFileInfo>> {
    let url = format!("https://huggingface.co/api/models/{}/tree/main", repo_id);
    
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("User-Agent", "SeekerAiTools/1.0")
        .send()
        .await
        .context("无法获取模型文件列表")?;
    
    if !response.status().is_success() {
        return Ok(Vec::new());
    }
    
    let json: Vec<serde_json::Value> = response
        .json()
        .await
        .context("无法解析文件列表 JSON")?;
    
    let mut files = Vec::new();
    
    for item in json {
        let filename = item["path"].as_str().unwrap_or("").to_string();
        let size = item["size"].as_u64();
        
        let file_type = if filename.ends_with(".gguf") {
            "gguf"
        } else if filename.ends_with(".safetensors") {
            "safetensors"
        } else if filename.contains("tokenizer") || filename.ends_with(".json") {
            "tokenizer"
        } else {
            "other"
        };
        
        files.push(ModelFileInfo {
            filename,
            size,
            r#type: file_type.to_string(),
        });
    }
    
    Ok(files)
}

/// 下载模型
#[tauri::command]
pub async fn download_model(
    request: DownloadModelRequest,
) -> Result<DownloadModelResponse, String> {
    info!("开始下载模型: {} / {}", request.repo_id, request.filename);
    
    let models_dir = get_models_directory();
    
    // 确保模型目录存在
    if let Err(e) = fs::create_dir_all(&models_dir) {
        error!("创建模型目录失败: {}", e);
        return Ok(DownloadModelResponse {
            success: false,
            message: format!("创建模型目录失败: {}", e),
            local_path: None,
            error: Some(format!("创建模型目录失败: {}", e)),
        });
    }
    
    // 确定保存路径
    let save_path = if let Some(ref custom_path) = request.save_path {
        PathBuf::from(custom_path)
    } else {
        models_dir.join(&request.filename)
    };
    
    // 构建下载 URL
    let download_url = format!(
        "https://huggingface.co/{}/resolve/main/{}",
        request.repo_id, request.filename
    );
    
    info!("下载 URL: {}", download_url);
    info!("保存路径: {}", save_path.display());
    
    // 下载文件
    let client = reqwest::Client::new();
    let response = match client
        .get(&download_url)
        .header("User-Agent", "SeekerAiTools/1.0")
        .send()
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            error!("下载请求失败: {}", e);
            return Ok(DownloadModelResponse {
                success: false,
                message: format!("下载请求失败: {}", e),
                local_path: None,
                error: Some(format!("下载请求失败: {}", e)),
            });
        }
    };
    
    if !response.status().is_success() {
        let status = response.status();
        error!("下载失败，状态码: {}", status);
        return Ok(DownloadModelResponse {
            success: false,
            message: format!("下载失败，HTTP 状态码: {}", status),
            local_path: None,
            error: Some(format!("下载失败，HTTP 状态码: {}", status)),
        });
    }
    
    // 获取文件大小（用于显示进度）
    let total_size = response.content_length();
    info!("文件大小: {:?} 字节", total_size);
    
    // 创建文件并写入
    let mut file = match fs::File::create(&save_path) {
        Ok(f) => f,
        Err(e) => {
            error!("创建文件失败: {}", e);
            return Ok(DownloadModelResponse {
                success: false,
                message: format!("创建文件失败: {}", e),
                local_path: None,
                error: Some(format!("创建文件失败: {}", e)),
            });
        }
    };
    
    // 使用流式下载
    use futures_util::StreamExt;
    use std::io::Write;
    
    let mut stream = response.bytes_stream();
    let mut downloaded = 0u64;
    
    while let Some(item) = stream.next().await {
        let chunk = match item {
            Ok(data) => data,
            Err(e) => {
                error!("读取数据流失败: {}", e);
                return Ok(DownloadModelResponse {
                    success: false,
                    message: format!("读取数据流失败: {}", e),
                    local_path: None,
                    error: Some(format!("读取数据流失败: {}", e)),
                });
            }
        };
        
        if let Err(e) = file.write_all(&chunk) {
            error!("写入文件失败: {}", e);
            return Ok(DownloadModelResponse {
                success: false,
                message: format!("写入文件失败: {}", e),
                local_path: None,
                error: Some(format!("写入文件失败: {}", e)),
            });
        }
        
        downloaded += chunk.len() as u64;
        
        // 每下载 10MB 输出一次进度
        if downloaded % (10 * 1024 * 1024) == 0 {
            if let Some(total) = total_size {
                let progress = (downloaded as f64 / total as f64) * 100.0;
                info!("下载进度: {:.2}% ({}/{} 字节)", progress, downloaded, total);
            } else {
                info!("已下载: {} 字节", downloaded);
            }
        }
    }
    
    info!("模型下载完成: {}", save_path.display());
    
    Ok(DownloadModelResponse {
        success: true,
        message: format!("模型下载成功: {}", save_path.display()),
        local_path: Some(save_path.to_string_lossy().to_string()),
        error: None,
    })
}

