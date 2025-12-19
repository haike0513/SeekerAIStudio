use serde::{Deserialize, Serialize};

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
