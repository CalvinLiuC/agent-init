import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import 'dotenv/config';

/**
 * 为本书 "Hello Agents" 定制的LLM客户端。
 * 它用于调用任何兼容OpenAI接口的服务，并默认使用流式响应。
 */
export class HelloAgentsLLM {
  private model: string;
  private client: OpenAI;

  /**
   * 初始化客户端。优先使用传入参数，如果未提供，则从环境变量加载。
   */
  constructor(
    options: {
      model?: string;
      apiKey?: string;
      baseUrl?: string;
      timeout?: number;
    } = {},
  ) {
    const model = options.model ?? process.env.LLM_MODEL_ID;
    const apiKey = options.apiKey ?? process.env.LLM_API_KEY;
    const baseUrl = options.baseUrl ?? process.env.LLM_BASE_URL;
    const timeout = options.timeout ?? parseInt(process.env.LLM_TIMEOUT ?? '60', 10);

    if (!model || !apiKey || !baseUrl) {
      throw new Error('模型ID、API密钥和服务地址必须被提供或在.env文件中定义。');
    }

    this.model = model;
    // OpenAI Node SDK 的 timeout 单位为毫秒
    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
      timeout: timeout * 1000,
    });
  }

  /**
   * 调用大语言模型进行思考，并返回其响应。
   */
  async think(messages: ChatCompletionMessageParam[], temperature = 0): Promise<string | null> {
    // console.log(`🧠 正在调用 ${this.model} 模型...`);
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature,
        stream: true,
      });

      // 处理流式响应
      console.log('✅ 大语言模型响应成功:');
      const collectedContent: string[] = [];
      for await (const chunk of response) {
        if (!chunk.choices || chunk.choices.length === 0) {
          continue;
        }
        const content = chunk.choices[0].delta?.content ?? '';
        process.stdout.write(content);
        collectedContent.push(content);
      }
      process.stdout.write('\n'); // 在流式输出结束后换行
      return collectedContent.join('');
    } catch (e) {
      console.log(`❌ 调用LLM API时发生错误: ${e}`);
      return null;
    }
  }
}

// --- 客户端使用示例 ---
export async function main() {
  try {
    const llmClient = new HelloAgentsLLM();

    const exampleMessages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant that writes Python code.',
      },
      { role: 'user', content: '写一个快速排序算法' },
    ];

    console.log('--- 调用LLM ---');
    const responseText = await llmClient.think(exampleMessages);
    if (responseText) {
      console.log('\n\n--- 完整模型响应 ---');
      console.log(responseText);
    }
  } catch (e) {
    if (e instanceof Error) {
      console.log(e.message);
    }
  }
}
