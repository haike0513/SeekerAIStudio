# AIGC 游戏开发助手 - 技术架构文档

> 版本: 1.0
> 最后更新: 2026-01-16
> 状态: 规划阶段

---

## 1. 架构概览

游戏开发助手模块基于 **SolidJS** + **Tauri** 构建，复用 SeekerAIStudio 现有的基础设施，同时整合小说、漫画、音频模块的能力，实现游戏资产的一站式生成与导出。

### 1.1 核心挑战
| 挑战 | 解决方案 |
|------|---------|
| 对话树的复杂分支逻辑 | 可视化节点编辑器 + 智能验证 |
| 角色立绘多表情/姿态一致性 | LoRA + Seed 锁定 + ControlNet |
| 多引擎导出格式 | 适配器模式，统一内部格式 |
| 实时预览 | 内置视觉小说阅读器 |

### 1.2 与其他模块的关系
```
┌────────────────────────────────────────────────────────────────────┐
│                      Game Dev Kit 模块                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     Story Editor                             │   │
│  │  (对话树编辑器 - 本模块核心)                                   │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                              │ 引用                               │
│         ┌────────────────────┼────────────────────┐               │
│         ▼                    ▼                    ▼               │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐       │
│  │ Novel 模块  │      │ Comic 模块  │      │ Audio 模块  │       │
│  │ (剧情生成)  │      │ (立绘生成)   │      │ (配音生成)   │       │
│  └─────────────┘      └─────────────┘      └─────────────┘       │
│                              │                                    │
│                              ▼                                    │
│                    ┌─────────────────┐                            │
│                    │  Export Engine  │                            │
│                    │   (多引擎导出)   │                            │
│                    └─────────────────┘                            │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. 数据结构设计

### 2.1 核心数据模型

```typescript
// 游戏项目
interface GameProject {
  id: string;
  name: string;
  type: 'visual_novel' | 'rpg' | 'adventure';
  settings: GameSettings;
  characters: Character[];
  scenes: Scene[];
  dialogueTree: DialogueNode[];
  variables: GameVariable[];
  assets: AssetLibrary;
  metadata: ProjectMetadata;
}

// 游戏设置
interface GameSettings {
  resolution: { width: number; height: number };
  aspectRatio: '16:9' | '4:3' | '9:16';
  defaultFont: string;
  dialogueBoxStyle: DialogueBoxStyle;
  transitionType: TransitionType;
}

// 角色
interface Character {
  id: string;
  name: string;
  displayName: string;
  color: string; // 对话框名字颜色
  
  // 立绘资产
  sprites: CharacterSprite[];
  defaultSpriteId: string;
  
  // 生成参数
  generationParams: {
    basePrompt: string;
    negativePrompt: string;
    seed: number;
    loraId?: string;
    referenceImageUrl?: string;
  };
  
  // 语音设置
  voiceSettings: {
    voiceId: string;
    pitch: number;
    speed: number;
  };
}

// 角色立绘
interface CharacterSprite {
  id: string;
  characterId: string;
  expression: Expression;
  pose: Pose;
  imageUrl: string;
  thumbnailUrl: string;
}

type Expression = 
  | 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' 
  | 'shy' | 'confused' | 'scared' | 'proud' | 'custom';

type Pose = 
  | 'front' | 'side_left' | 'side_right' | 'back'
  | 'sitting' | 'action' | 'custom';

// 场景
interface Scene {
  id: string;
  name: string;
  category: 'indoor' | 'outdoor' | 'fantasy' | 'scifi' | 'special';
  
  // 背景变体
  variants: SceneVariant[];
  defaultVariantId: string;
  
  // 生成参数
  generationParams: {
    basePrompt: string;
    negativePrompt: string;
    style: string;
  };
}

interface SceneVariant {
  id: string;
  sceneId: string;
  timeOfDay: 'morning' | 'noon' | 'evening' | 'night';
  weather: 'clear' | 'cloudy' | 'rainy' | 'snowy';
  imageUrl: string;
}
```

### 2.2 对话树数据结构

```typescript
// 对话节点 (联合类型)
type DialogueNode = 
  | DialogueTextNode
  | DialogueChoiceNode
  | DialogueConditionNode
  | DialogueEffectNode
  | DialogueJumpNode
  | DialogueEndNode;

// 基础节点接口
interface BaseDialogueNode {
  id: string;
  type: string;
  position: { x: number; y: number }; // 编辑器位置
  nextNodeId?: string;
}

