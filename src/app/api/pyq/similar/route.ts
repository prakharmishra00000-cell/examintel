import { NextRequest, NextResponse } from "next/server";
import { jsonWithFallback } from "@/lib/ai/json-with-fallback";
import type { PYQ } from "@/types/pyq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Validate the { pyqs: PYQ[] } payload from the similar-question finder.
// Each PYQ should additionally carry a similarityReason.
function isPYQList(v: unknown): v is { pyqs: PYQ[] } {
  const r = v as any;
  if (!r || typeof r !== "object") return false;
  if (!Array.isArray(r.pyqs)) return false;
  if (r.pyqs.length === 0) return false;
  return r.pyqs.every(
    (p: any) =>
      p &&
      typeof p === "object" &&
      typeof p.question === "string" &&
      Array.isArray(p.options) &&
      typeof p.correctAnswer === "string" &&
      typeof p.explanation === "string"
  );
}

const SYSTEM = `You are ExamIntel's Similar-Question Finder — a retrieval engine that, given a single source question, returns 3–5 previous-year questions (PYQs) that test the same underlying concept or are structurally similar.

Your job: analyse the source question, identify the core concept/topic/subject and the question's structural shape (formula application, definition recall, multi-step calculation, etc.), then return a STRICT-JSON { "pyqs": PYQ[] } object containing 3–5 PYQs that exercise the same concept or share the same structure.

PYQ SHAPE & RULES:
- id: stable string like "sim1", "sim2"... unique across the set.
- exam: a realistic exam where this kind of PYQ appears (e.g. "SSC CGL", "GATE CS", "Banking PO").
- year: 4-digit string between 2020 and 2024.
- topic: short topic label (≤ 5 words) — should align with the source question's concept.
- subject: subject the question belongs to.
- question: complete, self-contained question text (NOT a copy of the source — a new but conceptually related PYQ).
- options: exactly 4 strings. Distinct.
- correctAnswer: MUST be a verbatim member of options.
- explanation: 1–3 sentences — concise, no chain-of-thought.
- difficulty: "Easy" | "Medium" | "Hard". Vary across the 3–5 results.
- marks: integer (1 or 2).
- sourceType: always "SEARCH_SOURCE".
- similarityReason: 1 sentence explaining WHY this PYQ is similar to the source question (same concept / same formula / same structural pattern / common trap).

FORMATTING:
- Output ONLY valid JSON. No markdown, no commentary, no code fences.
- All keys must exactly match the PYQ shape above (including similarityReason).
- Strings must be plain.
- Do NOT expose chain-of-thought.`;

const SCHEMA = `{
  "pyqs": PYQ[]
}

PYQ = {
  "id": string,                       // e.g. "sim1"
  "exam": string,
  "year": string,                      // 4-digit year 2020–2024
  "topic": string,
  "subject": string,
  "question": string,
  "options": string[],                 // exactly 4 distinct strings
  "correctAnswer": string,            // MUST be a verbatim member of options
  "explanation": string,
  "difficulty": "Easy" | "Medium" | "Hard",
  "marks": number,
  "sourceType": "SEARCH_SOURCE",
  "similarityReason": string          // 1 sentence: why this PYQ is similar to the source
}`;

function sanitizePYQs(raw: PYQ[]): PYQ[] {
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
      correct = uniqOptions[0];
    }

    const question = typeof p.question === "string" ? p.question.trim() : "";
    if (!question || seenQ.has(question)) continue;
    seenQ.add(question);

    const id = typeof p.id === "string" && p.id.trim() && !seenIds.has(p.id) ? p.id.trim() : `sim${idx}`;
    seenIds.add(id);

    const dRaw = String(p.difficulty ?? "").trim();
    const difficulty: "Easy" | "Medium" | "Hard" =
      dRaw === "Easy" || dRaw === "Medium" || dRaw === "Hard" ? dRaw : "Medium";

    out.push({
      id,
      exam: typeof p.exam === "string" && p.exam.trim() ? p.exam.trim() : "General",
      year: typeof p.year === "string" && /^\d{4}$/.test(p.year) ? p.year : "2024",
      topic: typeof p.topic === "string" && p.topic.trim() ? p.topic.trim() : "General",
      subject: typeof p.subject === "string" && p.subject.trim() ? p.subject.trim() : "General",
      question,
      options: uniqOptions.slice(0, 4),
      correctAnswer: correct,
      explanation: typeof p.explanation === "string" ? p.explanation.trim() : "",
      difficulty,
      marks: typeof p.marks === "number" && Number.isFinite(p.marks) ? Math.max(1, Math.round(p.marks)) : 1,
      sourceType: "SEARCH_SOURCE",
      similarityReason:
        typeof (p as any).similarityReason === "string" && (p as any).similarityReason.trim()
          ? (p as any).similarityReason.trim()
          : "Tests the same underlying concept as the source question.",
    });
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const question = typeof body?.question === "string" ? body.question.trim() : "";

    if (!question) {
      return NextResponse.json(
        { error: "Missing 'question' in request body" },
        { status: 400 }
      );
    }

    const userPrompt = `Find similar previous-year questions for the source question below.

SOURCE QUESTION:
"""
${question.slice(0, 4000)}
"""

REQUIREMENTS:
- Return 3–5 PYQs that test the same underlying concept OR are structurally similar to the source question.
- Each PYQ MUST include a similarityReason (1 sentence) explaining the connection.
- correctAnswer MUST be a verbatim member of options.
- sourceType MUST be "SEARCH_SOURCE".
- Vary difficulty across the results.
- Do NOT just rephrase the source — produce realistic PYQs from Indian competitive exams.
- Output ONLY the JSON object matching the { "pyqs": PYQ[] } shape.`;

    const raw = await jsonWithFallback<{ pyqs: PYQ[] }>(SYSTEM, userPrompt, SCHEMA, isPYQList);
    const pyqs = sanitizePYQs(raw?.pyqs ?? []);

    return NextResponse.json({ pyqs });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Similar PYQ search failed" },
      { status: 500 }
    );
  }
}
