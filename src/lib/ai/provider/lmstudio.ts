import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export const lmstudio = createOpenAICompatible({
  name: 'lmstudio',
  // baseURL: 'http://localhost:1234/v1',
  baseURL: 'http://192.168.31.12:1234/v1',

});