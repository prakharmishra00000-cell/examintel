// ============================================================
// Direct AI Call Helper — ZAI (sandbox) + Gemini (Vercel) + OpenAI (fallback)
// ============================================================
// Provider chain (in order):
//   1. ZAI SDK (z-ai-web-dev-sdk)  — works in sandbox WITHOUT any API key
//   2. Gemini API (gemini-2.5-flash) — when GEMINI_API_KEY_* is set (Vercel production)
//   3. OpenAI-compatible — when OPENAI_API_KEY is set
//   4. Mock provider — last resort, only when everything else fails
//
// KEY OPTIMIZATION for Vercel's 60s function timeout:
//   - Try only ONE model per Gemini key (gemini-2.5-flash, the fastest)
//   - Retry only ONCE on 429/503 (not 3 times)
//   - 8-second AbortController timeout per attempt
//   - Max total: 3 keys × 2 attempts × 8s + 8s OpenAI = 56s (under 60s)
//   - Previous version tried 3 keys × 4 models × 3 retries × 9s = 324s → Vercel timeout
// ============================================================
import ZAI from "z-ai-web-dev-sdk";
import { extractJson } from "./provider";
import { MockProvider } from "./mock-provider";
import { zaiDirectChat } from "./zai-direct";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Primary Gemini model — gemini-2.5-flash is the fastest and most capable.
// Only fall back to other models if the primary returns 404 (model not found).
const GEMINI_PRIMARY = "gemini-2.5-flash";
const GEMINI_FALLBACKS = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-1.5-flash"];

// Max output tokens for JSON responses (structured reports).
// For text responses (chat/summary), use a smaller budget.
const MAX_TOKENS_JSON = 8000;
const MAX_TOKENS_TEXT = 2000;

// Response format hint: "text" for free-form chat, "json_object" for structured.
type ResponseFormat = "text" | "json_object";

// ---------- ZAI SDK (primary on all environments) ----------
// The ZAI SDK works WITHOUT any API key and has NO rate limits.
// We wrap it in a timeout so it doesn't hang if the gateway is unreachable.
const ZAI_TIMEOUT_MS = 50000; // 50s — leaves room for Gemini fallback within Vercel's 60s

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("ZAI timeout")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer!) clearTimeout(timer);
  }
}

