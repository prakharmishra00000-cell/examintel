import { NextRequest, NextResponse } from "next/server";
import { jsonWithFallback } from "@/lib/ai/json-with-fallback";
import type {
  QuestionEvolutionReport,
  EvolvedQuestion,
  EvolutionLevel,
} from "@/types";

function isQuestionEvolutionReport(v: unknown): v is QuestionEvolutionReport {
  const r = v as any;
  return (
    !!r &&
    typeof r === "object" &&
    typeof r.sourceQuestion === "string" &&
    Array.isArray(r.variants)
  );
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You are ExamIntel's AI Question Evolution Engine — an expert competitive-exam question designer who transforms ONE source question into a structured family of 5 evolved practice variants, each preserving lineage and validated for correctness.

Your job: take a single source question (often a PYQ) from the user, analyse it (concept extraction, difficulty analysis, structure analysis), then produce exactly 5 evolved variants — one per evolution level — that together form a deliberate, labelled practice family. STRICT JSON only, matching the QuestionEvolutionReport shape exactly.

PHASE 1 — SOURCE ANALYSIS (silent, internal):
- concept extraction: identify the single canonical concept the source question tests (e.g. "Speed = Distance / Time").
- difficulty analysis: classify source difficulty as Easy | Medium | Hard.
- structure analysis: identify the question type (word problem, MCQ, numerical, conceptual), the typical distractor pattern, and the cognitive load (1-step / 2-step / multi-step / layered reasoning).
Use these three analyses to seed the variants.

PHASE 2 — EVOLVE 5 VARIANTS (mandatory, one per level):

LEVEL 1 — SAME CONCEPT, EASIER
- Same concept as the source, but simpler: use friendlier numbers, plainer language, fewer reasoning steps.
- Reduce cognitive load by one notch. Keep the concept testable in isolation.

LEVEL 2 — SAME CONCEPT, DIFFERENT FRAMING
- Same underlying concept, but reframe the scenario, wording, or context (e.g. swap a train-and-pole problem for a runner-and-flag problem).
- Difficulty should be comparable to the source. The student who understood the source should still solve it.

LEVEL 3 — MULTI-CONCEPT
- Combine the source concept with a related concept (e.g. speed + ratio, percentage + averages, geometry + algebra).
- Difficulty is Medium-to-Hard. The combination must be natural and exam-plausible, not contrived.

LEVEL 4 — DIFFICULT VARIANT
- Same concept family but harder: increase numerical complexity, improve distractor quality, deepen conceptual reasoning, or add layered conditions.
- Must remain a legitimate, well-posed question. Difficulty: Hard.

LEVEL 5 — EXAM-TRAP VARIANT
- A legitimate, difficult question engineered around a COMMON MISCONCEPTION students have on this concept.
- The trap must be honest: a plausible-looking wrong option that students pick for a real, identifiable reason. Record the trap in "commonTrap".
- NEVER create ambiguous or invalid questions. There must be exactly one unambiguously correct answer.
- Difficulty: Hard.

EACH VARIANT must include:
- level (1-5)
- levelName (short, human-readable: "Same Concept, Easier" / "Same Concept, Different Framing" / "Multi-Concept" / "Difficult Variant" / "Exam-Trap Variant")
- question: the full question text, self-contained
- options: array of 4 plausible MCQ options (string)
- correctAnswer: the EXACT string from options[] that is correct
- explanation: 1-4 sentences showing the reasoning (may include a one-line calculation)
- shortcut (optional): a faster method or mental-math move, only if genuinely applicable
- commonTrap (optional, expected on Level 5): the misconception the wrong options exploit
- validationStatus: "verified" | "needs-review" — use "needs-review" if confidence in any validation check is low
- validationNotes: array of short strings, one per validation check you performed. ALWAYS run all of these checks:
  1. single correct answer (exactly one option equals correctAnswer)
  2. mathematical correctness (re-derive the answer; confirm arithmetic)
  3. option consistency (options are same type/units/format; no duplicate options)
  4. explanation consistency (explanation matches the correctAnswer and the question)
  5. difficulty consistency (variant difficulty matches its level's intended difficulty)
  6. source concept consistency (variant still tests the source's core concept or a deliberate extension)
  7. no contradictory information
  8. no duplicate options
  9. no unsupported claims (no invented exam names, years, or PYQ attribution)
  If any check fails or is uncertain, set validationStatus = "needs-review" and explain in validationNotes.

SOURCE METADATA:
- coreConcept: the canonical concept of the source (e.g. "Speed = Distance / Time")
- subject: e.g. "Quantitative Aptitude", "Physics", "General Studies"
- topic: e.g. "Time, Speed & Distance"
- subtopic (optional): e.g. "Trains & Poles"
- difficulty: "Easy" | "Medium" | "Hard" (source difficulty)

LINEAGE:
- lineage: a single string that explains the source -> variants chain, e.g. "Source PYQ (train-pole, Medium) -> 5 variants: L1 easier, L2 reframed, L3 multi-concept, L4 harder, L5 exam-trap on relative-speed misconception."

SOURCE TAGGING — STRICT PROVENANCE RULES:
- ALL variants are AI-GENERATED. NEVER present a variant as an original PYQ.
- sources[] must include AT LEAST one entry of type "AI_GENERATED" with label "AI-Generated" and detail "Variants derived from source question".
- If the source question is a known PYQ, you MAY add a second source entry of type "AI_ANALYSIS" with label "Source PYQ pattern" and detail like "SSC CGL previous-year pattern". NEVER fabricate a specific year, exam session, or question number.
- sourceQuestion must echo back the user's question verbatim (trimmed).

FORMATTING RULES:
- Output ONLY valid JSON. No markdown, no commentary, no code fences.
- All keys must exactly match the QuestionEvolutionReport shape.
- Strings should be plain (no nested JSON, no markdown headers). Plain math expressions are fine.
- generatedAt must be an ISO 8601 timestamp string.
- producedAt must be current ISO timestamp.`;

const SCHEMA = `{
  "sourceQuestion": string,                    // verbatim echo of user's input
  "coreConcept": string,
  "subject": string,
  "topic": string,
  "subtopic"?: string,
  "difficulty": "Easy" | "Medium" | "Hard",    // source difficulty
  "variants": [                                // EXACTLY 5, levels 1..5 in order
    {
      "level": 1 | 2 | 3 | 4 | 5,
      "levelName": string,
      "question": string,
      "options": string[],                      // exactly 4
      "correctAnswer": string,                  // must equal one of options[]
      "explanation": string,
      "shortcut"?: string,
      "commonTrap"?: string,
      "validationStatus": "verified" | "needs-review",
      "validationNotes": string[]              // one per validation check
    }
  ],
  "lineage": string,
  "sources": SourceRef[]                        // at least one AI_GENERATED entry
}`;

// ---- defensive normalization ----
function normalizeReport(
  raw: QuestionEvolutionReport,
  sourceQuestion: string
): QuestionEvolutionReport {
  const out: QuestionEvolutionReport = {
    sourceQuestion:
      raw.sourceQuestion && raw.sourceQuestion.trim().length > 0
        ? raw.sourceQuestion.trim()
        : sourceQuestion,
    coreConcept: (raw.coreConcept ?? "").toString().trim() || "Unspecified concept",
    subject: (raw.subject ?? "").toString().trim() || "General",
    topic: (raw.topic ?? "").toString().trim() || "General",
    subtopic: raw.subtopic ? raw.subtopic.toString().trim() : undefined,
    difficulty:
      raw.difficulty === "Easy" || raw.difficulty === "Hard" ? raw.difficulty : "Medium",
    variants: [],
    lineage: (raw.lineage ?? "").toString().trim() ||
      "Source question -> 5 evolved variants across difficulty and concept combination.",
    sources: [],
    generatedAt:
      raw.generatedAt && /\d/.test(raw.generatedAt)
        ? raw.generatedAt
        : new Date().toISOString(),
  };

  // Normalize variants: only accept levels 1-5; coerce strings; ensure one per level.
  const levelOrder: EvolutionLevel[] = [1, 2, 3, 4, 5];
  const byLevel = new Map<EvolutionLevel, EvolvedQuestion>();
  if (Array.isArray(raw.variants)) {
    for (const v of raw.variants) {
      if (!v || typeof v !== "object") continue;
      const lvl = Number(v.level);
      if (!Number.isInteger(lvl) || lvl < 1 || lvl > 5) continue;
      const el = lvl as EvolutionLevel;
      if (byLevel.has(el)) continue; // first wins
      byLevel.set(el, v as EvolvedQuestion);
    }
  }

  for (const lvl of levelOrder) {
    const v = byLevel.get(lvl);
    if (!v) continue;
    const options: string[] = Array.isArray(v.options)
      ? v.options.map((o) => (o == null ? "" : String(o)).trim()).filter((o) => o.length > 0)
      : [];
    const correctAnswer = (v.correctAnswer ?? "").toString().trim();
    const explanation = (v.explanation ?? "").toString().trim();
    const levelName =
      (v.levelName ?? "").toString().trim() || DEFAULT_LEVEL_NAMES[lvl - 1];

    // Validation status coercion
    let validationStatus: "verified" | "needs-review" = "needs-review";
    if (v.validationStatus === "verified") validationStatus = "verified";

    // Run local validation checks
    const notes: string[] = [];
    const userNotes = Array.isArray(v.validationNotes)
      ? v.validationNotes.map((n) => (n == null ? "" : String(n)).trim()).filter(Boolean)
      : [];

    let localOk = true;

    // 1. single correct answer
    const matches = options.filter((o) => o === correctAnswer).length;
    if (matches !== 1) {
      localOk = false;
      notes.push(
        `single-correct-answer: ${matches === 0 ? "no option matches correctAnswer" : "multiple options match correctAnswer"}`
      );
    } else {
      notes.push("single-correct-answer: exactly one option matches correctAnswer");
    }

    // 2. options length
    if (options.length !== 4) {
      localOk = false;
      notes.push(`option-count: ${options.length} options (expected 4)`);
    } else {
      notes.push("option-count: 4 options present");
    }

    // 3. no duplicate options
    const dupSet = new Set(options.map((o) => o.toLowerCase()));
    if (dupSet.size !== options.length) {
      localOk = false;
      notes.push("duplicate-options: duplicates detected (case-insensitive)");
    } else {
      notes.push("duplicate-options: none");
    }

    // 4. explanation non-empty
    if (explanation.length === 0) {
      localOk = false;
      notes.push("explanation: empty");
    } else {
      notes.push("explanation: present");
    }

    // 5. correctAnswer non-empty
    if (correctAnswer.length === 0) {
      localOk = false;
      notes.push("correctAnswer: empty");
    } else {
      notes.push("correctAnswer: present");
    }

    // If user-supplied notes already flagged issues, downgrade too
    if (!localOk) validationStatus = "needs-review";

    // Preserve user notes (which contain arithmetic / conceptual checks we can't re-derive)
    const mergedNotes = userNotes.length > 0 ? userNotes : notes;

    const ev: EvolvedQuestion = {
      level: lvl,
      levelName,
      question: (v.question ?? "").toString().trim() || "(missing question text)",
      options: options.length > 0 ? options : ["(no options)"],
      correctAnswer: correctAnswer || options[0] || "(missing answer)",
      explanation: explanation || "(missing explanation)",
      shortcut: v.shortcut ? String(v.shortcut).trim() : undefined,
      commonTrap: v.commonTrap ? String(v.commonTrap).trim() : undefined,
      validationStatus,
      validationNotes: mergedNotes,
    };
    out.variants.push(ev);
  }

  // Sources: ensure at least one AI_GENERATED entry; force all entries to AI_GENERATED/AI_ANALYSIS only.
  const rawSources = Array.isArray(raw.sources) ? raw.sources : [];
  const cleanedSources = rawSources
    .filter((s) => s && typeof s === "object")
    .map((s) => {
      const type =
        s.type === "AI_ANALYSIS" ? "AI_ANALYSIS" : "AI_GENERATED";
      const label = (s.label ?? "").toString().trim() || (type === "AI_ANALYSIS" ? "AI Analysis" : "AI-Generated");
      const detail =
        type === "AI_GENERATED"
          ? "Variants derived from source question"
          : (s.detail ? String(s.detail).trim() : undefined);
      return { type, label, detail } as const;
    });

  const hasGen = cleanedSources.some((s) => s.type === "AI_GENERATED");
  if (!hasGen) {
    cleanedSources.unshift({
      type: "AI_GENERATED",
      label: "AI-Generated",
      detail: "Variants derived from source question",
    });
  }
  out.sources = cleanedSources;

  return out;
}

const DEFAULT_LEVEL_NAMES = [
  "Same Concept, Easier",
  "Same Concept, Different Framing",
  "Multi-Concept",
  "Difficult Variant",
  "Exam-Trap Variant",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const questionRaw = body?.question;
    if (
      !questionRaw ||
      typeof questionRaw !== "string" ||
      questionRaw.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "A non-empty 'question' string is required." },
        { status: 400 }
      );
    }
    const question = questionRaw.trim();

    const userPrompt = `Evolve the following source question into a 5-level practice family. Run concept extraction, difficulty analysis, and structure analysis silently, then produce all 5 variants with full validation.

SOURCE QUESTION:
"""
${question}
"""

Hard rules:
- Produce EXACTLY 5 variants, one per level (1..5), in order.
- Each variant has 4 options; correctAnswer must equal exactly one of them.
- Level 5 must include a "commonTrap" describing the misconception it exploits.
- Run all 9 validation checks per variant; record one short note per check in validationNotes[].
- Set validationStatus = "needs-review" if ANY check is uncertain or fails.
- Every variant is AI-GENERATED. NEVER present a variant as an original PYQ.
- sources[] MUST include at least one AI_GENERATED entry with detail "Variants derived from source question".
- sourceQuestion must echo the user's question verbatim.
- generatedAt = current ISO timestamp.`;

    const raw = await jsonWithFallback<QuestionEvolutionReport>(SYSTEM, userPrompt, SCHEMA, isQuestionEvolutionReport);
    let report: QuestionEvolutionReport;
    try {
      report = normalizeReport(raw, question);
    } catch (normErr) {
      console.error("[question/evolve] normalizeReport error:", normErr);
      report = raw;
    }

    return NextResponse.json({ report });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Question evolution failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
