// Internal shared types for AI provider
export interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
