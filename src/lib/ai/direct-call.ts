// ============================================================
// Direct AI Call Helper — Gemini (free) + OpenRouter (fallback)
// ============================================================
import { extractJson } from "./provider";
import { MockProvider } from "./mock-provider";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function directChat(
  messages: { role: string; content: string }[]
): Promise<string> {
  const providers: { key: string; baseUrl: string; model: string; name: string }[] = [];

  // Key 1 first (confirmed working), then key 3, then key 2, then OpenRouter
  for (const envVar of ["GEMINI_API_KEY", "GEMINI_API_KEY_3", "GEMINI_API_KEY_2"]) {
    const k = process.env[envVar];
    if (k) providers.push({
      key: k,
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      model: "gemini-3.8-flash",
      name: envVar,
    });
  }

  if (process.env.OPENAI_API_KEY) {
    providers.push({
      key: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      model: process.env.OPENAI_MODEL || "deepseek/deepseek-chat",
      name: "OPENAI",
    });
  }

  if (providers.length === 0) return "**Demo mode.** Set GEMINI_API_KEY on Vercel.";

  for (const p of providers) {
    for (let retry = 0; retry < 2; retry++) {
      try {
        const res = await fetch(`${p.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
          body: JSON.stringify({ model: p.model, messages, temperature: 0.4, max_tokens: 2000 }),
        });

        const text = await res.text();

        if (res.ok) {
          try {
            const data = JSON.parse(text);
            const content = data.choices?.[0]?.message?.content;
            if (content && content.trim()) return content;
          } catch {}
          return "";
        }

        // 503 = high demand, retry once after 500ms
        if (res.status === 503 && retry < 1) {
          await sleep(500);
          continue;
        }

        break; // Any other error → next provider
      } catch {
        break; // Network error → next provider
      }
    }
  }

  return "**Demo mode.** All AI providers failed.";
}

export async function directJson<T>(
  system: string,
  user: string,
  schemaHint: string | undefined,
  validate: (v: unknown) => v is T
): Promise<T> {
  try {
    const sys =
      system +
      (schemaHint
        ? `\n\nRespond with ONLY valid JSON (no markdown, no code fences) matching this shape:\n${schemaHint}`
        : "\n\nRespond with ONLY valid JSON. No markdown, no code fences, no commentary.");
    const raw = await directChat([
      { role: "system", content: sys },
      { role: "user", content: user },
    ]);
    if (raw && !raw.startsWith("**Demo")) {
      const result = extractJson<T>(raw);
      if (result && validate(result)) return result;
    }
  } catch {}
  const mock = new MockProvider();
  return mock.json<T>(system, user, schemaHint);
}
