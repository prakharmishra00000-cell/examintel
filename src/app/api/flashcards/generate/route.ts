import { NextRequest, NextResponse } from "next/server";
import { jsonWithFallback } from "@/lib/ai/json-with-fallback";
import type { Flashcard, FlashcardSet } from "@/types/flashcard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isFlashcardSet(v: unknown): v is FlashcardSet {
  const r = v as any;
  return !!r && typeof r === "object" && Array.isArray(r.cards);
}

const SYSTEM = `You are ExamIntel's Spaced-Repetition Flashcard Generator — an expert tutor who creates concise, high-yield flashcards for competitive-exam preparation.

Your job: take the user's source label, topic, optional grounding content, and requested card count, and return a STRICT-JSON object that matches the FlashcardSet shape exactly. Each card is a front/back pair tuned for active recall.

FLASHCARD DESIGN RULES:
- front: a question OR a term to recall. Self-contained, no "see above" references. ≤ 18 words when possible.
- back: a concise answer / definition / worked formula. 1–4 sentences. Must directly answer the front. No chain-of-thought.
- topic: a short label (≤ 5 words). Cards may cover related subtopics under the chosen topic.
- difficulty: "Easy" (recall), "Medium" (apply), "Hard" (multi-step / analytical).
- Each card MUST include all SM-2 fields with defaults: easeFactor = 2.5, interval = 1, repetitions = 0, nextReview = today's ISO date, mastery = "New".
- Use the grounding content when provided — every claim must be supported by it. When no content is provided, generate exam-grade practice cards on the topic.
- Cards must be DISTINCT — no duplicate fronts. Cover the breadth of the topic/subtopics.
- Tag sources accurately: include one "AI_GENERATED" entry labelled "ExamIntel Flashcard Generator". If content was provided, also include a "USER_INPUT" or "UPLOADED_DOCUMENT" entry.

SET-LEVEL FIELDS:
- source: echo the user-supplied source label (e.g. "Saved Exam: SSC CGL" or "Custom topic").
- topic: echo the user-supplied topic.
- cards: array of Flashcard objects (length = requested count or as many as the source supports — never pad with filler).
- sources: array of { type, label, detail? } objects (see rules above).
- generatedAt: current ISO 8601 timestamp.

FORMATTING:
- Output ONLY valid JSON. No markdown, no commentary, no code fences.
- All keys must exactly match the FlashcardSet shape below.`;

const SCHEMA = `FlashcardSet schema (case-insensitive hint: "FlashcardSet")
{
  "source": string,
  "topic": string,
  "cards": Flashcard[],
  "sources": { "type": string, "label": string, "detail"?: string }[],
  "generatedAt": string  // ISO 8601
}

Flashcard = {
  "id": string,                          // stable, e.g. "fc1"
  "front": string,                       // question / term
  "back": string,                        // answer / definition
  "topic": string,
  "difficulty": "Easy" | "Medium" | "Hard",
  "easeFactor": number,                  // 2.5
  "interval": number,                    // 1 (days)
  "repetitions": number,                 // 0
  "nextReview": string,                  // ISO date (today)
  "lastReviewed"?: string,               // omit for new cards
  "mastery": "New" | "Learning" | "Reviewing" | "Mastered"  // "New" for fresh cards
}`;

function coerceDifficulty(d: unknown): "Easy" | "Medium" | "Hard" {
  const v = String(d ?? "Medium").trim();
  if (v === "Easy" || v === "Medium" || v === "Hard") return v;
  return "Medium";
}