// 对话节点 - 显示文字
interface DialogueTextNode extends BaseDialogueNode {
  type: 'dialogue';
  speakerId?: string; // 说话的角色，null 表示旁白
  expression?: Expression;
  text: string;
  voiceClipUrl?: string; // 预生成的语音
}

// 选择节点 - 玩家选项
interface DialogueChoiceNode extends BaseDialogueNode {
  type: 'choice';
  prompt?: string; // 选择前的提示文字
  choices: Choice[];
}

interface Choice {
  id: string;
  text: string;
  nextNodeId: string;
  conditions?: Condition[]; // 显示条件
  effects?: Effect[]; // 选择效果
}

// 条件节点 - 分支逻辑
interface DialogueConditionNode extends BaseDialogueNode {
  type: 'condition';
  conditions: {
    condition: Condition;
    nextNodeId: string;
  }[];
  fallbackNodeId: string; // 所有条件都不满足时
}

// 效果节点 - 修改状态
interface DialogueEffectNode extends BaseDialogueNode {
  type: 'effect';
  effects: Effect[];
}

// 跳转节点 - 跳转到其他位置
interface DialogueJumpNode extends BaseDialogueNode {
  type: 'jump';
  targetLabel: string;
}

// 结束节点
interface DialogueEndNode extends BaseDialogueNode {
  type: 'end';
  endingType: 'normal' | 'good' | 'bad' | 'secret';
  endingId?: string;
}

// 条件
interface Condition {
  variableId: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value: string | number | boolean;
}

// 效果
interface Effect {
  type: 'set_variable' | 'add_variable' | 'play_sound' | 'change_scene';
  params: Record<string, unknown>;
}

// 游戏变量
interface GameVariable {
  id: string;
  name: string;
  type: 'number' | 'string' | 'boolean';
  defaultValue: string | number | boolean;
  description?: string;
}
```

### 2.3 资产库

```typescript
interface AssetLibrary {
  images: {
    characters: Record<string, CharacterSprite[]>;
    backgrounds: Record<string, SceneVariant[]>;
    ui: UIAsset[];
    effects: EffectAsset[];
  };
  audio: {
    voices: VoiceClip[];
    bgm: MusicTrack[];
    sfx: SoundEffect[];
  };
}

interface UIAsset {
  id: string;
  type: 'dialogue_box' | 'button' | 'menu' | 'overlay';
  imageUrl: string;
  metadata: Record<string, unknown>;
}
```

---

## 3. 组件架构

### 3.1 前端目录结构

```
src/features/game/
├── components/
│   ├── StoryEditor/           # 对话树编辑器
│   │   ├── Canvas.tsx         # 画布容器
│   │   ├── Node.tsx           # 节点组件
│   │   ├── NodeTypes/         # 各类型节点
│   │   │   ├── DialogueNode.tsx
│   │   │   ├── ChoiceNode.tsx
│   │   │   ├── ConditionNode.tsx
│   │   │   └── ...
│   │   ├── Edge.tsx           # 连接线
│   │   ├── Toolbar.tsx        # 工具栏
│   │   └── PropertyPanel.tsx  # 属性面板
│   │
│   ├── CharacterManager/      # 角色管理
│   │   ├── CharacterList.tsx
│   │   ├── CharacterCard.tsx
│   │   ├── SpriteGenerator.tsx    # 立绘生成
│   │   └── ExpressionGrid.tsx     # 表情网格
│   │
│   ├── SceneManager/          # 场景管理
│   │   ├── SceneList.tsx
│   │   ├── SceneCard.tsx
│   │   └── VariantGenerator.tsx
│   │
│   ├── Preview/               # 游戏预览
│   │   ├── GamePlayer.tsx     # VN 阅读器
│   │   ├── DialogueDisplay.tsx
│   │   ├── ChoiceButtons.tsx
│   │   └── TransitionEffect.tsx
│   │
│   └── Export/                # 导出
│       ├── ExportWizard.tsx
│       ├── EngineSelector.tsx
│       └── ProgressDisplay.tsx
│
├── pages/
│   ├── GameHome.tsx           # 项目列表页
│   └── GameEditor.tsx         # 主编辑页
│
├── stores/
│   └── gameStore.ts           # 状态管理
│
├── hooks/
│   ├── useDialogueTree.ts     # 对话树操作
│   ├── useCharacterConsistency.ts # 角色一致性
│   └── useGamePreview.ts      # 预览逻辑
│
├── adapters/
│   ├── base.ts                # 导出适配器基类
│   ├── renpy.ts               # Ren'Py 适配器
│   ├── unity.ts               # Unity 适配器
│   └── godot.ts               # Godot 适配器
│
└── utils/
    ├── validation.ts          # 对话树验证
    ├── pathfinding.ts         # 分支路径分析
    └── generator.ts           # AI 生成辅助
