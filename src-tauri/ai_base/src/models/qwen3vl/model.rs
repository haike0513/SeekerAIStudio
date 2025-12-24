use anyhow::Result;
use candle_core::{IndexOp, Tensor, D};
use candle_nn::{
    embedding, linear, Activation, Embedding, Init, LayerNorm, Linear, Module, VarBuilder,
};

use crate::models::qwen3vl::config::{Qwen3VLConfig, Qwen3VLVisionConfig};
use crate::utils::rope::{apply_rotary_pos_emb, Qwen3VLTextRotaryEmbedding};
use crate::utils::tensor_utils::split_tensor;

pub struct Qwen3VLVisionPatchEmbed {
    conv3d_weight: Tensor,
    conv3d_bias: Tensor,
}

impl Qwen3VLVisionPatchEmbed {
    pub fn new(cfg: &Qwen3VLVisionConfig, vb: VarBuilder) -> Result<Self> {
        let embed_dim = cfg.hidden_size;
        let in_channels = cfg.in_channels;
        let temporal_patch_size = cfg.temporal_patch_size;
        let patch_size = cfg.patch_size;

        let conv3d_weight = vb
            .get_with_hints(
                (
                    embed_dim,
                    in_channels,
                    temporal_patch_size,
                    patch_size,
                    patch_size,
                ),
                "proj.weight",
                Init::Const(1.),
            )?
            .flatten(1, 4)?
            .t()?;

        let conv3d_bias = vb
            .get_with_hints((embed_dim,), "proj.bias", Init::Const(0.))?
            .unsqueeze(0)?;

        Ok(Self {
            conv3d_weight,
            conv3d_bias,
        })
    }

    pub fn forward(&self, hidden_states: &Tensor) -> Result<Tensor> {
        let hidden_states = hidden_states.matmul(&self.conv3d_weight)?;
        let hidden_states = hidden_states.broadcast_add(&self.conv3d_bias)?;
        Ok(hidden_states)
    }
}

pub struct Qwen3VLVisionPatchMerger {
    hidden_size: usize,
    use_postshuffle_norm: bool,
    norm: LayerNorm,
    linear_fc1: Linear,
    act_fn: Activation,
    linear_fc2: Linear,
}

impl Qwen3VLVisionPatchMerger {
    pub fn new(
        config: &Qwen3VLVisionConfig,
        vb: VarBuilder,
        use_postshuffle_norm: bool,
    ) -> Result<Self> {
        let spatial_merge_size = config.spatial_merge_size;
        let hidden_size = config.hidden_size * spatial_merge_size * spatial_merge_size;
        let norm_size = if use_postshuffle_norm {
            hidden_size
        } else {
            config.hidden_size
        };

        // Simple layer norm as placeholder, should use get_layer_norm helper if available
        let norm = candle_nn::layer_norm(norm_size, 1e-6, vb.pp("norm"))?;
        let linear_fc1 = linear(hidden_size, hidden_size, vb.pp("linear_fc1"))?;
        let act_fn = Activation::Gelu;
        let linear_fc2 = linear(hidden_size, config.out_hidden_size, vb.pp("linear_fc2"))?;

        Ok(Self {
            hidden_size,
            use_postshuffle_norm,
            norm,
            linear_fc1,
            act_fn,
            linear_fc2,
        })
    }

    pub fn forward(&self, xs: &Tensor) -> Result<Tensor> {
        let xs = if self.use_postshuffle_norm {
            xs.reshape(((), self.hidden_size))?
        } else {
            xs.clone()
        };
        let xs = self.norm.forward(&xs)?.reshape(((), self.hidden_size))?;
        let xs = self
            .linear_fc2
            .forward(&self.act_fn.forward(&self.linear_fc1.forward(&xs)?)?)?;
        Ok(xs)
    }
}

// Minimal Transformer implementation for Vision
pub struct Qwen3VLVisionAttention {
    num_heads: usize,
    qkv: Linear,
    proj: Linear,
    scaling: f64,
}

impl Qwen3VLVisionAttention {
    pub fn new(config: &Qwen3VLVisionConfig, vb: VarBuilder) -> Result<Self> {
        let hidden_size = config.hidden_size;
        let num_heads = config.num_heads;
        let head_dim = hidden_size / num_heads;
        let qkv = linear(hidden_size, hidden_size * 3, vb.pp("qkv"))?;
        let proj = linear(hidden_size, hidden_size, vb.pp("proj"))?;
        let scaling = 1.0 / (head_dim as f64).sqrt();
        Ok(Self {
            num_heads,
            qkv,
            proj,
            scaling,
        })
    }

