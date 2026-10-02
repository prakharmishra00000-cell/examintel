import { NextRequest, NextResponse } from "next/server";
import { jsonWithFallback } from "@/lib/ai/json-with-fallback";
import type { ExamResearchReport } from "@/types";

function isExamReport(v: unknown): v is ExamResearchReport {
  const r = v as any;
  return !!r && typeof r === "object" && !!r.basicInfo;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are ExamIntel's Exam Intelligence Researcher — a meticulous analyst who produces structured intelligence reports on competitive exams.

Your job: given an exam name (e.g. "SSC CGL", "GATE Mechanical Engineering", "RRB JE", "UPSC CSE", "CAT"), produce a STRICT JSON object matching the ExamResearchReport schema provided below. The report must help a serious aspirant understand the exam end-to-end before starting preparation.

Core principles (NON-NEGOTIABLE):
1. Distinguish OFFICIAL information (rules, eligibility, pattern, syllabus from the exam-conducting body) from AI ANALYSIS (your inferences, difficulty ratings, recommended sequences, common mistakes). Use the "sources" array to tag every claim's origin with the appropriate SourceType.
2. NEVER fabricate exam rules. If a specific number (vacancies, dates, age relaxations, marking scheme, fees) is not verifiable from your knowledge or cannot be reliably stated, OMIT it from concrete fields and instead add an entry to "caveats" describing what couldn't be verified.
3. Use "infoCurrency" honestly: "current" if your data is from the latest known cycle; "historical" if the most recent cycle data is incomplete and you're relying on prior-cycle patterns; "mixed" if some fields are current and others historical.
4. Tag every source. Sources array must include at least: an OFFICIAL source (the conducting organisation's website), and an AI_ANALYSIS entry for your inferences. Add SEARCH_SOURCE entries for well-known reference portals when relevant.
5. The "generatedAt" field must be the current ISO timestamp (use new Date().toISOString()).
6. For syllabus, list subjects with topics, subtopics, concepts (as chips/strings), prerequisites, and difficulty (Easy/Medium/Hard). Use realistic granularity — not too coarse, not absurdly fine.
7. For the pattern, only include numbers (questions, marks, duration) you can state confidently; otherwise explain variability in markingScheme/negativeMarking strings and add a caveat.
8. For career info, include it ONLY if the exam leads to government/organisational posts with known pay, posts, departments. If the exam is an entrance for higher education (GATE, CAT, JEE etc.) where "career" means admission pathways, you may omit career or include relevant post-qualification pathways — but be honest about it.
9. Preparation info: difficulty characteristics, frequently tested topics, important subjects, common mistakes, recommended learning sequence, PYQ importance, topic dependencies, high-priority prerequisites — all derived from your analysis of the exam's pattern.
10. Be comprehensive but ACCURATE. A shorter honest report beats a longer fabricated one.

Return ONLY the JSON object. No markdown, no commentary, no code fences.`;

const SCHEMA_HINT = `ExamResearchReport = {
  basicInfo: {
    name: string,
    conductingOrganisation: string,
    examPurpose: string,
    officialWebsite?: string,
    examFrequency: string,
    cycleInfo: string,
    qualification: string,
    ageLimit: string,
    nationality: string,
    importantEligibility: string[],
    infoCurrency: "current" | "historical" | "mixed"
  },
  stages: { name: string, description: string, sequence: number, details?: string[] }[],
  syllabus: { subject: string, topics: { name: string, description?: string, subtopics: { name: string, concepts: string[], prerequisites?: string[], relatedConcepts?: string[], questionTypes?: string[], difficulty?: "Easy"|"Medium"|"Hard", pyqReference?: string }[], examRelevance?: string, difficulty?: "Easy"|"Medium"|"Hard"|"Mixed" }[] }[],
  pattern: {
    totalQuestions: number,
    maxMarks: number,
    duration: string,
    questionType: string,
    markingScheme: string,
    negativeMarking: string,
    sectionDistribution: { section: string, questions: number, marks: number }[],
    sectionalTiming: string,
    qualifyingRequirements: string[],
    stageSpecificRules?: string[]
  },
  career?: {
    posts: string[],
    departments: string[],
    jobRoles: string[],
    payLevel: string,
    basicSalary?: string,
    allowances?: string[],
    careerProgression: string,
    workProfile: string,
    posting?: string
  },
  preparation: {
    difficultyCharacteristics: string,
    frequentlyTestedTopics: string[],
    importantSubjects: string[],
    commonMistakes: string[],
    recommendedSequence: string[],
    pyqImportance: string,
    topicDependencies: string[],
    highPriorityPrerequisites: string[]
  },
  sources: { type: "OFFICIAL"|"UPLOADED_DOCUMENT"|"SEARCH_SOURCE"|"USER_INPUT"|"AI_ANALYSIS"|"AI_GENERATED", label: string, detail?: string }[],
  generatedAt: string (ISO timestamp),
  caveats: string[]
}`;

function buildUserPrompt(query: string): string {
  const trimmed = query.trim();
  return `Research the competitive exam: "${trimmed}"

Produce a complete ExamResearchReport JSON object. Follow the schema exactly.

Reminders:
- Set "generatedAt" to "${new Date().toISOString()}".
- Tag every claim with a source in "sources". Always include at least one OFFICIAL source (the conducting body's website) and one AI_ANALYSIS entry.
- Add to "caveats" anything you couldn't verify with confidence (specific vacancy counts, exact dates, recent rule changes, etc.).
- Do not invent marking schemes, age relaxations, or vacancies.
- Return ONLY the JSON.`;
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
    const report = await jsonWithFallback<ExamResearchReport>(SYSTEM_PROMPT, userPrompt, SCHEMA_HINT, isExamReport);

    return NextResponse.json({ report });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Exam research failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