```

### 3.2 对话树编辑器架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        StoryEditor                                   │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                         Toolbar                              │    │
│  │  [添加对话] [添加选项] [添加条件] │ [验证] [预览] [导出]      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌───────────────────────────────────────┬─────────────────────┐    │
│  │              Canvas                    │   PropertyPanel    │    │
│  │  ┌─────────┐                          │   ┌─────────────┐  │    │
│  │  │ 开始    │──────┐                   │   │ 节点属性    │  │    │
│  │  └─────────┘      │                   │   │             │  │    │
│  │                   ▼                   │   │ 说话者:     │  │    │
│  │           ┌─────────────┐             │   │ [Alice ▼]   │  │    │
│  │           │ 对话节点 1  │             │   │             │  │    │
│  │           └─────────────┘             │   │ 表情:       │  │    │
│  │                   │                   │   │ [微笑 ▼]    │  │    │
│  │                   ▼                   │   │             │  │    │
│  │           ┌─────────────┐             │   │ 对白:       │  │    │
│  │           │ 选择节点    │             │   │ [________]  │  │    │
│  │           │  A ──▶      │             │   │             │  │    │
│  │           │  B ──▶      │             │   │ [AI 生成]   │  │    │
│  │           └─────────────┘             │   └─────────────┘  │    │
│  │                                       │                     │    │
│  └───────────────────────────────────────┴─────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 节点渲染组件

```typescript
// 通用节点包装器
interface NodeWrapperProps {
  node: DialogueNode;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onConnect: (targetId: string) => void;
}

const NodeWrapper: Component<NodeWrapperProps> = (props) => {
  return (
    <div
      class={cn(
        "absolute rounded-lg shadow-lg",
        props.selected && "ring-2 ring-accent-500"
      )}
      style={{
        left: `${props.node.position.x}px`,
        top: `${props.node.position.y}px`,
      }}
      onClick={props.onSelect}
    >
      <Switch>
        <Match when={props.node.type === 'dialogue'}>
          <DialogueNodeContent node={props.node as DialogueTextNode} />
        </Match>
        <Match when={props.node.type === 'choice'}>
          <ChoiceNodeContent node={props.node as DialogueChoiceNode} />
        </Match>
        {/* ... 其他类型 */}
      </Switch>
      
      {/* 连接点 */}
      <ConnectionHandle type="input" />
      <ConnectionHandle type="output" />
    </div>
  );
};
```

---

## 4. 角色一致性系统

### 4.1 多层保障策略

```
                    角色一致性保障
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │基础层    │    │增强层    │    │高级层   │
    │Seed 锁定 │    │Reference │    │LoRA    │
    │         │    │Image     │    │训练     │
    └────┬────┘    └────┬────┘    └────┬────┘
         │               │               │
         ▼               ▼               ▼
    简单有效        灵活控制        最高一致性
    姿态受限        需要参考图      需要训练数据
```

### 4.2 实现方案

```typescript
interface CharacterConsistencyEngine {
  // 策略选择
  selectStrategy(character: Character, targetExpression: Expression): ConsistencyStrategy;
  
  // 基础层: Seed 锁定
  generateWithSeed(params: {
    character: Character;
    expression: Expression;
    seed: number;
  }): Promise<GeneratedImage>;
  
  // 增强层: 参考图
  generateWithReference(params: {
    character: Character;
    expression: Expression;
    referenceImage: string;
    ipAdapterWeight: number;
  }): Promise<GeneratedImage>;
  
  // 高级层: LoRA
  generateWithLoRA(params: {
    character: Character;
    expression: Expression;
    loraPath: string;
    loraWeight: number;
  }): Promise<GeneratedImage>;
}

type ConsistencyStrategy = 'seed' | 'reference' | 'lora';

