import { NextRequest, NextResponse } from "next/server";
import { jsonWithFallback } from "@/lib/ai/json-with-fallback";
import type { GeneratedPaper, GeneratedQuestion, SourceRef } from "@/types";

function isGeneratedPaper(v: unknown): v is GeneratedPaper {
  const r = v as any;
  return (
    !!r &&
    typeof r === "object" &&
    Array.isArray(r.questions) &&
    Array.isArray(r.sections)
  );
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================
// AI Personalized Question Paper Generator
// ============================================================
// Receives a full configuration object from the client and
// returns a strict GeneratedPaper via getLLM().json<T>().
// The system prompt enforces: honest AI-generated provenance,
// no claim of being an official paper or prediction, schema
// compliance, and source tagging (every source tagged
// AI_GENERATED). A defensive sanitizer re-aligns the AI output
// to the strict shape so the test-taking UI never breaks.
// ============================================================

const SYSTEM_PROMPT = `You are ExamIntel's Personalized Question Paper Generator — a meticulous examiner who assembles full-length, attemptable practice papers tailored to a serious aspirant's configuration.

Your job: given a configuration (exam name, total questions, duration, subjects, topics, difficulty, question types, marking scheme, negative marking, section distribution, and a generation "mode"), produce a STRICT JSON object matching the GeneratedPaper schema provided below. The paper must be a real, attemptable practice paper — every question must have a question stem, 2–4 options, exactly one correct option, an explanation, a topic tag, a difficulty, marks, and negative marks.

Core principles (NON-NEGOTIABLE):
1. This is an AI-GENERATED PRACTICE PAPER. It is NOT an official paper, NOT a prediction, NOT a leak, and NOT derived from copyrighted official content. State this honestly in the "disclaimer" field.
2. Every question's "sourceType" MUST be "AI_GENERATED". Every entry in "sources" MUST have type "AI_GENERATED" with a clear label (e.g. "AI-Generated Practice Question", "AI-Generated Paper").
3. Respect the user's configuration: produce exactly "totalQuestions" questions; honour the requested difficulty distribution, subject/topic coverage, marking scheme, negative marking, and section distribution when provided. If "mode" is "Weakness-Focused", emphasise the user-provided topics; if "PYQ-Inspired", mirror common PYQ patterns WITHOUT copying any real PYQ verbatim; if "Mixed Difficulty", mix Easy/Medium/Hard; if "Exam Simulation", stick to the real exam's pattern; if "Concept Mastery", deepen conceptual coverage on the given topics; if "Balanced Practice", balance coverage across all listed subjects/topics.
4. Each question must have a stable unique id ("q1", "q2", ...), a section name, a 1-based questionNumber, a questionType from the allowed enum, a clear question stem, 2–4 options (4 for MCQ; arrays for multi-correct / match / statement types), the correctAnswer string EXACTLY matching one of the options, a topic, difficulty ∈ {Easy, Medium, Hard}, marks (number), negativeMarks (number), and a concise explanation that actually justifies the correct answer.
5. The "markingScheme" string should summarise marks (e.g. "+2 per correct, -0.5 per incorrect"). "durationMinutes" and "totalQuestions" must match the configuration.
6. Sections array: one entry per section, each with name, questions count, marksPerQuestion, and negativeMarking (number). The sum of section questions should equal totalQuestions.
7. Be honest: do not invent an "official" feel. Do not tag sources as OFFICIAL. Do not copy real PYQs verbatim — paraphrase patterns only.
8. generatedAt must be the current ISO timestamp.

Return ONLY the JSON object. No markdown, no commentary, no code fences.`;

const SCHEMA_HINT = `GeneratedPaper = {
  examName: string,
  mode: "Exam Simulation" | "Weakness-Focused" | "Balanced Practice" | "Concept Mastery" | "PYQ-Inspired" | "Mixed Difficulty",
  totalQuestions: number,
  durationMinutes: number,
  sections: { name: string, questions: number, marksPerQuestion: number, negativeMarking: number }[],
  questions: GeneratedQuestion[],
  markingScheme: string,
  sources: { type: "AI_GENERATED", label: string, detail?: string }[],
  generatedAt: string (ISO timestamp),
  disclaimer: string
}

GeneratedQuestion = {
  id: string,
  section: string,
  questionNumber: number,
  questionType: "MCQ" | "Multiple Correct" | "Assertion & Reason" | "Match the Following" | "Statement-based" | "True/False",
  question: string,
  options: string[],
  correctAnswer: string,
  topic: string,
  difficulty: "Easy" | "Medium" | "Hard",
  marks: number,
  negativeMarks: number,
  explanation: string,
  sourceType: "AI_GENERATED"
}`;

interface PaperConfig {
  examName?: string;
  totalQuestions?: number;
  durationMinutes?: number;
  subjects?: string[];
  topics?: string[];
  difficulty?: "Easy" | "Medium" | "Hard" | "Mixed";
  questionTypes?: string[];
  markingScheme?: string;
  negativeMarking?: string;
  sections?: { name?: string; questions?: number; marksPerQuestion?: number; negativeMarking?: number }[];
  mode?:
    | "Exam Simulation"
    | "Weakness-Focused"
    | "Balanced Practice"
    | "Concept Mastery"
    | "PYQ-Inspired"
    | "Mixed Difficulty";
}

const ALLOWED_MODES = new Set([
  "Exam Simulation",
  "Weakness-Focused",
  "Balanced Practice",
  "Concept Mastery",
  "PYQ-Inspired",
  "Mixed Difficulty",
]);
const ALLOWED_QTYPES = new Set([
  "MCQ",
  "Multiple Correct",
  "Assertion & Reason",
  "Match the Following",
  "Statement-based",
  "True/False",
]);
const ALLOWED_DIFF = new Set(["Easy", "Medium", "Hard"]);

function buildUserPrompt(cfg: PaperConfig): string {
  const examName = cfg.examName?.trim() || "SSC CGL";
  const total = Number.isFinite(cfg.totalQuestions) ? Number(cfg.totalQuestions) : 10;
  const duration = Number.isFinite(cfg.durationMinutes) ? Number(cfg.durationMinutes) : 15;
  const subjects = Array.isArray(cfg.subjects) ? cfg.subjects.filter(Boolean) : [];
  const topics = Array.isArray(cfg.topics) ? cfg.topics.filter(Boolean) : [];
  const difficulty = cfg.difficulty || "Mixed";
  const qtypes = Array.isArray(cfg.questionTypes) ? cfg.questionTypes.filter(Boolean) : [];
  const markingScheme = cfg.markingScheme?.trim() || "+2 / -0.5";
  const neg = cfg.negativeMarking?.trim() || "0.5";
  const sections = Array.isArray(cfg.sections) ? cfg.sections : [];
  const mode = cfg.mode && ALLOWED_MODES.has(cfg.mode) ? cfg.mode : "Balanced Practice";

  const sectionsBlock =
    sections.length > 0
      ? sections
          .map(
            (s, i) =>
              `  ${i + 1}. ${s.name ?? "—"} — ${s.questions ?? "?"} questions, ${s.marksPerQuestion ?? "?"} marks each, negative marking ${s.negativeMarking ?? neg}`
          )
          .join("\n")
      : "  (no explicit section distribution — auto-distribute across the requested subjects)";

  return `Generate a personalized practice paper with this configuration:

- Exam name: "${examName}"
- Total questions: ${total}
- Duration (minutes): ${duration}
- Subjects: ${subjects.length ? subjects.join(", ") : "(AI may pick sensible defaults for the exam)"}
- Topics to emphasise: ${topics.length ? topics.join(", ") : "(AI picks representative topics for the exam)"}
- Overall difficulty: ${difficulty}
- Allowed question types: ${qtypes.length ? qtypes.join(", ") : "MCQ (default)"}
- Marking scheme: ${markingScheme}
- Negative marking: ${neg} per incorrect
- Generation mode: ${mode}

Section distribution requested:
${sectionsBlock}

Mode guidance:
${modeGuidance(mode)}

Constraints (NON-NEGOTIABLE):
- Produce exactly ${total} questions with ids "q1".."q${total}".
- questionNumber goes from 1 to ${total}.
- Each question's correctAnswer MUST be an EXACT string copy of one of its options.
- Each question's sourceType MUST be "AI_GENERATED".
- Sections array sum of "questions" should equal ${total}.
- markingScheme: "${markingScheme}". durationMinutes: ${duration}. totalQuestions: ${total}.
- "disclaimer" must clearly state this is an AI-generated practice paper, NOT an official paper or prediction.
- "generatedAt": "${new Date().toISOString()}".
- Tag every source as type "AI_GENERATED".
- Return ONLY the JSON object.`;
}

function modeGuidance(mode: string): string {
  switch (mode) {
    case "Exam Simulation":
      return "- Mimic the real exam's pattern, section structure, difficulty, and time pressure. Do not include anything not in the standard pattern.";
    case "Weakness-Focused":
      return "- Concentrate questions on the user-supplied topics/subjects. Use slightly harder variants to expose weaknesses.";
    case "Balanced Practice":
      return "- Spread questions evenly across all listed subjects and a mix of difficulties (Easy/Medium/Hard).";
    case "Concept Mastery":
      return "- Pick the listed topics and go deep: each question should test a distinct concept or sub-skill, with thorough explanations.";
    case "PYQ-Inspired":
      return "- Mirror common previous-year-question patterns (style and weight) WITHOUT copying any real PYQ verbatim. Paraphrase patterns only.";
    case "Mixed Difficulty":
      return "- Deliberately mix Easy / Medium / Hard questions so the user gets a varied challenge.";
    default:
      return "- Produce a balanced, attemptable practice paper.";
  }
}

// ---------- defensive normalization ----------
function sanitizePaper(raw: GeneratedPaper, cfg: PaperConfig): GeneratedPaper {
  const now = new Date().toISOString();
  const examName = cfg.examName?.trim() || raw.examName || "SSC CGL";
  const mode =
    raw.mode && ALLOWED_MODES.has(raw.mode)
      ? raw.mode
      : cfg.mode && ALLOWED_MODES.has(cfg.mode)
        ? cfg.mode
        : "Balanced Practice";

  // --- questions ---
  let qs = Array.isArray(raw.questions) ? raw.questions : [];
  // strip / normalise each question
  qs = qs.map((q, i) => {
    const id = `q${i + 1}`;
    const section = typeof q.section === "string" && q.section.trim() ? q.section : "General";
    const questionNumber = Number.isFinite(q.questionNumber) ? q.questionNumber : i + 1;
    const questionType =
      q.questionType && ALLOWED_QTYPES.has(q.questionType) ? q.questionType : "MCQ";
    const question = typeof q.question === "string" ? q.question : "";
    const options = Array.isArray(q.options)
      ? q.options.map((o) => (typeof o === "string" ? o : String(o))).filter((o) => o.length > 0)
      : [];
    // correctAnswer must match an option exactly; otherwise pick first option (or empty)
    let correctAnswer =
      typeof q.correctAnswer === "string" && q.correctAnswer.length > 0 ? q.correctAnswer : "";
    if (options.length > 0 && !options.includes(correctAnswer)) {
      correctAnswer = options[0];
    }
    const topic = typeof q.topic === "string" && q.topic.trim() ? q.topic : "General";
    const difficulty: "Easy" | "Medium" | "Hard" = ALLOWED_DIFF.has(q.difficulty)
      ? (q.difficulty as "Easy" | "Medium" | "Hard")
      : "Medium";
    const marks = Number.isFinite(q.marks) ? Number(q.marks) : 2;
    const negativeMarks = Number.isFinite(q.negativeMarks) ? Number(q.negativeMarks) : 0.5;
    const explanation = typeof q.explanation === "string" ? q.explanation : "";
    return {
      id,
      section,
      questionNumber,
      questionType,
      question,
      options,
      correctAnswer,
      topic,
      difficulty,
      marks,
      negativeMarks,
      explanation,
      sourceType: "AI_GENERATED" as const,
    } satisfies GeneratedQuestion;
  });
  // ensure we keep the requested count if AI produced more; if AI produced fewer, keep what we have
  const requestedTotal = Number.isFinite(cfg.totalQuestions) ? Number(cfg.totalQuestions) : qs.length;
  if (qs.length > requestedTotal) {
    qs = qs.slice(0, requestedTotal).map((q, i) => ({ ...q, id: `q${i + 1}`, questionNumber: i + 1 }));
  } else if (qs.length < requestedTotal) {
    // re-number what we have rather than inventing
    qs = qs.map((q, i) => ({ ...q, id: `q${i + 1}`, questionNumber: i + 1 }));
  }

  // --- sections ---
  const sections = (Array.isArray(raw.sections) ? raw.sections : [])
    .map((s) => ({
      name: typeof s.name === "string" && s.name ? s.name : "General",
      questions: Number.isFinite(s.questions) ? Number(s.questions) : 0,
      marksPerQuestion: Number.isFinite(s.marksPerQuestion) ? Number(s.marksPerQuestion) : 2,
      negativeMarking: Number.isFinite(s.negativeMarking) ? Number(s.negativeMarking) : 0.5,
    }))
    .filter((s) => s.questions > 0);

  // --- sources: force every source to AI_GENERATED, ensure at least one entry ---
  let sources: SourceRef[] = Array.isArray(raw.sources) ? raw.sources : [];
  if (sources.length === 0) {
    sources = [{ type: "AI_GENERATED", label: "AI-Generated Practice Paper" }];
  } else {
    sources = sources.map((s) => ({
      type: "AI_GENERATED" as const,
      label: typeof s.label === "string" && s.label ? s.label : "AI-Generated",
      detail: typeof s.detail === "string" && s.detail ? s.detail : undefined,
    }));
  }

  const markingScheme =
    typeof raw.markingScheme === "string" && raw.markingScheme.trim()
      ? raw.markingScheme
      : cfg.markingScheme?.trim() || "+2 / -0.5";
  const durationMinutes = Number.isFinite(raw.durationMinutes)
    ? Number(raw.durationMinutes)
    : Number.isFinite(cfg.durationMinutes)
      ? Number(cfg.durationMinutes)
      : 15;
  const totalQuestions = qs.length;

  const disclaimer =
    typeof raw.disclaimer === "string" && raw.disclaimer.trim()
      ? raw.disclaimer
      : "AI-generated practice paper. Not an official paper, prediction, or leak. Use for practice only.";

  return {
    examName,
    mode,
    totalQuestions,
    durationMinutes,
    sections,
    questions: qs,
    markingScheme,
    sources,
    generatedAt: typeof raw.generatedAt === "string" && raw.generatedAt ? raw.generatedAt : now,
    disclaimer,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const cfg: PaperConfig = body?.config ?? body ?? {};

    // light validation — require at least examName or totalQuestions
    if (
      (!cfg.examName || typeof cfg.examName !== "string") &&
      !Number.isFinite(cfg.totalQuestions)
    ) {
      return NextResponse.json(
        { error: "Provide at least an examName or totalQuestions." },
        { status: 400 }
      );
    }

    const userPrompt = buildUserPrompt(cfg);
    const raw = await jsonWithFallback<GeneratedPaper>(SYSTEM_PROMPT, userPrompt, SCHEMA_HINT, isGeneratedPaper);

    let paper: GeneratedPaper;
    try {
      paper = sanitizePaper(raw, cfg);
    } catch (normErr) {
      console.error("[paper/generate] sanitizePaper error:", normErr);
      paper = raw;
    }

    return NextResponse.json({ paper });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Paper generation failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
