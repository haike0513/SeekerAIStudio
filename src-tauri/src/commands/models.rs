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
    pub tokenizer_path: Option<String>, // 同目录下的 tokenizer 路径
}

/// Tokenizer 信息
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TokenizerInfo {
    pub name: String,
    pub path: String,
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
/// 支持以下文件夹结构：
/// - models/gguf/模型名称/模型文件.gguf （推荐结构）
/// - models/safetensors/模型名称/模型文件.safetensors （推荐结构）
/// - models/gguf/模型文件.gguf （旧结构，兼容）
/// - models/safetensors/模型文件.safetensors （旧结构，兼容）
/// - models/模型文件.gguf 或 models/模型文件.safetensors （根目录，通过扩展名判断）
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
            // 获取路径的各个部分，用于判断模型类型
            let path_components: Vec<String> = path
                .components()
                .filter_map(|c| {
                    if let std::path::Component::Normal(name) = c {
                        name.to_str().map(|s| s.to_lowercase())
                    } else {
                        None
                    }
                })
                .collect();
            
            let extension = path.extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("")
                .to_lowercase();
            
            // 查找路径中是否包含类型文件夹（gguf 或 safetensors）
            let model_type = if path_components.contains(&"gguf".to_string()) {
                Some("gguf")
            } else if path_components.contains(&"safetensors".to_string()) {
                Some("safetensors")
            } else {
                // 如果路径中不包含类型文件夹，通过扩展名判断
                match extension.as_str() {
                    "gguf" => Some("gguf"),
                    "safetensors" => Some("safetensors"),
                    _ => None,
                }
            };
            
            if let Some(mt) = model_type {
                let metadata = fs::metadata(&path)
                    .context(format!("无法获取文件元数据: {}", path.display()))?;
                
                // 确定模型名称：如果文件在 models/{type}/{model_name}/ 结构中，使用文件夹名称
                // 否则使用文件名
                let name = if let Some(parent) = path.parent() {
                    // 检查父目录是否是模型文件夹（在 models/{type}/ 下）
                    if let Some(grandparent) = parent.parent() {
                        if let Some(grandparent_name) = grandparent.file_name() {
                            let grandparent_str = grandparent_name.to_string_lossy().to_lowercase();
                            // 如果祖父目录是 "gguf" 或 "safetensors"，说明文件在模型文件夹中
                            if grandparent_str == "gguf" || grandparent_str == "safetensors" {
                                // 使用父目录（模型文件夹）名称作为模型名称
                                parent.file_name()
                                    .and_then(|n| n.to_str())
                                    .unwrap_or("未知模型")
                                    .to_string()
                            } else {
                                // 不在标准结构中，使用文件名
                                path.file_name()
                                    .and_then(|n| n.to_str())
                                    .unwrap_or("未知模型")
                                    .to_string()
                            }
                        } else {
                            path.file_name()
                                .and_then(|n| n.to_str())
                                .unwrap_or("未知模型")
                                .to_string()
                        }
                    } else {
                        path.file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("未知模型")
                            .to_string()
                    }
                } else {
                    path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("未知模型")
                        .to_string()
                };
                
                let modified_time = metadata.modified()
                    .ok()
                    .and_then(|time| {
                        chrono::DateTime::<chrono::Local>::from(time)
                            .format("%Y-%m-%d %H:%M:%S")
                            .to_string()
                            .into()
                    });
                
                // 查找同目录下的 tokenizer
                let tokenizer_path = find_tokenizer_in_directory(&path);
                
                models.push(LocalModelInfo {
                    name: name.clone(),
                    path: path.to_string_lossy().to_string(),
                    size: metadata.len(),
                    model_type: mt.to_string(),
                    modified_time,
                    tokenizer_path,
                });
            }
        } else if path.is_dir() {
            // 递归扫描子目录（但跳过类型文件夹的直接子目录，避免重复扫描）
            // 这里我们仍然递归扫描，因为可能有嵌套结构
            let mut sub_models = scan_directory_for_models(&path)?;
            models.append(&mut sub_models);
        }
    }
    
    Ok(models)
}

