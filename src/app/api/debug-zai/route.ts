import { NextResponse } from "next/server";
import { zaiDirectChat } from "@/lib/ai/zai-direct";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const results: any = {};

  // Test 1: ZAI Direct API call
  try {
    const reply = await zaiDirectChat(
      [{ role: "user", content: "Say OK" }],
      "text"
    );
    results.zaiDirect = {
      ok: true,
      reply: reply.slice(0, 200),
      length: reply.length,
    };
  } catch (e: any) {
    results.zaiDirect = {
      ok: false,
      error: e?.message?.slice(0, 300),
      name: e?.name,
    };
  }

  // Test 2: Check if internal-api.z.ai is reachable (network test)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch("https://internal-api.z.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer Z.ai",
        "X-Z-AI-From": "Z",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "ping" }],
        thinking: { type: "disabled" },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    results.networkTest = {
      reachable: true,
      status: res.status,
      statusText: res.statusText,
    };
  } catch (e: any) {
    results.networkTest = {
      reachable: false,
      error: e?.message?.slice(0, 300),
      name: e?.name,
    };
  }

  // Test 3: Environment info
  results.env = {
    VERCEL: !!process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV || null,
    hasZaiBaseUrl: !!process.env.ZAI_BASE_URL,
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
  };

  return NextResponse.json(results);
}
