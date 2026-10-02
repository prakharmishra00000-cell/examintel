import { NextRequest, NextResponse } from "next/server";
import { jsonWithFallback } from "@/lib/ai/json-with-fallback";
import type { ExamComparisonReport } from "@/types";

function isExamComparisonReport(v: unknown): v is ExamComparisonReport {
  const r = v as any;
  return !!r && typeof r === "object" && (Array.isArray(r.examNames) || Array.isArray(r.comparison));
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You are ExamIntel's Exam Comparison Engine — an expert at side-by-side competitive-exam analysis.

Your job: take 2-5 exam names provided by the user and produce a STRICT JSON object that matches the ExamComparisonReport schema exactly. Compare across these dimensions:
- Eligibility (qualification, nationality, important conditions)
- Qualification (minimum education)
- Age limit (with relaxations if relevant)
- Stages (tier structure)
- Subjects (which sections/subjects each tests)
- Syllabus (common + exam-specific topics)
- Pattern (questions, marks, duration, sections)
- Marking scheme (positive marks)
- Negative marking (penalty per wrong answer)
- Difficulty (relative)
- Posts offered
- Job roles
- Salary / pay level
- Preparation overlap (which topics are shared)
- Career pathways (how each exam leads to a career)
- Prerequisite differences (what disqualifies you from one but not another)
- Additional preparation (topics you must add if preparing for all of them)

Strict rules:
1. Output ONLY valid JSON. No markdown, no commentary outside JSON.
2. The "comparison" array must contain ExamComparisonRow objects, each with "attribute" (string) and "values" (string[]). The values array MUST be aligned with the input examNames order and have exactly the same length as examNames.
3. Cover AT LEAST these attributes (use more if useful): Qualification, Age Limit, Nationality, Stages, Subjects, Total Questions, Max Marks, Duration, Negative Marking, Difficulty, Posts, Job Roles, Pay Level, Frequency.
4. Distinguish OFFICIAL facts (verifiable from notification/website) from AI_ANALYSIS (your own reasoning). Tag each SourceRef with the right type.
5. Do NOT invent numerical overlap percentages unless they are derivable from the syllabus structure you produce. Use qualitative categories ("Very High" | "High" | "Moderate" | "Limited") in overlapCategories instead.
6. "commonTopics" must be topics genuinely shared by ALL listed exams. "examSpecific" must list topics unique to each exam (one entry per exam, even if empty array).
7. "additionalPreparation" must list topics that a candidate preparing for ALL these exams would need to add beyond what is common — with a short reason each.
8. "careerPathways" and "prerequisiteDifferences" are plain string bullet lists.
9. "generatedAt" must be the current ISO timestamp.
10. If an exam name is unclear, make your best guess (e.g. "SSC CGL" = "Staff Selection Commission - Combined Graduate Level") and proceed.
11. Never fabricate official URLs. If you cannot verify an official website, omit it or mark source as AI_ANALYSIS.`;

const SCHEMA = `ExamComparisonReport = {
  examNames: string[],                                  // same order as input
  comparison: { attribute: string; values: string[] }[],// values length === examNames length
  commonSyllabus: {
    commonTopics: string[],
    examSpecific: { exam: string; topics: string[] }[]
  },
  overlap: {
    overlapCategories: { category: "Very High" | "High" | "Moderate" | "Limited"; topic: string; reason: string }[],
    existingPreparation: string[],
    additionalPreparation: { topic: string; reason: string }[]
  },
  careerPathways: string[],
  prerequisiteDifferences: string[],
  sources: SourceRef[],
  generatedAt: string                                   // ISO timestamp
}

SourceRef = {
  type: "OFFICIAL" | "UPLOADED_DOCUMENT" | "SEARCH_SOURCE" | "USER_INPUT" | "AI_ANALYSIS" | "AI_GENERATED",
  label: string,
  detail?: string
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

    const user = `Compare these ${exams.length} competitive exams side by side and return the full ExamComparisonReport JSON:
${exams.map((e, i) => `${i + 1}. ${e}`).join("\n")}

Remember:
- examNames array order must match the order above.
- Each comparison.values array must align with examNames (one value per exam).
- Tag sources: OFFICIAL for verifiable facts from notifications/websites, AI_ANALYSIS for your own synthesis.
- Use qualitative overlap categories (Very High / High / Moderate / Limited) — do not invent numeric percentages.`;

    const report = await jsonWithFallback<ExamComparisonReport>(SYSTEM, user, SCHEMA, isExamComparisonReport);

    // Defensive normalization: ensure examNames matches input order/length.
    try {
      if (!Array.isArray(report?.examNames) || report.examNames.length !== exams.length) {
        (report as ExamComparisonReport).examNames = exams;
      }
      if (Array.isArray(report?.comparison)) {
        (report as ExamComparisonReport).comparison = report.comparison.map((row) => ({
          attribute: String(row?.attribute ?? ""),
          values: Array.isArray(row?.values)
            ? exams.map((_, i) => String(row.values[i] ?? "—"))
            : exams.map(() => "—"),
        }));
      }
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
