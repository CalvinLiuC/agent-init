import { getJson } from 'serpapi';
import 'dotenv/config';

/**
 * 一个基于SerpApi的实战网页搜索引擎工具。
 * 它会智能地解析搜索结果，优先返回直接答案或知识图谱信息。
 */
export async function searchTool(query: string) {
  console.log(`🔍 正在执行 [SerpApi] 网页搜索: ${query}`);
  try {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      return '错误：SERPAPI_API_KEY 未在 .env 文件中配置。';
    }
    const results = await getJson({
      engine: 'google',
      q: query,
      api_key: apiKey,
      // gl:'cn',
      // hl:'zh-cn'
    });
    // 智能解析：优先寻找最直接的答案
    if (results.answer_box_list) {
      return (results.answer_box_list as string[]).join('\n');
    }
    if (results.answer_box && results.answer_box.answer) {
      return results.answer_box.answer;
    }
    if (results.knowledge_graph && results.knowledge_graph.description) {
      return results.knowledge_graph.description;
    }
    if (results.organic_results && results.organic_results.length > 0) {
      // 如果没有直接答案，则返回前三个有机结果的摘要
      const snippets = (results.organic_results as Array<Record<string, any>>)
        .slice(0, 3)
        .map((res, i) => `[${i + 1}] ${res.title ?? ''}\n${res.snippet ?? ''}`);
      return snippets.join('\n\n');
    }

    return `对不起，没有找到关于 '${query}' 的信息。`;
  } catch (e) {
    return `搜索时发生错误: ${e}`;
  }
}

/** 一个工具的执行函数签名。 */
export type ToolFunction = (input: string) => string | Promise<string>;

interface ToolInfo {
  description: string;
  func: ToolFunction;
}

/**
 * 一个工具执行器，负责管理和执行工具。
 */
export class ToolExecutor {
  private tools: Record<string, ToolInfo> = {};

  /**
   * 向工具箱中注册一个新工具。
   */
  registerTool(name: string, description: string, func: ToolFunction): void {
    if (name in this.tools) {
      console.log(`警告：工具 '${name}' 已存在，将被覆盖。`);
    }

    this.tools[name] = { description, func };
    console.log(`工具 '${name}' 已注册。`);
  }

  /**
   * 根据名称获取一个工具的执行函数。
   */
  getTool(name: string): ToolFunction | undefined {
    return this.tools[name]?.func;
  }

  /**
   * 获取所有可用工具的格式化描述字符串。
   */
  getAvailableTools(): string {
    return Object.entries(this.tools)
      .map(([name, info]) => `- ${name}: ${info.description}`)
      .join('\n');
  }
}

// --- 工具初始化与使用示例 ---
async function main() {
  // 1. 初始化工具执行器
  const toolExecutor = new ToolExecutor();

  // 2. 注册我们的实战搜索工具
  const searchDescription =
    '一个网页搜索引擎。当你需要回答关于时事、事实以及在你的知识库中找不到的信息时，应使用此工具。';
  toolExecutor.registerTool('Search', searchDescription, searchTool);

  // 3. 打印可用的工具
  console.log('\n--- 可用的工具 ---');
  console.log(toolExecutor.getAvailableTools());

  // 4. 智能体的Action调用，这次我们问一个实时性的问题
  console.log("\n--- 执行 Action: Search['英伟达最新的GPU型号是什么'] ---");
  const toolName = 'Search';
  const toolInput = '英伟达最新的GPU型号是什么';

  const toolFunction = toolExecutor.getTool(toolName);
  if (toolFunction) {
    const observation = await toolFunction(toolInput);
    console.log('--- 观察 (Observation) ---');
    console.log(observation);
  } else {
    console.log(`错误：未找到名为 '${toolName}' 的工具。`);
  }
}
