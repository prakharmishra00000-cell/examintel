// ============================================================
// LLM Provider — Gemini (default) + OpenAI-compatible
// ============================================================
// Set ONE of these env vars on Vercel:
//
//   GEMINI_API_KEY   ← recommended (Google AI Studio)
//     Get it from: https://aistudio.google.com/apikey
//     Default model: gemini-2.0-flash
//     Default endpoint: https://generativelanguage.googleapis.com/v1beta/openai
//
//   OPENAI_API_KEY   ← optional (if you prefer OpenAI)
//     Default model: gpt-4o-mini
//     Default endpoint: https://api.openai.com/v1
//
//   OPENAI_BASE_URL  ← optional (for OpenRouter/Groq/Together etc.)
//   OPENAI_MODEL     ← optional (override default model)
//
// When EITHER key is set, ALL AI features use real AI (no mock data).
// Users visiting the live URL get real AI — no setup needed on their end.
// ============================================================
import type { LLMProvider, ChatCompletionMessage } from "./provider";
import { extractJson } from "./provider";

export class OpenAIProvider implements LLMProvider {
  name = "gemini";
  available = true;

  private get geminiKey() {
    return process.env.GEMINI_API_KEY ?? "";
  }
  private get openaiKey() {
    return process.env.OPENAI_API_KEY ?? "";
  }
  private get key() {
    return this.geminiKey || this.openaiKey;
  }
  private get baseUrl() {
    if (this.geminiKey) {
      return process.env.OPENAI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai";
    }
    return process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  }
  private get model() {
    if (this.geminiKey) {
      return process.env.OPENAI_MODEL ?? "gemini-2.0-flash";
    }
    return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  }

  private async call(messages: ChatCompletionMessage[]): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.key}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.4,
        max_tokens: 8000,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`AI API error ${res.status}: ${t.slice(0, 300)}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }

  async text(system: string, user: string): Promise<string> {
    return this.call([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
  }

  async json<T>(system: string, user: string, schemaHint?: string): Promise<T> {
    const sys =
      system +
      (schemaHint
        ? `\n\nRespond with ONLY valid JSON (no markdown, no code fences) matching this shape:\n${schemaHint}`
        : "\n\nRespond with ONLY valid JSON. No markdown, no code fences, no commentary.");
    const raw = await this.text(sys, user);
    return extractJson<T>(raw);
  }

  async chat(messages: ChatCompletionMessage[]): Promise<string> {
    return this.call(messages);
  }
}
