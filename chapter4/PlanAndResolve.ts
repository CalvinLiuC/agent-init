import { ChatCompletionMessageParam } from 'openai/resources';
import { HelloAgentsLLM } from './llmClient.js';
const PLANNER_PROMPT_TEMPLATE = `
你是一个顶级的AI规划专家。你的任务是将用户提出的复杂问题分解成一个由多个简单步骤组成的行动计划。
请确保计划中的每个步骤都是一个独立的、可执行的子任务，并且严格按照逻辑顺序排列。
你的输出必须是一个JSON字符串数组，其中每个元素都是一个描述子任务的字符串。
问题: {question}

请严格按照以下格式输出你的计划，使用 \`\`\`json 代码块包裹（前后缀是必要的）:
\`\`\`json
["步骤1", "步骤2", "步骤3", ...]
\`\`\`

`;

class Planner {
  private llmClient: HelloAgentsLLM;
  constructor(llmClient: HelloAgentsLLM) {
    this.llmClient = new HelloAgentsLLM();
  }
  async plan(question: string): Promise<string[]> {
    const prompt = this.parsePrompt(question);
    const messages: ChatCompletionMessageParam[] = [{ role: 'user', content: prompt }];

    console.log('--- 正在生成计划 ---');
    const responseText = (await this.llmClient.think(messages)) || '';

    console.log(`✅ 计划已生成:\n${responseText}`);

    // 解析LLM输出的列表字符串
    try {
      // 优先提取 ```typescript / ```python / ``` 代码块中的内容，否则直接定位数组
      const fenceMatch = responseText.match(/```(?:typescript|python|json)?\s*([\s\S]*?)```/);
      let planStr = fenceMatch ? fenceMatch[1].trim() : responseText.trim();

      // 截取首个 [ 到最后一个 ] 之间的内容，避免多余的说明文字干扰解析
      const start = planStr.indexOf('[');
      const end = planStr.lastIndexOf(']');
      if (start !== -1 && end !== -1 && end > start) {
        planStr = planStr.slice(start, end + 1);
      }

      // 使用 JSON.parse 安全地将字符串转换为数组
      const plan = JSON.parse(planStr);
      return Array.isArray(plan)
        ? plan.filter((step): step is string => typeof step === 'string')
        : [];
    } catch (e) {
      console.log(`❌ 解析计划时出错: ${e}`);
      console.log(`原始响应: ${responseText}`);
      return [];
    }
  }
  private parsePrompt(question: string) {
    const prompt = PLANNER_PROMPT_TEMPLATE.replace('{question}', question);
    return prompt;
  }
}

const EXECUTOR_PROMPT_TEMPLATE = `
你是一位顶级的AI执行专家。你的任务是严格按照给定的计划，一步步地解决问题。
你将收到原始问题、完整的计划、以及到目前为止已经完成的步骤和结果。
请你专注于解决“当前步骤”，并仅输出该步骤的最终答案，不要输出任何额外的解释或对话。

# 原始问题:
{question}

# 完整计划:
{plan}

# 历史步骤与结果:
{history}

# 当前步骤:
{current_step}

请仅输出针对“当前步骤”的回答:
`;

class Executor {
  private llmClient: HelloAgentsLLM;

  constructor(llmClient: HelloAgentsLLM) {
    this.llmClient = llmClient;
  }

  async execute(q: string, plan: Array<string>) {
    const history: Array<string> = [];
    let responseText;
    for (const i in plan) {
      const planItem = plan[i];
      const step = Number(i) + 1;
      const prompt = this.parsePrompt(q, plan, history, step);
      const messages: ChatCompletionMessageParam[] = [{ role: 'user', content: prompt }];
      responseText = await this.llmClient.think(messages);
      if (!responseText) {
        console.error('Error: no response');
        break;
      }
      history.push(`步骤：${step}\n结果：${responseText}`);
      console.info(`✅ 步骤 ${step} 已完成，结果: ${responseText}`);
    }
    return responseText;
  }

  private parsePrompt(q: string, p: Array<string>, history: Array<string>, currentStep: number) {
    const planStr = p.join('\n');
    const historyStr = history.join('\n');
    const prompt = EXECUTOR_PROMPT_TEMPLATE.replace('{question}', q)
      .replace('{plan}', planStr)
      .replace('{history}', historyStr)
      .replace('{current_step}', currentStep + '');
    return prompt;
  }
}

export class PlanAndResolveAgent {
  private llmClient: HelloAgentsLLM;
  private planner: Planner;
  private executor: Executor;
  constructor(llmClient: HelloAgentsLLM, planner: Planner, executor: Executor) {
    this.llmClient = llmClient;
    this.planner = planner;
    this.executor = executor;
  }

  async run(q: string) {
    const plan = await this.planner.plan(q);
    if (!plan.length) {
      console.info('无法生成plan');
      return;
    }
    const finalResult = await this.executor.execute(q, plan);
    console.info(`\n--- 任务完成 ---\n最终答案: ${finalResult}`);
  }
}

export function main() {
  const llmClient = new HelloAgentsLLM();
  const planner = new Planner(llmClient);
  const executor = new Executor(llmClient);
  const planAndResolveAgent = new PlanAndResolveAgent(llmClient, planner, executor);
  const question =
    '一个水果店周一卖出了15个苹果。周二卖出的苹果数量是周一的两倍。周三卖出的数量比周二少了5个。请问这三天总共卖出了多少个苹果？';
  planAndResolveAgent.run(question);
}
