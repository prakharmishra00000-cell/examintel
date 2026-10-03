import { NextRequest, NextResponse } from "next/server";
import { directJson } from "@/lib/ai/direct-call";
import type { MCQSet, GeneratedMCQ, SourceRef, SourceType } from "@/types";

function isMCQSet(v: unknown): v is MCQSet {
  const r = v as any;
  return !!r && typeof r === "object" && Array.isArray(r.mcqs);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You are ExamIntel's PDF-Grounded MCQ Generator — an expert competitive-exam item writer who produces strictly-typed, validated multiple-choice questions from grounded source material.

Your job: take the user's source, content, topic, difficulty, questionCount, questionType and mode and return a STRICT-JSON object that matches the MCQSet shape exactly. Generate exactly the requested number of questions (or as close as the source allows — never invent filler).

GROUNDING RULES:
- In "Strict PDF Mode": every question MUST be derivable from the provided content. Do NOT introduce facts, numbers, definitions, dates or claims that are not supported by the content. Each MCQ MUST include sourcePassage (a short verbatim or near-verbatim quote from the content that justifies the question) and sourcePage when a page number is supplied in the content. Tag sourceType = "UPLOADED_DOCUMENT" for every MCQ in strict mode.
- In "Source + Exam Mode": use the content as primary ground, but you may extend with widely-accepted exam knowledge (formulas, standard definitions). Tag sourceType = "AI_GENERATED" for extended items and "UPLOADED_DOCUMENT" for items directly quoting the content.
- In "Practice Mode" (no content provided): generate exam-grade practice questions on the chosen topic. Tag every MCQ sourceType = "AI_GENERATED". Provide sourcePassage only if you can quote a canonical rule; otherwise omit it.
- In "Evolution Mode": produce progressive variants on the topic (from basic to advanced). Tag sourceType = "AI_GENERATED".

PER-MCQ SHAPE & VALIDATION:
- id: stable string like "q1", "q2"... unique across the set.
- question: a complete, self-contained question (no "Refer to the passage above" without quoting the passage inline or in sourcePassage).
- options: array of 3–6 strings (typically 4). Distinct. No "All of the above" as a free dodge — if used, it must be a real, evaluable option.
- correctAnswer: MUST be a verbatim member of the options array. For standard "MCQ" questionType, exactly one option is correct. For "Multiple correct" questionType, format correctAnswer as a comma-separated list of the correct option strings (e.g. "Option A, Option C"); the explanation must justify each.
- explanation: 1–4 sentences — concise, no chain-of-thought, no "let's think step by step". Must justify the correct answer AND, when useful, briefly note why a tempting distractor is wrong.
- topic: a short topic label (≤ 5 words). May vary across the set to cover subtopics when mode allows.
- difficulty: "Easy" | "Medium" | "Hard". When the requested difficulty is "Mixed", distribute across Easy/Medium/Hard in roughly equal proportions.
- sourcePassage (optional, REQUIRED in Strict PDF Mode): a short verbatim quote.
- sourcePage (optional, REQUIRED in Strict PDF Mode when the content includes page markers).
- sourceType: per the rules above — "UPLOADED_DOCUMENT" for strict-mode items, "AI_GENERATED" otherwise.
- validationStatus: "verified" when (a) single correct answer for standard MCQ, (b) correctAnswer ∈ options, (c) explanation is consistent with correctAnswer, (d) no duplicate questions, (e) no unsupported claims in strict mode. Otherwise "needs-review". Use "needs-review" sparingly and only when genuinely uncertain.

SET-LEVEL FIELDS:
- source: echo the user-supplied source label.
- topic: echo the user-supplied topic (or the dominant topic in Practice Mode).
- difficulty: echo the user-supplied difficulty.
- questionCount: the number of MCQs you actually produced (≤ the requested count).
- questionType: echo the user-supplied questionType.
- mode: echo the user-supplied mode.
- sources: array of SourceRef — at minimum one entry. In Strict PDF Mode include a source of type "UPLOADED_DOCUMENT" labelled "Uploaded PDF content" (or the source label). Always also include one "AI_GENERATED" entry labelled "ExamIntel MCQ Generator".
- generatedAt: current ISO 8601 timestamp.

FORMATTING:
- Output ONLY valid JSON. No markdown, no commentary, no code fences.
- All keys must exactly match the MCQSet shape.
- Strings must be plain (no nested JSON, no markdown headers).
- Do NOT expose chain-of-thought. Explanations are concise and student-facing.`;

const SCHEMA = `{
  "source": string,                          // e.g. "Uploaded PDF"
  "topic": string,                           // e.g. "Quantitative Aptitude"
  "difficulty": "Easy" | "Medium" | "Hard" | "Mixed",
  "questionCount": number,                   // number of MCQs actually produced
  "questionType": string,                    // e.g. "MCQ" | "Multiple correct" | "Assertion & Reason" | "Match the following" | "Statement-based" | "True/False"
  "mode": "Strict PDF Mode" | "Source + Exam Mode" | "Practice Mode" | "Evolution Mode",
  "mcqs": GeneratedMCQ[],
  "sources": SourceRef[],
  "generatedAt": string                     // ISO 8601
}

GeneratedMCQ = {
  "id": string,                              // stable, e.g. "q1"
  "question": string,
  "options": string[],                       // distinct, 3–6 entries
  "correctAnswer": string,                   // MUST be a verbatim member of options (or comma-separated list for Multiple correct)
  "explanation": string,                    // concise, no chain-of-thought
  "topic": string,
  "difficulty": "Easy" | "Medium" | "Hard",
  "sourcePassage"?: string,                  // REQUIRED in Strict PDF Mode
  "sourcePage"?: number,                     // REQUIRED in Strict PDF Mode when content has page markers
  "sourceType": "UPLOADED_DOCUMENT" | "AI_GENERATED",
  "validationStatus": "verified" | "needs-review"
}`;

function coerceDifficulty(d: unknown): "Easy" | "Medium" | "Hard" | "Mixed" {
  const v = String(d ?? "Mixed").trim();
  if (v === "Easy" || v === "Medium" || v === "Hard" || v === "Mixed") return v;
  return "Mixed";
}

function coerceMode(m: unknown): "Strict PDF Mode" | "Source + Exam Mode" | "Practice Mode" | "Evolution Mode" {
  const v = String(m ?? "Practice Mode").trim();
  if (
    v === "Strict PDF Mode" ||
    v === "Source + Exam Mode" ||
    v === "Practice Mode" ||
    v === "Evolution Mode"
  )
    return v;
  return "Practice Mode";
}

function sanitizeMCQSet(
  raw: MCQSet,
  args: {
    source: string;
    topic: string;
    difficulty: "Easy" | "Medium" | "Hard" | "Mixed";
    questionCount: number;
    questionType: string;
    mode: "Strict PDF Mode" | "Source + Exam Mode" | "Practice Mode" | "Evolution Mode";
  },
): MCQSet {
  const strict = args.mode === "Strict PDF Mode";
  const seenQuestions = new Set<string>();
  const seenIds = new Set<string>();

  const mcqs: GeneratedMCQ[] = Array.isArray(raw?.mcqs) ? raw.mcqs : [];
  const cleaned: GeneratedMCQ[] = [];
  let idx = 0;
  for (const m of mcqs) {
    if (!m || typeof m !== "object") continue;
    idx += 1;
    const id = typeof m.id === "string" && m.id.trim() && !seenIds.has(m.id) ? m.id.trim() : `q${idx}`;
    seenIds.add(id);

    const options: string[] = Array.isArray(m.options)
      ? m.options.map((o) => String(o ?? "").trim()).filter((o) => o.length > 0)
      : [];
    // de-duplicate options while preserving order
    const uniqOptions: string[] = [];
    for (const o of options) {
      if (!uniqOptions.includes(o)) uniqOptions.push(o);
    }

    let correct = typeof m.correctAnswer === "string" ? m.correctAnswer.trim() : "";
    // If the AI returned an index instead of a string, fix it.
    if (typeof m.correctAnswer === "number" && uniqOptions[m.correctAnswer]) {
      correct = uniqOptions[m.correctAnswer];
    }
    // For "Multiple correct" the AI may have returned an array — join it.
    if (Array.isArray(m.correctAnswer) && m.correctAnswer.length > 0) {
      const parts = m.correctAnswer
        .map((c) => String(c).trim())
        .filter((c) => uniqOptions.includes(c));
      correct = parts.join(", ");
    }
    // Validate: every comma-separated part must be a verbatim option member
    const parts = correct.split(",").map((p) => p.trim()).filter(Boolean);
    const validParts = parts.filter((p) => uniqOptions.includes(p));
    if (validParts.length === 0 && uniqOptions.length > 0) {
      // fall back to first option so the UI never breaks
      correct = uniqOptions[0];
    } else if (validParts.length !== parts.length) {
      correct = validParts.join(", ");
    }

    const question = typeof m.question === "string" ? m.question.trim() : "";
    if (!question || seenQuestions.has(question)) continue; // drop duplicates
    seenQuestions.add(question);

    const explanation = typeof m.explanation === "string" ? m.explanation.trim() : "";
    const topic = typeof m.topic === "string" && m.topic.trim() ? m.topic.trim() : args.topic;
    const dRaw = String(m.difficulty ?? "").trim();
    const difficulty: "Easy" | "Medium" | "Hard" =
      dRaw === "Easy" || dRaw === "Medium" || dRaw === "Hard" ? dRaw : "Medium";

    const sourcePassage = typeof m.sourcePassage === "string" && m.sourcePassage.trim() ? m.sourcePassage.trim() : undefined;
    const sourcePage = typeof m.sourcePage === "number" && Number.isFinite(m.sourcePage) ? m.sourcePage : undefined;

    let sourceType: SourceType = m.sourceType === "UPLOADED_DOCUMENT" || m.sourceType === "AI_GENERATED" ? m.sourceType : "AI_GENERATED";
    if (strict) sourceType = "UPLOADED_DOCUMENT";
    else if (sourceType !== "AI_GENERATED" && sourceType !== "UPLOADED_DOCUMENT") sourceType = "AI_GENERATED";

    // validationStatus re-evaluation
    let status: "verified" | "needs-review" = "verified";
    const reasons: string[] = [];
    if (uniqOptions.length < 2) reasons.push("Fewer than 2 distinct options");
    if (validParts.length === 0) reasons.push("correctAnswer not found in options");
    if (!explanation) reasons.push("Missing explanation");
    if (strict && !sourcePassage) reasons.push("Strict PDF mode requires a sourcePassage");
    if (reasons.length > 0) status = "needs-review";
    // Respect AI's "needs-review" flag too
    if (m.validationStatus === "needs-review") status = "needs-review";

    cleaned.push({
      id,
      question,
      options: uniqOptions,
      correctAnswer: correct,
      explanation,
      topic,
      difficulty,
      sourcePassage,
      sourcePage,
      sourceType,
      validationStatus: status,
    });
  }

  // Ensure sources array
  const sources: SourceRef[] = Array.isArray(raw?.sources) && raw.sources.length > 0 ? raw.sources : [];
  const fixedSources: SourceRef[] = sources
    .filter((s) => s && typeof s === "object")
    .map((s) => ({
      type: (["OFFICIAL", "UPLOADED_DOCUMENT", "SEARCH_SOURCE", "USER_INPUT", "AI_ANALYSIS", "AI_GENERATED"].includes(s.type) ? s.type : "AI_GENERATED") as SourceType,
      label: typeof s.label === "string" && s.label ? s.label : "ExamIntel MCQ Generator",
      detail: typeof s.detail === "string" && s.detail ? s.detail : undefined,
    }));

  if (strict && !fixedSources.some((s) => s.type === "UPLOADED_DOCUMENT")) {
    fixedSources.unshift({
      type: "UPLOADED_DOCUMENT",
      label: "Uploaded PDF content",
      detail: args.source,
    });
  }
  if (!fixedSources.some((s) => s.type === "AI_GENERATED")) {
    fixedSources.push({ type: "AI_GENERATED", label: "ExamIntel MCQ Generator" });
  }

  return {
    source: args.source,
    topic: args.topic,
    difficulty: args.difficulty,
    questionCount: cleaned.length,
    questionType: args.questionType,
    mode: args.mode,
    mcqs: cleaned,
    sources: fixedSources,
    generatedAt: raw?.generatedAt && typeof raw.generatedAt === "string" ? raw.generatedAt : new Date().toISOString(),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const source = typeof body?.source === "string" && body.source.trim() ? body.source.trim() : "Topic";
    const content = typeof body?.content === "string" ? body.content : "";
    const topic = typeof body?.topic === "string" && body.topic.trim() ? body.topic.trim() : "General";
    const difficulty = coerceDifficulty(body?.difficulty);
    const questionCount = Number.isFinite(body?.questionCount) && Number(body.questionCount) > 0
      ? Math.min(50, Math.max(1, Math.floor(Number(body.questionCount))))
      : 5;
    const questionType = typeof body?.questionType === "string" && body.questionType.trim() ? body.questionType.trim() : "MCQ";
    const requestedMode = coerceMode(body?.mode);
    const examName = typeof body?.examName === "string" && body.examName.trim() ? body.examName.trim() : "";

    // Auto-derive mode if the caller didn't pass an explicit Strict/Practice signal:
    // - content provided AND mode is "Practice Mode" → upgrade to "Strict PDF Mode"
    // - no content provided AND mode is "Strict PDF Mode" → downgrade to "Practice Mode"
    let mode = requestedMode;
    if (content.trim().length > 0 && mode === "Practice Mode") mode = "Strict PDF Mode";
    if (content.trim().length === 0 && mode === "Strict PDF Mode") mode = "Practice Mode";

    const userPrompt = `Generate a strict JSON MCQSet.

CONFIGURATION:
- Source: ${source}
- Topic: ${topic}
- Difficulty: ${difficulty}
- Number of questions requested: ${questionCount}
- Question type: ${questionType}
- Mode: ${mode}
${examName ? `- Target exam (for tone & relevance): ${examName}` : ""}

${content.trim().length > 0 ? `GROUNDING CONTENT (use ONLY this material in Strict PDF Mode):\n"""\n${content.trim().slice(0, 12000)}\n"""\n` : `No grounding content provided — generate exam-grade practice questions on the topic "${topic}".`}

REMEMBER:
- Produce exactly ${questionCount} questions (or as many as the source genuinely supports — never pad with filler).
- Each MCQ's correctAnswer MUST be a verbatim member of its options array (or a comma-separated list of option members for "Multiple correct").
- Tag sourceType = "UPLOADED_DOCUMENT" for items derived from the content in Strict PDF Mode; "AI_GENERATED" otherwise.
- In Strict PDF Mode, every MCQ MUST include sourcePassage (a short verbatim quote) and sourcePage if pages are present in the content.
- Set validationStatus = "needs-review" for any MCQ where you are uncertain about correctness, option consistency, or grounding — do not bluff.
- Explanations must be concise and student-facing. No chain-of-thought.
- generatedAt must be the current ISO timestamp.
- Output ONLY the JSON object matching the MCQSet shape.
- BE COMPREHENSIVE AND DETAILED — every MCQ must be a complete, well-posed, exam-grade item with a clear stem, plausible distractors, and an explanation that genuinely justifies the correct answer.`;

    const raw = await directJson<MCQSet>(SYSTEM, userPrompt, SCHEMA, isMCQSet);
    let set: MCQSet;
    try {
      set = sanitizeMCQSet(raw, {
        source,
        topic,
        difficulty,
        questionCount,
        questionType,
        mode,
      });
    } catch (normErr) {
      console.error("[mcq/generate] sanitizeMCQSet error:", normErr);
      set = raw;
    }

    return NextResponse.json({ set });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "MCQ generation failed" },
      { status: 500 }
    );
  }
}
