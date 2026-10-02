// Shared helper: call AI for structured JSON.
// When OPENAI_API_KEY is set (production/Vercel): errors propagate — real AI only.
// When no key (local/sandbox): falls back to mock canned data so UI is explorable.
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

  try {
    const result = await llm.json<T>(system, user, schemaHint);
    if (result && validate(result)) {
      return result;
    }
    if (hasKey) {
      // Real key is set but validation failed — throw so the user sees the real error
      throw new Error("AI response did not match the expected schema. Please try again.");
    }
    console.error("[AI] primary response failed validation, falling back to mock");
  } catch (e) {
    if (hasKey) throw e;
    console.error("[AI] primary call failed, falling back to mock:", (e as Error)?.message);
  }
  // Only reach here in sandbox/no-key mode
  const mock = new MockProvider();
  const fallback = await mock.json<T>(system, user, schemaHint);
  return fallback;
}
