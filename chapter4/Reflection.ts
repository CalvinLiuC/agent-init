import { ChatCompletionMessageParam } from 'openai/resources';
import { HelloAgentsLLM } from './llmClient.js';

const INITIAL_PROMPT_TEMPLATE = `
你是一位资深的TypeScript程序员。请根据以下要求，编写一个TypeScript函数。
你的代码必须包含完整的函数签名、文档字符串，并遵循编码规范。

要求: {task}

请直接输出代码，不要包含任何额外的解释。
`;

const REFLECT_PROMPT_TEMPLATE = `
你是一位极其严格的代码评审专家和资深算法工程师，对代码的性能有极致的要求。
你的任务是审查以下Python代码，并专注于找出其在<strong>算法效率</strong>上的主要瓶颈。

# 原始任务:
{task}

# 待审查的代码:
\`\`\`ts
{code}
\`\`\`

请分析该代码的时间复杂度，并思考是否存在一种<strong>算法上更优</strong>的解决方案来显著提升性能。
如果存在，请清晰地指出当前算法的不足，并提出具体的、可行的改进算法建议（例如，使用筛法替代试除法）。
如果代码在算法层面已经达到最优，才能回答“无需改进”。

请直接输出你的反馈，不要包含任何额外的解释。
`;

const REFINE_PROMPT_TEMPLATE = `
你是一位资深的Python程序员。你正在根据一位代码评审专家的反馈来优化你的代码。

# 原始任务:
{task}

# 你上一轮尝试的代码:
{last_code_attempt}
评审员的反馈：
{feedback}

请根据评审员的反馈，生成一个优化后的新版本代码。
你的代码必须包含完整的函数签名、文档字符串，并遵循PEP 8编码规范。
请直接输出优化后的代码，不要包含任何额外的解释。
`;
type RecordType = 'execution' | 'reflection';
interface Record {
  record_type: RecordType;
  content: string;
}

class Memory {
  private records: Array<Record> = [];
  constructor() { }
  add_record(record_type: RecordType, content: string) {
    this.records.push({ record_type, content });
    console.info(
      `新增一条结果：record_type->${record_type},content->${content}`,
    );
  }

  //获取短期的消息记录
  get_trajectory() {
    const trajectory: Array<string> = [];
    this.records.forEach(item => {
      const { record_type, content } = item;
      if (record_type === 'execution') {
        trajectory.push(`上一轮的尝试代码：${content}`);
      } else {
        trajectory.push(`评审员反馈结果：${content}`);
      }
    });
    return trajectory.join('/n');
  }

  //获取最后一次执行的消息记录
  get_last_execution(): string | null {
    for (let i = this.records.length - 1; i >= 0; i--) {
      if (this.records[i].record_type === 'execution') {
        return this.records[i].content;
      }
    }
    return null;
  }
}

class ReflectionAgent {
  private llmClient: HelloAgentsLLM;
  private memory: Memory;
  constructor(llmClient: HelloAgentsLLM, memory: Memory) {
    this.llmClient = llmClient;
    this.memory = memory;
  }

  async run(task: string) {
    const initTaskPrompt = this.parseInitialPrompt(task);
    const messages: ChatCompletionMessageParam[] = [
      { role: "user", content: initTaskPrompt }
    ];
    const initialCode = await this.llmClient.think(messages)
    if (!initialCode) {
      return 'llm 返回为null'
    }
    this.memory.add_record('execution', initialCode)
  }

  private parseInitialPrompt(task: string) {
    return INITIAL_PROMPT_TEMPLATE.replace('{task}', task);
  }

  private parseReflectPrompt(task: string, code: string) {
    return REFLECT_PROMPT_TEMPLATE.replace('{task}', task).replace(
      '{code}',
      code,
    );
  }

  private parseRefinePrompt(
    task: string,
    last_code_attempt: string,
    feedback: string,
  ) {
    return REFINE_PROMPT_TEMPLATE.replace(`{task}`, task)
      .replace('{last_code_attempt}', last_code_attempt)
      .replace('{feedback}', feedback);
  }
}
