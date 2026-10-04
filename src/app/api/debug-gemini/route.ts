import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const keys: { name: string; key: string }[] = [];
  if (process.env.GEMINI_API_KEY) keys.push({ name: "GEMINI_API_KEY", key: process.env.GEMINI_API_KEY });
  if (process.env.GEMINI_API_KEY_3) keys.push({ name: "GEMINI_API_KEY_3", key: process.env.GEMINI_API_KEY_3 });
  if (process.env.GEMINI_API_KEY_2) keys.push({ name: "GEMINI_API_KEY_2", key: process.env.GEMINI_API_KEY_2 });
  if (process.env.GEMINI_API_KEY_4) keys.push({ name: "GEMINI_API_KEY_4", key: process.env.GEMINI_API_KEY_4 });

  if (keys.length === 0) {
    return NextResponse.json({ error: "No Gemini keys set" });
  }

  const baseUrl = "https://generativelanguage.googleapis.com/v1beta/openai";
  const model = "gemini-2.5-flash";
  const results: any[] = [];

  for (const { name, key } of keys) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Say OK" }],
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const body = await res.text();
      let parsed: any = null;
      try { parsed = JSON.parse(body); } catch {}
      results.push({
        keyName: name,
        keyPrefix: key.slice(0, 8) + "...",
        status: res.status,
        ok: res.ok,
        reply: parsed?.choices?.[0]?.message?.content ?? null,
        error: parsed?.error ? { code: parsed.error.code, message: (parsed.error.message || "").slice(0, 200), status: parsed.error.status } : null,
        bodyPreview: body.slice(0, 300),
      });
    } catch (e: any) {
      results.push({
        keyName: name,
        error: e?.message?.slice(0, 200),
        name: e?.name,
      });
    }
  }

  return NextResponse.json({ model, results });
}
