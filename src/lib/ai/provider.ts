// ============================================================
// AI Provider Abstraction Layer
// ============================================================
// In the sandbox: uses z-ai-web-dev-sdk (ZAI) — works with no API key.
// On Vercel: uses OpenAI-compatible API when OPENAI_API_KEY is set,
//            or falls back to a structured-mock provider when no key is present
//            so the UI is still explorable.
//
// To make AI fully functional on Vercel, set ONE of these env vars:
//   OPENAI_API_KEY   -> uses OpenAI (gpt-4o-mini). Recommended.
//   (fallback)       -> structured mock provider (UI works, AI is canned).
// ============================================================

import type { ChatCompletionMessage } from "./types-internal";

export interface LLMProvider {
  name: string;
  available: boolean;
  /** Single-shot structured JSON completion. Returns parsed JSON. */
  json<T>(system: string, user: string, schemaHint?: string): Promise<T>;
  /** Free-text completion. */
  text(system: string, user: string): Promise<string>;
  /** Multi-turn chat. */
  chat(messages: ChatCompletionMessage[]): Promise<string>;
}

export interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ---------- helpers ----------
function repairTruncatedJson(s: string): string {
  // If JSON.parse fails, the AI response may have been truncated mid-generation.
  // Attempt to close any unbalanced braces/brackets + truncate trailing partial tokens.
  let out = s;
  // Strip trailing comma (common truncation artifact)
  out = out.replace(/,\s*$/, "");
  // Count unbalanced delimiters (respecting strings)
  let inStr = false;
  let esc = false;
  const stack: string[] = [];
  for (const ch of out) {
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{" || ch === "[") stack.push(ch);
    if (ch === "}" || ch === "]") stack.pop();
  }
  // If we ended inside a string, close it
  if (inStr) out += '"';
  // Close any unclosed structures in reverse order
  while (stack.length) {
    const open = stack.pop();
    out += open === "{" ? "}" : "]";
  }
  return out;
}

export function extractJson<T>(raw: string): T {
  if (!raw) throw new Error("Empty AI response");
  // strip code fences
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  // also handle the case where there's an opening fence but no closing (truncated)
  const openFence = s.match(/```(?:json)?\s*([\s\S]*)$/i);
  if (openFence) s = openFence[1].trim();
  // find first { and last }
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1);
  } else if (first !== -1) {
    // no closing brace — truncated; slice from first { to end
    s = s.slice(first);
  }
  // also handle arrays
  const firstArr = s.indexOf("[");
  const lastArr = s.lastIndexOf("]");
  if (first === -1 && firstArr !== -1) {
    s = lastArr !== -1 && lastArr > firstArr ? s.slice(firstArr, lastArr + 1) : s.slice(firstArr);
  }
  try {
    return JSON.parse(s) as T;
  } catch {
    // attempt to repair truncated JSON
    try {
      const repaired = repairTruncatedJson(s);
      return JSON.parse(repaired) as T;
    } catch {
      // last resort: evaluate as JS object (untrusted-input-adjacent)
      try {
        const fn = new Function("return (" + s + ")") as () => unknown;
        return fn() as T;
      } catch {
        throw new Error("AI returned invalid JSON (len=" + s.length + "): " + s.slice(0, 200));
      }
    }
  }
}

// Provider that tries the real provider and falls back to Mock on failure.
// When GEMINI_API_KEY or OPENAI_API_KEY is set:
//   - The real provider (Gemini/OpenAI) is used with automatic retry on 429/503
//   - 401/403 (invalid key) → error propagates (user must fix key)
//   - Validation failures → mock fallback (keeps UI working)
//   - Other errors → mock fallback
class FallbackProvider implements LLMProvider {
  constructor(private primary: LLMProvider, private fallback: LLMProvider) {}
  private get hasKey() {
    return !!(process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_3 || process.env.OPENAI_API_KEY);
  }
  // When key is set: fall back for rate limits and validation errors, NOT for auth errors
  private shouldFallbackOnError(e: unknown): boolean {
    const msg = (e as Error)?.message ?? "";
    // 401/403 = invalid key → NEVER fall back, user must fix
    if (/error 40[13]|401|403|invalid.*key|unauthorized/i.test(msg)) return false;
    // Everything else (429, 503, JSON parse, validation) → fall back to mock
    // so the UI never breaks. Real AI resumes when the issue resolves.
    return true;
  }
  get name() {
    return this.primary.available ? this.primary.name : this.fallback.name;
  }
  get available() {
    return this.primary.available || this.fallback.available;
  }
  async json<T>(system: string, user: string, schemaHint?: string): Promise<T> {
    try {
      if (this.primary.available) {
        return await this.primary.json<T>(system, user, schemaHint);
      }
    } catch (e) {
      if (!this.shouldFallbackOnError(e)) throw e;
      console.error("[AI] primary provider failed, falling back to mock:", (e as Error)?.message?.slice(0, 100));
    }
    return this.fallback.json<T>(system, user, schemaHint);
  }
  async text(system: string, user: string): Promise<string> {
    try {
      if (this.primary.available) return await this.primary.text(system, user);
    } catch (e) {
      if (!this.shouldFallbackOnError(e)) throw e;
      console.error("[AI] primary provider failed, falling back to mock:", (e as Error)?.message?.slice(0, 100));
    }
    return this.fallback.text(system, user);
  }
  async chat(messages: ChatCompletionMessage[]): Promise<string> {
    try {
      if (this.primary.available) return await this.primary.chat(messages);
    } catch (e) {
      if (!this.shouldFallbackOnError(e)) throw e;
      console.error("[AI] primary chat failed, falling back to mock:", (e as Error)?.message?.slice(0, 100));
    }
    return this.fallback.chat(messages);
  }
}

let _cached: LLMProvider | null = null;

export async function getLLM(): Promise<LLMProvider> {
  if (_cached) return _cached;
  const { MockProvider } = await import("./mock-provider");
  const mock = new MockProvider();
  const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_3);
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasRealKey = hasGemini || hasOpenAI;
  // SKIP_ZAI=1 forces mock mode (useful for QA / cron runs where the sandbox
  // z-ai SDK's large JSON responses cause OOM crashes).
  const skipZai = process.env.SKIP_ZAI === "1" || process.env.USE_MOCK_AI === "1";
  let primary: LLMProvider;
  if (hasRealKey) {
    // Gemini or OpenAI — real AI, no mock
    const mod = await import("./openai-provider");
    primary = new mod.OpenAIProvider();
  } else if (skipZai) {
    // Explicitly requested mock mode — stable for automated QA.
    primary = mock;
  } else {
    // sandbox / no-key fallback: z-ai-web-dev-sdk if available, else mock
    try {
      const mod = await import("./zai-provider");
      primary = new mod.ZAIProvider();
    } catch {
      primary = mock;
    }
  }
  // On Vercel without any API key, the z-ai-web-dev-sdk won't function — go straight to mock.
  if (!hasRealKey && process.env.VERCEL) {
    primary = mock;
  }
  _cached = new FallbackProvider(primary, mock);
  return _cached;
}

export { ZAIProvider } from "./zai-provider";
export { OpenAIProvider } from "./openai-provider";
export { MockProvider } from "./mock-provider";