function sanitizeFlashcardSet(
  raw: FlashcardSet,
  args: { source: string; topic: string; count: number }
): FlashcardSet {
  const seenFronts = new Set<string>();
  const seenIds = new Set<string>();
  const today = new Date().toISOString();
  const cleaned: Flashcard[] = [];

  const cards: Flashcard[] = Array.isArray(raw?.cards) ? (raw.cards as any[]) : [];
  let idx = 0;
  for (const c of cards) {
    if (!c || typeof c !== "object") continue;
    const front = typeof c.front === "string" ? c.front.trim() : "";
    const back = typeof c.back === "string" ? c.back.trim() : "";
    if (!front || !back) continue;
    if (seenFronts.has(front.toLowerCase())) continue; // de-dup
    seenFronts.add(front.toLowerCase());

    idx += 1;
    const id =
      typeof c.id === "string" && c.id.trim() && !seenIds.has(c.id)
        ? c.id.trim()
        : `fc${idx}`;
    seenIds.add(id);

    const topic = typeof c.topic === "string" && c.topic.trim() ? c.topic.trim() : args.topic;
    const difficulty = coerceDifficulty(c.difficulty);
    const easeFactor =
      typeof c.easeFactor === "number" && Number.isFinite(c.easeFactor) && c.easeFactor >= 1.3
        ? Math.round(c.easeFactor * 100) / 100
        : 2.5;
    const interval =
      typeof c.interval === "number" && Number.isFinite(c.interval) && c.interval > 0
        ? Math.max(1, Math.floor(c.interval))
        : 1;
    const repetitions =
      typeof c.repetitions === "number" && Number.isFinite(c.repetitions) && c.repetitions >= 0
        ? Math.max(0, Math.floor(c.repetitions))
        : 0;
    const nextReview =
      typeof c.nextReview === "string" && c.nextReview.trim()
        ? c.nextReview.trim()
        : today;
    const lastReviewed =
      typeof c.lastReviewed === "string" && c.lastReviewed.trim()
        ? c.lastReviewed.trim()
        : undefined;
    const mastery =
      c.mastery === "New" ||
      c.mastery === "Learning" ||
      c.mastery === "Reviewing" ||
      c.mastery === "Mastered"
        ? c.mastery
        : "New";

    cleaned.push({
      id,
      front,
      back,
      topic,
      difficulty,
      easeFactor,
      interval,
      repetitions,
      nextReview,
      lastReviewed,
      mastery,
    });
    if (cleaned.length >= args.count) break;
  }

  const sources: FlashcardSet["sources"] = Array.isArray(raw?.sources)
    ? (raw.sources as any[])
        .filter((s) => s && typeof s === "object")
        .map((s) => ({
          type: typeof s.type === "string" && s.type ? s.type : "AI_GENERATED",
          label: typeof s.label === "string" && s.label ? s.label : "ExamIntel Flashcard Generator",
          detail:
            typeof s.detail === "string" && s.detail ? s.detail : undefined,
        }))
    : [];
  if (!sources.some((s) => s.type === "AI_GENERATED")) {
    sources.push({ type: "AI_GENERATED", label: "ExamIntel Flashcard Generator" });
  }

  const setId =
    typeof (raw as any)?.id === "string" && (raw as any).id.trim()
      ? (raw as any).id.trim()
      : `fs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id: setId,
    source: args.source,
    topic: args.topic,
    cards: cleaned,
    sources,
    generatedAt:
      typeof raw?.generatedAt === "string" && raw.generatedAt.trim()
        ? raw.generatedAt
        : today,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const source =
      typeof body?.source === "string" && body.source.trim()
        ? body.source.trim()
        : "Custom topic";
    const content = typeof body?.content === "string" ? body.content : "";
    const topic =
      typeof body?.topic === "string" && body.topic.trim()
        ? body.topic.trim()
        : "General";
    const count = Number.isFinite(body?.count) && Number(body.count) > 0
      ? Math.min(50, Math.max(1, Math.floor(Number(body.count))))
      : 10;

    const userPrompt = `Generate a strict JSON FlashcardSet.

CONFIGURATION:
- Source label: ${source}
- Topic: ${topic}
- Number of flashcards requested: ${count}

${content.trim().length > 0 ? `GROUNDING CONTENT (use this material; every claim must be supported by it):\n"""\n${content.trim().slice(0, 12000)}\n"""\n` : `No grounding content provided — generate exam-grade practice flashcards on the topic "${topic}".`}

REMEMBER:
- Produce exactly ${count} flashcards (or as many as the source genuinely supports — never pad with filler).
- Each card MUST include SM-2 fields with defaults: easeFactor = 2.5, interval = 1, repetitions = 0, nextReview = today's ISO date, mastery = "New".
- Fronts must be distinct and self-contained. Backs must directly answer the fronts.
- generatedAt must be the current ISO timestamp.
- Output ONLY the JSON object matching the FlashcardSet shape.`;

    const raw = await jsonWithFallback<FlashcardSet>(SYSTEM, userPrompt, SCHEMA, isFlashcardSet);
    let set: FlashcardSet;
    try {
      set = sanitizeFlashcardSet(raw, { source, topic, count });
    } catch (normErr) {
      console.error("[flashcards/generate] sanitizeFlashcardSet error:", normErr);
      set = raw;
    }
    return NextResponse.json({ set });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Flashcard generation failed" },
      { status: 500 }
    );
  }
}
