# 贡献指南

感谢您对 SeekerAIStudio 项目的关注！我们欢迎任何形式的贡献。

---

## 🌟 贡献方式

### 1. 报告 Bug

如果您发现了 Bug，请通过 Issues 提交报告：

**Bug 报告模板:**
```markdown
### Bug 描述
简要描述遇到的问题

### 复现步骤
1. 进入 '...'
2. 点击 '...'
3. 看到错误

### 预期行为
描述您期望发生的行为

### 实际行为
描述实际发生的行为

### 环境信息
- 操作系统: [e.g. Windows 11]
- 应用版本: [e.g. 0.1.0]
- 浏览器/WebView: [如果相关]

### 截图
如果适用，添加截图帮助解释问题

### 附加信息
任何其他可能相关的信息
```

### 2. 功能建议

有新功能的想法？我们很想听到！

**功能建议模板:**
```markdown
### 功能描述
清晰简洁地描述您想要的功能

### 使用场景
描述这个功能在什么场景下会有用

### 解决方案
描述您期望如何实现这个功能

### 替代方案
描述您考虑过的其他替代方案

### 附加信息
任何其他相关的上下文或截图
```

### 3. 代码贡献

#### 流程概述
```
1. Fork 仓库
   └── 点击 GitHub 页面右上角的 Fork 按钮

2. 克隆到本地
   └── git clone https://github.com/YOUR_USERNAME/SeekerAITools.git

3. 创建功能分支
   └── git checkout -b feature/your-feature-name

4. 进行开发
   └── 编写代码和测试
   └── 遵循代码规范

5. 提交更改
   └── git add .
   └── git commit -m "feat: 添加新功能"

6. 推送分支
   └── git push origin feature/your-feature-name

7. 创建 Pull Request
   └── 在 GitHub 上创建 PR
   └── 填写 PR 描述
```

#### 分支命名规范
| 类型 | 格式 | 示例 |
|------|------|------|
| 新功能 | `feature/功能名` | `feature/novel-editor` |
| Bug 修复 | `fix/问题描述` | `fix/chat-scroll` |
| 文档 | `docs/文档主题` | `docs/api-reference` |
| 重构 | `refactor/模块名` | `refactor/ai-provider` |
| 性能 | `perf/优化内容` | `perf/model-loading` |

#### 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型 (type):**
| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构（不新增功能，不修复 bug） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具相关 |

**示例:**
```
feat(novel): 添加大纲编辑器

实现了三级大纲的可视化编辑功能，支持拖拽排序和折叠展开。

- 添加 OutlineTree 组件
- 添加拖拽排序逻辑
- 添加大纲数据持久化

Closes #42
```

### 4. 文档贡献

文档位于 `docs/` 目录，使用 Markdown 格式。

**可贡献的内容:**
- 修正文档中的错误
- 添加缺失的文档
- 改进现有文档的清晰度
- 翻译文档到其他语言
- 添加代码示例

---

## 🛠️ 开发环境设置

### 前置要求

| 工具 | 版本要求 | 下载链接 |
|------|---------|---------|
| Node.js | >= 20.0.0 | [nodejs.org](https://nodejs.org/) |
| pnpm | >= 8.0.0 | [pnpm.io](https://pnpm.io/) |
| Rust | >= 1.75.0 | [rustup.rs](https://rustup.rs/) |
| Git | 最新版 | [git-scm.com](https://git-scm.com/) |

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/your-org/SeekerAITools.git
cd SeekerAITools

# 2. 安装 Node.js 依赖
pnpm install

# 3. 安装 Rust 工具链 (如果尚未安装)
rustup update stable

# 4. 启动开发服务器
pnpm dev

# 5. (可选) 启动 Tauri 开发模式
pnpm tauri dev
```

### 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动 Vite 开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm tauri dev` | 启动 Tauri 开发模式 |
| `pnpm tauri build` | 构建桌面应用 |
| `pnpm lint` | 运行 ESLint 检查 |
| `pnpm format` | 格式化代码 |
| `pnpm test` | 运行测试 |

### IDE 设置

推荐使用 **VS Code**，并安装以下扩展：

- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- [ES6 String HTML](https://marketplace.visualstudio.com/items?itemName=tobermory.es6-string-html)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
- [EditorConfig](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig)

---

## 📋 代码规范

请参阅 [agents.md](./agents.md) 获取完整的代码规范，以下是关键点摘要：

### TypeScript/SolidJS

```typescript
// ✅ 正确
const [count, setCount] = createSignal(0);
return <div class="container">{count()}</div>;

// ❌ 错误
const [count, setCount] = useState(0);  // 这是 React
return <div className="container">{count}</div>;  // className 和直接使用 count
```

### Rust

```rust
// ✅ 正确
#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| format!("读取文件失败: {}", e))
}

// ❌ 错误
pub async fn read_file(path: String) -> String {
    std::fs::read_to_string(&path).unwrap()  // 不要用 unwrap
}
```

### 样式

- 使用 TailwindCSS 工具类
- 避免内联样式
- 不要修改 `src/components/ui/` 下的组件

---

## 🔍 Pull Request 审查标准

提交的 PR 需要满足以下条件：

### 代码质量
- [ ] 代码通过 TypeScript 类型检查
- [ ] 代码通过 ESLint 检查 (无错误，警告需说明)
- [ ] Rust 代码通过 Clippy 检查
- [ ] 代码格式化正确

### 功能完整性
- [ ] 实现了描述中的所有功能
- [ ] 边界情况已处理
- [ ] 错误处理完善

### 测试
- [ ] 新功能有对应的测试
- [ ] 现有测试未被破坏
- [ ] 已进行手动测试

### 文档
- [ ] 公共 API 有文档注释
- [ ] 复杂逻辑有代码注释
- [ ] 如需要，已更新相关文档

### 其他
- [ ] 提交信息格式正确
- [ ] PR 描述清晰完整
- [ ] 没有引入安全漏洞
- [ ] 没有性能退化

---

## 🤔 常见问题

### Q: 我发现了一个小 typo，值得提交 PR 吗？
A: 当然值得！任何改进都是有价值的。

### Q: 我不会 Rust，可以贡献吗？
A: 当然可以！前端代码、文档、设计建议都是很好的贡献方式。

### Q: 如何开始？从哪里找到适合新手的任务？
A: 查看 Issues 中标记为 `good first issue` 的任务，这些通常适合新贡献者。

### Q: 我的 PR 很久没有回复怎么办？
A: 可以在 PR 中 @ 维护者提醒。我们会尽快回复，但有时可能会延迟。

---

## 📞 联系我们

- **GitHub Issues**: 问题和建议
- **Discussions**: 讨论和交流
- **Email**: [contact@seekeraistudio.com](mailto:contact@seekeraistudio.com)

---

## 🙏 感谢

感谢所有贡献者！

<a href="https://github.com/your-org/SeekerAITools/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=your-org/SeekerAITools" />
</a>

---

**再次感谢您的贡献！🎉**
