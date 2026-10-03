import { NextRequest, NextResponse } from "next/server";
import { directJson } from "@/lib/ai/direct-call";
import type { ExamComparisonReport } from "@/types";

function isExamComparisonReport(v: unknown): v is ExamComparisonReport {
  const r = v as any;
  // RELAXED validation: only require examNames + comparison (the minimum for
  // a useful comparison). Missing commonSyllabus/overlap/careerPathways will
  // be filled with defaults in the normalization step. This prevents falling
  // back to mock when the real AI response is slightly truncated.
  return (
    !!r &&
    typeof r === "object" &&
    Array.isArray(r.examNames) &&
    Array.isArray(r.comparison) &&
    r.comparison.length >= 2
  );
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You are ExamIntel's Exam Comparison Engine. Produce a STRICT JSON comparing 2-5 competitive exams.

CRITICAL: You have limited response time. Be CONCISE.
- Each text field: 1 short sentence (max 15 words).
- Each array: cap at 5 items.
- No padding, no markdown, no commentary.

Output JSON field order (IMPORTANT — generate in this order):
1. examNames — array of exam names
2. comparison — array of {attribute, values[]} (max 10 rows)
3. commonSyllabus — {commonTopics[], examSpecific[{exam, topics[]}]}
4. overlap — {overlapCategories[], existingPreparation[], additionalPreparation[]}
5. careerPathways — string[] (max 5)
6. prerequisiteDifferences — string[] (max 4)
7. sources — SourceRef[] (max 3)
8. generatedAt — ISO timestamp

Rules:
- examNames order must match the user's input order.
- comparison[].values length must === examNames length.
- Cover at least: Qualification, Age Limit, Stages, Negative Marking, Difficulty, Frequency, Conducting Body.
- Use qualitative overlap categories: "Very High" | "High" | "Moderate" | "Limited".
- commonTopics = topics shared by ALL exams. examSpecific = topics unique to each exam.
- Tag sources: OFFICIAL for verifiable facts, AI_ANALYSIS for your synthesis.

Return ONLY the JSON object.`;

const SCHEMA = `ExamComparisonReport = {
  examNames: string[],
  comparison: { attribute: string, values: string[] }[] (max 10, values length === examNames length),
  commonSyllabus: { commonTopics: string[] (max 6), examSpecific: { exam: string, topics: string[] (max 4) }[] },
  overlap: {
    overlapCategories: { category: "Very High"|"High"|"Moderate"|"Limited", topic: string, reason: string (1 sentence) }[] (max 5),
    existingPreparation: string[] (max 4),
    additionalPreparation: { topic: string, reason: string }[] (max 3)
  },
  careerPathways: string[] (max 5),
  prerequisiteDifferences: string[] (max 4),
  sources: { type: "OFFICIAL"|"AI_ANALYSIS"|"SEARCH_SOURCE"|"USER_INPUT", label: string, detail?: string }[] (max 3),
  generatedAt: string (ISO timestamp)
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const examsRaw: unknown = body?.exams;
    if (!Array.isArray(examsRaw)) {
      return NextResponse.json({ error: "Expected { exams: string[] }" }, { status: 400 });
    }
    const exams = examsRaw
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter((x) => x.length > 0);
    if (exams.length < 2) {
      return NextResponse.json({ error: "Provide at least 2 exams to compare." }, { status: 400 });
    }
    if (exams.length > 5) {
      return NextResponse.json({ error: "Compare at most 5 exams at a time." }, { status: 400 });
    }

    const user = `Compare these ${exams.length} competitive exams. Return ONLY the JSON.
Exams (in order):
${exams.map((e, i) => `${i + 1}. ${e}`).join("\n")}

Set generatedAt to "${new Date().toISOString()}".
Be CONCISE — 1-sentence values, cap arrays. Generate fields in this exact order: examNames, comparison, commonSyllabus, overlap, careerPathways, prerequisiteDifferences, sources, generatedAt.`;

    const report = await directJson<ExamComparisonReport>(SYSTEM, user, SCHEMA, isExamComparisonReport);

    // Defensive normalization: fill in defaults for any missing fields so the
    // UI always has a complete report to render, even if the AI response was
    // truncated or missing some optional sections.
    try {
      const r = report as any;
      // Ensure examNames matches input order/length
      if (!Array.isArray(r?.examNames) || r.examNames.length !== exams.length) {
        r.examNames = exams;
      }
      // Ensure comparison rows have correct values length
      if (Array.isArray(r?.comparison)) {
        r.comparison = r.comparison.map((row: any) => ({
          attribute: String(row?.attribute ?? ""),
          values: Array.isArray(row?.values)
            ? exams.map((_, i) => String(row.values[i] ?? "—"))
            : exams.map(() => "—"),
        }));
      }
      // Fill defaults for missing optional sections
      if (!r?.commonSyllabus || typeof r.commonSyllabus !== "object") {
        r.commonSyllabus = { commonTopics: [], examSpecific: exams.map((e: string) => ({ exam: e, topics: [] })) };
      }
      if (!r?.overlap || typeof r.overlap !== "object") {
        r.overlap = { overlapCategories: [], existingPreparation: [], additionalPreparation: [] };
      }
      if (!Array.isArray(r?.careerPathways)) r.careerPathways = [];
      if (!Array.isArray(r?.prerequisiteDifferences)) r.prerequisiteDifferences = [];
      if (!Array.isArray(r?.sources) || r.sources.length === 0) {
        r.sources = [{ type: "AI_ANALYSIS", label: "AI Exam Comparison Analysis" }];
      }
      if (!r?.generatedAt) r.generatedAt = new Date().toISOString();
    } catch (normErr) {
      console.error("[exam/compare] normalization error:", normErr);
    }

    return NextResponse.json({ report });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Exam comparison failed" },
      { status: 500 }
    );
  }
}