async function zaiChat(
  messages: { role: string; content: string }[],
  format: ResponseFormat = "text"
): Promise<string> {
  const mapped = messages.map((m) =>
    m.role === "system"
      ? { role: "assistant" as const, content: m.content }
      : { role: m.role as "user" | "assistant", content: m.content }
  );
  const zai = await withTimeout(ZAI.create(), ZAI_TIMEOUT_MS);
  const maxTokens = format === "json_object" ? MAX_TOKENS_JSON : MAX_TOKENS_TEXT;
  const completion = await withTimeout(
    zai.chat.completions.create({
      messages: mapped as any,
      thinking: { type: "disabled" },
      max_tokens: maxTokens,
      temperature: 0.4,
      response_format: { type: format },
    } as any),
    ZAI_TIMEOUT_MS
  );
  const choice = completion.choices?.[0];
  const content = choice?.message?.content ?? "";
  const finishReason = choice?.finish_reason;

  // For JSON mode: detect truncation and retry with a "be concise" instruction.
  if (format === "json_object") {
    const stripped = content.replace(/```(?:json)?/g, "").trim();
    const looksTruncated =
      finishReason === "length" ||
      (stripped.length > 0 && !stripped.endsWith("}") && !stripped.endsWith("]"));
    if (looksTruncated && messages.length > 0) {
      try {
        const retry = await withTimeout(
          zai.chat.completions.create({
            messages: mapped.map((m, i) =>
              i === mapped.length - 1
                ? {
                    ...m,
                    content:
                      m.content +
                      "\n\nIMPORTANT: Your previous response was truncated. Return ONLY the JSON object. Keep each text field under 20 words. Cap arrays at 4 items. Omit optional fields if needed. The complete JSON MUST end with a closing brace.",
                  }
                : m
            ) as any,
            thinking: { type: "disabled" },
            max_tokens: maxTokens,
            temperature: 0.3,
            response_format: { type: "json_object" },
          } as any),
          ZAI_TIMEOUT_MS
        );
        const retryContent = retry.choices?.[0]?.message?.content ?? "";
        if (retryContent && retryContent.trim()) return retryContent;
      } catch {}
    }
  }

  return content;
}

// ---------- Gemini / OpenAI-compatible direct fetch ----------
async function fetchOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  format: ResponseFormat = "text",
  timeoutMs: number = 25000
): Promise<{ ok: boolean; status: number; body: string }> {
  const controller = new AbortController();
  // 25s timeout — Gemini needs ~16s for simple prompts, complex JSON needs more
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const maxTokens = format === "json_object" ? MAX_TOKENS_JSON : MAX_TOKENS_TEXT;
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        max_tokens: maxTokens,
        ...(format === "json_object" ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  } catch (e: any) {
    return { ok: false, status: 0, body: "" };
  } finally {
    clearTimeout(timeout);
  }
}

// Try multiple Gemini keys in PARALLEL — first one to succeed wins.
// This is much faster than sequential retries (3 keys × 25s = 75s → 25s).
async function geminiParallelChat(
  messages: { role: string; content: string }[],
  format: ResponseFormat
): Promise<string | null> {
  const geminiKeys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_3, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_4]
    .filter((k): k is string => !!k && k.length > 5);

  if (geminiKeys.length === 0) return null;

  const baseUrl = "https://generativelanguage.googleapis.com/v1beta/openai";
  const model = GEMINI_PRIMARY;

  // Launch all key attempts in parallel
  const attempts = geminiKeys.map(async (key) => {
    const r = await fetchOpenAICompatible(baseUrl, key, model, messages, format, 25000);
    if (r.ok) {
      try {
        const data = JSON.parse(r.body);
        const content = data.choices?.[0]?.message?.content;
        if (content && content.trim()) return content;
      } catch {}
    }
    return null;
  });

  // Wait for the first non-null result, or all to complete with null
  return await firstNonNull(attempts);
}

// Resolves as soon as any promise returns a non-null value, or null if all fail.
async function firstNonNull<T>(promises: Promise<T | null>[]): Promise<T | null> {
  return new Promise((resolve) => {
    let remaining = promises.length;
    let done = false;
    if (remaining === 0) { resolve(null); return; }
    promises.forEach((p) => {
      p.then((result) => {
        if (!done && result !== null && result !== undefined) {
          done = true;
          resolve(result);
        }
        remaining--;
        if (!done && remaining === 0) resolve(null);
      }).catch(() => {
        remaining--;
        if (!done && remaining === 0) resolve(null);
      });
    });
  });
}

export async function directChat(
  messages: { role: string; content: string }[],
  format: ResponseFormat = "text"
): Promise<string> {
  // ----- 1) ZAI Direct API call — PRIMARY provider on ALL environments -----
  // The ZAI API (glm-4-plus model) works WITHOUT any API key and has NO rate
  // limits. We call it directly via fetch (bypassing the SDK's file-based config)
  // so it works on both sandbox and Vercel production.
  try {
    const content = await zaiDirectChat(messages, format);
    if (content && content.trim()) return content;
  } catch (e) {
    console.error("[AI] ZAI direct failed:", (e as Error)?.message?.slice(0, 150));
  }

  // ----- 1b) ZAI SDK fallback (sandbox only — reads from /etc/.z-ai-config) -----
  // If the direct call fails (e.g. internal-api.z.ai not reachable), try the SDK
  // which might use a different code path. Only works in sandbox.
  const isVercel = !!process.env.VERCEL || !!process.env.VERCEL_ENV;
  if (!isVercel) {
    try {
      const content = await zaiChat(messages, format);
      if (content && content.trim()) return content;
    } catch (e) {
      console.error("[AI] ZAI SDK failed:", (e as Error)?.message?.slice(0, 120));
    }
  }

  // ----- 2) Gemini API keys (fallback if ZAI fails) — PARALLEL attempts -----
  // Try all 3 keys at once; first one to respond wins. 25s timeout per attempt.
  // This is much faster than sequential retries (was 3 keys × 4 models × 3 retries
  // × 9s = 324s → Vercel timeout). Now: 25s max for all keys in parallel.
  const geminiResult = await geminiParallelChat(messages, format);
  if (geminiResult) return geminiResult;

  // ----- 3) OpenAI / OpenRouter -----
  if (process.env.OPENAI_API_KEY) {
    const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const r = await fetchOpenAICompatible(baseUrl, process.env.OPENAI_API_KEY, model, messages, format, 20000);
    if (r.ok) {
      try {
        const data = JSON.parse(r.body);
        const content = data.choices?.[0]?.message?.content;
        if (content && content.trim()) return content;
      } catch {}
    }
  }

  // ----- 4) Final fallback: explicit demo marker so directJson knows to use mock -----
  return "**Demo mode.** All AI providers failed (no API key configured, network error, or quota exhausted).";
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
    const raw = await directChat(
      [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      "json_object"
    );
    if (raw && !raw.startsWith("**Demo")) {
      const result = extractJson<T>(raw);
      if (result && validate(result)) return result;
      console.error("[AI] AI response failed schema validation. Raw preview:", raw.slice(0, 200));
    }
  } catch (e) {
    console.error("[AI] directJson threw:", (e as Error)?.message?.slice(0, 200));
  }
  // Last-resort fallback — keeps UI working when AI is unreachable.
  const mock = new MockProvider();
  return mock.json<T>(system, user, schemaHint);
}
