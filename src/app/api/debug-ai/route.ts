import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const keys: { name: string; key: string }[] = [];
  if (process.env.GEMINI_API_KEY) keys.push({ name: "GEMINI_API_KEY", key: process.env.GEMINI_API_KEY });
  if (process.env.GEMINI_API_KEY_2) keys.push({ name: "GEMINI_API_KEY_2", key: process.env.GEMINI_API_KEY_2 });
  if (process.env.OPENAI_API_KEY) keys.push({ name: "OPENAI_API_KEY", key: process.env.OPENAI_API_KEY });

  const model = process.env.OPENAI_MODEL || "gemini-3.8-flash";
  const baseUrl = "https://generativelanguage.googleapis.com/v1beta/openai";

  if (keys.length === 0) {
    return NextResponse.json({ error: "No API keys set" });
  }

  const results: any[] = [];
  for (const { name, key } of keys) {
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Say OK" }],
          max_tokens: 10,
        }),
      });

      const text = await res.text();
      let parsed: any = null;
      try { parsed = JSON.parse(text); if (Array.isArray(parsed)) parsed = parsed[0]; } catch {}

      results.push({
        keyName: name,
        keyPrefix: key.slice(0, 10) + "...",
        status: res.status,
        ok: res.ok,
        reply: parsed?.choices?.[0]?.message?.content ?? null,
        error: parsed?.error ? { code: parsed.error.code, message: parsed.error.message?.slice(0, 200) } : null,
      });
    } catch (e: any) {
      results.push({
        keyName: name,
        keyPrefix: key.slice(0, 10) + "...",
        error: e?.message?.slice(0, 200),
      });
    }
  }

  return NextResponse.json({ model, baseUrl, keys: results });
}