// 表情变体批量生成
async function generateExpressionSet(
  character: Character,
  expressions: Expression[]
): Promise<CharacterSprite[]> {
  const strategy = selectBestStrategy(character);
  
  const sprites = await Promise.all(
    expressions.map(async (expr) => {
      const image = await consistencyEngine[strategy]({
        character,
        expression: expr,
        ...getStrategyParams(strategy, character),
      });
      
      return {
        id: nanoid(),
        characterId: character.id,
        expression: expr,
        pose: 'front',
        imageUrl: image.url,
        thumbnailUrl: image.thumbnailUrl,
      };
    })
  );
  
  return sprites;
}
```

### 4.3 ControlNet 姿态控制

```typescript
interface PoseControlParams {
  targetPose: Pose;
  poseImageUrl?: string; // 自定义姿态参考
  controlNetModel: 'openpose' | 'depth' | 'canny';
  controlWeight: number;
}

async function generateWithPose(
  character: Character,
  expression: Expression,
  pose: PoseControlParams
): Promise<CharacterSprite> {
  // 获取预设姿态模板
  const poseTemplate = pose.poseImageUrl ?? getPresetPose(pose.targetPose);
  
  const result = await comfyuiClient.generate({
    workflow: 'game_character_with_pose',
    inputs: {
      prompt: buildCharacterPrompt(character, expression),
      negative_prompt: character.generationParams.negativePrompt,
      seed: character.generationParams.seed,
      controlnet_image: poseTemplate,
      controlnet_model: pose.controlNetModel,
      controlnet_weight: pose.controlWeight,
      lora_path: character.generationParams.loraId,
    },
  });
  
  return {
    id: nanoid(),
    characterId: character.id,
    expression,
    pose: pose.targetPose,
    imageUrl: result.imageUrl,
    thumbnailUrl: result.thumbnailUrl,
  };
}
```

---

## 5. 导出适配器系统

### 5.1 适配器接口

```typescript
interface ExportAdapter {
  name: string;
  engineId: 'renpy' | 'unity' | 'godot' | 'generic';
  version: string;
  
  // 验证项目兼容性
  validate(project: GameProject): ValidationResult;
  
  // 导出项目
  export(project: GameProject, options: ExportOptions): Promise<ExportResult>;
  
  // 生成脚本
  generateScripts(dialogueTree: DialogueNode[]): GeneratedScript[];
  
  // 打包资产
  packageAssets(assets: AssetLibrary): Promise<PackagedAssets>;
}

interface ExportOptions {
  outputDir: string;
  includeAssets: boolean;
  optimizeImages: boolean;
  generateVoice: boolean;
  targetResolution?: { width: number; height: number };
}

interface ExportResult {
  success: boolean;
  outputPath: string;
  files: ExportedFile[];
  warnings: string[];
  errors?: string[];
}
```

### 5.2 Ren'Py 适配器

```typescript
class RenPyAdapter implements ExportAdapter {
  name = "Ren'Py";
  engineId = 'renpy' as const;
  version = '8.0';
  
  generateScripts(dialogueTree: DialogueNode[]): GeneratedScript[] {
    const scripts: GeneratedScript[] = [];
    
    // 生成角色定义
    scripts.push({
      filename: 'characters.rpy',
      content: this.generateCharacterDefinitions(),
    });
    
    // 生成主脚本
    scripts.push({
      filename: 'script.rpy',
      content: this.generateMainScript(dialogueTree),
    });
    
    return scripts;
  }
  
  private generateMainScript(nodes: DialogueNode[]): string {
    let script = '# Generated by SeekerAIStudio\n\n';
    script += 'label start:\n';
    
    for (const node of nodes) {
      script += this.nodeToRenPy(node);
    }
    
    return script;
  }
  
  private nodeToRenPy(node: DialogueNode): string {
    switch (node.type) {
      case 'dialogue':
        return this.dialogueToRenPy(node);
      case 'choice':
        return this.choiceToRenPy(node);
      case 'condition':
        return this.conditionToRenPy(node);
      default:
        return '';
    }
  }
  
