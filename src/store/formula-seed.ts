// Pure-data seed list of built-in formulas.
// Kept separate from formula-store.ts (which is "use client" + zustand) so
// the server-side mock provider can import this array without pulling the
// client store into the server bundle.

export interface Formula {
  id: string;
  subject: string; // e.g. "Quantitative Aptitude"
  topic: string; // e.g. "Percentage"
  name: string; // e.g. "Percentage Change"
  formula: string; // e.g. "((New - Old) / Old) × 100"
  description: string;
  example?: string;
  difficulty?: "Basic" | "Intermediate" | "Advanced";
}

// ---------- seed (built-in formulas) ----------
export const SEED_FORMULAS: Formula[] = [
  // ---- Quantitative Aptitude ----
  {
    id: "f_pct_change",
    subject: "Quantitative Aptitude",
    topic: "Percentage",
    name: "Percentage Change",
    formula: "((New − Old) / Old) × 100",
    description:
      "Percentage change measures how much a value has increased or decreased relative to its original value.",
    example:
      "Old = 200, New = 250 → ((250−200)/200)×100 = 25% increase.",
    difficulty: "Basic",
  },
  {
    id: "f_pct_to_frac",
    subject: "Quantitative Aptitude",
    topic: "Percentage",
    name: "X percent of Y",
    formula: "Result = (X / 100) × Y",
    description:
      "To find X% of Y, convert the percentage to a fraction (X/100) and multiply by Y.",
    example: "20% of 80 → (20/100) × 80 = 16.",
    difficulty: "Basic",
  },
  {
    id: "f_profit_pct",
    subject: "Quantitative Aptitude",
    topic: "Profit & Loss",
    name: "Profit Percentage",
    formula: "Profit% = (Profit / CP) × 100, where Profit = SP − CP",
    description:
      "Profit percentage is the profit expressed as a percentage of the cost price. Loss% uses the same form with Loss = CP − SP.",
    example: "CP = ₹500, SP = ₹650 → Profit = 150 → 30% profit.",
    difficulty: "Basic",
  },
  {
    id: "f_discount",
    subject: "Quantitative Aptitude",
    topic: "Profit & Loss",
    name: "Selling Price after Discount",
    formula: "SP = MP × (1 − Discount%/100)",
    description:
      "The selling price after a discount on the marked price. Equivalent to SP = MP − (Discount% × MP / 100).",
    example: "MP = ₹1200, Discount = 25% → SP = 1200 × 0.75 = ₹900.",
    difficulty: "Intermediate",
  },
  {
    id: "f_time_work",
    subject: "Quantitative Aptitude",
    topic: "Time & Work",
    name: "Work by Two Persons Together",
    formula: "T = (a × b) / (a + b)",
    description:
      "If person A completes a job in 'a' hours and person B in 'b' hours, together they finish it in (a·b)/(a+b) hours.",
    example: "A: 6h, B: 3h → T = (6×3)/(6+3) = 18/9 = 2 hours.",
    difficulty: "Intermediate",
  },
  {
    id: "f_speed_distance_time",
    subject: "Quantitative Aptitude",
    topic: "Time, Speed & Distance",
    name: "Speed, Distance, Time",
    formula: "Speed = Distance / Time",
    description:
      "The fundamental relation. Rearrange as Distance = Speed × Time, or Time = Distance / Speed. Units must be consistent (m/s or km/h).",
    example: "Distance 120 km, Time 2 h → Speed = 60 km/h.",
    difficulty: "Basic",
  },
  {
    id: "f_train_crossing",
    subject: "Quantitative Aptitude",
    topic: "Time, Speed & Distance",
    name: "Train Crossing a Pole",
    formula: "Time = Length of Train / Speed",
    description:
      "Time taken by a train of length L to pass a stationary pole (or point) at speed S is L/S. Convert km/h to m/s by multiplying by 5/18.",
    example: "L = 150 m, S = 54 km/h (=15 m/s) → Time = 150/15 = 10 s.",
    difficulty: "Intermediate",
  },
  {
    id: "f_average",
    subject: "Quantitative Aptitude",
    topic: "Average",
    name: "Average of n values",
    formula: "Average = (Sum of values) / n",
    description:
      "The arithmetic mean of n numbers is their sum divided by n. Rearranged: Sum = Average × n.",
    example: "Numbers 4, 8, 12 → Average = 24/3 = 8.",
    difficulty: "Basic",
  },
  {
    id: "f_ratio_divide",
    subject: "Quantitative Aptitude",
    topic: "Ratio & Proportion",
    name: "Divide an Amount in a Ratio",
    formula: "Share of A = Total × (a / (a + b))",
    description:
      "When an amount is divided in the ratio a : b, the share of A is Total × a/(a+b) and the share of B is Total × b/(a+b).",
    example: "Divide ₹1000 in 3:2 → A gets 1000×(3/5)=₹600, B gets ₹400.",
    difficulty: "Basic",
  },
  {
    id: "f_si",
    subject: "Quantitative Aptitude",
    topic: "Simple Interest",
    name: "Simple Interest",
    formula: "SI = (P × R × T) / 100",
    description:
      "Simple interest on principal P at rate R% per annum for T years. Amount A = P + SI.",
    example: "P = ₹1000, R = 5%, T = 2y → SI = (1000×5×2)/100 = ₹100.",
    difficulty: "Basic",
  },
  {
    id: "f_ci",
    subject: "Quantitative Aptitude",
    topic: "Compound Interest",
    name: "Compound Interest (Amount)",
    formula: "A = P × (1 + R/100)^T",
    description:
      "Amount under compound interest (compounded annually). CI = A − P. For different compounding frequencies replace R/100 by R/(n×100) and T by n×T.",
    example: "P = ₹1000, R = 10%, T = 2y → A = 1000×(1.1)^2 = ₹1210.",
    difficulty: "Intermediate",
  },
  // ---- Mensuration ----
  {
    id: "f_triangle_area",
    subject: "Mensuration",
    topic: "Triangle",
    name: "Area of Triangle",
    formula: "Area = (1/2) × base × height",
    description:
      "Area of a triangle using any side as the base and the perpendicular height to that base.",
    example: "base = 10 cm, height = 6 cm → Area = 30 cm².",
    difficulty: "Basic",
  },
  {
    id: "f_rectangle_area",
    subject: "Mensuration",
    topic: "Rectangle",
    name: "Area & Perimeter of Rectangle",
    formula: "Area = L × B, Perimeter = 2(L + B)",
    description:
      "L = length, B = breadth. Diagonal = √(L² + B²).",
    example: "L = 8 m, B = 5 m → Area = 40 m², Perimeter = 26 m.",
    difficulty: "Basic",
  },
  {
    id: "f_circle_area",
    subject: "Mensuration",
    topic: "Circle",
    name: "Area & Circumference of Circle",
    formula: "Area = π r², Circumference = 2 π r",
    description:
      "r is the radius. Diameter d = 2r, so Area = π d²/4 and Circumference = π d.",
    example: "r = 7 cm → Area = 154 cm² (π≈22/7), Circumference = 44 cm.",
    difficulty: "Basic",
  },
  // ---- Algebra ----
  {
    id: "f_quadratic",
    subject: "Algebra",
    topic: "Quadratic Equations",
    name: "Quadratic Formula",
    formula: "x = [−b ± √(b² − 4ac)] / (2a)",
    description:
      "Solutions of ax² + bx + c = 0. The discriminant Δ = b² − 4ac: Δ>0 → two real roots; Δ=0 → one repeated root; Δ<0 → complex roots.",
    example: "x² − 5x + 6 = 0 → a=1, b=−5, c=6 → x = (5 ± √1)/2 = 3 or 2.",
    difficulty: "Intermediate",
  },
  // ---- Geometry ----
  {
    id: "f_pythagoras",
    subject: "Geometry",
    topic: "Right Triangle",
    name: "Pythagoras Theorem",
    formula: "a² + b² = c²",
    description:
      "In a right-angled triangle, the square of the hypotenuse (c) equals the sum of the squares of the other two sides (a, b).",
    example: "a = 3, b = 4 → c = √(9+16) = 5.",
    difficulty: "Basic",
  },
  // ---- Trigonometry ----
  {
    id: "f_trig_identity",
    subject: "Trigonometry",
    topic: "Basic Identities",
    name: "Pythagorean Trigonometric Identity",
    formula: "sin²θ + cos²θ = 1",
    description:
      "The fundamental identity. From it: 1 + tan²θ = sec²θ and 1 + cot²θ = csc²θ.",
    example: "If sin θ = 3/5 → cos θ = 4/5 (since 9/25 + 16/25 = 1).",
    difficulty: "Intermediate",
  },
];
