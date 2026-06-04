# Hello Agents (TypeScript 版)

本仓库是《**Hello Agents**》一书的 **TypeScript 学习实现**。原书示例以 Python 为主，这里用 TypeScript + Node.js 重写，便于前端 / 全栈背景的同学理解智能体（Agent）的核心范式。

当前已实现 **第 4 章** 的四种经典 Agent 设计模式：

| 模式 | 文件 | 一句话说明 |
| --- | --- | --- |
| **LLM Client** | `chapter4/llmClient.ts` | 对接 OpenAI 兼容接口的流式大模型客户端，是其他模式的基础 |
| **ReAct** | `chapter4/ReAct.ts` | `Thought → Action → Observation` 循环，让模型边思考边调用工具 |
| **Plan-and-Resolve** | `chapter4/PlanAndResolve.ts` | 先由 Planner 拆解计划，再由 Executor 逐步执行 |
| **Reflection** | `chapter4/Reflection.ts` | 生成代码 → 自我审查 → 迭代优化，带短期记忆 |

> `firstAgent.ts` 是入门阶段的 Demo，直接用 `@anthropic-ai/sdk` 调用 DeepSeek 的 Anthropic 兼容端点，可作为最小可运行示例参考。

---

## ✨ 核心概念速览

### 1. LLM Client（`HelloAgentsLLM`）

封装了一个**兼容 OpenAI 协议**的客户端，默认使用流式输出。所有 Agent 都通过它的 `think(messages)` 方法与大模型交互：

- 优先读取构造参数，缺省时从 `.env` 读取 `LLM_API_KEY` / `LLM_MODEL_ID` / `LLM_BASE_URL`
- 流式拼接响应内容并返回完整字符串

### 2. ReAct Agent

通过提示词约束模型按固定格式输出：

```
Thought: 分析问题、规划下一步
Action: Search[查询内容]   // 调用工具
Action: Finish[最终答案]   // 得到答案后结束
```

Agent 解析 `Action`，调用 `ToolExecutor` 中注册的工具（如基于 SerpApi 的 `Search`），把结果作为 `Observation` 回填历史，循环直到 `Finish` 或达到最大步数。

### 3. Plan-and-Resolve Agent

- **Planner**：把复杂问题分解为一个 JSON 步骤数组
- **Executor**：携带「原始问题 + 完整计划 + 历史结果」逐步求解，前一步结果会作为后一步的上下文

适合可线性分解的多步推理任务（示例：多日苹果销量求和）。

### 4. Reflection Agent

模拟「写代码 → 评审 → 改进」的工程闭环：

1. 根据任务生成初版代码（execution）
2. 以「严格的代码评审专家」视角审查算法效率（reflection）
3. 若反馈非「无需改进」，则结合反馈生成优化版本，循环至多 `max_step` 次

内置 `Memory` 类记录每一轮的执行与反思轨迹。

---

## 🛠 技术栈

- **运行时**：Node.js（ESM，`"type": "module"`）
- **语言**：TypeScript（`target: ES2022`，`module: NodeNext`）
- **执行**：[tsx](https://github.com/privatenumber/tsx) —— 免编译直接运行 `.ts`
- **大模型 SDK**：`openai`（OpenAI 兼容接口）、`@anthropic-ai/sdk`
- **工具**：`serpapi`（网页搜索）
- **其他**：`zod`、`dotenv`、`ai`

---

## 🚀 快速开始

### 1. 安装依赖

```bash
yarn install
```

### 2. 配置环境变量

在项目根目录创建 `.env` 文件（参考下表）：

```ini
# 大模型配置（OpenAI 兼容接口，如 DeepSeek、通义、Kimi 等）
LLM_API_KEY=你的_API_KEY
LLM_MODEL_ID=模型ID            # 例如 deepseek-chat
LLM_BASE_URL=服务地址          # 例如 https://api.deepseek.com/v1

# 网页搜索工具（ReAct 模式需要）
SERPAPI_API_KEY=你的_SerpApi_KEY
```

| 变量 | 用途 | 必填 |
| --- | --- | --- |
| `LLM_API_KEY` | 大模型 API 密钥 | ✅ |
| `LLM_MODEL_ID` | 模型名称 / ID | ✅ |
| `LLM_BASE_URL` | OpenAI 兼容服务地址 | ✅ |
| `LLM_TIMEOUT` | 请求超时（秒，默认 60） | ❌ |
| `SERPAPI_API_KEY` | SerpApi 密钥（ReAct 工具调用用） | 仅 ReAct |

> `.env` 已在 `.gitignore` 中忽略，不会被提交。

### 3. 选择并运行某个模式

入口文件 `index.ts` 通过注释切换要运行的模式，保留你想运行的那一段即可：

```ts
// reflection agent
import { main } from './chapter4/Reflection.js';
main();
```

> 注意：ESM + NodeNext 下导入路径需写 `.js` 后缀（即使源码是 `.ts`），这是 `NodeNext` 模块解析的要求。

然后运行：

```bash
yarn dev        # 一次性运行
yarn watch      # 监听文件变化，自动重跑
```

---

## 📜 可用脚本

| 命令 | 说明 |
| --- | --- |
| `yarn dev` | 用 tsx 运行 `index.ts`（加载 `.env`） |
| `yarn watch` | 监听模式运行 |
| `yarn build` | `tsc` 编译到 `dist/` |
| `yarn start` | 运行编译后的 `dist/index.js` |
| `yarn typecheck` | 仅做类型检查，不输出文件 |
| `yarn format` | 用 Prettier 格式化全部文件 |
| `yarn format:check` | 检查格式是否符合规范 |

---

## 📁 项目结构

```
agent-init/
├── index.ts                 # 入口：通过注释切换运行不同 Agent 模式
├── firstAgent.ts            # 入门 Demo：Anthropic SDK 调用 DeepSeek
├── chapter4/
│   ├── llmClient.ts         # HelloAgentsLLM：流式 LLM 客户端（基础设施）
│   ├── tools.ts             # searchTool（SerpApi）+ ToolExecutor 工具管理器
│   ├── ReAct.ts             # ReAct 模式
│   ├── PlanAndResolve.ts    # Plan-and-Resolve 模式
│   └── Reflection.ts        # Reflection 模式
├── .env                     # 环境变量（不提交）
├── tsconfig.json
└── package.json
```

---

## 📌 说明

- 本项目仅用于**学习目的**，代码注重清晰地还原各 Agent 范式，未做生产级的错误处理与抽象。
- 各模式的 `main()` 中内置了示例问题，可自行修改体验不同效果。
