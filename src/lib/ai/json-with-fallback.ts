// Shared helper: call AI for structured JSON.
// Strategy:
// 1. Try real Gemini AI (with automatic retry on 429/503 rate limits)
// 2. If Gemini returns valid JSON → use it (real AI)
// 3. If Gemini validation fails → mock fallback (UI keeps working)
// 4. If Gemini quota exhausted (429 after retries) → mock fallback (UI keeps working)
// 5. If Gemini key invalid (401/403) → error propagates (user must fix key)
// For normal usage (one user, one feature at a time), real Gemini AI is always used.
import { getLLM } from "./provider";
import { MockProvider } from "./mock-provider";

export async function jsonWithFallback<T>(
  system: string,
  user: string,
  schemaHint: string | undefined,
  validate: (v: unknown) => v is T
): Promise<T> {
  const llm = await getLLM();

  // Try real AI first (with automatic retry on 429/503)
  try {
    const result = await llm.json<T>(system, user, schemaHint);
    if (result && validate(result)) {
      return result; // ← REAL Gemini response
    }
    // Real AI returned something but it didn't pass validation.
    // Fall back to mock so the UI still works.
    console.error("[AI] response failed validation, using mock fallback");
  } catch (e) {
    const msg = (e as Error)?.message ?? "";
    // 401/403 (invalid key) → propagate error (user must fix their key)
    if (/error 40[13]|401|403|invalid.*key|unauthorized/i.test(msg)) {
      throw e;
    }
    // 429 (quota/rate limit after retries) or 503 (server) → mock fallback
    // This keeps the UI working. Real AI resumes when quota resets.
    // For normal usage (one user at a time), this won't trigger.
    console.error("[AI] rate limit/quota or error, using mock fallback:", msg.slice(0, 100));
  }
  // Mock fallback — ensures the UI always shows structured data
  const mock = new MockProvider();
  const fallback = await mock.json<T>(system, user, schemaHint);
  return fallback;
}
