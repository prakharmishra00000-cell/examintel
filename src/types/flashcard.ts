// ============================================================
// Spaced Repetition Flashcards — shared types
// SM-2 algorithm fields + mastery tracking
// ============================================================

export type FlashcardDifficulty = "Easy" | "Medium" | "Hard";
export type FlashcardMastery =
  | "New"
  | "Learning"
  | "Reviewing"
  | "Mastered";

export interface Flashcard {
  id: string;
  /** Question / term — what's shown on the front */
  front: string;
  /** Answer / definition — what's revealed on flip */
  back: string;
  topic: string;
  difficulty: FlashcardDifficulty;

  // ---- SM-2 spaced repetition fields ----
  /** SM-2 ease factor, default 2.5, never below 1.3 */
  easeFactor: number;
  /** Days until next review, default 1 */
  interval: number;
  /** Consecutive correct responses, default 0 */
  repetitions: number;
  /** ISO date string — when the card is next due */
  nextReview: string;
  /** ISO date string — when last reviewed (optional) */
  lastReviewed?: string;
  /** Derived mastery bucket */
  mastery: FlashcardMastery;
}

export interface FlashcardSource {
  type: string;
  label: string;
  detail?: string;
}

export interface FlashcardSet {
  id: string;
  source: string;
  topic: string;
  cards: Flashcard[];
  sources: FlashcardSource[];
  generatedAt: string;
}
