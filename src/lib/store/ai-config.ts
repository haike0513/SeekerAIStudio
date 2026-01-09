import { createStore } from "solid-js/store";
import { makePersisted } from "@solid-primitives/storage";

export interface AIProviderConfig {
  id: string;
  name: string;
  type: "openai" | "ollama" | "anthropic";
  baseUrl?: string;
  apiKey?: string;
  enabled: boolean;
  models: string[]; // List of available models
}

export interface AIConfigState {
  providers: AIProviderConfig[];
  defaultProviderId: string;
  defaultModel: string;
}

// Initial default state
const initialState: AIConfigState = {
  providers: [
    {
      id: "openai",
      name: "OpenAI",
      type: "openai",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "",
      enabled: true,
      models: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
    },
    {
      id: "ollama",
      name: "Ollama (Local)",
      type: "ollama",
      baseUrl: "http://localhost:11434/api",
      enabled: false,
      models: ["llama3", "mistral"],
    },
    {
      id: "deepseek",
      name: "DeepSeek",
      type: "openai", // Compatible
      baseUrl: "https://api.deepseek.com",
      apiKey: "",
      enabled: false,
      models: ["deepseek-chat", "deepseek-coder"],
    },
  ],
  defaultProviderId: "openai",
  defaultModel: "gpt-4o",
};

// Create a persisted store
const [aiConfig, setAiConfig] = makePersisted(
  createStore<AIConfigState>(initialState),
  { name: "seeker_ai_config" }
);

export { aiConfig, setAiConfig };

// Helper to get current active provider
export const getActiveProvider = () => {
  return aiConfig.providers.find((p) => p.id === aiConfig.defaultProviderId);
};
