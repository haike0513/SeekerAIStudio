use anyhow::{anyhow, Result};
use candle_core::{DType, Device, Tensor};
use image::{DynamicImage, GenericImageView};

pub fn img_smart_resize(
    h: u32,
    w: u32,
    factor: u32,
    min_pixels: u32,
    max_pixels: u32,
) -> Result<(u32, u32)> {
    let mut h = h;
    let mut w = w;
    let pixels = h * w;

    if pixels < min_pixels {
        let ratio = (min_pixels as f32 / pixels as f32).sqrt();
        h = (h as f32 * ratio) as u32;
        w = (w as f32 * ratio) as u32;
    }

    if pixels > max_pixels {
        let ratio = (max_pixels as f32 / pixels as f32).sqrt();
        h = (h as f32 * ratio) as u32;
        w = (w as f32 * ratio) as u32;
    }

    h = (h + factor - 1) / factor * factor;
    w = (w + factor - 1) / factor * factor;

    Ok((h, w))
}

pub fn img_transform(
    img: &DynamicImage,
    mean: &Tensor,
    std: &Tensor,
    device: &Device,
    dtype: DType,
) -> Result<Tensor> {
    let (w, h) = img.dimensions();
    let img = img.to_rgb8();
    let data = img.into_raw();
    let tensor = Tensor::from_vec(data, (h as usize, w as usize, 3), &Device::Cpu)?
        .to_dtype(DType::F32)?
        .broadcast_div(&Tensor::new(255.0f32, &Device::Cpu)?)?;

    let tensor = tensor.broadcast_sub(mean)?.broadcast_div(std)?;

    let tensor = tensor
        .permute((2, 0, 1))? // (H, W, C) -> (C, H, W)
        .to_device(device)?
        .to_dtype(dtype)?;

    Ok(tensor)
}