    pub fn forward(&self, xs: &Tensor) -> Result<Tensor> {
        let (seq_len, hidden_size) = xs.dims2()?;
        let qkv = xs
            .apply(&self.qkv)?
            .reshape((seq_len, 3, self.num_heads, ()))?
            .permute((1, 0, 2, 3))?;

        let q = qkv.i(0)?.contiguous()?;
        let k = qkv.i(1)?.contiguous()?;
        let v = qkv.i(2)?.contiguous()?;

        // Scaling q
        let q = (q * self.scaling)?;

        // Simple attention (no RoPE for now in vision forward, or implement if needed)
        // aha uses apply_rotary_pos_emb_vision

        let attn_weights = q.matmul(&k.transpose(D::Minus2, D::Minus1)?)?;
        let attn_weights = candle_nn::ops::softmax_last_dim(&attn_weights)?;
        let attn_output = attn_weights.matmul(&v)?;

        let attn_output = attn_output
            .reshape((seq_len, hidden_size))?
            .apply(&self.proj)?;
        Ok(attn_output)
    }
}

pub struct Qwen3VLVisionBlock {
    norm1: LayerNorm,
    norm2: LayerNorm,
    attn: Qwen3VLVisionAttention,
    mlp: Linear, // Simplified MLP
}

impl Qwen3VLVisionBlock {
    pub fn new(config: &Qwen3VLVisionConfig, vb: VarBuilder) -> Result<Self> {
        let norm1 = candle_nn::layer_norm(config.hidden_size, 1e-6, vb.pp("norm1"))?;
        let norm2 = candle_nn::layer_norm(config.hidden_size, 1e-6, vb.pp("norm2"))?;
        let attn = Qwen3VLVisionAttention::new(config, vb.pp("attn"))?;
        let mlp = linear(config.hidden_size, config.hidden_size, vb.pp("mlp"))?; // Placeholder
        Ok(Self {
            norm1,
            norm2,
            attn,
            mlp,
        })
    }

    pub fn forward(&self, xs: &Tensor) -> Result<Tensor> {
        let xs = (xs + self.attn.forward(&self.norm1.forward(xs)?)?)?;
        let xs_norm = self.norm2.forward(&xs)?;
        let xs = (xs + self.mlp.forward(&xs_norm)?)?;
        Ok(xs)
    }
}

pub struct Qwen3VLVisionModel {
    patch_embed: Qwen3VLVisionPatchEmbed,
    blocks: Vec<Qwen3VLVisionBlock>,
    merger: Qwen3VLVisionPatchMerger,
}

impl Qwen3VLVisionModel {
    pub fn new(config: &Qwen3VLVisionConfig, vb: VarBuilder) -> Result<Self> {
        let patch_embed = Qwen3VLVisionPatchEmbed::new(config, vb.pp("patch_embed"))?;
        let mut blocks = Vec::new();
        let vb_blocks = vb.pp("blocks");
        for i in 0..config.depth {
            blocks.push(Qwen3VLVisionBlock::new(config, vb_blocks.pp(i))?);
        }
        let merger = Qwen3VLVisionPatchMerger::new(config, vb.pp("merger"), false)?;
        Ok(Self {
            patch_embed,
            blocks,
            merger,
        })
    }

    pub fn forward(&self, hidden_states: &Tensor) -> Result<Tensor> {
        let mut xs = self.patch_embed.forward(hidden_states)?;
        for block in &self.blocks {
            xs = block.forward(&xs)?;
        }
        xs = self.merger.forward(&xs)?;
        Ok(xs)
    }
}

pub struct Qwen3VLModel {
    vision_model: Qwen3VLVisionModel,
    // language_model: Qwen2Model, // Placeholder for actual LM
    embedding: Embedding,
    rope: Qwen3VLTextRotaryEmbedding,
    config: Qwen3VLConfig,
}

impl Qwen3VLModel {
    pub fn new(config: &Qwen3VLConfig, vb: VarBuilder) -> Result<Self> {
        let vision_model = Qwen3VLVisionModel::new(&config.vision_config, vb.pp("visual"))?;
        let embedding = embedding(
            config.text_config.vocab_size,
            config.text_config.hidden_size,
            vb.pp("model.embed_tokens"),
        )?;
        let rope = Qwen3VLTextRotaryEmbedding::new(
            config.text_config.head_dim,
            config.text_config.rope_theta,
        );
        Ok(Self {
            vision_model,
            embedding,
            rope,
            config: config.clone(),
        })
    }

    pub fn forward(
        &self,
        input_ids: &Tensor,
        pixel_values: Option<&Tensor>,
        image_grid_thw: Option<&Tensor>,
    ) -> Result<Tensor> {
        let inputs_embeds = self.embedding.forward(input_ids)?;

        if let (Some(pixels), Some(_grid)) = (pixel_values, image_grid_thw) {
            let _vision_features = self.vision_model.forward(pixels)?;
        }

        // Final pass through language model blocks (to be implemented)
        Ok(inputs_embeds)
    }
}
