// ============================================================
// PYQ (Previous-Year Question) Browser types
// Used by /api/pyq/browse and /api/pyq/similar endpoints,
// and rendered by the PYQBrowser view component.
// ============================================================

export interface PYQ {
  id: string;
  exam: string;
  year: string;
  topic: string;
  subject: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: "Easy" | "Medium" | "Hard";
  marks: number;
  sourceType: string; // e.g. "SEARCH_SOURCE"
  /** Optional similarity reasoning — populated by /api/pyq/similar */
  similarityReason?: string;
}

export interface PYQSet {
  exam: string;
  year: string;
  pyqs: PYQ[];
  sources: { type: string; label: string; detail?: string }[];
  generatedAt: string;
}
