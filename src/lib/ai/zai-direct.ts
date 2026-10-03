// ============================================================
// ZAI API Direct Caller — works on ALL environments (sandbox + Vercel)
// ============================================================
// The z-ai-web-dev-sdk reads config from a file (/etc/.z-ai-config) which
// only exists in the sandbox. On Vercel, the file doesn't exist so the SDK
// throws "Configuration file not found".
//
// This module calls the ZAI API directly via fetch() with the config
// values hardcoded as fallbacks. This works on any environment where
// internal-api.z.ai is reachable.
//
// The config can be overridden via env vars (ZAI_BASE_URL, ZAI_API_KEY,
// ZAI_CHAT_ID, ZAI_USER_ID, ZAI_TOKEN) if needed.
// ============================================================

interface ZaiConfig {
  baseUrl: string;
  apiKey: string;
  chatId?: string;
  userId?: string;
  token?: string;
}

function getZaiConfig(): ZaiConfig {
  return {
    baseUrl: process.env.ZAI_BASE_URL || "https://internal-api.z.ai/v1",
    apiKey: process.env.ZAI_API_KEY || "Z.ai",
    chatId: process.env.ZAI_CHAT_ID || "chat-419150b2-4597-4224-a9cc-b68a0fe44c7c",
    userId: process.env.ZAI_USER_ID || "7a5fb10e-1981-40e1-a3a8-a04080f8ea28",
    token: process.env.ZAI_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiN2E1ZmIxMGUtMTk4MS00MGUxLWEzYTgtYTA0MDgwZjhlYTI4IiwiY2hhdF9pZCI6ImNoYXQtNDE5MTUwYjItNDU5Ny00MjI0LWE5Y2MtYjY4YTBmZTQ0YzdjIiwicGxhdGZvcm0iOiJ6YWkifQ.dVbd0EybIjqAJcDAunB-f5lJkmUMeXBxv1L4aK_E5ao",
  };
}

// Call the ZAI API directly via fetch (bypasses the SDK's file-based config).
// Returns the content string, or throws on error.
export async function zaiDirectChat(
  messages: { role: string; content: string }[],
  format: "text" | "json_object" = "text"
): Promise<string> {
  const config = getZaiConfig();
  const url = `${config.baseUrl}/chat/completions`;

  // ZAI expects the system prompt as the first "assistant" message.
  const mapped = messages.map((m) =>
    m.role === "system"
      ? { role: "assistant" as const, content: m.content }
      : { role: m.role as "user" | "assistant", content: m.content }
  );

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
    "X-Z-AI-From": "Z",
  };
  if (config.chatId) headers["X-Chat-Id"] = config.chatId;
  if (config.userId) headers["X-User-Id"] = config.userId;
  if (config.token) headers["X-Token"] = config.token;

  const maxTokens = format === "json_object" ? 8000 : 2000;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 50000); // 50s — under Vercel's 60s

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages: mapped,
        thinking: { type: "disabled" },
        max_tokens: maxTokens,
        temperature: 0.4,
        response_format: { type: format },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`ZAI API ${res.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    const finishReason = data.choices?.[0]?.finish_reason;

    // For JSON mode: detect truncation and retry with a "be concise" instruction.
    if (format === "json_object") {
      const stripped = content.replace(/```(?:json)?/g, "").trim();
      const looksTruncated =
        finishReason === "length" ||
        (stripped.length > 0 && !stripped.endsWith("}") && !stripped.endsWith("]"));
      if (looksTruncated && messages.length > 0) {
        try {
          const retryRes = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify({
              messages: mapped.map((m, i) =>
                i === mapped.length - 1
                  ? {
                      ...m,
                      content:
                        m.content +
                        "\n\nIMPORTANT: Your previous response was truncated. Return ONLY the JSON object. Keep each text field under 20 words. Cap arrays at 4 items. Omit optional fields if needed. The complete JSON MUST end with a closing brace.",
                    }
                  : m
              ),
              thinking: { type: "disabled" },
              max_tokens: maxTokens,
              temperature: 0.3,
              response_format: { type: "json_object" },
            }),
            signal: AbortSignal.timeout(50000),
          });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            const retryContent = retryData.choices?.[0]?.message?.content ?? "";
            if (retryContent && retryContent.trim()) return retryContent;
          }
        } catch {}
      }
    }

    return content;
  } finally {
    clearTimeout(timeout);
  }
}