  private dialogueToRenPy(node: DialogueTextNode): string {
    const character = node.speakerId ?? 'narrator';
    const expression = node.expression ? ` ${node.expression}` : '';
    
    let output = '';
    
    // 显示立绘表情
    if (node.speakerId && node.expression) {
      output += `    show ${node.speakerId}${expression}\n`;
    }
    
    // 对话文本
    const escapedText = node.text.replace(/"/g, '\\"');
    output += `    ${character} "${escapedText}"\n`;
    
    return output;
  }
  
  private choiceToRenPy(node: DialogueChoiceNode): string {
    let output = '    menu:\n';
    
    if (node.prompt) {
      output += `        "${node.prompt}"\n`;
    }
    
    for (const choice of node.choices) {
      const escapedText = choice.text.replace(/"/g, '\\"');
      output += `        "${escapedText}":\n`;
      output += `            jump ${choice.nextNodeId}\n`;
    }
    
    return output;
  }
}
```

### 5.3 Unity 适配器

```typescript
class UnityAdapter implements ExportAdapter {
  name = 'Unity';
  engineId = 'unity' as const;
  version = '2022.3';
  
  async export(project: GameProject, options: ExportOptions): Promise<ExportResult> {
    const files: ExportedFile[] = [];
    
    // 生成 C# 脚本
    files.push({
      path: 'Assets/Scripts/DialogueData.cs',
      content: this.generateDialogueDataClass(project),
    });
    
    files.push({
      path: 'Assets/Scripts/DialogueManager.cs',
      content: this.generateDialogueManager(),
    });
    
    // 生成 JSON 数据
    files.push({
      path: 'Assets/Resources/dialogue.json',
      content: JSON.stringify(this.convertToUnityFormat(project), null, 2),
    });
    
    // 打包资产
    if (options.includeAssets) {
      const assetFiles = await this.packageAssets(project.assets);
      files.push(...assetFiles);
    }
    
    // 生成 Unity Package
    const packagePath = await this.createUnityPackage(files, options.outputDir);
    
    return {
      success: true,
      outputPath: packagePath,
      files,
      warnings: [],
    };
  }
  
  private convertToUnityFormat(project: GameProject): UnityDialogueData {
    return {
      characters: project.characters.map(c => ({
        id: c.id,
        name: c.displayName,
        color: c.color,
        sprites: c.sprites.map(s => ({
          expression: s.expression,
          pose: s.pose,
          path: `Sprites/Characters/${c.id}/${s.expression}_${s.pose}`,
        })),
      })),
      scenes: project.scenes.map(s => ({
        id: s.id,
        name: s.name,
        variants: s.variants.map(v => ({
          timeOfDay: v.timeOfDay,
          weather: v.weather,
          path: `Sprites/Backgrounds/${s.id}/${v.timeOfDay}_${v.weather}`,
        })),
      })),
      dialogues: this.convertDialogueTree(project.dialogueTree),
      variables: project.variables,
    };
  }
}
```

---

## 6. 游戏预览系统

### 6.1 内置视觉小说引擎

```typescript
interface GamePlayerState {
  currentNodeId: string;
  variables: Record<string, unknown>;
  history: string[]; // 已访问节点历史
  isPlaying: boolean;
  isPaused: boolean;
}

const GamePlayer: Component<{ project: GameProject }> = (props) => {
  const [state, setState] = createStore<GamePlayerState>({
    currentNodeId: findStartNode(props.project.dialogueTree).id,
    variables: initializeVariables(props.project.variables),
    history: [],
    isPlaying: false,
    isPaused: false,
  });
  
  const currentNode = createMemo(() => 
    props.project.dialogueTree.find(n => n.id === state.currentNodeId)
  );
  
  const currentScene = createMemo(() => {
    // 从 context 获取当前场景
    return findCurrentScene(props.project, state);
  });
  
  const currentSpeaker = createMemo(() => {
    const node = currentNode();
    if (node?.type !== 'dialogue') return null;
    return props.project.characters.find(c => c.id === node.speakerId);
  });
  
  function advanceDialogue() {
    const node = currentNode();
    if (!node) return;
    
    // 处理不同节点类型
    switch (node.type) {
      case 'dialogue':
        if (node.nextNodeId) {
          goToNode(node.nextNodeId);
        }
        break;
      case 'condition':
        const nextId = evaluateCondition(node, state.variables);
        goToNode(nextId);
        break;
      case 'effect':
        applyEffects(node.effects, state.variables);
        if (node.nextNodeId) {
          goToNode(node.nextNodeId);
        }
        break;
      case 'end':
        setState('isPlaying', false);
        break;
    }
  }
  
  function selectChoice(choice: Choice) {
    // 应用选择效果
    if (choice.effects) {
      applyEffects(choice.effects, state.variables);
    }
    goToNode(choice.nextNodeId);
  }
  
  function goToNode(nodeId: string) {
    setState('history', h => [...h, state.currentNodeId]);
    setState('currentNodeId', nodeId);
  }
  
  return (
    <div class="game-player relative w-full h-full">
      {/* 背景层 */}
      <Show when={currentScene()}>
        <img 
          src={currentScene()!.imageUrl} 
          class="absolute inset-0 w-full h-full object-cover"
        />
      </Show>
      
      {/* 角色层 */}
      <Show when={currentSpeaker()}>
        <CharacterDisplay character={currentSpeaker()!} />
      </Show>
      
      {/* 对话层 */}
      <Show when={currentNode()?.type === 'dialogue'}>
        <DialogueBox
          speaker={currentSpeaker()}
          text={(currentNode() as DialogueTextNode).text}
          onAdvance={advanceDialogue}
        />
      </Show>
      
      {/* 选择层 */}
      <Show when={currentNode()?.type === 'choice'}>
        <ChoicePanel
          choices={(currentNode() as DialogueChoiceNode).choices}
          variables={state.variables}
          onSelect={selectChoice}
        />
      </Show>
    </div>
  );
};
```

---

## 7. AI 辅助功能

### 7.1 剧情生成

```typescript
interface StoryGenerationParams {
  genre: 'romance' | 'mystery' | 'fantasy' | 'scifi' | 'horror';
  setting: string;
  characters: Character[];
  length: 'short' | 'medium' | 'long';
  tone: 'serious' | 'comedy' | 'drama';
}

async function generateStoryOutline(
  params: StoryGenerationParams
): Promise<StoryOutline> {
  const prompt = buildStoryPrompt(params);
  
  const { object } = await generateObject({
    model: getDefaultModel(),
    schema: storyOutlineSchema,
    prompt,
  });
  
  return object;
}

// 对话续写
async function continueDialogue(
  context: DialogueContext,
  speaker: Character,
  direction?: string
): Promise<string[]> {
  const prompt = `
你是一个游戏剧情编辑器。基于以下上下文，为角色 ${speaker.displayName} 生成 3 个可能的对话选项。

角色设定:
${speaker.generationParams.basePrompt}

对话历史:
${context.recentDialogues.map(d => `${d.speaker}: ${d.text}`).join('\n')}

${direction ? `写作方向: ${direction}` : ''}

请生成 3 个不同风格的对话选项。
`;

  const { object } = await generateObject({
    model: getDefaultModel(),
    schema: z.object({
      options: z.array(z.string()).length(3),
    }),
    prompt,
  });
  
  return object.options;
}
```

### 7.2 分支建议

```typescript
async function suggestBranches(
  currentNode: DialogueNode,
  context: DialogueContext
): Promise<BranchSuggestion[]> {
  const prompt = `
分析以下对话节点，建议可能的分支走向：

当前对话: ${(currentNode as DialogueTextNode).text}

请建议 2-4 个合理的分支选项，每个选项包含：
- 选项文本
- 后续剧情方向
- 情感基调
`;

  const { object } = await generateObject({
    model: getDefaultModel(),
    schema: branchSuggestionSchema,
    prompt,
  });
  
  return object.suggestions;
}
```

---

## 8. 项目结构示例

### 8.1 存储格式

```
projects/
└── my_visual_novel/
    ├── project.json           # 项目配置
    ├── dialogue.json          # 对话树数据
    ├── assets/
    │   ├── characters/
    │   │   ├── alice/
    │   │   │   ├── happy.png
    │   │   │   ├── sad.png
    │   │   │   └── ...
    │   │   └── bob/
    │   │       └── ...
    │   ├── backgrounds/
    │   │   ├── classroom/
    │   │   │   ├── morning_clear.png
    │   │   │   ├── evening_clear.png
    │   │   │   └── ...
    │   │   └── ...
    │   ├── ui/
    │   │   ├── dialogue_box.png
    │   │   └── ...
    │   └── audio/
    │       ├── voices/
    │       ├── bgm/
    │       └── sfx/
    └── exports/
        ├── renpy/
        ├── unity/
        └── godot/
```

---

## 附录

### A. 相关文档
- [游戏开发助手产品需求](../product/AIGC_Game_Generation.md)
- [整体技术架构](./Architecture.md)
- [漫画模块架构](./AIGC_Comic_Architecture.md) (立绘生成复用)
- [音频模块架构](./AIGC_Audio_Architecture.md) (配音生成复用)

### B. 外部资源
- [Ren'Py 文档](https://www.renpy.org/doc/html/)
- [Unity Dialogue System](https://assetstore.unity.com/)
- [Godot DialogueManager](https://godotengine.org/)
