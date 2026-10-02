// Shared helper: call AI for structured JSON.
// When GEMINI_API_KEY or OPENAI_API_KEY is set: real AI is used.
// If the AI returns valid JSON that passes validation → returned directly.
// If the AI returns invalid/partial JSON → mock fallback (so UI always works).
// If quota exceeded (429) → mock fallback (UI keeps working, real AI resumes when quota resets).
// If auth error (401/403) → error propagates (user needs to fix their key).
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

  // Try real AI first
  try {
    const result = await llm.json<T>(system, user, schemaHint);
    if (result && validate(result)) {
      return result;
    }
    // Real AI returned something but it didn't pass validation.
    // This happens when Gemini wraps JSON differently or truncates.
    // Fall back to mock so the UI still works.
    console.error("[AI] response failed validation, using mock fallback");
  } catch (e) {
    const msg = (e as Error)?.message ?? "";
    // 401/403 = invalid key — user must fix this, propagate the error
    if (hasKey && /error 40[13]|401|403|invalid.*key|unauthorized/i.test(msg)) {
      throw e;
    }
    // 429 (quota/rate limit) or 503 (server overload) — fall back to mock
    // so the UI keeps working. Real AI resumes when quota resets.
    if (/error 4\d\d|error 5\d\d|429|503|quota|UNAVAILABLE|rate.limit/i.test(msg)) {
      console.error("[AI] quota/rate limit hit, using mock fallback temporarily:", msg.slice(0, 100));
    } else {
      console.error("[AI] call failed, using mock fallback:", msg.slice(0, 100));
    }
  }
  // Mock fallback — ensures the UI always shows structured data
  const mock = new MockProvider();
  const fallback = await mock.json<T>(system, user, schemaHint);
  return fallback;
}
