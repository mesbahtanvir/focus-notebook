/* istanbul ignore file */
export default class OpenAI {
  apiKey?: string;
  chat: { completions: { create: jest.Mock } };

  constructor(config?: { apiKey?: string }) {
    this.apiKey = config?.apiKey;
    this.chat = { completions: { create: jest.fn() } };
  }
}
