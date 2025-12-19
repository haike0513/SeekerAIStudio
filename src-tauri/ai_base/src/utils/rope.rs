use anyhow::Result;
use candle_core::{DType, IndexOp, Tensor, D};

pub fn compute_default_rope_parameters(dim: usize, base: f32) -> Vec<f32> {
    let inv_freq: Vec<f32> = (0..dim)
        .step_by(2)
        .map(|i| 1.0_f32 / base.powf(i as f32 / dim as f32))
        .collect();
    inv_freq
}

pub fn rotate_half(x: &Tensor) -> Result<Tensor> {
    let half_dim = x.dim(D::Minus1)? / 2;
    let x1 = x.narrow(D::Minus1, 0, half_dim)?;
    let x2 = x.narrow(D::Minus1, half_dim, half_dim)?;
    let x2 = x2.affine(-1.0, 0.0)?;
    let rotate_x = Tensor::cat(&[&x2, &x1], D::Minus1)?.contiguous()?;
    Ok(rotate_x)
}

pub fn apply_rotary_pos_emb(
    q: &Tensor,
    k: &Tensor,
    cos: &Tensor,
    sin: &Tensor,
) -> Result<(Tensor, Tensor)> {
    let cos = cos.to_dtype(q.dtype())?;
    let sin = sin.to_dtype(q.dtype())?;
    let q_embed = q
        .broadcast_mul(&cos)?
        .add(&rotate_half(q)?.broadcast_mul(&sin)?)?;
    let k_embed = k
        .broadcast_mul(&cos)?
        .add(&rotate_half(k)?.broadcast_mul(&sin)?)?;
    Ok((q_embed, k_embed))
}

pub struct Qwen3VLTextRotaryEmbedding {
    inv_freq: Vec<f32>,
}

impl Qwen3VLTextRotaryEmbedding {
    pub fn new(dim: usize, theta_base: f32) -> Self {
        let inv_freq = compute_default_rope_parameters(dim, theta_base);
        Self { inv_freq }
    }

    pub fn forward(
        &self,
        position_ids: &Tensor,
        dtype: DType,
        mrope_section: &[usize],
    ) -> Result<(Tensor, Tensor)> {
        let position_ids = position_ids.to_dtype(DType::F32)?;
        let device = position_ids.device();

        let inv_freq_tensor = Tensor::from_vec(
            self.inv_freq.clone(),
            (1, 1, self.inv_freq.len(), 1),
            device,
        )?;

        let position_ids_unsqueezed = position_ids.unsqueeze(D::Minus2)?;
        let freqs = inv_freq_tensor.matmul(&position_ids_unsqueezed)?;
        let freqs = freqs.transpose(2, 3)?;

        let mrope_section_vec: Vec<usize> =
            vec![mrope_section[0], mrope_section[1], mrope_section[2]];

        self.apply_mrope(&freqs, &mrope_section_vec, dtype)
    }

    fn apply_mrope(
        &self,
        freqs: &Tensor,
        sections: &[usize],
        dtype: DType,
    ) -> Result<(Tensor, Tensor)> {
        let mut combined_freqs = Vec::new();

        for (i, &section_size) in sections.iter().enumerate() {
            let f = freqs.i(i)?;
            let start = if i == 0 {
                0
            } else {
                sections[..i].iter().sum()
            };
            let chunk = f.narrow(D::Minus1, start, section_size)?;
            combined_freqs.push(chunk);
        }

        let freqs_t = Tensor::cat(&combined_freqs, D::Minus1)?;
        let emb = Tensor::cat(&[&freqs_t, &freqs_t], D::Minus1)?;

        Ok((emb.cos()?.to_dtype(dtype)?, emb.sin()?.to_dtype(dtype)?))
    }
}
