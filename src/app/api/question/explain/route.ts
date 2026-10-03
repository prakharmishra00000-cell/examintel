import { NextRequest, NextResponse } from "next/server";
import { directJson } from "@/lib/ai/direct-call";
import type { QuestionExplanation } from "@/types";

function isQuestionExplanation(v: unknown): v is QuestionExplanation {
  const r = v as any;
  return !!r && typeof r === "object" && (!!r.originalQuestion || !!r.levels);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You are ExamIntel's AI Question Explainer — an expert competitive-exam tutor who explains ANY question across 5 progressive levels of depth.

Your job: take a single question from the user and produce a STRICT-JSON explanation that follows the QuestionExplanation shape exactly. You also extract structured metadata (subject, topic, subtopic, concept, difficulty, question type, related concepts, prerequisites) — this metadata feeds ExamIntel's Knowledge Graph, so be precise.

THE 5 LEVELS (mandatory):

LEVEL 1 — Quick Hint (level1_quickHint):
- A small nudge — NOT the full solution. Point the student toward the right idea without giving away the answer or the method.
- MUST NOT reveal the final answer, the full formula, or the step-by-step solution. Just enough to spark thinking.

LEVEL 2 — Concept (level2_concept):
- conceptName: short name of the underlying concept (e.g. "Speed, Distance & Time", "Pythagoras Theorem", "Percentage Change").
- coreRule: the rule/formula/definition that governs this question (e.g. "Speed = Distance / Time").
- whyItApplies: 1–2 sentences on why this rule applies to THIS question.
- shortcut: (optional) a useful derived rule or identity that simplifies the work.
- commonMistake: (optional) the trap students fall into (e.g. forgetting unit conversion, mixing up CP and SP).

LEVEL 3 — Detailed Solution (level3_detailedSolution):
- steps: an array of short numbered step descriptions (in order). Each step should be one line.
- formula: the canonical formula used (write as a plain math string, e.g. "Speed = Distance / Time").
- substitution: how the values from the question get substituted into the formula (e.g. "Speed = 150 m / 15 s").
- calculation: the arithmetic step (e.g. "150 / 15 = 10").
- finalAnswer: the final answer with units (e.g. "10 m/s = 36 km/h").
- explanation: 1–3 sentences wrapping up why the answer is what it is.

LEVEL 4 — Exam Shortcut (level4_examShortcut):
- method: a faster alternative approach (mental math, ratio, identity, elimination).
- mentalCalculation: (optional) the actual mental-math move (e.g. "150 ÷ 15 = 10 in one step").
- eliminationTechnique: (optional) how to eliminate wrong MCQ options quickly.
- timeSavingApproach: how this saves time on exam day.
- If NO shortcut genuinely applies, omit level4_examShortcut entirely.

LEVEL 5 — Learning Insight (level5_learningInsight):
- What to remember going forward — the transferable lesson, the pattern to recognize, the next concept to study. 1–2 sentences.

METADATA (for the Knowledge Graph):
- subject: e.g. "Quantitative Aptitude", "Physics", "General Studies".
- topic: e.g. "Time, Speed & Distance", "Thermodynamics".
- subtopic: more granular (e.g. "Trains & Poles").
- concept: the single canonical concept name (must match level2_concept.conceptName).
- difficulty: "Easy" | "Medium" | "Hard".
- questionType: e.g. "Numerical", "MCQ", "Word Problem", "Conceptual".
- relatedConcepts: array of closely related concept names.
- prerequisites: array of concepts the student must already know.

SOURCE TAGGING:
- Tag every source as type "AI_ANALYSIS" with label "AI Analysis" and a short detail string.
- Include at least one source entry. Add more if the question references a known exam or PYQ (e.g. label "SSC CGL PYQ pattern").

FORMATTING RULES:
- Output ONLY valid JSON. No markdown, no commentary, no code fences.
- All keys must exactly match the QuestionExplanation shape.
- Strings should be plain (no nested JSON, no markdown headers). Math expressions are fine as plain strings.
- generatedAt must be an ISO 8601 timestamp string.
- originalQuestion must echo back the user's question verbatim (trimmed).
- If the question is in a non-English language, still respond in English metadata but echo the original question as-is in originalQuestion.`;

const SCHEMA = `{
  "originalQuestion": string,
  "subject": string,
  "topic": string,
  "subtopic"?: string,
  "concept": string,
  "difficulty": "Easy" | "Medium" | "Hard",
  "questionType": string,
  "relatedConcepts"?: string[],
  "prerequisites"?: string[],
  "levels": {
    "level1_quickHint": string,                  // small nudge, NO full answer
    "level2_concept": {
      "conceptName": string,
      "coreRule": string,
      "whyItApplies": string,
      "shortcut"?: string,
      "commonMistake"?: string
    },
    "level3_detailedSolution": {
      "steps": string[],                          // ordered, one line each
      "formula"?: string,
      "substitution"?: string,
      "calculation"?: string,
      "finalAnswer": string,                       // with units
      "explanation": string
    },
    "level4_examShortcut"?: {                      // omit if not applicable
      "method": string,
      "mentalCalculation"?: string,
      "eliminationTechnique"?: string,
      "timeSavingApproach": string
    },
    "level5_learningInsight": string
  },
  "sources": SourceRef[]                           // all sources tagged AI_ANALYSIS
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const questionRaw = body?.question;
    if (!questionRaw || typeof questionRaw !== "string" || questionRaw.trim().length === 0) {
      return NextResponse.json(
        { error: "A non-empty 'question' string is required." },
        { status: 400 }
      );
    }
    const question = questionRaw.trim();

    const userPrompt = `Explain the following exam question progressively across all 5 levels. Extract metadata. Echo the question verbatim in originalQuestion.

QUESTION:
"""
${question}
"""

Remember:
- Level 1 (Quick Hint) must NOT reveal the answer or the full method.
- Level 4 (Exam Shortcut) is optional — omit the field if no genuine shortcut applies.
- Every source must be tagged type "AI_ANALYSIS".
- Set generatedAt to the current ISO timestamp.
- BE COMPREHENSIVE AND DETAILED — each level should carry complete, useful information. A real student will use all 5 levels to truly master the question.`;

    const explanation = await directJson<QuestionExplanation>(SYSTEM, userPrompt, SCHEMA, isQuestionExplanation);

    // Ensure timestamp + originalQuestion are sane even if AI forgot them.
    try {
      if (!explanation.generatedAt) {
        explanation.generatedAt = new Date().toISOString();
      }
      if (!explanation.originalQuestion || explanation.originalQuestion.trim().length === 0) {
        explanation.originalQuestion = question;
      }
      // Defensive: guarantee sources are AI_ANALYSIS
      if (!Array.isArray(explanation.sources) || explanation.sources.length === 0) {
        explanation.sources = [
          { type: "AI_ANALYSIS", label: "AI Analysis", detail: "Generated by ExamIntel Question Explainer" },
        ];
      } else {
        explanation.sources = explanation.sources.map((s) => ({
          ...s,
          type: "AI_ANALYSIS",
        }));
      }
    } catch (normErr) {
      console.error("[question/explain] normalization error:", normErr);
    }

    return NextResponse.json({ explanation });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Question explanation failed" },
      { status: 500 }
    );
  }
}
