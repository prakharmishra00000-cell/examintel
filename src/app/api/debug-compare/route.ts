import { NextResponse } from "next/server";
import { directChat } from "@/lib/ai/direct-call";
import { extractJson } from "@/lib/ai/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const exams: string[] = Array.isArray(body?.exams) ? body.exams : ["CAT", "GATE CS"];

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
- Cover at least: Qualification, Age Limit, Stages, Negative Marking, Difficulty, Frequency.
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

  const user = `Compare these ${exams.length} competitive exams. Return ONLY the JSON.
Exams (in order):
${exams.map((e, i) => `${i + 1}. ${e}`).join("\n")}

Set generatedAt to "${new Date().toISOString()}".
Be CONCISE — 1-sentence values, cap arrays. Generate fields in this exact order: examNames, comparison, commonSyllabus, overlap, careerPathways, prerequisiteDifferences, sources, generatedAt.`;

  const sys = SYSTEM + `\n\nRespond with ONLY valid JSON (no markdown, no code fences) matching this shape:\n${SCHEMA}`;

  const raw = await directChat(
    [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    "json_object"
  );

  const isDemo = raw.startsWith("**Demo");
  let parsed: unknown = null;
  let parseError: string | null = null;
  let validationError: string | null = null;

  if (!isDemo) {
    try {
      parsed = extractJson(raw);
      const r = parsed as any;
      if (!Array.isArray(r?.examNames)) validationError = "missing examNames";
      else if (!Array.isArray(r?.comparison) || r.comparison.length < 3) validationError = `comparison has ${r?.comparison?.length ?? 0} items (need >=3)`;
      else if (!r?.commonSyllabus) validationError = "missing commonSyllabus";
      else if (!r?.overlap) validationError = "missing overlap";
    } catch (e: any) {
      parseError = e?.message?.slice(0, 300);
    }
  }

  return NextResponse.json({
    isDemo,
    rawLength: raw.length,
    rawPreview: raw.slice(0, 500),
    rawEnd: raw.slice(-200),
    parsed: parsed ? {
      examNames: (parsed as any)?.examNames,
      comparisonCount: (parsed as any)?.comparison?.length,
      hasCommonSyllabus: !!(parsed as any)?.commonSyllabus,
      hasOverlap: !!(parsed as any)?.overlap,
      hasCareerPathways: !!(parsed as any)?.careerPathways,
      keys: Object.keys(parsed as any),
    } : null,
    parseError,
    validationError,
  });
}
