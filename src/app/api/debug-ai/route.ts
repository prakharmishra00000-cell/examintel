import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Test with a COMPLEX prompt (similar to exam research) to see the actual Gemini response
  const keys: { name: string; key: string }[] = [];
  if (process.env.GEMINI_API_KEY) keys.push({ name: "GEMINI_API_KEY", key: process.env.GEMINI_API_KEY });
  if (process.env.GEMINI_API_KEY_2) keys.push({ name: "GEMINI_API_KEY_2", key: process.env.GEMINI_API_KEY_2 });

  const model = process.env.OPENAI_MODEL || "gemini-3.8-flash";
  const baseUrl = "https://generativelanguage.googleapis.com/v1beta/openai";

  if (keys.length === 0) {
    return NextResponse.json({ error: "No API keys set" });
  }

  const results: any[] = [];
  
  // Test 1: Simple chat
  // Test 2: Complex JSON (simulates exam research)
  const complexPrompt = `You are an exam researcher. Research "SSC CGL" and return ONLY valid JSON with this shape:
{"basicInfo":{"name":"string","conductingOrganisation":"string"},"stages":[{"name":"string"}],"preparation":{"difficultyCharacteristics":"string"}}

Respond with ONLY the JSON object. No markdown, no code fences.`;

  for (const { name, key } of keys) {
    // Simple test
    try {
      const res1 = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: "Say OK" }], max_tokens: 10 }),
      });
      const data1 = await res1.json();
      
      // Complex JSON test
      let complexResult: any = null;
      if (res1.ok) {
        try {
          const res2 = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
            body: JSON.stringify({ model, messages: [{ role: "user", content: complexPrompt }], max_tokens: 4000 }),
          });
          const data2 = await res2.json();
          const content2 = data2?.choices?.[0]?.message?.content ?? "";
          complexResult = {
            status: res2.status,
            ok: res2.ok,
            responseLength: content2.length,
            responsePreview: content2.slice(0, 300),
            startsWith: content2.trim().charAt(0),
            error: data2?.error ? { code: data2.error.code, message: data2.error.message?.slice(0, 200) } : null,
          };
        } catch (e: any) {
          complexResult = { error: e?.message?.slice(0, 200) };
        }
      }

      results.push({
        keyName: name,
        keyPrefix: key.slice(0, 10) + "...",
        simple: {
          status: res1.status,
          ok: res1.ok,
          reply: data1?.choices?.[0]?.message?.content ?? null,
          error: data1?.error ? { code: data1.error.code, message: data1.error.message?.slice(0, 100) } : null,
        },
        complex: complexResult,
      });
    } catch (e: any) {
      results.push({ keyName: name, error: e?.message?.slice(0, 200) });
    }
  }

  return NextResponse.json({ model, keys: results });
}
