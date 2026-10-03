import { NextRequest, NextResponse } from "next/server";
import { directChat } from "@/lib/ai/direct-call";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You are ExamIntel's Study Note Summarizer — an expert academic coach for competitive-exam aspirants.

You receive a markdown study note from the user and produce a concise, structured summary in markdown.

Your summary MUST include these sections (use markdown headings):

## Summary
- 3 to 5 concise bullet points capturing the core ideas of the note. Each bullet should be a complete, specific sentence (not a fragment). Draw only from what is actually in the note.

## Key Terms
- A bullet list of 3-6 key terms / formulas / definitions worth memorizing. Bold each term, then a one-line definition or value pulled from the note.

## Suggested Tags
- A comma-separated line of 3-6 lowercase tags (single words or short kebab-case phrases) that capture the subject, topic, and concepts. Format as: \`tags: tag1, tag2, tag3\`

Rules:
- Be concise. Total length 150-280 words. Use short markdown.
- Be faithful — only reference content actually present in the note. Do not invent facts.
- If the note is very short or sparse, still produce all three sections; keep bullets short.
- Output ONLY the markdown summary. No preamble, no closing remarks, no code fences.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const content: string = typeof body?.content === "string" ? body.content : "";

    if (!content.trim()) {
      return NextResponse.json(
        { error: "Note content is empty. Add some text before summarizing." },
        { status: 400 }
      );
    }

    // Truncate very long notes to keep prompt size reasonable (preserve beginning).
    const truncated =
      content.length > 8000 ? content.slice(0, 8000) + "\n\n[...note truncated...]" : content;

    const userPrompt = `Summarize the following study note per the system instructions.\n\n--- NOTE BEGIN ---\n${truncated}\n--- NOTE END ---`;

    const messages: { role: string; content: string }[] = [
      { role: "system", content: SYSTEM },
      { role: "user", content: userPrompt },
    ];

    const summary = await directChat(messages);

    // If the AI failed (Demo mode), generate a basic summary locally.
    if (summary.startsWith("**Demo") || !summary.trim()) {
      const sentences = content.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 10);
      const basicSummary = sentences.slice(0, 3).map((s) => `- ${s.trim()}`).join("\n");
      const stopWords = new Set(["the","and","for","with","that","this","from","have","were","they","will","about","which","their","would","there","could","other","than","then","them","these","those","being","been","should","might","must","shall","does","done","going","made","make","into","also","such","very","more","most","some","any","all","both","each","many","like","just","only","own","same","can","did","was","are","has","had","what","when","where","why","how","who","whom","not","nor","but","yet"]);
      const words = content.split(/\s+/)
        .map((w) => w.toLowerCase().replace(/[^a-z]/gi, ""))
        .filter((w) => w.length > 4 && !stopWords.has(w));
      const tags = Array.from(new Set(words)).slice(0, 6);
      const fallback = `## Summary
${basicSummary || "- (Note content too short to summarize automatically)"}

## Key Terms
${tags.length > 0 ? tags.map((t) => `- **${t}**`).join("\n") : "- (No key terms extracted)"}

## Suggested Tags
tags: ${tags.slice(0, 5).join(", ") || "study-note"}

**Note** — The AI summary service is temporarily unavailable. This is a basic summary. Try again in a moment for the full AI-analyzed summary.`;
      return NextResponse.json({ summary: fallback, provider: "fallback" });
    }

    return NextResponse.json({ summary, provider: "gemini-direct" });
  } catch (e: any) {
    console.error("[/api/notes/summarize] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to generate note summary." },
      { status: 500 }
    );
  }
}
