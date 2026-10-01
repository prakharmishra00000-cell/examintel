// Shared helper: call AI for structured JSON, fall back to mock canned data
// when the primary provider fails OR returns invalid/partial data.
// This guarantees the UI is always explorable (sandbox truncation, no API key, etc.).
// On Vercel with OPENAI_API_KEY set, real AI is used (OpenAI doesn't truncate).
import { getLLM } from "./provider";
import { MockProvider } from "./mock-provider";

export async function jsonWithFallback<T>(
  system: string,
  user: string,
  schemaHint: string | undefined,
  validate: (v: unknown) => v is T
): Promise<T> {
  const llm = await getLLM();
  try {
    const result = await llm.json<T>(system, user, schemaHint);
    if (result && validate(result)) {
      return result;
    }
    console.error("[AI] primary response failed validation, falling back to mock");
  } catch (e) {
    console.error("[AI] primary call failed, falling back to mock:", (e as Error)?.message);
  }
  const mock = new MockProvider();
  const fallback = await mock.json<T>(system, user, schemaHint);
  return fallback;
}
