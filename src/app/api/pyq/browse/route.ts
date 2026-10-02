import { NextRequest, NextResponse } from "next/server";
import { jsonWithFallback } from "@/lib/ai/json-with-fallback";
import type { PYQ } from "@/types/pyq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Validate that the AI response is a { pyqs: PYQ[] } payload with at least
// the minimum required fields per item. We tolerate extra/missing optional
// fields but require the core shape so the UI never crashes.
function isPYQList(v: unknown): v is { pyqs: PYQ[] } {
  const r = v as any;
  return !!r && typeof r === "object" && Array.isArray(r.pyqs);
}

const SYSTEM = `You are ExamIntel's PYQ Browser — a previous-year question retrieval engine that surfaces real previous-year questions (PYQs) for Indian competitive exams (SSC CGL, GATE CS, UPSC CSE, RRB JE, Banking PO, etc.).

Your job: given the user's exam/year/topic filters, return a STRICT-JSON object { "pyqs": PYQ[] } containing 8–10 previous-year questions that match.

PYQ SHAPE & RULES:
- id: stable string like "pyq1", "pyq2"... unique across the set.
- exam: the exam name (e.g. "SSC CGL", "GATE CS"). If user passed "All", pick a representative mix.
- year: 4-digit string between 2020 and 2024. If user did not pass a specific year, draw from recent years (2020–2024) and vary across the set.
- topic: short topic label (≤ 5 words).
- subject: subject the question belongs to (e.g. "Quantitative Aptitude", "Data Structures").
- question: complete, self-contained question text. No "Refer to passage above" — every question must stand alone.
- options: array of exactly 4 strings (A/B/C/D). Distinct. No "All of the above" as a free dodge.
- correctAnswer: MUST be a verbatim member of options.
- explanation: 1–3 sentences — concise, no chain-of-thought. Justify the correct answer and briefly note why a tempting distractor is wrong.
- difficulty: "Easy" | "Medium" | "Hard". Distribute across the set (roughly 30/40/30).
- marks: integer (typically 1 or 2).
- sourceType: always "SEARCH_SOURCE" (these are previous-year exam items, not freshly generated).

FORMATTING:
- Output ONLY valid JSON. No markdown, no commentary, no code fences.
- All keys must exactly match the PYQ shape above.
- Strings must be plain (no nested JSON, no markdown headers).
- Do NOT expose chain-of-thought. Explanations are concise and student-facing.`;

const SCHEMA = `{
  "pyqs": PYQ[]
}

PYQ = {
  "id": string,                  // stable, e.g. "pyq1"
  "exam": string,                // e.g. "SSC CGL"
  "year": string,                // 4-digit year 2020–2024
  "topic": string,               // short label
  "subject": string,
  "question": string,
  "options": string[],           // exactly 4 strings, distinct
  "correctAnswer": string,       // MUST be a verbatim member of options
  "explanation": string,         // concise, no chain-of-thought
  "difficulty": "Easy" | "Medium" | "Hard",
  "marks": number,               // integer (1 or 2 typically)
  "sourceType": "SEARCH_SOURCE"  // always SEARCH_SOURCE for PYQs
}`;

function sanitizePYQs(raw: PYQ[], fallbackExam: string, fallbackYear: string): PYQ[] {
  const seenIds = new Set<string>();
  const seenQ = new Set<string>();
  const out: PYQ[] = [];
  let idx = 0;
  for (const p of raw ?? []) {
    if (!p || typeof p !== "object") continue;
    idx += 1;

    const options: string[] = Array.isArray(p.options)
      ? p.options.map((o: any) => String(o ?? "").trim()).filter((o: string) => o.length > 0)
      : [];
    const uniqOptions: string[] = [];
    for (const o of options) if (!uniqOptions.includes(o)) uniqOptions.push(o);

    let correct = typeof p.correctAnswer === "string" ? p.correctAnswer.trim() : "";
    if (typeof p.correctAnswer === "number" && uniqOptions[p.correctAnswer]) {
      correct = uniqOptions[p.correctAnswer];
    }
    if (!uniqOptions.includes(correct) && uniqOptions.length > 0) {
      correct = uniqOptions[0]; // fallback so UI never breaks
    }

    const question = typeof p.question === "string" ? p.question.trim() : "";
    if (!question || seenQ.has(question)) continue;
    seenQ.add(question);

    const id = typeof p.id === "string" && p.id.trim() && !seenIds.has(p.id) ? p.id.trim() : `pyq${idx}`;
    seenIds.add(id);

    const dRaw = String(p.difficulty ?? "").trim();
    const difficulty: "Easy" | "Medium" | "Hard" =
      dRaw === "Easy" || dRaw === "Medium" || dRaw === "Hard" ? dRaw : "Medium";

    const year = typeof p.year === "string" && /^\d{4}$/.test(p.year) ? p.year : fallbackYear;
    const exam = typeof p.exam === "string" && p.exam.trim() ? p.exam.trim() : fallbackExam;

    out.push({
      id,
      exam,
      year,
      topic: typeof p.topic === "string" && p.topic.trim() ? p.topic.trim() : "General",
      subject: typeof p.subject === "string" && p.subject.trim() ? p.subject.trim() : "General",
      question,
      options: uniqOptions.slice(0, 4),
      correctAnswer: correct,
      explanation: typeof p.explanation === "string" ? p.explanation.trim() : "",
      difficulty,
      marks: typeof p.marks === "number" && Number.isFinite(p.marks) ? Math.max(1, Math.round(p.marks)) : 1,
      sourceType: "SEARCH_SOURCE",
      similarityReason: typeof (p as any).similarityReason === "string" ? (p as any).similarityReason.trim() : undefined,
    });
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const exam = typeof body?.exam === "string" && body.exam.trim() ? body.exam.trim() : "All";
    const year = typeof body?.year === "string" && /^\d{4}$/.test(body.year) ? body.year.trim() : "";
    const topic = typeof body?.topic === "string" && body.topic.trim() ? body.topic.trim() : "";

    const yearLine = year ? `Year: ${year}` : "Year: not specified — return PYQs from recent years (2020–2024), varied across the set";
    const topicLine = topic ? `Topic filter: ${topic}` : "Topic filter: not specified — cover the main topics of the chosen exam";

    const userPrompt = `Browse previous-year questions and return a strict JSON { "pyqs": PYQ[] } payload.

FILTERS:
- Exam: ${exam}
- ${yearLine}
- ${topicLine}

REQUIREMENTS:
- Return 8–10 PYQs matching the filters.
- Each PYQ's correctAnswer MUST be a verbatim member of its options array.
- Each PYQ's sourceType MUST be "SEARCH_SOURCE".
- Distribute difficulty across Easy/Medium/Hard.
- Spread years across 2020–2024 when no specific year is given.
- Explanations must be concise and student-facing. No chain-of-thought.
- Output ONLY the JSON object matching the { "pyqs": PYQ[] } shape.`;

    const raw = await jsonWithFallback<{ pyqs: PYQ[] }>(SYSTEM, userPrompt, SCHEMA, isPYQList);
    const pyqs = sanitizePYQs(raw?.pyqs ?? [], exam, year || "2024");

    return NextResponse.json({ pyqs });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "PYQ browse failed" },
      { status: 500 }
    );
  }
}
