import { NextRequest, NextResponse } from "next/server";
import { directChat } from "@/lib/ai/direct-call";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You are ExamIntel's contextual AI assistant — an expert on competitive-exam preparation.
You help the user with: exam research, syllabus mapping, dependency analysis, question explanation, question evolution, paper generation, PDF analysis, MCQ generation, preparation planning, multi-exam optimization, and performance analysis.

Rules:
- Be concise, structured, and actionable. Use short markdown (headings, bullets).
- When the user asks about a specific exam/topic/question, explain it clearly.
- Recommend next actions (e.g., "Open Dependency Mapper" / "Generate a paper").
- If the user wants structured intelligence (full report), tell them to use the dedicated feature view.
- Distinguish official facts from AI analysis when relevant.
- Never fabricate exam rules. If unsure, say so and suggest researching the exam.
- Keep replies under 250 words unless asked for detail.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: { role: string; content: string }[] = body.messages ?? [];
    const context = body.context as string | undefined;

    const full: { role: string; content: string }[] = [
      { role: "system", content: SYSTEM + (context ? `\n\nCurrent user context: ${context}` : "") },
      ...messages.map((m: any) => ({ role: m.role as "user" | "assistant", content: String(m.content) })),
    ];

    const reply = await directChat(full);
    return NextResponse.json({ reply, provider: "gemini-direct" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Chat failed" }, { status: 500 });
  }
}
