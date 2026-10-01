import { NextRequest, NextResponse } from "next/server";
import { getLLM } from "@/lib/ai/provider";
import type { ChatCompletionMessage } from "@/lib/ai/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================
// PDF Q&A — grounded RAG-style chat over an uploaded document
// ============================================================

const SYSTEM_PROMPT = `You are ExamIntel's PDF Q&A assistant — you answer questions about an exam-related document (notification, syllabus, PYQ) STRICTLY from the document text provided in the conversation.

GROUNDING RULES (NON-NEGOTIABLE):
1. Use ONLY the document text supplied in the user's first message (it will appear between the markers BEGIN_DOCUMENT and END_DOCUMENT). Treat anything outside that text as off-limits for factual claims.
2. If the answer to the user's question is NOT in the document, say so clearly: "This information is not present in the provided document." Do NOT guess, do NOT use outside knowledge, do NOT fabricate.
3. If a question is ambiguous, ask one short clarifying question instead of guessing.
4. Quote or paraphrase faithfully. If the user asks for a specific number (date, age limit, mark), reproduce it verbatim when possible.
5. Cite the source page or section when you can find it in the document. Format citations inline as: "Source: Page X" or "Source: Section Y" or "Source: Page X, Section Y". If you cannot identify a page/section, omit the citation — do NOT invent one.
6. Keep answers concise (3–6 sentences) and skimmable. Use short paragraphs or bullet points when the user asks for a list.
7. If the user asks a meta question (e.g. "summarise the whole document" or "what are the main topics?"), give a structured overview grounded in the document, and tag the high-level sections you used as sources.
8. Do not refuse to answer exam-prep questions on policy grounds — competitive-exam preparation is the platform's purpose.
9. If the document text was empty (sample-analysis mode), say: "No document text was provided — I can't answer grounded questions about it. Please upload or paste the document first."
10. Stay neutral and factual. Do not speculate about what the document "probably" means.

OUTPUT FORMAT:
- Plain text. Markdown is fine (use **bold** for emphasis, bullet lists where helpful), but avoid headings.
- Always append a "Source:" line at the end of the answer when you can identify a page/section. If you cited inline already, you may still add a summary "Source: Page X" line at the end.
- If no source is identifiable (e.g. the document didn't expose page markers), end with: "Source: Uploaded Document (page not identifiable)" — never invent a page number.`;

function buildFirstUserMessage(
  content: string,
  filename: string,
  question: string
): string {
  const safeFilename = filename || "Uploaded document";
  const trimmed = content.trim();
  const safeContent = trimmed.length > 12000 ? trimmed.slice(0, 12000) + "\n\n[... document truncated for chat context ...]" : trimmed;

  if (!trimmed) {
    return `FILENAME: ${safeFilename}

BEGIN_DOCUMENT
(empty — no document text was supplied)
END_DOCUMENT

QUESTION: ${question}

Note: the document text is empty. Follow rule 9 — inform the user that grounded answers require the document text.`;
  }

  return `FILENAME: ${safeFilename}

BEGIN_DOCUMENT
${safeContent}
END_DOCUMENT

QUESTION: ${question}

Answer strictly from the document above. Cite "Source: Page X" or "Source: Section Y" when you can identify them. If the answer is not in the document, say so.`;
}

interface QAHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const content: string = typeof body?.content === "string" ? body.content : "";
    const filename: string = typeof body?.filename === "string" ? body.filename.trim() : "";
    const questionRaw: unknown = body?.question;
    const historyRaw: unknown = body?.history;

    if (typeof questionRaw !== "string" || questionRaw.trim().length === 0) {
      return NextResponse.json(
        { error: "A non-empty 'question' string is required." },
        { status: 400 }
      );
    }
    const question = questionRaw.trim();

    // normalize history into ChatCompletionMessage[]
    const history: QAHistoryItem[] = Array.isArray(historyRaw)
      ? historyRaw
          .filter(
            (h: unknown): h is QAHistoryItem =>
              !!h &&
              typeof h === "object" &&
              ((h as QAHistoryItem).role === "user" ||
                (h as QAHistoryItem).role === "assistant") &&
              typeof (h as QAHistoryItem).content === "string"
          )
          .slice(-6) // keep last 6 turns max to stay within context limits
      : [];

    const llm = await getLLM();

    const messages: ChatCompletionMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildFirstUserMessage(content, filename, question) },
      ...history.map((h) => ({
        role: h.role,
        content: h.content,
      })),
    ];

    const answer = await llm.chat(messages);
    if (!answer || !answer.trim()) {
      return NextResponse.json(
        { error: "AI returned an empty answer." },
        { status: 500 }
      );
    }
    return NextResponse.json({ answer: answer.trim() });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "PDF Q&A failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
