import { NextRequest, NextResponse } from "next/server";
import { getLLM } from "@/lib/ai/provider";
import type { ChatCompletionMessage } from "@/lib/ai/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface JournalEntryInput {
  id: string;
  date: string;
  subject: string;
  topic: string;
  durationMinutes: number;
  mood: "great" | "good" | "okay" | "struggle";
  whatStudied: string;
  blockers: string;
  wins: string;
  createdAt: string;
}

const SYSTEM = `You are ExamIntel's Study Journal Analyst — an expert coach for competitive-exam aspirants.

You receive a week's worth of daily study journal entries and produce a concise, motivating weekly summary in markdown.

Your summary MUST include these sections (use markdown headings):
1. **Total Study Time** — sum of durationMinutes across entries, formatted as "Xh Ym" and number of sessions.
2. **Subjects Covered** — bullet list of distinct subjects with total minutes each.
3. **Key Wins** — 2-4 bullet highlights of the best wins/progress (drawn from the "wins" fields).
4. **Recurring Blockers** — 1-3 bullets of patterns/issues that show up across multiple entries (drawn from the "blockers" fields). If none, say "No recurring blockers — clean week."
5. **Mood Trend** — 1-2 sentence read on overall mood (great/good/okay/struggle distribution) and what it suggests.
6. **Recommendations for Next Week** — exactly 3 numbered, actionable, specific recommendations tailored to the user's actual subjects/topics/blockers.

Rules:
- Be concise. Total length ~200-320 words. Use short markdown (headings, bullets).
- Be specific — reference actual subjects/topics/wins from the entries, not generic advice.
- Be motivating but honest. Don't sugarcoat blockers.
- If the entries are sparse (1-2 entries), acknowledge that and focus recommendations on building consistency.
- Output ONLY the markdown summary. No preamble, no code fences.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const entries: JournalEntryInput[] = Array.isArray(body?.entries)
      ? body.entries
      : [];

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "No journal entries provided for this week." },
        { status: 400 }
      );
    }

    // Compact serialization for the model — drop empty fields to save tokens.
    const compact = entries.map((e, i) => {
      const parts: string[] = [
        `Entry ${i + 1}:`,
        `  date: ${e.date}`,
        `  subject: ${e.subject || "—"}`,
        `  topic: ${e.topic || "—"}`,
        `  duration_minutes: ${Number(e.durationMinutes) || 0}`,
        `  mood: ${e.mood}`,
      ];
      if (e.whatStudied?.trim()) parts.push(`  what_studied: ${e.whatStudied.trim()}`);
      if (e.blockers?.trim()) parts.push(`  blockers: ${e.blockers.trim()}`);
      if (e.wins?.trim()) parts.push(`  wins: ${e.wins.trim()}`);
      return parts.join("\n");
    });

    const userPrompt = `Here are ${entries.length} study journal entries from the past week. Produce the weekly summary per the system instructions.\n\n${compact.join("\n\n")}`;

    const messages: ChatCompletionMessage[] = [
      { role: "system", content: SYSTEM },
      { role: "user", content: userPrompt },
    ];

    const llm = await getLLM();
    const summary = await llm.chat(messages);

    if (!summary || !summary.trim()) {
      return NextResponse.json(
        { error: "AI returned an empty summary. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ summary, provider: llm.name });
  } catch (e: any) {
    console.error("[/api/journal/summary] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to generate weekly summary." },
      { status: 500 }
    );
  }
}
