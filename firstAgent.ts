import Anthropic from '@anthropic-ai/sdk';
// type ROLE = 'user' | 'client'

class HelloAgent {
  _client!: Anthropic;
  constructor() {
    this._init();
  }
  _init() {
    this._client = new Anthropic({
      apiKey: process.env['DEEPSEEK_API_KEY'],
      baseURL: 'https://api.deepseek.com/anthropic',
    });
  }
  async think(msgList: Anthropic.Messages.MessageParam[], temperatrure = 0) {
    const streamParams: Anthropic.MessageCreateParams = {
      max_tokens: 1024,
      messages: msgList,
      model: 'deepseek-v4-flash',
      stream: true,
    };
    console.info('调用大语言模型进行思考，并返回其响应。');
    try {
      const result = await this._client.messages.create(streamParams);
      console.info('大模型响应成功');
      // for await (const chunk of result) {

      // }
      console.info(result);
    } catch (e) {
      console.info('❌ 调用LLM API时发生错误', e);
    }
  }
}
// const client = new Anthropic({
//     apiKey: process.env["DEEPSEEK_API_KEY"],
//     baseURL: "https://api.deepseek.com/anthropic"
// })

// //普通消息
// const params: Anthropic.MessageCreateParams = {
//     max_tokens: 1024,
//     messages: [{ role: "user", content: "Hello, Claude" }],
//     model: "deepseek-v4-flash",
// }
// // const message = await client.messages.create(params);
// //流式消息
// const streamParams: Anthropic.MessageCreateParams = {
//     max_tokens: 1024,
//     messages: [{ role: "user", content: "Hello, Claude" }],
//     model: "deepseek-v4-flash",
//     stream: true
// }
// // const streamMessage = await client.messages.create(streamParams);

// // for await (const msgEvent of streamMessage) {
// //     console.info(msgEvent.type)
// // }

// // streamHelper

// let textOutput = ''
// const streamHelperMessage = client.messages.stream(params).on('text', (text) => {
//     textOutput += text
//     console.info(textOutput)
// })
// const finalMsg = await streamHelperMessage.finalMessage();

// console.info("finalMsg", finalMsg)
type ROLE = 'assistant' | 'user';
const exampleMessages: any = [
  { role: 'assistant', content: 'You are a helpful assistant that writes Python code.' },
  { role: 'user', content: '写一个快速排序算法' },
];
const helloAgent = new HelloAgent();
helloAgent.think(exampleMessages);
