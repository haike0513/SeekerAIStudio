use anyhow::{Context, Result};
use candle_core::{Device, Tensor};
use image::{DynamicImage, RgbImage};
use std::path::Path;

/// 图像预处理配置
#[derive(Debug, Clone)]
pub struct ImagePreprocessConfig {
    /// 目标图像大小（通常为正方形）
    pub image_size: usize,
    /// 均值（用于归一化）
    pub mean: [f32; 3],
    /// 标准差（用于归一化）
    pub std: [f32; 3],
}

impl Default for ImagePreprocessConfig {
    fn default() -> Self {
        // Qwen3-VL 通常使用 448x448 或 1024x1024 的图像大小
        Self {
            image_size: 448,
            mean: [0.485, 0.456, 0.406],  // ImageNet 均值
            std: [0.229, 0.224, 0.225],   // ImageNet 标准差
        }
    }
}

/// 图像预处理器
pub struct ImagePreprocessor {
    config: ImagePreprocessConfig,
}

impl ImagePreprocessor {
    /// 创建新的图像预处理器
    pub fn new(config: ImagePreprocessConfig) -> Self {
        Self { config }
    }

    /// 从默认配置创建
    pub fn default() -> Self {
        Self::new(ImagePreprocessConfig::default())
    }

    /// 从文件路径加载并预处理图像
    pub fn load_and_preprocess<P: AsRef<Path>>(
        &self,
        image_path: P,
        device: &Device,
    ) -> Result<Tensor> {
        let image = image::open(image_path.as_ref())
            .with_context(|| format!("无法加载图像: {:?}", image_path.as_ref()))?;
        
        self.preprocess(&image, device)
    }

    /// 从内存中的图像数据预处理
    pub fn preprocess_from_bytes(&self, image_data: &[u8], device: &Device) -> Result<Tensor> {
        let image = image::load_from_memory(image_data)
            .context("无法从字节数据加载图像")?;
        
        self.preprocess(&image, device)
    }

    /// 预处理图像（resize、normalize、转换为 tensor）
    pub fn preprocess(&self, image: &DynamicImage, device: &Device) -> Result<Tensor> {
        // 转换为 RGB 格式
        let rgb_image = image.to_rgb8();
        
        // Resize 到目标大小（保持宽高比的中心裁剪）
        let resized = self.resize_and_center_crop(&rgb_image, self.config.image_size)?;
        
        // 转换为浮点数并归一化
        let normalized = self.normalize_image(&resized)?;
        
        // 转换为 Tensor: [1, 3, H, W] (batch, channels, height, width)
        // 重新排列维度: [H, W, C] -> [C, H, W]
        let tensor = normalized
            .permute((2, 0, 1))?
            .unsqueeze(0)?; // 添加 batch 维度
        
        Ok(tensor.to_device(device)?)
    }

    /// Resize 图像并进行中心裁剪
    fn resize_and_center_crop(
        &self,
        image: &RgbImage,
        target_size: usize,
    ) -> Result<RgbImage> {
        let (width, height) = image.dimensions();
        let min_dim = width.min(height);
        
        // 先缩放到最小的边等于目标大小
        let scale = target_size as f32 / min_dim as f32;
        let new_width = (width as f32 * scale) as u32;
        let new_height = (height as f32 * scale) as u32;
        
        let resized = image::imageops::resize(image, new_width, new_height, image::imageops::FilterType::Lanczos3);
        
        // 中心裁剪到目标大小
        let start_x = (new_width.saturating_sub(target_size as u32)) / 2;
        let start_y = (new_height.saturating_sub(target_size as u32)) / 2;
        
        let cropped = image::imageops::crop_imm(
            &resized,
            start_x,
            start_y,
            target_size as u32,
            target_size as u32,
        ).to_image();
        
        Ok(cropped)
    }

    /// 归一化图像（转换为浮点数，应用均值和标准差）
    fn normalize_image(&self, image: &RgbImage) -> Result<Tensor> {
        let (width, height) = image.dimensions();
        let size = (width * height) as usize;
        
        // 分别处理每个通道
        let mut r_data = Vec::with_capacity(size);
        let mut g_data = Vec::with_capacity(size);
        let mut b_data = Vec::with_capacity(size);
        
        for pixel in image.pixels() {
            let [r, g, b] = pixel.0;
            r_data.push((r as f32 / 255.0 - self.config.mean[0]) / self.config.std[0]);
            g_data.push((g as f32 / 255.0 - self.config.mean[1]) / self.config.std[1]);
            b_data.push((b as f32 / 255.0 - self.config.mean[2]) / self.config.std[2]);
        }
        
        // 创建三个通道的 tensor: [H, W]
        let shape = (height as usize, width as usize);
        let r_tensor = Tensor::from_vec(r_data, shape, &Device::Cpu)?;
        let g_tensor = Tensor::from_vec(g_data, shape, &Device::Cpu)?;
        let b_tensor = Tensor::from_vec(b_data, shape, &Device::Cpu)?;
        
        // 堆叠为 [H, W, 3]
        let tensor = Tensor::stack(&[r_tensor, g_tensor, b_tensor], 2)?;
        
        Ok(tensor)
    }
}

/// 处理多张图像的批处理
pub fn preprocess_images_batch(
    images: Vec<DynamicImage>,
    config: ImagePreprocessConfig,
    device: &Device,
) -> Result<Tensor> {
    let preprocessor = ImagePreprocessor::new(config);
    let mut tensors = Vec::new();
    
    for image in images {
        let tensor = preprocessor.preprocess(&image, device)?;
        tensors.push(tensor);
    }
    
    // 堆叠为批次: [batch_size, channels, height, width]
    Tensor::stack(&tensors, 0)
        .context("无法堆叠图像张量")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_image_preprocessor_default() {
        let preprocessor = ImagePreprocessor::default();
        assert_eq!(preprocessor.config.image_size, 448);
    }
}

