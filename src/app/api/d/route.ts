import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET() {
  const results: any[] = [];
  for (const [name, key] of [
    ["GEMINI_API_KEY", process.env.GEMINI_API_KEY],
    ["GEMINI_API_KEY_2", process.env.GEMINI_API_KEY_2],
    ["GEMINI_API_KEY_3", process.env.GEMINI_API_KEY_3],
  ]) {
    if (!key) { results.push({ name, status: "not set" }); continue; }
    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: "gemini-3.8-flash", messages: [{ role: "user", content: "Say OK" }], max_tokens: 5 }),
      });
      const text = await res.text();
      let parsed: any = null;
      try { parsed = JSON.parse(text); if (Array.isArray(parsed)) parsed = parsed[0]; } catch {}
      results.push({
        name, status: res.status,
        reply: parsed?.choices?.[0]?.message?.content ?? null,
        error: parsed?.error ? { code: parsed.error.code, message: parsed.error.message?.slice(0, 80) } : null,
      });
    } catch (e: any) { results.push({ name, error: e?.message?.slice(0, 80) }); }
  }
  return NextResponse.json({ results });
}
