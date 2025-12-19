use anyhow::{anyhow, Result};
use candle_core::{shape::Dim, DType, Device, Tensor, D};

pub fn prepare_causal_attention_mask(
    b_size: usize,
    tgt_len: usize,
    seqlen_offset: usize,
    device: &Device,
) -> Result<Tensor> {
    let arange = Tensor::arange(0u32, tgt_len as u32, device).map_err(|e| anyhow!(e))?;
    let arange = arange
        .unsqueeze(1)
        .map_err(|e| anyhow!(e))?
        .broadcast_as((tgt_len, tgt_len))
        .map_err(|e| anyhow!(e))?;
    let upper_triangle = arange
        .t()
        .map_err(|e| anyhow!(e))?
        .gt(&arange)
        .map_err(|e| anyhow!(e))?;
    let mask = upper_triangle
        .where_cond(
            &Tensor::new(f32::NEG_INFINITY, device)
                .map_err(|e| anyhow!(e))?
                .broadcast_as(arange.shape())
                .map_err(|e| anyhow!(e))?,
            &Tensor::new(0f32, device)
                .map_err(|e| anyhow!(e))?
                .broadcast_as(arange.shape())
                .map_err(|e| anyhow!(e))?,
        )
        .map_err(|e| anyhow!(e))?;
    let mask = if seqlen_offset > 0 {
        let mask0 =
            Tensor::zeros((tgt_len, seqlen_offset), DType::F32, device).map_err(|e| anyhow!(e))?;
        Tensor::cat(&[&mask0, &mask], D::Minus1).map_err(|e| anyhow!(e))?
    } else {
        mask
    };
    let mask = mask
        .expand((b_size, 1, tgt_len, tgt_len + seqlen_offset))
        .map_err(|e| anyhow!(e))?
        .to_dtype(DType::F32)
        .map_err(|e| anyhow!(e))?;
    Ok(mask)
}

pub fn split_tensor<D_DIM: Dim>(t: &Tensor, splits: &[usize], dim: D_DIM) -> Result<Vec<Tensor>> {
    let dim = dim.to_index(t.shape(), "split").map_err(|e| anyhow!(e))?;
    let mut split_res = Vec::new();
    let mut index = 0;
    for split in splits {
        split_res.push(t.narrow(dim, index, *split).map_err(|e| anyhow!(e))?);
        index += *split;
    }
    Ok(split_res)
}

pub fn nonzero_index_vec(mask: &Tensor) -> Result<Vec<u32>> {
    let mut mask = mask.clone();
    if mask.dtype() != DType::U32 {
        mask = mask.to_dtype(DType::U32).map_err(|e| anyhow!(e))?;
    }
    match mask.rank() {
        1 => {
            let mask_vector = mask.to_vec1::<u32>().map_err(|e| anyhow!(e))?;
            let indices: Vec<u32> = mask_vector
                .iter()
                .enumerate()
                .filter_map(|(idx, &val)| if val != 0 { Some(idx as u32) } else { None })
                .collect();
            Ok(indices)
        }
        _ => Err(anyhow!("input rank must be 1")),
    }
}

pub fn nonzero_index(mask: &Tensor) -> Result<Tensor> {
    let index_vec = nonzero_index_vec(mask)?;
    Tensor::from_slice(&index_vec, index_vec.len(), mask.device()).map_err(|e| anyhow!(e))
}

pub fn linspace(start: f32, stop: f32, num: usize, device: &Device) -> Result<Tensor> {
    if num == 0 {
        return Ok(Tensor::from_vec(Vec::<f32>::new(), (0,), device).map_err(|e| anyhow!(e))?);
    }
    if num == 1 {
        return Ok(Tensor::new(&[start], device).map_err(|e| anyhow!(e))?);
    }
    let step = (stop - start) / (num - 1) as f32;
    let v: Vec<f32> = (0..num).map(|i| start + i as f32 * step).collect();
    Tensor::from_vec(v, (num,), device).map_err(|e| anyhow!(e))
}

pub fn masked_scatter_dim0(t: &Tensor, src: &Tensor, mask: &Tensor) -> Result<Tensor> {
    let indices = nonzero_index(mask)?;
    t.index_add(&indices, src, 0).map_err(|e| anyhow!(e))
}

pub fn bitor_tensor(a: &Tensor, b: &Tensor) -> Result<Tensor> {
    let a_u32 = a.to_dtype(DType::U32).map_err(|e| anyhow!(e))?;
    let b_u32 = b.to_dtype(DType::U32).map_err(|e| anyhow!(e))?;
    let or = (a_u32 + b_u32)
        .map_err(|e| anyhow!(e))?
        .gt(&Tensor::new(0u32, a.device()).map_err(|e| anyhow!(e))?)
        .map_err(|e| anyhow!(e))?;
    or.to_dtype(a.dtype()).map_err(|e| anyhow!(e))
}

pub fn prod_tensor_last_dim(t: &Tensor) -> Result<Tensor> {
    let dims = t.dims();
    let last_dim = dims[dims.len() - 1];
    let t_vec = t.to_vec1::<u32>().map_err(|e| anyhow!(e))?;
    let mut res = Vec::new();
    for chunk in t_vec.chunks(last_dim) {
        let prod: u32 = chunk.iter().product();
        res.push(prod);
    }
    let mut new_shape = dims[..dims.len() - 1].to_vec();
    if new_shape.is_empty() {
        new_shape.push(1);
    }
    Tensor::from_vec(res, new_shape, t.device()).map_err(|e| anyhow!(e))
}

pub fn get_vision_next_indices(grid_thw: &Tensor) -> Result<Tensor> {
    let grid_thw_u32 = grid_thw.to_dtype(DType::U32).map_err(|e| anyhow!(e))?;
    let seq_lens = prod_tensor_last_dim(&grid_thw_u32)?;
    let seq_lens_vec = seq_lens.to_vec1::<u32>().map_err(|e| anyhow!(e))?;
    let mut indices = Vec::new();
    let mut current = 0u32;
    for &len in &seq_lens_vec {
        indices.push(current);
        current += len;
    }
    Tensor::from_vec(indices, seq_lens_vec.len(), grid_thw.device()).map_err(|e| anyhow!(e))
}
