import { NextRequest, NextResponse } from "next/server";
import { jsonWithFallback } from "@/lib/ai/json-with-fallback";
import type { Formula } from "@/store/formula-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface FormulaList {
  formulas: Formula[];
}

function isFormulaList(v: unknown): v is FormulaList {
  const r = v as any;
  return !!r && typeof r === "object" && Array.isArray(r.formulas);
}

const SYSTEM = `You are ExamIntel's Formula Sheet lookup engine — a precise mathematical reference assistant for competitive-exam aspirants.

Your job: given the user's search query, return a STRICT-JSON object whose "formulas" array contains formulas whose subject, topic, or name matches the query. If nothing matches, return an empty array (do NOT invent or fabricate formulas).

Each formula object must contain EXACTLY these keys:
- id (string, short stable id, e.g. "ai_pct_1")
- subject (string, one of: "Quantitative Aptitude", "Algebra", "Geometry", "Trigonometry", "Mensuration")
- topic (string, e.g. "Percentage", "Quadratic Equations")
- name (string, short human label, e.g. "Percentage Change")
- formula (string, the mathematical expression using plain ASCII or unicode where natural — e.g. "A = P × (1 + R/100)^T", "sin²θ + cos²θ = 1")
- description (string, 1-2 sentences explaining what the formula computes and what the symbols mean)
- example (string, a worked numeric example showing substitution)
- difficulty (string, one of "Basic" | "Intermediate" | "Advanced")

RULES:
- Return only formulas genuinely relevant to the query — never pad with unrelated entries.
- Prefer 3 to 5 well-chosen formulas per lookup. Cap at 8.
- Every formula string must be a real, correct, exam-grade formula.
- Do NOT include markdown, code fences, or commentary. Output ONLY the JSON object.`;

const SCHEMA = `FormulaSheet schema (case-insensitive hint: "FormulaSheet")
{
  "formulas": {
    "id": string,
    "subject": "Quantitative Aptitude" | "Algebra" | "Geometry" | "Trigonometry" | "Mensuration",
    "topic": string,
    "name": string,
    "formula": string,
    "description": string,
    "example": string,
    "difficulty": "Basic" | "Intermediate" | "Advanced"
  }[]
}`;

function coerceDifficulty(d: unknown): Formula["difficulty"] {
  const v = String(d ?? "Intermediate").trim();
  if (v === "Basic" || v === "Intermediate" || v === "Advanced") return v;
  return "Intermediate";
}

function sanitizeFormulaList(raw: FormulaList): FormulaList {
  const list = Array.isArray(raw?.formulas) ? (raw.formulas as any[]) : [];
  const out: Formula[] = [];
  const seenIds = new Set<string>();
  list.forEach((f, i) => {
    if (!f || typeof f !== "object") return;
    const subject =
      typeof f.subject === "string" && f.subject.trim()
        ? f.subject.trim()
        : "Quantitative Aptitude";
    const topic = typeof f.topic === "string" && f.topic.trim() ? f.topic.trim() : "General";
    const name = typeof f.name === "string" && f.name.trim() ? f.name.trim() : "Untitled formula";
    const formula = typeof f.formula === "string" && f.formula.trim() ? f.formula.trim() : "";
    const description =
      typeof f.description === "string" && f.description.trim() ? f.description.trim() : "";
    if (!formula || !description) return; // skip invalid entries
    const id =
      typeof f.id === "string" && f.id.trim() && !seenIds.has(f.id.trim())
        ? f.id.trim()
        : `ai_${i + 1}`;
    seenIds.add(id);
    out.push({
      id,
      subject,
      topic,
      name,
      formula,
      description,
      example: typeof f.example === "string" && f.example.trim() ? f.example.trim() : undefined,
      difficulty: coerceDifficulty(f.difficulty),
    });
  });
  return { formulas: out.slice(0, 8) };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query =
      typeof body?.query === "string" && body.query.trim()
        ? body.query.trim().slice(0, 500)
        : "";

    if (!query) {
      return NextResponse.json(
        { error: "Query is required. Send a 'query' field in the request body." },
        { status: 400 }
      );
    }

    const userPrompt = `Formula lookup. User query:
"""
${query}
"""

Return a strict JSON object matching the FormulaSheet schema. Include only formulas whose subject / topic / name matches the query. If nothing matches, return { "formulas": [] }.`;

    const raw = await jsonWithFallback<FormulaList>(SYSTEM, userPrompt, SCHEMA, isFormulaList);
    let result: FormulaList;
    try {
      result = sanitizeFormulaList(raw);
    } catch (normErr) {
      console.error("[formulas/search] sanitizeFormulaList error:", normErr);
      result = raw;
    }
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Formula lookup failed" },
      { status: 500 }
    );
  }
}