/// 在指定目录下查找 tokenizer
/// 查找顺序：
/// 1. 目录下的 tokenizer.json 文件
/// 2. 目录下的 tokenizer 子目录（包含 tokenizer.json）
/// 3. 与模型同名的目录（去掉扩展名，例如：model.gguf -> model/ 目录）
fn find_tokenizer_in_directory(model_path: &Path) -> Option<String> {
    // 获取模型文件所在的目录
    let model_dir = model_path.parent()?;
    
    // 检查是否有 tokenizer.json 文件（在模型同目录）
    let tokenizer_json = model_dir.join("tokenizer.json");
    if tokenizer_json.exists() && tokenizer_json.is_file() {
        return Some(tokenizer_json.to_string_lossy().to_string());
    }
    
    // 检查是否有 tokenizer 子目录
    let tokenizer_dir = model_dir.join("tokenizer");
    if tokenizer_dir.exists() && tokenizer_dir.is_dir() {
        let tokenizer_json_in_dir = tokenizer_dir.join("tokenizer.json");
        if tokenizer_json_in_dir.exists() {
            return Some(tokenizer_dir.to_string_lossy().to_string());
        }
    }
    
    // 检查是否有与模型同名的目录（去掉扩展名）
    // 例如：models/gguf/model.gguf -> models/gguf/model/ 目录
    if let Some(file_stem) = model_path.file_stem() {
        let model_name_dir = model_dir.join(file_stem);
        if model_name_dir.exists() && model_name_dir.is_dir() {
            let tokenizer_json_in_model_dir = model_name_dir.join("tokenizer.json");
            if tokenizer_json_in_model_dir.exists() {
                return Some(model_name_dir.to_string_lossy().to_string());
            }
        }
    }
    
    None
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

/// 获取 tokenizer 目录路径（与 models 目录相同）
fn get_tokenizers_directory() -> PathBuf {
    // 使用与 models 相同的目录
    get_models_directory()
}

/// 获取本地 tokenizer 列表
#[tauri::command]
pub async fn get_local_tokenizers() -> Result<Vec<TokenizerInfo>, String> {
    info!("开始获取本地 tokenizer 列表");
    
    let tokenizers_dir = get_tokenizers_directory();
    let mut tokenizers = Vec::new();
    
    if !tokenizers_dir.exists() {
        info!("Tokenizer 目录不存在，创建目录: {}", tokenizers_dir.display());
        if let Err(e) = fs::create_dir_all(&tokenizers_dir) {
            error!("创建 tokenizer 目录失败: {}", e);
            return Err(format!("创建 tokenizer 目录失败: {}", e));
        }
        return Ok(tokenizers);
    }
    
    match scan_directory_for_tokenizers(&tokenizers_dir) {
        Ok(mut found_tokenizers) => {
            tokenizers.append(&mut found_tokenizers);
        }
        Err(e) => {
            error!("扫描 tokenizer 目录失败: {}", e);
            return Err(format!("扫描 tokenizer 目录失败: {}", e));
        }
    }
    
    info!("找到 {} 个本地 tokenizer", tokenizers.len());
    Ok(tokenizers)
}

/// 扫描目录查找 tokenizer
fn scan_directory_for_tokenizers(dir: &Path) -> Result<Vec<TokenizerInfo>> {
    let mut tokenizers = Vec::new();
    
    if !dir.is_dir() {
        return Ok(tokenizers);
    }
    
    let entries = fs::read_dir(dir)
        .context("无法读取目录")?;
    
    for entry in entries {
        let entry = entry.context("无法读取目录项")?;
        let path = entry.path();
        
        if path.is_dir() {
            // Tokenizer 通常是目录，包含 tokenizer.json 等文件
            // 检查目录中是否有 tokenizer.json 文件
            let tokenizer_json = path.join("tokenizer.json");
            let has_tokenizer_json = tokenizer_json.exists();
            
            // 也接受只有目录的情况（可能包含其他 tokenizer 文件）
            if has_tokenizer_json || path.is_dir() {
                let metadata = fs::metadata(&path)
                    .context(format!("无法获取目录元数据: {}", path.display()))?;
                
                let name = path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("未知 Tokenizer")
                    .to_string();
                
                let modified_time = metadata.modified()
                    .ok()
                    .and_then(|time| {
                        chrono::DateTime::<chrono::Local>::from(time)
                            .format("%Y-%m-%d %H:%M:%S")
                            .to_string()
                            .into()
                    });
                
                tokenizers.push(TokenizerInfo {
                    name: name.clone(),
                    path: path.to_string_lossy().to_string(),
                    modified_time,
                });
            }
        } else if path.is_file() {
            // 也支持单个 tokenizer.json 文件
            let extension = path.extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("")
                .to_lowercase();
            
            if extension == "json" && path.file_name()
                .and_then(|n| n.to_str())
                .map(|s| s.contains("tokenizer"))
                .unwrap_or(false) {
                let metadata = fs::metadata(&path)
                    .context(format!("无法获取文件元数据: {}", path.display()))?;
                
                let name = path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("未知 Tokenizer")
                    .to_string();
                
                let modified_time = metadata.modified()
                    .ok()
                    .and_then(|time| {
                        chrono::DateTime::<chrono::Local>::from(time)
                            .format("%Y-%m-%d %H:%M:%S")
                            .to_string()
                            .into()
                    });
                
                tokenizers.push(TokenizerInfo {
                    name: name.clone(),
                    path: path.to_string_lossy().to_string(),
                    modified_time,
                });
            }
        }
    }
    
    Ok(tokenizers)
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
        // 根据文件扩展名确定模型类型
        let extension = Path::new(&request.filename)
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_lowercase();
        
        // 判断是否为模型文件
        let is_model_file = extension == "gguf" || extension == "safetensors";
        
        if is_model_file {
            // 模型文件：创建文件夹结构 models/{model_type}/{model_name}/
            let model_type = if extension == "gguf" { "gguf" } else { "safetensors" };
            
            // 优先使用 repo_id 的最后一部分作为模型名称（通常是模型标识符）
            // 例如：HuggingFaceTB/SmolLM2-360M-Instruct-GGUF -> SmolLM2-360M-Instruct-GGUF
            let mut model_name = request.repo_id
                .split('/')
                .last()
                .unwrap_or("unknown")
                .to_string();
            
            // 如果 repo_id 包含 "-GGUF" 或类似后缀，尝试去掉（因为文件夹名不需要）
            // 但保留其他部分，如 "SmolLM2-360M-Instruct"
            let suffixes = ["-GGUF", "-gguf", "-GGUF", "-Safetensors", "-safetensors"];
            for suffix in &suffixes {
                if model_name.ends_with(suffix) {
                    model_name = model_name.trim_end_matches(suffix).to_string();
                    break;
                }
            }
            
            // 创建文件夹结构：models/{model_type}/{model_name}/
            let model_folder = models_dir.join(model_type).join(&model_name);
            if let Err(e) = fs::create_dir_all(&model_folder) {
                error!("创建模型文件夹失败: {}", e);
                return Ok(DownloadModelResponse {
                    success: false,
                    message: format!("创建模型文件夹失败: {}", e),
                    local_path: None,
                    error: Some(format!("创建模型文件夹失败: {}", e)),
                });
            }
            
            // 保存路径：models/{model_type}/{model_name}/{filename}
            model_folder.join(&request.filename)
        } else if request.filename.contains("tokenizer") || extension == "json" {
            // Tokenizer 文件：尝试找到对应的模型文件夹
            // 从 repo_id 提取模型名称
            let model_name = request.repo_id
                .split('/')
                .last()
                .unwrap_or("unknown")
                .to_string();
            
            // 先尝试在 gguf 目录下查找模型文件夹
            let gguf_folder = models_dir.join("gguf").join(&model_name);
            if gguf_folder.exists() {
                // 如果 gguf 模型文件夹存在，将 tokenizer 放在那里
                gguf_folder.join(&request.filename)
            } else {
                // 否则尝试 safetensors 目录
                let safetensors_folder = models_dir.join("safetensors").join(&model_name);
                if safetensors_folder.exists() {
                    safetensors_folder.join(&request.filename)
                } else {
                    // 如果都不存在，创建 safetensors 文件夹（默认）
                    let model_folder = models_dir.join("safetensors").join(&model_name);
                    if let Err(e) = fs::create_dir_all(&model_folder) {
                        error!("创建模型文件夹失败: {}", e);
                        return Ok(DownloadModelResponse {
                            success: false,
                            message: format!("创建模型文件夹失败: {}", e),
                            local_path: None,
                            error: Some(format!("创建模型文件夹失败: {}", e)),
                        });
                    }
                    model_folder.join(&request.filename)
                }
            }
        } else {
            // 未知类型，放在根目录
            models_dir.join(&request.filename)
        }
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

