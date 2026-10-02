// Shared helper: call AI for structured JSON.
// When GEMINI_API_KEY or OPENAI_API_KEY is set: real AI is used with auto-retry.
// - 429/503 → provider retries automatically (exponential backoff), then propagates error
// - 401/403 → error propagates (user must fix key)
// - JSON validation failure → mock fallback (keeps UI working for edge cases)
// When no key: mock data is used (sandbox/demo mode)
import { getLLM } from "./provider";
import { MockProvider } from "./mock-provider";

export async function jsonWithFallback<T>(
  system: string,
  user: string,
  schemaHint: string | undefined,
  validate: (v: unknown) => v is T
): Promise<T> {
  const llm = await getLLM();
  const hasKey = !!process.env.GEMINI_API_KEY || !!process.env.OPENAI_API_KEY;

  // Try real AI first (with automatic retry on 429/503)
  try {
    const result = await llm.json<T>(system, user, schemaHint);
    if (result && validate(result)) {
      return result;
    }
    // Real AI returned something but it didn't pass validation.
    // Fall back to mock so the UI still works.
    console.error("[AI] response failed validation, using mock fallback");
  } catch (e) {
    const msg = (e as Error)?.message ?? "";
    // 401/403 (invalid key) or 429/503 (rate limit after retries) → propagate error
    if (hasKey && /error 40[13]|401|403|invalid.*key|unauthorized|error 429|429|quota|error 503|503|UNAVAILABLE|rate.limit/i.test(msg)) {
      throw e;
    }
    // Other errors (JSON parse, etc.) → fall back to mock
    console.error("[AI] call failed, using mock fallback:", msg.slice(0, 100));
  }
  // Mock fallback — ensures the UI always shows structured data (sandbox/no-key mode)
  const mock = new MockProvider();
  const fallback = await mock.json<T>(system, user, schemaHint);
  return fallback;
}
