import { NextResponse } from "next/server";
import { directChat } from "@/lib/ai/direct-call";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Probe the direct-call provider chain with a tiny message.
    const hasKey =
      !!process.env.GEMINI_API_KEY ||
      !!process.env.GEMINI_API_KEY_2 ||
      !!process.env.GEMINI_API_KEY_3 ||
      !!process.env.OPENAI_API_KEY;

    const reply = await directChat([{ role: "user", content: "ping" }]);
    const available = !!reply && !reply.startsWith("**Demo") && !reply.startsWith("**Mock");

    return NextResponse.json({
      provider: "gemini-direct",
      available,
      hasKey,
      preview: reply.slice(0, 80),
    });
  } catch (e: any) {
    return NextResponse.json({ provider: "error", available: false, error: e?.message ?? "unknown" });
  }
}
