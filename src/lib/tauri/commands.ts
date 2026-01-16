/**
 * Tauri 命令封装
 * 
 * 提供类型安全的 Tauri 命令调用
 */

import { invoke } from "@tauri-apps/api/core";

// ============ 类型定义 ============

/** 应用路径信息 */
export interface AppPaths {
    config: string;
    data: string;
    cache: string;
    logs: string;
    models: string;
}

/** 文件/目录条目 */
export interface FileEntry {
    name: string;
    path: string;
    is_directory: boolean;
    size: number;
    modified_at?: number;
}

/** 系统信息 */
export interface SystemInfo {
    os: string;
    arch: string;
    total_memory: number;
    available_memory: number;
    cpu_count: number;
}

/** 本地模型信息 */
export interface LocalModelInfo {
    name: string;
    path: string;
    size: number;
    model_type: string;
    modified_time?: string;
}

/** 远程模型信息 */
export interface RemoteModelInfo {
    id: string;
    author: string;
    downloads?: number;
    likes?: number;
    tags: string[];
    model_type?: string;
    files: ModelFileInfo[];
}

/** 模型文件信息 */
export interface ModelFileInfo {
    filename: string;
    size?: number;
    type: string;
}

// ============ 存储命令 ============

/** 获取应用路径 */
export async function getAppPaths(): Promise<AppPaths> {
    return invoke<AppPaths>("get_app_paths");
}

/** 读取文件内容 */
export async function readFile(path: string): Promise<string> {
    return invoke<string>("read_file", { path });
}

/** 写入文件内容 */
export async function writeFile(path: string, content: string): Promise<void> {
    return invoke("write_file", { path, content });
}

/** 列出目录内容 */
export async function listDirectory(path: string): Promise<FileEntry[]> {
    return invoke<FileEntry[]>("list_directory", { path });
}

/** 创建目录 */
export async function createDirectory(path: string): Promise<void> {
    return invoke("create_directory", { path });
}

/** 删除文件或目录 */
export async function deleteFile(path: string, recursive: boolean = false): Promise<void> {
    return invoke("delete_file", { path, recursive });
}

/** 检查文件是否存在 */
export async function fileExists(path: string): Promise<boolean> {
    return invoke<boolean>("file_exists", { path });
}

/** 获取系统信息 */
export async function getSystemInfo(): Promise<SystemInfo> {
    return invoke<SystemInfo>("get_system_info");
}

/** 保存设置 */
export async function saveSetting(key: string, value: string): Promise<void> {
    return invoke("save_setting", { key, value });
}

/** 读取设置 */
export async function getSetting(key: string, defaultValue?: string): Promise<string | null> {
    return invoke<string | null>("get_setting", { key, defaultValue: defaultValue ?? null });
}

/** 获取所有设置 */
export async function getAllSettings(): Promise<Record<string, unknown>> {
    return invoke<Record<string, unknown>>("get_all_settings");
}

// ============ 模型管理命令 ============

/** 获取本地模型列表 */
export async function getLocalModels(): Promise<LocalModelInfo[]> {
    return invoke<LocalModelInfo[]>("get_local_models");
}

/** 获取本地 tokenizers */
export async function getLocalTokenizers(): Promise<LocalModelInfo[]> {
    return invoke<LocalModelInfo[]>("get_local_tokenizers");
}

/** 搜索远程模型 */
export async function searchRemoteModels(options: {
    query: string;
    limit?: number;
    model_type?: string;
}): Promise<RemoteModelInfo[]> {
    return invoke<RemoteModelInfo[]>("search_remote_models", options);
}

/** 下载模型 */
export async function downloadModel(options: {
    repo_id: string;
    filename: string;
    save_path?: string;
}): Promise<string> {
    return invoke<string>("download_model", options);
}

// ============ GGUF 推理命令 ============

/** 初始化 GGUF 模型（从文件） */
export async function initGGUFModelFromFile(modelPath: string): Promise<void> {
    return invoke("init_gguf_model_from_file", { modelPath });
}

/** 初始化 GGUF 模型（从 Hub） */
export async function initGGUFModelFromHub(repoId: string, filename: string): Promise<void> {
    return invoke("init_gguf_model_from_hub", { repoId, filename });
}

/** GGUF 文本生成 */
export async function generateGGUFText(options: {
    prompt: string;
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    top_k?: number;
}): Promise<string> {
    return invoke<string>("generate_gguf_text", options);
}

/** 检查 GGUF 模型是否已加载 */
export async function isGGUFModelLoaded(): Promise<boolean> {
    return invoke<boolean>("is_gguf_model_loaded");
}

/** 统一推理接口 */
export async function unifiedInference(options: {
    prompt: string;
    model_id?: string;
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    stream?: boolean;
}): Promise<string> {
    return invoke<string>("unified_inference", options);
}

// ============ 服务器控制命令 ============

/** 服务器状态 */
export interface ServerStatus {
    is_running: boolean;
    address: string | null;
}

/** 获取服务器状态 */
export async function getServerStatus(): Promise<ServerStatus> {
    return invoke<ServerStatus>("get_server_status");
}

/** 启动服务器 */
export async function startServer(): Promise<string> {
    return invoke<string>("start_server");
}

/** 停止服务器 */
export async function stopServer(): Promise<void> {
    return invoke("stop_server");
}

// ============ 日志命令 ============

/** 日志级别 */
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

/** 获取当前日志级别 */
export async function getLogLevel(): Promise<string> {
    return invoke<string>("get_log_level");
}

/** 设置日志级别 */
export async function setLogLevel(level: LogLevel): Promise<void> {
    return invoke("set_log_level", { level });
}

// ============ Qwen3VL 命令 ============

/** 初始化 Qwen3VL 模型 */
export async function initQwen3VLModel(modelPath: string): Promise<void> {
    return invoke("init_qwen3vl_model", { modelPath });
}

/** 检查 Qwen3VL 模型是否已加载 */
export async function isQwen3VLModelLoaded(): Promise<boolean> {
    return invoke<boolean>("is_model_loaded");
}

/** Qwen3VL 文本生成 */
export async function generateText(prompt: string): Promise<string> {
    return invoke<string>("generate_text", { prompt });
}

/** Qwen3VL 多模态生成 */
export async function generateMultimodal(options: {
    prompt: string;
    image_path: string;
}): Promise<string> {
    return invoke<string>("generate_multimodal", options);
}

/** Qwen3VL 多模态生成（从字节） */
export async function generateMultimodalFromBytes(options: {
    prompt: string;
    image_bytes: number[];
}): Promise<string> {
    return invoke<string>("generate_multimodal_from_bytes", options);
}
