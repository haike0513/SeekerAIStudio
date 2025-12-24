use crate::models::qwen3vl::config::Qwen3VLConfig;
use crate::utils::img_utils::{img_smart_resize, img_transform};
use anyhow::Result;
use candle_core::{DType, Device, Tensor};
use image::DynamicImage;

pub struct Qwen3VLProcessor {
    config: Qwen3VLConfig,
    image_mean: Tensor,
    image_std: Tensor,
}

impl Qwen3VLProcessor {
    pub fn new(config: &Qwen3VLConfig, device: &Device) -> Result<Self> {
        let mean =
            Tensor::new(&[0.48145466f32, 0.4578275, 0.40821073], device)?.reshape((3, 1, 1))?;
        let std =
            Tensor::new(&[0.26862954f32, 0.26130258, 0.2757771], device)?.reshape((3, 1, 1))?;

        Ok(Self {
            config: config.clone(),
            image_mean: mean,
            image_std: std,
        })
    }

    pub fn process_image(&self, img: &DynamicImage, device: &Device) -> Result<(Tensor, Tensor)> {
        let (h, w) = (img.height(), img.width());
        let factor =
            self.config.vision_config.patch_size * self.config.vision_config.spatial_merge_size;

        let (resize_h, resize_w) = img_smart_resize(
            h,
            w,
            factor as u32,
            28 as u32,          // placeholder min pixels
            1024 * 1024 as u32, // placeholder max pixels
        )?;

        let resized_img =
            img.resize_exact(resize_w, resize_h, image::imageops::FilterType::CatmullRom);
        let pixel_values = img_transform(
            &resized_img,
            &self.image_mean,
            &self.image_std,
            device,
            DType::F32,
        )?;

        // grid_thw: [t=1, h, w]
        let grid_thw = Tensor::new(
            &[1u32, resize_h / factor as u32, resize_w / factor as u32],
            device,
        )?;

        Ok((pixel_values.unsqueeze(0)?, grid_thw.unsqueeze(0)?))
    }
}
