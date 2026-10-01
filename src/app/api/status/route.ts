import { NextResponse } from "next/server";
import { getLLM } from "@/lib/ai/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const llm = await getLLM();
    return NextResponse.json({ provider: llm.name, available: llm.available });
  } catch (e: any) {
    return NextResponse.json({ provider: "error", available: false, error: e?.message ?? "unknown" });
  }
}
