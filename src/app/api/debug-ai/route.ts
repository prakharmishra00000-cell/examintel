import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || "";
  const model = process.env.OPENAI_MODEL || "gemini-3.8-flash";
  const baseUrl = process.env.OPENAI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai";

  if (!key) {
    return NextResponse.json({ error: "No API key set", env: { GEMINI_API_KEY: "not set", OPENAI_API_KEY: "not set" } });
  }

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
    try { parsed = JSON.parse(text); } catch {}

    return NextResponse.json({
      status: res.status,
      ok: res.ok,
      model,
      baseUrl,
      keyPrefix: key.slice(0, 6) + "...",
      response: parsed || text.slice(0, 500),
    });
  } catch (e: any) {
    return NextResponse.json({
      error: e?.message ?? "Unknown error",
      model,
      baseUrl,
      keyPrefix: key.slice(0, 6) + "...",
    });
  }
}
