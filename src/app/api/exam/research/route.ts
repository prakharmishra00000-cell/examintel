import { NextRequest, NextResponse } from "next/server";
import { directJson } from "@/lib/ai/direct-call";
import type { ExamResearchReport } from "@/types";

function isExamReport(v: unknown): v is ExamResearchReport {
  const r = v as any;
  // Strict validation: require the critical sections to be populated.
  // This prevents truncated AI responses (which only have basicInfo/stages)
  // from being returned — instead the mock provider's exam-aware fallback
  // kicks in, which always has complete pattern/preparation/sources.
  return (
    !!r &&
    typeof r === "object" &&
    !!r.basicInfo &&
    !!r.pattern &&
    !!r.preparation &&
    Array.isArray(r.sources) &&
    r.sources.length > 0
  );
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================
// Vercel Hobby plan has a 10-second function timeout.
// The previous verbose prompt caused the Gemini API to be cut
// off mid-JSON, losing the syllabus/pattern/preparation/sources
// fields. This rewrite:
//   1. Reorders the schema so CRITICAL fields come FIRST
//      (basicInfo → pattern → preparation → sources → caveats)
//      and the verbose syllabus goes LAST. If truncated, we
//      still have the important sections.
//   2. Caps array lengths (4 stages, 4 subjects with 3 topics,
//      4 sources, etc.) so the AI finishes faster.
//   3. Asks for 1-sentence descriptions, no padding.
// ============================================================

const SYSTEM_PROMPT = `You are ExamIntel's Exam Intelligence Researcher. Produce a STRICT JSON object for a competitive exam.

CRITICAL: You have limited response time. Be CONCISE.
- Each text field: 1 short sentence (max 20 words).
- Each array: cap at 4-6 items unless noted.
- No padding, no markdown, no commentary.

Output JSON field order (IMPORTANT — generate in this order):
1. basicInfo — small
2. pattern — small
3. preparation — medium
4. sources — small
5. caveats — small
6. stages — medium (max 4)
7. syllabus — large (max 4 subjects, max 3 topics each, max 3 subtopics each, max 3 concepts each)
8. career (optional, only if exam leads to govt jobs)
9. generatedAt

Principles:
- Distinguish OFFICIAL (rules, eligibility, pattern, syllabus from conducting body) from AI_ANALYSIS (your inferences, difficulty, sequence, mistakes).
- NEVER fabricate numbers. If unsure of vacancies/dates/age-relaxations/fees, OMIT and add to "caveats".
- "infoCurrency": "current" | "historical" | "mixed".
- Sources: include at least 1 OFFICIAL (conducting body website) + 1 AI_ANALYSIS.
- "generatedAt" = current ISO timestamp.

Return ONLY the JSON object.`;

const SCHEMA_HINT = `ExamResearchReport = {
  basicInfo: { name: string, conductingOrganisation: string, examPurpose: string (1 sentence), officialWebsite?: string, examFrequency: string, cycleInfo: string, qualification: string, ageLimit: string, nationality: string, importantEligibility: string[] (max 4), infoCurrency: "current"|"historical"|"mixed" },
  pattern: { totalQuestions: number, maxMarks: number, duration: string, questionType: string, markingScheme: string (1 sentence), negativeMarking: string (1 sentence), sectionDistribution: { section: string, questions: number, marks: number }[] (max 5), sectionalTiming: string, qualifyingRequirements: string[] (max 3), stageSpecificRules?: string[] (max 3) },
  preparation: { difficultyCharacteristics: string (1 sentence), frequentlyTestedTopics: string[] (max 6), importantSubjects: string[] (max 4), commonMistakes: string[] (max 5), recommendedSequence: string[] (max 6, each ≤10 words), pyqImportance: string (1 sentence), topicDependencies: string[] (max 5), highPriorityPrerequisites: string[] (max 5) },
  sources: { type: "OFFICIAL"|"UPLOADED_DOCUMENT"|"SEARCH_SOURCE"|"USER_INPUT"|"AI_ANALYSIS"|"AI_GENERATED", label: string, detail?: string }[] (max 5),
  caveats: string[] (max 4),
  stages: { name: string, description: string (1 sentence), sequence: number, details?: string[] (max 3) }[] (max 4),
  syllabus: { subject: string, topics: { name: string, subtopics: { name: string, concepts: string[] (max 3), difficulty?: "Easy"|"Medium"|"Hard" }[] (max 3), difficulty?: "Easy"|"Medium"|"Hard"|"Mixed" }[] (max 3) }[] (max 4),
  career?: { posts: string[] (max 4), departments: string[] (max 3), jobRoles: string[] (max 3), payLevel: string, careerProgression: string (1 sentence), workProfile: string (1 sentence) },
  generatedAt: string (ISO timestamp)
}`;

function buildUserPrompt(query: string): string {
  const trimmed = query.trim();
  const now = new Date().toISOString();
  return `Research exam: "${trimmed}"

Return ONLY the JSON. Set "generatedAt" to "${now}".
Be CONCISE — 1-sentence field values, cap arrays. Generate fields in this exact order: basicInfo, pattern, preparation, sources, caveats, stages, syllabus, career, generatedAt.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query: string | undefined = body?.query;
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return NextResponse.json(
        { error: "A 'query' string of at least 2 characters is required." },
        { status: 400 }
      );
    }

    const userPrompt = buildUserPrompt(query);
    const report = await directJson<ExamResearchReport>(SYSTEM_PROMPT, userPrompt, SCHEMA_HINT, isExamReport);

    return NextResponse.json({ report });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Exam research failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
