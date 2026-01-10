import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export const geminiProvider = createGoogleGenerativeAI({
  name: 'gemini',
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || "sk-9403b688ef9a41eea03dd3f293431ca0",
  // baseURL: 'http://localhost:1234/v1',
  baseURL: 'http://127.0.0.1:8045/v1beta',

});


export const geminiOpenAIProvider = createOpenAICompatible({
  name: 'gemini',
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || "sk-9403b688ef9a41eea03dd3f293431ca0",
  // baseURL: 'http://localhost:1234/v1',
  baseURL: 'http://127.0.0.1:8045/v1',

});