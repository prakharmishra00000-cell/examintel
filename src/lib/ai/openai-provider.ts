// ============================================================
// OpenAI-compatible Provider — for Vercel deployment
// ============================================================
// Works with OpenAI, OpenRouter, Together, Groq, etc.
// Set these env vars on Vercel:
//   OPENAI_API_KEY     (required)
//   OPENAI_BASE_URL    (optional, e.g. https://openrouter.ai/api/v1)
//   OPENAI_MODEL       (optional, default gpt-4o-mini)
// ============================================================
import type { LLMProvider, ChatCompletionMessage } from "./provider";
import { extractJson } from "./provider";

export class OpenAIProvider implements LLMProvider {
  name = "openai-compatible";
  available = true;

  private get key() {
    return process.env.OPENAI_API_KEY ?? "";
  }
  private get baseUrl() {
    return process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  }
  private get model() {
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
        max_tokens: 4000,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${t.slice(0, 300)}`);
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
