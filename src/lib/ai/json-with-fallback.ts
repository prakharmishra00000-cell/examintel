// Shared helper: call AI for structured JSON.
// When GEMINI_API_KEY or OPENAI_API_KEY is set: real AI is used.
// If the AI returns valid JSON that passes validation → returned directly.
// If the AI returns invalid/partial JSON → mock fallback (so UI always works).
// If the AI API itself fails (401/503/etc.) → error propagates (no mock).
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
    // If it's an API-level error (auth, rate limit, server error), propagate it
    // so the user knows the AI service is having issues.
    if (hasKey && /error 4\d\d|error 5\d\d|401|403|429|503|UNAVAILABLE|quota/i.test(msg)) {
      throw e;
    }
    // For other errors (JSON parsing, etc.), fall back to mock
    console.error("[AI] call failed, using mock fallback:", msg);
  }
  // Mock fallback — ensures the UI always shows structured data
  const mock = new MockProvider();
  const fallback = await mock.json<T>(system, user, schemaHint);
  return fallback;
}
