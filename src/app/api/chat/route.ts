import { NextRequest, NextResponse } from "next/server";
import { directChat } from "@/lib/ai/direct-call";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You are ExamIntel's contextual AI assistant — an expert on competitive-exam preparation.
You help the user with: exam research, syllabus mapping, dependency analysis, question explanation, question evolution, paper generation, PDF analysis, MCQ generation, preparation planning, multi-exam optimization, and performance analysis.

CRITICAL OUTPUT FORMAT — REPLY IN PLAIN MARKDOWN PROSE.
Do NOT respond with JSON. Do NOT wrap your reply in code fences. Do NOT use \`{"key":"value"}\` syntax.
Your reply MUST be readable English text using markdown headings (##, ###), bullet points (-), and **bold** for emphasis.
If you find yourself starting a reply with \`{\` or \`\`\`json, STOP and rephrase as prose.

Rules:
- Be concise, structured, and actionable.
- When the user asks about a specific exam/topic/question, explain it clearly with proper paragraphs.
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

    // If the AI failed (Demo mode), return a helpful message instead of the
    // raw "Demo mode" string which confuses users.
    if (reply.startsWith("**Demo")) {
      return NextResponse.json({
        reply: "I'm temporarily unable to connect to the AI service. This is usually due to high traffic or rate limiting. Please try again in a few seconds — your question will be answered by the real AI as soon as the connection is restored.",
        provider: "fallback",
      });
    }

    return NextResponse.json({ reply, provider: "gemini-direct" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Chat failed" }, { status: 500 });
  }
}
