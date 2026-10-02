// ============================================================
// LLM Provider — Gemini (multi-key rotation) + OpenAI-compatible
// ============================================================
// Set these env vars on Vercel:
//   GEMINI_API_KEY      (primary — from account 1)
//   GEMINI_API_KEY_2    (secondary — from account 2, auto-failover)
//   OPENAI_API_KEY      (optional alternative)
//   OPENAI_BASE_URL     (optional override)
//   OPENAI_MODEL        (optional override, default gemini-3.8-flash)
//
// When ANY key is set, real AI is used. If key 1 hits 429 (quota),
// automatically switches to key 2. Both keys share the load.
// ============================================================
import type { LLMProvider, ChatCompletionMessage } from "./provider";
import { extractJson } from "./provider";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class OpenAIProvider implements LLMProvider {
  name = "gemini";
  available = true;

  // Collect all available keys (key rotation pool)
  private get keys(): string[] {
    const ks: string[] = [];
    if (process.env.GEMINI_API_KEY) ks.push(process.env.GEMINI_API_KEY);
    if (process.env.GEMINI_API_KEY_2) ks.push(process.env.GEMINI_API_KEY_2);
    if (process.env.GEMINI_API_KEY_3) ks.push(process.env.GEMINI_API_KEY_3);
    if (process.env.OPENAI_API_KEY) ks.push(process.env.OPENAI_API_KEY);
    return ks.filter(Boolean);
  }

  private get isGemini(): boolean {
    return !!(process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_3);
  }

  private get baseUrl(): string {
    if (this.isGemini) {
      return process.env.OPENAI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai";
    }
    return process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  }

  private get model(): string {
    if (this.isGemini) {
      return process.env.OPENAI_MODEL ?? "gemini-3.8-flash";
    }
    return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  }

  // Track which keys are exhausted (429) to skip them
  private exhaustedKeys = new Set<number>();

  private async callWithKey(key: string, keyIndex: number, messages: ChatCompletionMessage[], retryCount = 0): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.4,
        max_tokens: 8000,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content ?? "";
      if (content) return content;
      throw new Error("AI returned an empty response.");
    }

    const t = await res.text();

    // 429 (quota exceeded) on THIS key → mark it exhausted, throw special error
    if (res.status === 429) {
      this.exhaustedKeys.add(keyIndex);
      const err = new Error(`__KEY_EXHAUSTED__${keyIndex}`) as any;
      err.statusCode = 429;
      throw err;
    }

    // 503 (server overload) → retry with backoff
    if (res.status === 503 && retryCount < 2) {
      await sleep(Math.pow(2, retryCount) * 1000);
      return this.callWithKey(key, keyIndex, messages, retryCount + 1);
    }

    // 401/403 → auth error
    if (res.status === 401 || res.status === 403) {
      throw new Error(`AI API key error ${res.status}: ${t.slice(0, 200)}. Check your API keys on Vercel.`);
    }

    throw new Error(`AI API error ${res.status}: ${t.slice(0, 200)}`);
  }

  private async call(messages: ChatCompletionMessage[]): Promise<string> {
    const allKeys = this.keys;
    if (allKeys.length === 0) {
      throw new Error("No API key configured. Set GEMINI_API_KEY on Vercel.");
    }

    // Clear exhausted keys on every new request — quotas may have reset
    this.exhaustedKeys.clear();

    let lastError: Error | null = null;

    // Try each key in order
    for (let i = 0; i < allKeys.length; i++) {
      // Skip keys that fail during THIS request (429 on this call)
      if (this.exhaustedKeys.has(i)) continue;

      try {
        return await this.callWithKey(allKeys[i], i, messages);
      } catch (e: any) {
        const msg = e?.message ?? "";

        // If this key is exhausted (429), try the next key
        if (msg.includes("__KEY_EXHAUSTED__")) {
          console.error(`[AI] Key ${i + 1} exhausted (429), trying next key...`);
          lastError = e;
          continue; // try next key
        }

        // 401/403 or other errors → try next key if available, otherwise throw
        if (allKeys.length > 1 && i < allKeys.length - 1) {
          console.error(`[AI] Key ${i + 1} failed: ${msg.slice(0, 80)}, trying next key...`);
          lastError = e;
          continue;
        }

        // Last key, real error → throw
        throw e;
      }
    }

    // All keys exhausted → clear the exhausted set so they can be retried later
    // (quota might reset, and the next request should try again)
    this.exhaustedKeys.clear();

    throw lastError ?? new Error("All API keys exhausted. Please wait for quota to reset or add more keys.");
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
