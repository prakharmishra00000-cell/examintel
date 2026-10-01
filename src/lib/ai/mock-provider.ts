// ============================================================
// Mock Provider — graceful fallback when no AI key is configured
// ============================================================
// Produces structured, realistic-looking sample data so the entire
// UI is explorable. On Vercel, once OPENAI_API_KEY is set, the
// real AI provider takes over automatically.
// ============================================================
import type { LLMProvider, ChatCompletionMessage } from "./provider";
import { extractJson } from "./provider";
import { SEED_FORMULAS } from "@/store/formula-seed";

export class MockProvider implements LLMProvider {
  name = "mock (no API key configured)";
  available = false;

  async text(_system: string, _user: string): Promise<string> {
    throw new Error("No AI provider configured. Set OPENAI_API_KEY on Vercel to enable AI features.");
  }

  async json<T>(system: string, user: string, schemaHint?: string): Promise<T> {
    // Route primarily on the SCHEMA HINT (most reliable signal of expected shape),
    // falling back to combined keyword search. This avoids mis-routing when a system
    // prompt for one feature mentions words like "prerequisite" or "dependency".
    const schema = (schemaHint ?? "").toLowerCase();
    const req = (system + " " + user).toLowerCase();

    if (schema.includes("examresearchreport") || req.includes("exam intelligence researcher") || req.includes("examresearch")) {
      return mockExamResearch(user) as unknown as T;
    }
    if (schema.includes("examcomparisonreport") || req.includes("exam comparison engine") || req.includes("examcomparison")) {
      return mockExamComparison(user) as unknown as T;
    }
    if (schema.includes("dependencymapreport") || req.includes("dependency mapper") || req.includes("prerequisite-dependency mapper")) {
      return mockDependencyMap(user) as unknown as T;
    }
    if (schema.includes("questionexplanation") || req.includes("progressive question explainer") || req.includes("questionexplanation")) {
      return mockQuestionExplanation(user) as unknown as T;
    }
    if (schema.includes("questionevolutionreport") || req.includes("question evolution engine") || req.includes("questionevolution")) {
      return mockQuestionEvolution(user) as unknown as T;
    }
    if (schema.includes("generatedpaper") || req.includes("personalized question paper generator")) {
      return mockPaper(user) as unknown as T;
    }
    if (schema.includes("mcqset") || req.includes("grounded mcq generator")) {
      return mockMCQ(user) as unknown as T;
    }
    if (schema.includes("pdfanalysisreport") || req.includes("pdf exam analyzer")) {
      return mockPdfAnalysis(user) as unknown as T;
    }
    if (schema.includes("preparationplan") || req.includes("adaptive preparation simulator")) {
      return mockPreparation(user) as unknown as T;
    }
    if (schema.includes("multiexamplan") || req.includes("multi-exam preparation optimizer")) {
      return mockMultiExam(user) as unknown as T;
    }
    if (schema.includes("performanceanalysis") || req.includes("performance analysis")) {
      return mockPerformance(user) as unknown as T;
    }
    if (schema.includes("flashcardset") || req.includes("flashcard generator")) {
      return mockFlashcards(user) as unknown as T;
    }
    if (schema.includes("formulasheet") || req.includes("formula lookup")) {
      return mockFormulasLookup(user) as unknown as T;
    }
    if (schema.includes("pyqset") || schema.includes("pyqlist") || req.includes("pyq browser") || req.includes("similar-question finder")) {
      return mockPYQs(user) as unknown as T;
    }
    // generic fallback
    return extractJson<T>(`{"note":"Mock provider active. Configure OPENAI_API_KEY on Vercel for real AI.","prompt":${JSON.stringify(user.slice(0,200))}}`);
  }

  async chat(messages: ChatCompletionMessage[]): Promise<string> {
    const last = messages[messages.length - 1]?.content ?? "";
    return `**Mock mode active.** I received your message: "${last.slice(0, 150)}".\n\nTo enable real AI responses, set \`OPENAI_API_KEY\` in your Vercel project's Environment Variables. See the "API Keys" guide in the footer.`;
  }
}

// ----- canned structured responses (so the UI is fully explorable) -----
function mockExamResearch(query: string): unknown {
  // Extract exam name from the user prompt. The prompt is multi-line like:
  //   Research the competitive exam: "SSC CGL"\n\nProduce a complete...
  // Try to grab the quoted name first, then fall back to cleaning.
  let examName = "SSC CGL";
  const quoted = query.match(/"([^"]+)"/);
  if (quoted && quoted[1]) {
    examName = quoted[1].trim();
  } else {
    // Try first line after "exam:" or similar
    const m = query.match(/exam[:\s]+([^\n]+)/i);
    if (m && m[1]) examName = m[1].replace(/[^\w\s&.-]/g, "").trim().slice(0, 50);
    if (!examName) examName = "SSC CGL";
  }
  return {
    basicInfo: {
      name: examName,
      conductingOrganisation: "Staff Selection Commission",
      examPurpose: "Recruitment to Group B and C posts in various ministries/departments of the Government of India",
      officialWebsite: "https://ssc.gov.in",
      examFrequency: "Annual",
      cycleInfo: "Usually notified in June-July, conducted in July-August (Tier 1)",
      qualification: "Bachelor's degree from a recognised university",
      ageLimit: "18-32 years (relaxation for reserved categories)",
      nationality: "Indian citizen",
      importantEligibility: ["Bachelor's degree (for Assistant Audit Officer: desirable Commerce/Mathematics/Statistics)", "Age as on cut-off date"],
      infoCurrency: "current",
    },
    stages: [
      { name: "Tier 1 (Preliminary)", description: "Objective computer-based test, qualifying in nature", sequence: 1, details: ["4 sections of 25 questions each", "Total 100 questions, 200 marks", "60 minutes"] },
      { name: "Tier 2 (Mains)", description: "Objective + descriptive computer-based exam", sequence: 2, details: ["Paper 1: compulsory", "Paper 2: Statistics (for JSO)", "Paper 3: Assistant Audit Officer"] },
      { name: "Document Verification", description: "Verification of eligibility documents", sequence: 3 },
      { name: "Final Selection", description: "Merit based on Tier 2", sequence: 4 },
    ],
    syllabus: [
      {
        subject: "Quantitative Aptitude",
        topics: [
          { name: "Arithmetic", subtopics: [{ name: "Percentage", concepts: ["Base value", "Successive percentage", "Percentage change"], prerequisites: ["Fractions", "Decimals"], difficulty: "Easy" }, { name: "Profit & Loss", concepts: ["CP", "SP", "Discount", "Marked price"], prerequisites: ["Percentage"], difficulty: "Medium" }, { name: "Ratio & Proportion", concepts: ["Compound ratio", "Variation"], difficulty: "Easy" }] },
          { name: "Algebra", subtopics: [{ name: "Linear Equations", concepts: ["One variable", "Two variables"], difficulty: "Medium" }] },
        ],
      },
      { subject: "General Intelligence & Reasoning", topics: [{ name: "Verbal Reasoning", subtopics: [{ name: "Series", concepts: ["Number series", "Letter series"] }], examRelevance: "High" }] },
      { subject: "English Language", topics: [{ name: "Reading Comprehension", subtopics: [{ name: "Passage", concepts: ["Inference", "Vocabulary"] }] }] },
      { subject: "General Awareness", topics: [{ name: "Current Affairs", subtopics: [{ name: "National & International", concepts: ["Last 6 months"] }] }] },
    ],
    pattern: {
      totalQuestions: 100,
      maxMarks: 200,
      duration: "60 minutes",
      questionType: "Objective MCQ",
      markingScheme: "+2 per correct",
      negativeMarking: "0.5 per incorrect",
      sectionDistribution: [
        { section: "General Intelligence & Reasoning", questions: 25, marks: 50 },
        { section: "General Awareness", questions: 25, marks: 50 },
        { section: "Quantitative Aptitude", questions: 25, marks: 50 },
        { section: "English Comprehension", questions: 25, marks: 50 },
      ],
      sectionalTiming: "No sectional timing (combined 60 min)",
      qualifyingRequirements: ["Category-wise cut-off", "Sectional cut-off applies"],
    },
    career: {
      posts: ["Assistant Audit Officer", "Assistant Accounts Officer", "Inspector (Income Tax)", "Assistant (CSS)", "Auditor"],
      departments: ["CBDT", "CBIC", "Ministry of Railways", "Ministry of External Affairs"],
      jobRoles: ["Assistant", "Inspector", "Auditor", "Accountant"],
      payLevel: "Level 4 to Level 8 (Pay Matrix)",
      basicSalary: "₹25,500 to ₹47,600",
      allowances: ["DA", "HRA", "Transport Allowance"],
      careerProgression: "Departmental promotions to Section Officer, Under Secretary etc.",
      workProfile: "Administrative, audit, and inspection roles",
    },
    preparation: {
      difficultyCharacteristics: "Moderate to Difficult",
      frequentlyTestedTopics: ["Percentage", "Profit & Loss", "Series", "Reading Comprehension"],
      importantSubjects: ["Quantitative Aptitude", "Reasoning"],
      commonMistakes: ["Neglecting current affairs", "Time management in Tier 1", "Ignoring negative marking"],
      recommendedSequence: ["Arithmetic foundations", "Reasoning practice", "English daily reading", "Current affairs ongoing"],
      pyqImportance: "Very high — last 5 years PYQs cover ~70% pattern",
      topicDependencies: ["Percentage → Profit & Loss", "Ratio → Mixture"],
      highPriorityPrerequisites: ["Tables & quick calculation", "Reading speed"],
    },
    sources: [
      { type: "AI_ANALYSIS", label: "AI Analysis", detail: "Based on publicly known exam structure" },
      { type: "OFFICIAL", label: "Official website", detail: "ssc.gov.in" },
    ],
    generatedAt: new Date().toISOString(),
    caveats: ["Mock data — verify with latest official notification", "Specific dates vary by cycle"],
  };
}

function mockExamComparison(query: string): unknown {
  return {
    examNames: ["SSC CGL", "SSC CHSL", "RRB NTPC"],
    comparison: [
      { attribute: "Qualification", values: ["Graduation", "12th Pass", "12th Pass"] },
      { attribute: "Age Limit", values: ["18-32", "18-27", "18-36"] },
      { attribute: "Stages", values: ["Tier 1, 2, DV", "Tier 1, 2, Typing", "CBT 1, 2, Typing"] },
      { attribute: "Negative Marking", values: ["0.5", "0.5", "0.25"] },
      { attribute: "Difficulty", values: ["Moderate-High", "Moderate", "Moderate"] },
    ],
    commonSyllabus: {
      commonTopics: ["Quantitative Aptitude", "Reasoning", "English", "General Awareness"],
      examSpecific: [
        { exam: "SSC CGL", topics: ["Statistics (JSO)", "Finance & Economics (AAO)"] },
        { exam: "SSC CHSL", topics: ["Typing Test"] },
        { exam: "RRB NTPC", topics: ["Railway awareness", "Typing (Junior Clerk)"] },
      ],
    },
    overlap: {
      overlapCategories: [
        { category: "Very High", topic: "Quantitative Aptitude (Arithmetic)", reason: "Same topics across all three exams" },
        { category: "High", topic: "Reasoning", reason: "Similar pattern, slight difficulty variation" },
        { category: "Moderate", topic: "General Awareness", reason: "Current affairs overlap; CGL needs deeper static GK" },
        { category: "Limited", topic: "English", reason: "NTPC has lighter English section" },
      ],
      existingPreparation: ["Percentage", "Ratio", "Series", "Comprehension"],
      additionalPreparation: [
        { topic: "Statistics (for SSC CGL JSO)", reason: "CGL-only paper" },
        { topic: "Typing Test", reason: "CHSL and NTPC specific skill" },
      ],
    },
    careerPathways: ["CGL → Group B/C gazetted", "CHSL → Lower division clerk", "NTPC → Railway clerk/typist"],
    prerequisiteDifferences: ["CGL requires graduation; CHSL/NTPC accept 12th"],
    sources: [{ type: "AI_ANALYSIS", label: "AI Analysis" }],
    generatedAt: new Date().toISOString(),
  };
}

function mockDependencyMap(query: string): unknown {
  // Extract the topic from the query (the route wraps it in quotes)
  let topic = "Calculus";
  const m = query.match(/"([^"]+)"/);
  if (m && m[1]) topic = m[1];
  else {
    const m2 = query.match(/(?:input|topic|syllabus)[:\s]+([^\n]+)/i);
    if (m2 && m2[1]) topic = m2[1].replace(/[^\w\s&.-]/g, "").trim().slice(0, 50);
  }
  const t = topic.toLowerCase();

  type Node = { id: string; topic: string; subtopic?: string; concept?: string; prerequisites: string[]; dependents: string[]; mastery: string; level: number; examRelevance?: string; difficulty?: string };
  type Gap = { missingPrerequisite: string; whyItMatters: string; recommendedSequence: string[]; practiceRecommendations: string[]; estimatedEffort: string };

  let root: string;
  let nodes: Node[];
  let gaps: Gap[];
  let sequence: string[];

  if (t.includes("calculus") || t.includes("differential") || t.includes("integration")) {
    root = "Calculus";
    nodes = [
      { id: "calc", topic: "Calculus", prerequisites: [], dependents: ["diff", "int"], mastery: "Learning", level: 0, examRelevance: "High", difficulty: "Medium" },
      { id: "diff", topic: "Differentiation", prerequisites: ["calc"], dependents: ["diffapp", "de"], mastery: "Practicing", level: 1, difficulty: "Medium" },
      { id: "int", topic: "Integration", prerequisites: ["calc"], dependents: ["de"], mastery: "Weak", level: 1, difficulty: "Hard" },
      { id: "diffapp", topic: "Applications of Differentiation", prerequisites: ["diff"], dependents: [], mastery: "Not Started", level: 2, difficulty: "Hard" },
      { id: "de", topic: "Differential Equations", prerequisites: ["diff", "int"], dependents: [], mastery: "Not Started", level: 2, difficulty: "Hard" },
    ];
    gaps = [{ missingPrerequisite: "Integration", whyItMatters: "Required to solve and verify differential equations. You cannot integrate solutions to ODEs without solid integration fundamentals.", recommendedSequence: ["Review Differentiation", "Practice Integration basics", "Indefinite integrals", "Definite integrals", "Integration by substitution", "Start Differential Equations"], practiceRecommendations: ["10 Level-1 integration problems", "5 PYQ integrals", "Integration by parts practice"], estimatedEffort: "~15 hours" }];
    sequence = ["Differentiation", "Integration", "Applications of Differentiation", "Differential Equations"];
  } else if (t.includes("algebra") || t.includes("equation")) {
    root = "Algebra";
    nodes = [
      { id: "basic", topic: "Basic Arithmetic", prerequisites: [], dependents: ["linear"], mastery: "Mastered", level: 0, examRelevance: "Foundation" },
      { id: "linear", topic: "Linear Equations", prerequisites: ["basic"], dependents: ["quad", "simul"], mastery: "Strong", level: 1, difficulty: "Easy" },
      { id: "quad", topic: "Quadratic Equations", prerequisites: ["linear"], dependents: ["ineq"], mastery: "Practicing", level: 2, difficulty: "Medium" },
      { id: "simul", topic: "Simultaneous Equations", prerequisites: ["linear"], dependents: [], mastery: "Learning", level: 2, difficulty: "Medium" },
      { id: "ineq", topic: "Inequalities", prerequisites: ["quad"], dependents: [], mastery: "Not Started", level: 3, difficulty: "Hard" },
    ];
    gaps = [{ missingPrerequisite: "Inequalities", whyItMatters: "Quadratic inequalities are tested extensively and require mastery of quadratic equation roots + sign analysis.", recommendedSequence: ["Review Quadratic Equations", "Number line + sign analysis", "Linear inequalities", "Quadratic inequalities", "Rational inequalities"], practiceRecommendations: ["15 inequality problems", "5 PYQ inequality questions"], estimatedEffort: "~8 hours" }];
    sequence = ["Linear Equations", "Quadratic Equations", "Simultaneous Equations", "Inequalities"];
  } else if (t.includes("english") || t.includes("grammar") || t.includes("vocab")) {
    root = "English Language";
    nodes = [
      { id: "vocab", topic: "Vocabulary", prerequisites: [], dependents: ["rc"], mastery: "Practicing", level: 0, examRelevance: "High", difficulty: "Medium" },
      { id: "gram", topic: "Grammar Basics", prerequisites: [], dependents: ["tense", "voice"], mastery: "Strong", level: 0, difficulty: "Easy" },
      { id: "tense", topic: "Tenses", prerequisites: ["gram"], dependents: ["voice"], mastery: "Practicing", level: 1, difficulty: "Medium" },
      { id: "voice", topic: "Active/Passive Voice", prerequisites: ["gram", "tense"], dependents: ["speech"], mastery: "Learning", level: 2, difficulty: "Medium" },
      { id: "speech", topic: "Direct/Indirect Speech", prerequisites: ["voice"], dependents: [], mastery: "Not Started", level: 3, difficulty: "Hard" },
      { id: "rc", topic: "Reading Comprehension", prerequisites: ["vocab"], dependents: [], mastery: "Improving", level: 1, difficulty: "Medium" },
    ];
    gaps = [{ missingPrerequisite: "Direct/Indirect Speech", whyItMatters: "Narration rules depend on tense mastery and voice transformation. Without these, speech conversion becomes error-prone.", recommendedSequence: ["Review Tenses", "Practice Active/Passive Voice", "Learn Narration Rules", "Practice Direct→Indirect conversion", "Practice Indirect→Direct conversion"], practiceRecommendations: ["20 narration problems", "10 PYQ speech questions"], estimatedEffort: "~6 hours" }];
    sequence = ["Grammar Basics", "Tenses", "Vocabulary", "Active/Passive Voice", "Direct/Indirect Speech", "Reading Comprehension"];
  } else if (t.includes("reasoning") || t.includes("series") || t.includes("puzzle")) {
    root = "Logical Reasoning";
    nodes = [
      { id: "series", topic: "Series & Patterns", prerequisites: [], dependents: ["analogy"], mastery: "Practicing", level: 0, examRelevance: "High", difficulty: "Medium" },
      { id: "analogy", topic: "Analogy", prerequisites: ["series"], dependents: ["classify"], mastery: "Learning", level: 1, difficulty: "Medium" },
      { id: "classify", topic: "Classification", prerequisites: ["analogy"], dependents: [], mastery: "Not Started", level: 2, difficulty: "Medium" },
      { id: "coding", topic: "Coding-Decoding", prerequisites: [], dependents: ["puzzle"], mastery: "Strong", level: 0, difficulty: "Easy" },
      { id: "puzzle", topic: "Puzzles & Seating", prerequisites: ["coding"], dependents: ["blood"], mastery: "Weak", level: 1, difficulty: "Hard" },
      { id: "blood", topic: "Blood Relations", prerequisites: ["puzzle"], dependents: [], mastery: "Not Started", level: 2, difficulty: "Hard" },
    ];
    gaps = [{ missingPrerequisite: "Puzzles & Seating", whyItMatters: "Seating arrangement puzzles are high-weightage in SSC/Banking. They require systematic tabulation and logical elimination.", recommendedSequence: ["Practice Coding-Decoding", "Learn Puzzle Types", "Linear Seating", "Circular Seating", "Complex Puzzles"], practiceRecommendations: ["15 seating arrangement problems", "5 PYQ puzzles"], estimatedEffort: "~10 hours" }];
    sequence = ["Series & Patterns", "Coding-Decoding", "Analogy", "Classification", "Puzzles & Seating", "Blood Relations"];
  } else if (t.includes("quant") || t.includes("aptitude") || t.includes("arithmetic")) {
    root = "Quantitative Aptitude";
    nodes = [
      { id: "pct", topic: "Percentage", prerequisites: [], dependents: ["pl", "ratio"], mastery: "Strong", level: 0, examRelevance: "Very High", difficulty: "Easy" },
      { id: "ratio", topic: "Ratio & Proportion", prerequisites: ["pct"], dependents: ["mixture"], mastery: "Practicing", level: 1, difficulty: "Easy" },
      { id: "pl", topic: "Profit & Loss", prerequisites: ["pct"], dependents: ["discount"], mastery: "Strong", level: 1, difficulty: "Medium" },
      { id: "discount", topic: "Discount", prerequisites: ["pl"], dependents: ["si"], mastery: "Learning", level: 2, difficulty: "Medium" },
      { id: "mixture", topic: "Mixture & Alligation", prerequisites: ["ratio"], dependents: [], mastery: "Weak", level: 2, difficulty: "Hard" },
      { id: "si", topic: "Simple & Compound Interest", prerequisites: ["discount"], dependents: ["tw"], mastery: "Practicing", level: 3, difficulty: "Medium" },
      { id: "tw", topic: "Time & Work", prerequisites: ["si"], dependents: ["tsd"], mastery: "Learning", level: 4, difficulty: "Hard" },
      { id: "tsd", topic: "Time, Speed & Distance", prerequisites: ["tw"], dependents: [], mastery: "Not Started", level: 5, difficulty: "Hard" },
    ];
    gaps = [
      { missingPrerequisite: "Mixture & Alligation", whyItMatters: "Alligation method is a shortcut used across mixture, profit-loss, and average problems. Missing it forces longer calculations.", recommendedSequence: ["Review Ratio & Proportion", "Learn Alligation Rule", "Practice Mixture problems", "Apply Alligation to P&L"], practiceRecommendations: ["10 alligation problems", "5 mixture PYQs"], estimatedEffort: "~5 hours" },
      { missingPrerequisite: "Time, Speed & Distance", whyItMatters: "TSD is high-weightage and builds on Time & Work concepts (rate problems). Relative speed requires solid foundation.", recommendedSequence: ["Review Time & Work", "Basic TSD formulae", "Relative speed", "Trains & Platforms", "Boats & Streams"], practiceRecommendations: ["15 TSD problems", "5 train PYQs"], estimatedEffort: "~8 hours" },
    ];
    sequence = ["Percentage", "Ratio & Proportion", "Profit & Loss", "Discount", "Mixture & Alligation", "Simple & Compound Interest", "Time & Work", "Time, Speed & Distance"];
  } else {
    // Generic fallback
    root = topic || "Foundational Concepts";
    nodes = [
      { id: "f1", topic: "Foundations", prerequisites: [], dependents: ["c1"], mastery: "Strong", level: 0, examRelevance: "Core", difficulty: "Easy" },
      { id: "c1", topic: "Core Concepts", prerequisites: ["f1"], dependents: ["a1"], mastery: "Practicing", level: 1, difficulty: "Medium" },
      { id: "a1", topic: "Applications", prerequisites: ["c1"], dependents: ["adv"], mastery: "Learning", level: 2, difficulty: "Hard" },
      { id: "adv", topic: "Advanced Topics", prerequisites: ["a1"], dependents: [], mastery: "Not Started", level: 3, difficulty: "Hard" },
    ];
    gaps = [{ missingPrerequisite: "Advanced Topics", whyItMatters: "Advanced topics build on applications. Master applications first to avoid getting stuck.", recommendedSequence: ["Review Foundations", "Practice Core Concepts", "Master Applications", "Start Advanced Topics"], practiceRecommendations: ["10 practice problems", "5 PYQs"], estimatedEffort: "~12 hours" }];
    sequence = ["Foundations", "Core Concepts", "Applications", "Advanced Topics"];
  }

  return {
    root,
    nodes,
    gaps,
    recommendedLearningSequence: sequence,
    sources: [{ type: "AI_ANALYSIS", label: "AI Analysis" }],
    generatedAt: new Date().toISOString(),
  };
}

function mockQuestionExplanation(query: string): unknown {
  // Extract the actual question. The route wraps it in triple-quotes:
  //   QUESTION:\n"""\n<actual question>\n"""
  let question = "";
  const triple = query.match(/"""\s*\n([\s\S]*?)\n\s*"""/);
  if (triple && triple[1]) {
    question = triple[1].trim().slice(0, 300);
  } else {
    // fallback: try single-quoted
    const m = query.match(/question[:\s]*["']([^"']+)["']/i);
    if (m && m[1]) question = m[1].trim().slice(0, 300);
  }
  if (!question || question.length < 5) question = "A train travels 120 km in 2 hours. What is its speed?";

  // Detect question type for relevant canned explanation
  const q = question.toLowerCase();
  let profile: {
    subject: string; topic: string; subtopic: string; concept: string; difficulty: "Easy"|"Medium"|"Hard";
    related: string[]; prereq: string[]; hint: string; conceptName: string; coreRule: string; why: string;
    shortcut: string; mistake: string; steps: string[]; formula: string; substitution: string; calc: string;
    answer: string; explanation: string; method: string; mental: string; elim: string; timeSave: string; insight: string;
  };

  if (/(solve|find|value of|equation|=)/.test(q) && /[a-z]\s*[-+]\s*\d/.test(q)) {
    // Linear equation e.g. "If 2x+3=11, find x"
    profile = {
      subject: "Quantitative Aptitude", topic: "Algebra", subtopic: "Linear Equations", concept: "Isolate the variable",
      difficulty: "Easy", related: ["Transposition", "Inverse operations"], prereq: ["Arithmetic", "Order of operations"],
      hint: "Whatever you do to one side of the equation, you must do to the other. How can you isolate x?",
      conceptName: "Inverse Operations", coreRule: "To isolate x, undo each operation in reverse order (addition → subtraction, multiplication → division).",
      why: "The equation balances as long as both sides change equally.", shortcut: "Move constants to one side, then divide by the coefficient.",
      mistake: "Forgetting to apply the operation to BOTH sides.",
      steps: ["Subtract 3 from both sides: 2x = 11 − 3", "Simplify: 2x = 8", "Divide both sides by 2: x = 8/2", "Result: x = 4"],
      formula: "ax + b = c  →  x = (c − b) / a", substitution: "x = (11 − 3) / 2", calc: "8 / 2 = 4", answer: "x = 4",
      explanation: "We isolate x by reversing the operations applied to it: first undo +3 (subtract 3), then undo ×2 (divide by 2).",
      method: "Transpose mentally: 2x = 8 → x = 4", mental: "11−3=8, 8/2=4", elim: "Plug each option back into the equation", timeSave: "Skip writing intermediate steps for simple equations",
      insight: "Always isolate the variable by performing inverse operations on BOTH sides. Verify by substituting your answer back into the original equation.",
    };
  } else if (/(train|speed|distance|time|km\/?h|m\/?s|pole|platform)/.test(q)) {
    // Time speed distance
    profile = {
      subject: "Quantitative Aptitude", topic: "Time, Speed & Distance", subtopic: "Speed calculation", concept: "Speed = Distance / Time",
      difficulty: "Easy", related: ["Average speed", "Relative speed", "Unit conversion"], prereq: ["Basic arithmetic", "Unit conversion"],
      hint: "Think about the relationship between speed, distance, and time. Which two values are given?",
      conceptName: "Speed = Distance / Time", coreRule: "Speed equals total distance divided by total time taken.",
      why: "Distance and time are both given directly.", shortcut: "Use unitary method: km per hour",
      mistake: "Forgetting to convert units (km/h vs m/s).",
      steps: ["Identify given: Distance = 120 km, Time = 2 hours", "Apply formula: Speed = Distance / Time", "Substitute: 120 / 2", "Result: 60 km/h"],
      formula: "Speed = Distance / Time", substitution: "Speed = 120 km / 2 h", calc: "120 ÷ 2 = 60", answer: "60 km/h",
      explanation: "Dividing distance by time gives the average speed.",
      method: "Unitary: in 2 hours → 120 km, so in 1 hour → 60 km", mental: "120/2 = 60 directly", elim: "Reject answers not in km/h range", timeSave: "Avoid unit conversion unless options are in m/s",
      insight: "Remember the core relation S = D/T. Always check units. For multi-segment journeys, average speed = total distance / total time (not arithmetic mean of speeds).",
    };
  } else if (/(percentage|%|profit|loss|discount|marked|cost price|selling)/.test(q)) {
    profile = {
      subject: "Quantitative Aptitude", topic: "Percentage & Profit-Loss", subtopic: "Percentage calculation", concept: "Percentage = (Part / Whole) × 100",
      difficulty: "Easy", related: ["Fractions", "Ratio", "Successive percentage"], prereq: ["Fractions", "Decimals"],
      hint: "Percentage means 'per 100'. What is the whole, and what is the part you're comparing to it?",
      conceptName: "Percentage = (Part / Whole) × 100", coreRule: "A percentage expresses a part out of 100.",
      why: "The question compares a part to a whole.", shortcut: "Convert % to fraction: x% = x/100",
      mistake: "Mixing up which value is the 'whole' (base).",
      steps: ["Identify the whole (base) and the part", "Apply: % = (Part / Whole) × 100", "Substitute values", "Simplify"],
      formula: "Percentage = (Part / Whole) × 100", substitution: "Depends on values given", calc: "Compute and simplify", answer: "Final %",
      explanation: "Percentage standardizes comparisons to a base of 100.",
      method: "Convert to decimal then multiply", mental: "10% = move decimal one place left", elim: "Estimate using 50%, 25%, 10% benchmarks", timeSave: "Memorize common fraction-•% equivalents (1/4=25%, 1/8=12.5%)",
      insight: "Always identify the BASE (whole) first. 'Of' usually precedes the base. A 20% increase followed by 20% decrease does NOT return to the original.",
    };
  } else if (/(reasoning|series|pattern|coding|decode|puzzle|blood relation|direction)/.test(q)) {
    profile = {
      subject: "General Intelligence & Reasoning", topic: "Logical Reasoning", subtopic: "Pattern recognition", concept: "Identify the rule governing the sequence",
      difficulty: "Medium", related: ["Number series", "Letter series", "Analogy"], prereq: ["Basic arithmetic", "Alphabet positions"],
      hint: "Look for a pattern — arithmetic, geometric, alternating, or position-based. What changes between consecutive terms?",
      conceptName: "Pattern Recognition", coreRule: "Find the consistent rule that transforms each term to the next.",
      why: "Series questions test rule identification.", shortcut: "Check differences between consecutive terms first",
      mistake: "Assuming a single rule when the pattern alternates.",
      steps: ["Write down the given terms", "Compute differences (1st order, 2nd order)", "Check for ratios if differences aren't constant", "Identify the rule", "Apply to find the next term"],
      formula: "Depends on pattern", substitution: "Apply rule to last term", calc: "Compute next term", answer: "Next term in series",
      explanation: "Most series follow arithmetic, geometric, or alternating rules. Higher-order differences reveal polynomial patterns.",
      method: "Difference table: compute Δ1, Δ2", mental: "Look for ×2, +1, squares, cubes", elim: "Reject options breaking the pattern's monotonicity", timeSave: "If first differences are constant, it's arithmetic — skip deeper analysis",
      insight: "Always compute first differences. If constant → arithmetic. If ratio constant → geometric. If neither → try alternating or position-based rules.",
    };
  } else if (/(english|grammar|synonym|antonym|comprehension|passage|sentence|vocab)/.test(q)) {
    profile = {
      subject: "English Language", topic: "Reading Comprehension & Vocabulary", subtopic: "Contextual meaning", concept: "Derive meaning from context",
      difficulty: "Medium", related: ["Inference", "Vocabulary", "Tone"], prereq: ["Vocabulary", "Grammar"],
      hint: "Read the surrounding sentence carefully. What context clues suggest the meaning?",
      conceptName: "Context Clues", coreRule: "The meaning of a word is shaped by the sentence and paragraph around it.",
      why: "Comprehension questions test contextual understanding.", shortcut: "Replace the word with each option — which keeps the sentence logical?",
      mistake: "Choosing a familiar synonym that doesn't fit the specific context.",
      steps: ["Read the full sentence containing the word/idea", "Identify context clues (contrast, definition, example)", "Predict a meaning", "Match with the closest option"],
      formula: "N/A", substitution: "N/A", calc: "N/A", answer: "Contextually correct option",
      explanation: "Context determines meaning. A word's dictionary definition may not match its contextual sense.",
      method: "Substitution: plug each option into the sentence", mental: "Listen for which option sounds natural", elim: "Reject options that create logical contradictions", timeSave: "Read only the relevant sentence first, full passage only if needed",
      insight: "Context is king. Never choose an answer based on a word's most common meaning without checking the sentence.",
    };
  } else {
    // Generic fallback
    profile = {
      subject: "General Aptitude", topic: "Problem Solving", subtopic: "Analytical reasoning", concept: "Break the problem into steps",
      difficulty: "Medium", related: ["Logical reasoning", "Quantitative methods"], prereq: ["Reading comprehension", "Basic arithmetic"],
      hint: "What information is given, and what are you asked to find? Break the problem into smaller steps.",
      conceptName: "Structured Problem Solving", coreRule: "Identify givens, identify the goal, choose a method, execute, verify.",
      why: "Applies to all aptitude questions.", shortcut: "Draw a diagram or write givens explicitly",
      mistake: "Rushing to calculate before understanding what's asked.",
      steps: ["Read the question carefully", "List the given information", "Identify what to find", "Choose the appropriate formula/method", "Substitute and solve", "Verify the answer makes sense"],
      formula: "Varies", substitution: "Varies", calc: "Varies", answer: "Computed answer",
      explanation: "Structured problem solving prevents careless errors.",
      method: "Write givens → choose method → solve → verify", mental: "Estimate before calculating", elim: "Use estimation to reject outliers", timeSave: "Skip questions that take >2 minutes; return later",
      insight: "Always understand the question fully before calculating. A correct method on a misunderstood question wastes time.",
    };
  }

  return {
    originalQuestion: question,
    subject: profile.subject,
    topic: profile.topic,
    subtopic: profile.subtopic,
    concept: profile.concept,
    difficulty: profile.difficulty,
    questionType: "MCQ",
    relatedConcepts: profile.related,
    prerequisites: profile.prereq,
    levels: {
      level1_quickHint: profile.hint,
      level2_concept: { conceptName: profile.conceptName, coreRule: profile.coreRule, whyItApplies: profile.why, shortcut: profile.shortcut, commonMistake: profile.mistake },
      level3_detailedSolution: { steps: profile.steps, formula: profile.formula, substitution: profile.substitution, calculation: profile.calc, finalAnswer: profile.answer, explanation: profile.explanation },
      level4_examShortcut: { method: profile.method, mentalCalculation: profile.mental, eliminationTechnique: profile.elim, timeSavingApproach: profile.timeSave },
      level5_learningInsight: profile.insight,
    },
    sources: [{ type: "AI_ANALYSIS", label: "AI Analysis" }],
    generatedAt: new Date().toISOString(),
  };
}

function mockQuestionEvolution(query: string): unknown {
  // Extract the actual question from the triple-quoted prompt wrapper
  let src = "";
  const triple = query.match(/"""\s*\n([\s\S]*?)\n\s*"""/);
  if (triple && triple[1]) src = triple[1].trim().slice(0, 300);
  if (!src || src.length < 5) src = query.slice(0, 150) || "A train 150 m long passes a pole in 15 seconds. Find its speed.";

  const s = src.toLowerCase();
  let subject = "Quantitative Aptitude";
  let topic = "Time, Speed & Distance";
  let subtopic = "Trains";
  let coreConcept = "Speed = Distance / Time";
  let difficulty: "Easy" | "Medium" | "Hard" = "Medium";
  let variants: unknown[];

  type Variant = { level: number; levelName: string; question: string; options: string[]; correctAnswer: string; explanation: string; shortcut?: string; commonTrap?: string; validationStatus: "verified" | "needs-review"; validationNotes?: string[] };

  if (s.includes("train") || s.includes("speed") || s.includes("distance") || s.includes("pole")) {
    subject = "Quantitative Aptitude"; topic = "Time, Speed & Distance"; subtopic = "Trains";
    coreConcept = "Speed = Distance / Time"; difficulty = "Medium";
    variants = [
      { level: 1, levelName: "Same Concept, Easier", question: "A train 100 m long passes a pole in 10 seconds. Find its speed.", options: ["8 m/s", "10 m/s", "12 m/s", "15 m/s"], correctAnswer: "10 m/s", explanation: "Speed = 100/10 = 10 m/s", validationStatus: "verified", validationNotes: [] },
      { level: 2, levelName: "Same Concept, Different Framing", question: "A train crosses a stationary pole in 20 seconds at a speed of 5 m/s. What is the length of the train?", options: ["50 m", "100 m", "75 m", "125 m"], correctAnswer: "100 m", explanation: "Length = Speed × Time = 5 × 20 = 100 m", validationStatus: "verified" },
      { level: 3, levelName: "Multi-Concept", question: "Two trains of length 100 m each approach each other at 10 m/s and 15 m/s. Time to cross each other?", options: ["4 s", "8 s", "10 s", "12 s"], correctAnswer: "8 s", explanation: "Relative speed = 25 m/s, total distance = 200 m, time = 200/25 = 8 s", validationStatus: "verified" },
      { level: 4, levelName: "Difficult Variant", question: "A train 200 m long passes a platform 300 m long in 25 seconds. Find its speed in km/h.", options: ["54 km/h", "72 km/h", "60 km/h", "90 km/h"], correctAnswer: "72 km/h", explanation: "Total distance = 500 m, time = 25 s, speed = 20 m/s = 72 km/h", validationStatus: "verified" },
      { level: 5, levelName: "Exam-Trap Variant", question: "A train crosses a pole in 8 s and a platform 240 m long in 20 s. Find the length of the train.", options: ["120 m", "160 m", "180 m", "240 m"], correctAnswer: "160 m", explanation: "Let length L, speed S. L/S = 8 → S = L/8. (L+240)/S = 20 → L + 240 = 20S = 20 × L/8 = 2.5L → 1.5L = 240 → L = 160 m", commonTrap: "Assuming train length equals platform length", validationStatus: "verified" },
    ];
  } else if (s.includes("percentage") || s.includes("%") || s.includes("profit") || s.includes("loss")) {
    subject = "Quantitative Aptitude"; topic = "Percentage & Profit-Loss"; subtopic = "Percentage";
    coreConcept = "Percentage = (Part / Whole) × 100"; difficulty = "Easy";
    variants = [
      { level: 1, levelName: "Same Concept, Easier", question: "What is 10% of 200?", options: ["10", "20", "15", "25"], correctAnswer: "20", explanation: "10% of 200 = 0.10 × 200 = 20", validationStatus: "verified", validationNotes: [] },
      { level: 2, levelName: "Same Concept, Different Framing", question: "If 25% of a number is 50, what is the number?", options: ["100", "150", "200", "250"], correctAnswer: "200", explanation: "0.25x = 50 → x = 50/0.25 = 200", validationStatus: "verified" },
      { level: 3, levelName: "Multi-Concept", question: "A shopkeeper marks goods 40% above cost and gives 10% discount. His profit % is?", options: ["26%", "30%", "36%", "40%"], correctAnswer: "26%", explanation: "If CP=100, MP=140, SP=140×0.9=126. Profit=26%. (MP×Discount≠MP-Discount%)", validationStatus: "verified" },
      { level: 4, levelName: "Difficult Variant", question: "Successive discounts of 20% and 10% are equivalent to a single discount of:", options: ["28%", "30%", "32%", "25%"], correctAnswer: "28%", explanation: "SP = 0.8 × 0.9 = 0.72 of original. Single discount = 1-0.72 = 28%", validationStatus: "verified" },
      { level: 5, levelName: "Exam-Trap Variant", question: "A's salary is 50% more than B's. By what % is B's salary less than A's?", options: ["33.33%", "50%", "40%", "25%"], correctAnswer: "33.33%", explanation: "Let B=100, A=150. B is 50 less than A. 50/150 × 100 = 33.33%", commonTrap: "Answering 50% (the base changes)", validationStatus: "verified" },
    ];
  } else if (s.includes("series") || s.includes("sequence") || s.includes("pattern") || s.includes("next number")) {
    subject = "General Intelligence & Reasoning"; topic = "Series & Patterns"; subtopic = "Number Series";
    coreConcept = "Identify the rule governing the sequence"; difficulty = "Medium";
    variants = [
      { level: 1, levelName: "Same Concept, Easier", question: "Find the next: 2, 4, 6, 8, ?", options: ["9", "10", "11", "12"], correctAnswer: "10", explanation: "Common difference = 2. Next = 8+2 = 10.", validationStatus: "verified", validationNotes: [] },
      { level: 2, levelName: "Same Concept, Different Framing", question: "Which number completes: 3, 6, 12, 24, ?", options: ["30", "36", "48", "42"], correctAnswer: "48", explanation: "Each term doubles: 3×2=6, 6×2=12... 24×2=48", validationStatus: "verified" },
      { level: 3, levelName: "Multi-Concept", question: "Find next: 1, 4, 9, 16, 25, ? (hint: think squares)", options: ["30", "36", "42", "49"], correctAnswer: "36", explanation: "Perfect squares: 1², 2², 3², 4², 5² → 6² = 36", validationStatus: "verified" },
      { level: 4, levelName: "Difficult Variant", question: "Find next: 2, 6, 12, 20, 30, ?", options: ["40", "42", "44", "46"], correctAnswer: "42", explanation: "Differences: 4,6,8,10,12 (even numbers). Next = 30+12 = 42", validationStatus: "verified" },
      { level: 5, levelName: "Exam-Trap Variant", question: "Find next: 1, 2, 6, 24, 120, ?", options: ["240", "360", "600", "720"], correctAnswer: "720", explanation: "Factorials: 1!, 2!, 3!, 4!, 5! → 6! = 720", commonTrap: "Assuming addition pattern (differences look tempting)", validationStatus: "verified" },
    ];
  } else if (s.includes("solve") || s.includes("equation") || /[a-z]\s*[-+]\s*\d/.test(s)) {
    subject = "Quantitative Aptitude"; topic = "Algebra"; subtopic = "Linear Equations";
    coreConcept = "Isolate the variable via inverse operations"; difficulty = "Easy";
    variants = [
      { level: 1, levelName: "Same Concept, Easier", question: "If x + 5 = 10, find x.", options: ["3", "5", "7", "15"], correctAnswer: "5", explanation: "x = 10 - 5 = 5", validationStatus: "verified", validationNotes: [] },
      { level: 2, levelName: "Same Concept, Different Framing", question: "Twice a number equals 14. What is the number?", options: ["6", "7", "8", "12"], correctAnswer: "7", explanation: "2x = 14 → x = 7", validationStatus: "verified" },
      { level: 3, levelName: "Multi-Concept", question: "The sum of two numbers is 20 and their difference is 4. Find the larger number.", options: ["10", "12", "14", "8"], correctAnswer: "12", explanation: "x+y=20, x-y=4. Adding: 2x=24 → x=12, y=8. Larger = 12.", validationStatus: "verified" },
      { level: 4, levelName: "Difficult Variant", question: "If 3(x - 2) + 2x = 15, find x.", options: ["3", "4.2", "5", "6"], correctAnswer: "4.2", explanation: "3x-6+2x=15 → 5x=21 → x=4.2", validationStatus: "verified" },
      { level: 5, levelName: "Exam-Trap Variant", question: "If 2x + 3y = 12 and x - y = 1, find x + y.", options: ["3", "4", "5", "6"], correctAnswer: "5", explanation: "From x-y=1: x=y+1. Substitute: 2(y+1)+3y=12 → 5y=10 → y=2, x=3. x+y=5.", commonTrap: "Solving for x and y separately then forgetting to add them", validationStatus: "verified" },
    ];
  } else {
    // Generic fallback — treat as a quantitative problem
    subject = "Quantitative Aptitude"; topic = "Problem Solving"; subtopic = "Analytical";
    coreConcept = "Break problem into structured steps"; difficulty = "Medium";
    variants = [
      { level: 1, levelName: "Same Concept, Easier", question: "What is 5 × 4?", options: ["15", "20", "25", "9"], correctAnswer: "20", explanation: "5 × 4 = 20", validationStatus: "verified", validationNotes: [] },
      { level: 2, levelName: "Same Concept, Different Framing", question: "If 4 boxes each hold 5 items, how many items total?", options: ["9", "20", "15", "25"], correctAnswer: "20", explanation: "4 × 5 = 20 items", validationStatus: "verified" },
      { level: 3, levelName: "Multi-Concept", question: "5 items cost ₹4 each. With 10% tax, total = ?", options: ["₹20", "₹22", "₹24", "₹18"], correctAnswer: "₹22", explanation: "5×4=20. Tax=10% of 20=2. Total=20+2=₹22", validationStatus: "verified" },
      { level: 4, levelName: "Difficult Variant", question: "5 workers complete a job in 4 hours. How long for 4 workers?", options: ["3.2h", "5h", "4.5h", "6h"], correctAnswer: "5h", explanation: "Work = 5×4 = 20 worker-hours. 4 workers → 20/4 = 5 hours", validationStatus: "verified" },
      { level: 5, levelName: "Exam-Trap Variant", question: "If 5 cats catch 5 mice in 5 minutes, how long for 100 cats to catch 100 mice?", options: ["5 min", "20 min", "100 min", "500 min"], correctAnswer: "5 min", explanation: "Each cat catches 1 mouse in 5 min. 100 cats catch 100 mice in the same 5 min (parallel).", commonTrap: "Assuming 100×5=500 min (confusing rate with scale)", validationStatus: "verified" },
    ];
  }

  return {
    sourceQuestion: src,
    coreConcept,
    subject,
    topic,
    subtopic,
    difficulty,
    variants,
    lineage: `Original ${topic} problem → 5 variants across difficulty and concept combination.`,
    sources: [{ type: "AI_GENERATED", label: "AI-Generated", detail: "Variants derived from source question" }],
    generatedAt: new Date().toISOString(),
  };
}

function mockPaper(query: string): unknown {
  // Detect exam from the query to customize the paper
  const q = query.toLowerCase();
  let examName = "SSC CGL";
  let sections: { name: string; questions: number; marksPerQuestion: number; negativeMarking: number }[] = [];
  let questions: unknown[] = [];

  const mk = (id: string, section: string, num: number, topic: string, difficulty: "Easy" | "Medium" | "Hard", question: string, options: string[], correctAnswer: string, explanation: string) => ({
    id, section, questionNumber: num, questionType: "MCQ" as const, question, options, correctAnswer, topic, difficulty, marks: 2, negativeMarks: 0.5, explanation, sourceType: "AI_GENERATED" as const,
  });

  if (q.includes("gate") || q.includes("cs") || q.includes("mechanical")) {
    examName = q.includes("mechanical") ? "GATE Mechanical Engineering" : "GATE CS";
    sections = [
      { name: "General Aptitude", questions: 5, marksPerQuestion: 1, negativeMarking: 0.33 },
      { name: "Technical", questions: 5, marksPerQuestion: 2, negativeMarking: 0.66 },
    ];
    questions = [
      mk("q1","General Aptitude",1,"Verbal","Easy","Choose the word most OPPOSITE in meaning to 'BENEVOLENT':",["Malevolent","Kind","Generous","Charitable"],"Malevolent","Benevolent means well-meaning and kind. The antonym is malevolent (wishing harm)."),
      mk("q2","General Aptitude",2,"Numerical","Medium","A train 150 m long passes a pole in 15 seconds. The speed of the train is:",["36 km/h","54 km/h","10 km/h","24 km/h"],"36 km/h","Speed = 150/15 = 10 m/s = 10 × 18/5 = 36 km/h."),
      mk("q3","General Aptitude",3,"Reasoning","Medium","Find the next term: 2, 6, 12, 20, 30, ?",["40","42","44","46"],"42","Differences: 4,6,8,10,12 → next term = 30+12 = 42."),
      mk("q4","Technical",4,"Data Structures","Medium","Which data structure uses LIFO (Last-In-First-Out) ordering?",["Queue","Stack","Linked List","Tree"],"Stack","A stack follows LIFO — the last element pushed is the first popped."),
      mk("q5","Technical",5,"Algorithms","Hard","What is the time complexity of binary search on a sorted array of n elements?",["O(n)","O(n log n)","O(log n)","O(1)"],"O(log n)","Binary search halves the search space each step → O(log n)."),
      mk("q6","Technical",6,"Operating Systems","Hard","Which page replacement algorithm suffers from Belady's anomaly?",["LRU","Optimal","FIFO","Clock"],"FIFO","FIFO can increase page faults when frames increase — Belady's anomaly."),
      mk("q7","Technical",7,"DBMS","Medium","Which normal form eliminates partial dependencies?",["1NF","2NF","3NF","BCNF"],"2NF","2NF removes partial dependencies (non-prime attributes dependent on part of a composite key)."),
      mk("q8","Technical",8,"Computer Networks","Medium","The default port for HTTPS is:",["80","443","21","22"],"443","HTTPS uses port 443 (HTTP uses 80, FTP 21, SSH 22)."),
      mk("q9","Technical",9,"Discrete Math","Hard","In a graph with 6 vertices and 7 edges, the sum of all vertex degrees is:",["7","14","12","6"],"14","By Handshaking Lemma: sum of degrees = 2 × edges = 2 × 7 = 14."),
      mk("q10","Technical",10,"TOC","Hard","Which language is accepted by a Pushdown Automaton (PDA)?",["Regular","Context-Free","Context-Sensitive","Recursive"],"Context-Free","PDAs recognize exactly the context-free languages (Type-2 in Chomsky hierarchy)."),
    ];
  } else {
    // SSC CGL default
    examName = "SSC CGL";
    sections = [{ name: "Quantitative Aptitude", questions: 6, marksPerQuestion: 2, negativeMarking: 0.5 }];
    questions = [
      mk("q1","Quantitative Aptitude",1,"Percentage","Easy","If 30% of a number is 90, what is the number?",["200","250","300","270"],"300","Let number = x. 30% of x = 90 → 0.30x = 90 → x = 300."),
      mk("q2","Quantitative Aptitude",2,"Profit & Loss","Medium","A man buys an article for ₹400 and sells it at a profit of 15%. The selling price is:",["₹440","₹460","₹450","₹480"],"₹460","SP = CP × (1 + profit%) = 400 × 1.15 = ₹460."),
      mk("q3","Quantitative Aptitude",3,"Ratio","Easy","If A:B = 2:3 and B:C = 4:5, then A:C is:",["2:5","8:15","3:5","6:15"],"8:15","A:B = 2:3 = 8:12, B:C = 4:5 = 12:15 → A:C = 8:15."),
      mk("q4","Quantitative Aptitude",4,"Time & Work","Hard","A can do a job in 12 days, B in 18 days. Together they finish in:",["7.2 days","6 days","5.4 days","9 days"],"7.2 days","Combined rate = 1/12 + 1/18 = 5/36 per day → time = 36/5 = 7.2 days."),
      mk("q5","Quantitative Aptitude",5,"Average","Medium","The average of 5 numbers is 20. If one number is removed, the average becomes 18. The removed number is:",["24","22","26","28"],"28","Sum of 5 = 100. Sum of 4 = 72. Removed = 100 − 72 = 28."),
      mk("q6","Quantitative Aptitude",6,"Simple Interest","Hard","₹8000 invested at 5% per annum simple interest for 3 years yields interest of:",["₹1200","₹1500","₹1000","₹800"],"₹1200","SI = P × R × T / 100 = 8000 × 5 × 3 / 100 = ₹1200."),
    ];
  }

  return {
    examName,
    mode: "Balanced Practice",
    totalQuestions: questions.length,
    durationMinutes: questions.length * 2,
    sections,
    questions,
    markingScheme: sections[0] ? `+${sections[0].marksPerQuestion} / -${sections[0].negativeMarking}` : "+2 / -0.5",
    sources: [{ type: "AI_GENERATED", label: "AI-Generated" }],
    generatedAt: new Date().toISOString(),
    disclaimer: "AI-generated practice paper. Not an official paper or prediction.",
  };
}

function mockMCQ(query: string): unknown {
  // Detect topic from the query to return topic-relevant MCQs
  const q = query.toLowerCase();
  let topic = "Quantitative Aptitude";
  let mcqs: unknown[] = [];

  const mk = (id: string, question: string, options: string[], correctAnswer: string, explanation: string, difficulty: "Easy" | "Medium" | "Hard", sourcePage?: number) => ({
    id, question, options, correctAnswer, explanation, topic, difficulty, sourcePage, sourceType: "AI_GENERATED" as const, validationStatus: "verified" as const,
  });

  if (q.includes("reasoning") || q.includes("series") || q.includes("pattern")) {
    topic = "Reasoning";
    mcqs = [
      mk("m1","Find the next number: 1, 4, 9, 16, 25, ?",["30","36","49","35"],"36","These are perfect squares: 1², 2², 3², 4², 5² → next is 6² = 36.","Easy",1),
      mk("m2","If FRIEND is coded as GSJFOE, how is HUMAN coded?",["IVNBO","IVMBO","IVNCO","IUNBO"],"IVNBO","Each letter shifts +1: H→I, U→V, M→N, A→B, N→O.","Medium",2),
      mk("m3","Pointing to a photo, a man said 'She is the daughter of my grandfather's only son.' How is she related to him?",["Sister","Daughter","Niece","Cousin"],"Sister","Grandfather's only son = the man's father. Father's daughter = sister.","Hard",2),
      mk("m4","Complete the series: AZ, BY, CX, DW, ?",["EV","EW","FV","DV"],"EV","First letter: A,B,C,D,E (+1). Second letter: Z,Y,X,W,V (−1).","Easy",3),
      mk("m5","In a row of children, Ravi is 7th from the left and 12th from the right. How many children are there?",["17","18","19","16"],"18","Total = 7 + 12 − 1 = 18 (Ravi is counted once).","Medium",3),
    ];
  } else if (q.includes("english") || q.includes("vocab") || q.includes("grammar")) {
    topic = "English";
    mcqs = [
      mk("m1","Choose the synonym of 'EPHEMERAL':",["Eternal","Short-lived","Permanent","Strong"],"Short-lived","Ephemeral means lasting for a very short time.","Easy",1),
      mk("m2","Choose the antonym of 'VERBOSE':",["Talkative","Concise","Wordy","Lengthy"],"Concise","Verbose means using more words than needed. Antonym = concise.","Medium",2),
      mk("m3","Fill in the blank: 'She is allergic ___ peanuts.'",["to","from","with","of"],"to","The correct preposition after 'allergic' is 'to'.","Easy",2),
      mk("m4","Identify the correctly spelled word:",["Accomodate","Acommodate","Accommodate","Acomodate"],"Accommodate","Correct spelling: A-C-C-O-M-M-O-D-A-T-E (double c, double m).","Hard",3),
      mk("m5","Choose the correct passive voice of 'She writes a letter':",["A letter is written by her","A letter was written by her","A letter is being written","A letter has been written"],"A letter is written by her","Present simple passive: is/am/are + past participle.","Medium",3),
    ];
  } else if (q.includes("general awareness") || q.includes("gk") || q.includes("current")) {
    topic = "General Awareness";
    mcqs = [
      mk("m1","Who is known as the 'Father of the Indian Constitution'?",["Jawaharlal Nehru","B.R. Ambedkar","Rajendra Prasad","Sardar Patel"],"B.R. Ambedkar","Dr. B.R. Ambedkar chaired the Drafting Committee of the Constituent Assembly.","Easy",1),
      mk("m2","The battle of Plassey was fought in which year?",["1757","1764","1857","1526"],"1757","The Battle of Plassey (1757) established British rule in India.","Medium",2),
      mk("m3","Which article of the Indian Constitution deals with the Right to Equality?",["Article 14","Article 19","Article 21","Article 32"],"Article 14","Article 14 guarantees equality before law and equal protection of laws.","Hard",2),
      mk("m4","The headquarters of the World Trade Organization (WTO) is located in:",["New York","Geneva","Vienna","Paris"],"Geneva","The WTO is headquartered in Geneva, Switzerland.","Medium",3),
      mk("m5","Who was the first Indian woman to win a Nobel Prize?",["Mother Teresa","Indira Gandhi","Sarojini Naidu","Kiran Bedi"],"Mother Teresa","Mother Teresa won the Nobel Peace Prize in 1979.","Easy",3),
    ];
  } else {
    // Quantitative Aptitude default
    topic = "Quantitative Aptitude";
    mcqs = [
      mk("m1","What is 15% of 200?",["25","30","35","20"],"30","15% of 200 = 0.15 × 200 = 30.","Easy",1),
      mk("m2","If the simple interest on ₹5000 for 2 years at 8% per annum, the interest is:",["₹800","₹1600","₹400","₹1200"],"₹800","SI = P×R×T/100 = 5000×8×2/100 = ₹800.","Medium",2),
      mk("m3","The ratio 2:3 expressed as a percentage is:",["40%","66.67%","60%","33.33%"],"66.67%","2/3 × 100 = 66.67%.","Easy",2),
      mk("m4","A and B can complete a task in 10 and 15 days respectively. Working together they finish in:",["6 days","5 days","8 days","4 days"],"6 days","Combined rate = 1/10 + 1/15 = 1/6 per day → 6 days.","Hard",3),
      mk("m5","The average of the first 10 natural numbers is:",["5","5.5","6","4.5"],"5.5","First 10 natural numbers: 1+2+...+10 = 55. Average = 55/10 = 5.5.","Medium",3),
    ];
  }

  return {
    source: "Uploaded PDF",
    topic,
    difficulty: "Mixed" as const,
    questionCount: mcqs.length,
    questionType: "MCQ",
    mode: "Strict PDF Mode",
    mcqs,
    sources: [{ type: "UPLOADED_DOCUMENT", label: "Uploaded Document" }],
    generatedAt: new Date().toISOString(),
  };
}

function mockPdfAnalysis(query: string): unknown {
  // Try to extract real info from the pasted content. The route sends the content
  // in the user prompt. Look for keywords to build a grounded extraction.
  const q = query.toLowerCase();

  // Extract any numbers/ages/dates mentioned in the content
  const ageMatch = query.match(/(\d{2})\s*[-–]\s*(\d{2})\s*years?/i);
  const dateMatches = [...query.matchAll(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4})/g)].map(m => m[0]).slice(0, 4);
  const questionMatch = query.match(/(\d+)\s*questions?/i);
  const marksMatch = query.match(/(\d+)\s*marks?/i);
  const durationMatch = query.match(/(\d+)\s*(?:minutes|min|hours?|hrs?)/i);
  const negMatch = query.match(/[-−](0?\.\d+|\d+)\s*(?:per|marks?|negative)/i);

  // Detect document type from keywords
  let docType = "Official Notification";
  let title = "Exam Notification";
  let organisation = "Exam Conducting Body";
  let exam = "Sample Exam";
  if (q.includes("ssc")) { exam = "SSC CGL"; organisation = "Staff Selection Commission"; }
  else if (q.includes("gate")) { exam = "GATE"; organisation = "IIT/IISc"; docType = "GATE Notification"; title = "GATE Information Brochure"; }
  else if (q.includes("upsc")) { exam = "UPSC CSE"; organisation = "Union Public Service Commission"; }
  else if (q.includes("railway") || q.includes("rrb")) { exam = "RRB NTPC"; organisation = "Railway Recruitment Board"; }
  else if (q.includes("banking") || q.includes("ibps") || q.includes("sbi")) { exam = "Banking PO"; organisation = "IBPS/SBI"; }

  const extracted: { category: string; content: string; sourcePage: number; sourceSection: string }[] = [];

  // Eligibility
  extracted.push({
    category: "Eligibility",
    content: q.includes("graduation") ? "Graduation in any discipline from a recognised university." : "Bachelor's degree (check specific post requirements).",
    sourcePage: 2, sourceSection: "Eligibility",
  });
  // Age
  if (ageMatch) {
    extracted.push({ category: "Age Limit", content: `${ageMatch[1]}-${ageMatch[2]} years as on cut-off date (relaxation for reserved categories).`, sourcePage: 2, sourceSection: "Eligibility" });
  } else {
    extracted.push({ category: "Age Limit", content: "20-30 years as on cut-off date (relaxation for reserved categories).", sourcePage: 2, sourceSection: "Eligibility" });
  }
  // Dates
  if (dateMatches.length > 0) {
    extracted.push({ category: "Important Dates", content: `Key dates mentioned: ${dateMatches.join(", ")}. Application window and exam schedule per official notification.`, sourcePage: 1, sourceSection: "Important Dates" });
  } else {
    extracted.push({ category: "Important Dates", content: "Application start, last date, and exam date per official notification.", sourcePage: 1, sourceSection: "Important Dates" });
  }
  // Exam Pattern
  const qCount = questionMatch ? questionMatch[1] : "100";
  const mCount = marksMatch ? marksMatch[1] : "200";
  const dur = durationMatch ? durationMatch[1] : "60";
  extracted.push({ category: "Exam Pattern", content: `Tier 1: ${qCount} questions, ${mCount} marks, ${dur} minutes. Computer-based test.`, sourcePage: 5, sourceSection: "Examination Scheme" });
  // Syllabus
  const subjects: string[] = [];
  if (q.includes("quant") || q.includes("aptitude")) subjects.push("Quantitative Aptitude");
  if (q.includes("reasoning")) subjects.push("General Intelligence & Reasoning");
  if (q.includes("english")) subjects.push("English Language");
  if (q.includes("general awareness") || q.includes("ga") || q.includes("gk")) subjects.push("General Awareness");
  if (subjects.length === 0) subjects.push("Quantitative Aptitude", "Reasoning", "English", "General Awareness");
  extracted.push({ category: "Syllabus", content: subjects.join(", ") + ".", sourcePage: 6, sourceSection: "Syllabus" });
  // Marking
  const neg = negMatch ? negMatch[1] : "0.5";
  extracted.push({ category: "Marking Scheme", content: `+2 per correct answer, -${neg} per incorrect answer. Unattempted: 0.`, sourcePage: 5, sourceSection: "Examination Scheme" });
  // Selection process
  extracted.push({ category: "Selection Process", content: "Tier 1 (qualifying) → Tier 2 (merit) → Document Verification → Final Selection.", sourcePage: 3, sourceSection: "Selection Process" });

  // Word count from content length if available
  const words = query.split(/\s+/).filter(w => w.length > 2).length;
  const wordCount = words > 100 ? words : 3200;

  // OCR detection
  const ocrUsed = /ocr|scanned|image|unreadable/i.test(query);

  return {
    documentOverview: { title, organisation, exam, year: new Date().getFullYear().toString(), documentType: docType, numberOfPages: 12, importantSections: ["Eligibility", "Exam Pattern", "Syllabus", "Important Dates", "Selection Process"] },
    extractedInformation: extracted,
    topics: ["Eligibility", "Exam Pattern", "Syllabus", "Selection Process", ...subjects],
    wordCount,
    ocrUsed,
    ocrWarning: ocrUsed ? "Some information was extracted using OCR and may require verification." : undefined,
    sources: [{ type: "UPLOADED_DOCUMENT", label: "Uploaded Document", detail: `${wordCount} words analysed` }],
    generatedAt: new Date().toISOString(),
  };
}

function mockPreparation(_query: string): unknown {
  return {
    targetExam: "SSC CGL",
    examDate: "2025-06-15",
    currentLevel: "Intermediate",
    availableHoursPerDay: 4,
    daysPerWeek: 6,
    targetScore: "180/200 (Tier 1)",
    totalDays: 120,
    phases: [
      { phase: 1, name: "Foundation", goal: "Concept building", duration: "Weeks 1-4", tasks: ["Arithmetic basics", "Reasoning patterns", "English grammar"] },
      { phase: 2, name: "Topic Completion", goal: "Complete syllabus", duration: "Weeks 5-8", tasks: ["Advanced arithmetic", "All reasoning types", "Reading comprehension"] },
      { phase: 3, name: "Practice", goal: "Topic-wise + PYQs", duration: "Weeks 9-12", tasks: ["Sectional tests", "PYQ sets", "Speed practice"] },
      { phase: 4, name: "Revision", goal: "Spaced revision", duration: "Weeks 13-14", tasks: ["Weak topics", "Formula revision", "Current affairs"] },
      { phase: 5, name: "Mock Tests", goal: "Full-length simulations", duration: "Weeks 15-16", tasks: ["Daily full mocks", "Analysis", "Targeted repractice"] },
      { phase: 6, name: "Final Revision", goal: "High-priority + weak areas", duration: "Week 17", tasks: ["Top 20 topics", "Last 3 years PYQs", "Exam strategy"] },
    ],
    dailyPlans: [
      { day: 1, date: "Day 1", sessions: [{ subject: "Quant", topic: "Percentage", durationHours: 2, activity: "Concept + practice" }, { subject: "Reasoning", topic: "Series", durationHours: 1, activity: "Practice set" }, { subject: "English", topic: "Vocab", durationHours: 1, activity: "Daily 30 words" }], totalHours: 4 },
      { day: 2, date: "Day 2", sessions: [{ subject: "Quant", topic: "Profit & Loss", durationHours: 2, activity: "Concept + practice" }, { subject: "Reasoning", topic: "Coding-Decoding", durationHours: 1, activity: "Practice set" }, { subject: "GA", topic: "Current Affairs", durationHours: 1, activity: "Last 6 months" }], totalHours: 4 },
      { day: 3, date: "Day 3", sessions: [{ subject: "Quant", topic: "Ratio", durationHours: 2, activity: "Practice" }, { subject: "English", topic: "RC", durationHours: 1, activity: "2 passages" }, { subject: "Reasoning", topic: "Puzzles", durationHours: 1, activity: "Practice" }], totalHours: 4 },
    ],
    weakSubjects: ["General Awareness", "Advanced Maths"],
    strongSubjects: ["Arithmetic", "Reasoning"],
    revisionSchedule: ["Saturday: weekly revision", "Sunday: full mock"],
    mockTestSchedule: ["From week 13: daily full mock", "Last week: 2 mocks/day"],
    adaptiveNotes: ["If a topic is consistently weak, allocate 1 extra hour for 3 days", "After each mock, spend 1.5 hours on analysis"],
    sources: [{ type: "AI_ANALYSIS", label: "AI Analysis" }],
    generatedAt: new Date().toISOString(),
  };
}

function mockMultiExam(_query: string): unknown {
  return {
    exams: [
      { name: "SSC CGL", priority: "Primary", date: "2025-06-15", targetScore: "180/200" },
      { name: "Banking PO", priority: "Secondary", date: "2025-07-20", targetScore: "Cut-off clearing" },
      { name: "Railway NTPC", priority: "Backup", date: "2025-09-01", targetScore: "Qualifying" },
    ],
    availableHours: 5,
    knowledgeMap: {
      common: ["Quantitative Aptitude", "Reasoning", "English", "General Awareness"],
      examSpecific: [
        { exam: "SSC CGL", priority: "Primary", topics: ["Static GK", "Advanced Maths", "Statistics (JSO)"] },
        { exam: "Banking PO", priority: "Secondary", topics: ["Banking Awareness", "Descriptive English", "Computer Awareness"] },
        { exam: "Railway NTPC", priority: "Backup", topics: ["Railway Awareness", "Typing"] },
      ],
    },
    combinedStrategy: {
      commonPreparation: ["Percentage", "Ratio", "Series", "Comprehension", "Current Affairs"],
      examSpecificPreparation: [{ exam: "CGL", topics: ["Statistics", "Static GK"] }, { exam: "Banking", topics: ["Banking Awareness", "Computer"] }, { exam: "Railway", topics: ["Railway GK", "Typing"] }],
      priority: ["Shared foundations first", "Then CGL-specific", "Banking maintenance", "Railway mock-only before exam"],
      dependencies: ["Percentage before Profit & Loss", "Tables before quick arithmetic"],
      scheduling: ["Morning: Quant (common)", "Afternoon: Reasoning (common)", "Evening: Exam-specific"],
      revision: ["Weekend shared revision", "Topic-level spaced repetition"],
      mockTesting: ["CGL mocks closer to June", "Banking mocks in July", "Railway mocks in August"],
    },
    conflicts: [
      { type: "Different patterns", description: "CGL 100q/60min vs Banking 100q/60min vs NTPC variable", reason: "Speed requirements differ" },
      { type: "Different marking", description: "CGL -0.5, Banking -0.25, NTPC -0.33", reason: "Different risk tolerance per exam" },
      { type: "Different awareness", description: "CGL static GK, Banking banking-awareness, Railway rail-awareness", reason: "Requires separate prep" },
    ],
    weeklySchedule: [
      { day: "Monday", sessions: ["Quant (common): 2h", "Reasoning: 1.5h", "English: 1.5h"] },
      { day: "Tuesday", sessions: ["Quant (CGL-adv): 1.5h", "Banking Awareness: 1.5h", "Reasoning: 2h"] },
      { day: "Wednesday", sessions: ["Quant (common): 2h", "English: 1.5h", "Static GK: 1.5h"] },
      { day: "Thursday", sessions: ["Quant (Banking): 1.5h", "Computer Awareness: 1.5h", "Reasoning: 2h"] },
      { day: "Friday", sessions: ["Quant (common): 2h", "Current Affairs: 1.5h", "Railway GK: 1.5h"] },
      { day: "Saturday", sessions: ["Weekly revision: 2.5h", "Sectional test: 2.5h"] },
      { day: "Sunday", sessions: ["Full mock (rotating): 2h", "Analysis: 1.5h", "Weak topic: 1.5h"] },
    ],
    sources: [{ type: "AI_ANALYSIS", label: "AI Analysis" }],
    generatedAt: new Date().toISOString(),
  };
}

function mockPerformance(_query: string): unknown {
  return {
    score: 142,
    maxMarks: 200,
    accuracy: 76,
    correct: 78,
    incorrect: 14,
    unattempted: 8,
    timeUsed: "55 min",
    avgTimePerQuestion: "33 sec",
    topicWise: [
      { topic: "Percentage", correct: 8, total: 10, accuracy: 80 },
      { topic: "Profit & Loss", correct: 6, total: 10, accuracy: 60 },
      { topic: "Ratio", correct: 9, total: 10, accuracy: 90 },
      { topic: "Series", correct: 7, total: 10, accuracy: 70 },
      { topic: "RC", correct: 8, total: 10, accuracy: 80 },
    ],
    difficultyWise: [
      { difficulty: "Easy", correct: 28, total: 30, accuracy: 93 },
      { difficulty: "Medium", correct: 35, total: 45, accuracy: 78 },
      { difficulty: "Hard", correct: 15, total: 25, accuracy: 60 },
    ],
    questionTypeWise: [{ type: "MCQ", correct: 78, total: 100, accuracy: 78 }],
    negativeMarkImpact: -7,
    strengths: ["Ratio", "Percentage", "Reading Comprehension"],
    weakAreas: ["Profit & Loss", "Hard difficulty questions"],
    conceptualErrors: ["Misapplied successive percentage formula", "Confused CP and SP in 2 questions"],
    calculationErrors: ["2 arithmetic slips in Profit & Loss"],
    questionSelectionErrors: ["Spent 4 min on 1 hard question — should have skipped"],
    recommendedPractice: ["Revise Profit & Loss → 15 Level-2 variants → 5 PYQs → mixed test"],
    generatedAt: new Date().toISOString(),
  };
}

function mockFlashcards(query: string): unknown {
  // Detect the topic from the user prompt so the canned cards feel relevant.
  // The prompt includes lines like "- Topic: SSC CGL" or "- Topic: Calculus".
  const lower = query.toLowerCase();
  const topicMatch = query.match(/topic:\s*([^\n]+)/i);
  let topic = topicMatch?.[1]?.trim() ?? "";

  type RawCard = {
    front: string;
    back: string;
    topic: string;
    difficulty: "Easy" | "Medium" | "Hard";
  };

  let cards: RawCard[] = [];

  if (lower.includes("ssc cgl") || lower.includes("general awareness")) {
    topic = topic || "SSC CGL — General Awareness";
    cards = [
      { front: "Who appoints the Chief Election Commissioner of India?", back: "The President of India appoints the Chief Election Commissioner on the advice of the Union Council.", topic: "Polity", difficulty: "Easy" },
      { front: "Which Article of the Indian Constitution deals with the Right to Equality?", back: "Articles 14–18 — Article 14 guarantees equality before law and equal protection of laws.", topic: "Polity", difficulty: "Medium" },
      { front: "The Quit India Movement was launched in which year?", back: "1942 — launched by Gandhi on 8 August with the slogan 'Do or Die'.", topic: "Modern History", difficulty: "Easy" },
      { front: "Which river is known as the 'Sorrow of Bihar'?", back: "The Kosi river, due to frequent flooding that causes widespread damage in Bihar.", topic: "Geography", difficulty: "Medium" },
      { front: "Who is known as the 'Missile Man of India'?", back: "Dr. A.P.J. Abdul Kalam — for his work on India's missile and nuclear programmes.", topic: "General Knowledge", difficulty: "Easy" },
      { front: "The Tropic of Cancer passes through how many Indian states?", back: "8 states — Gujarat, Rajasthan, MP, Chhattisgarh, Jharkhand, WB, Tripura, Mizoram.", topic: "Geography", difficulty: "Hard" },
      { front: "Which vitamin is produced when human skin is exposed to sunlight?", back: "Vitamin D (cholecalciferol) — synthesised in the skin from UV exposure.", topic: "Science", difficulty: "Medium" },
      { front: "Who founded the Mauryan Empire?", back: "Chandragupta Maurya in 322 BCE, with guidance from his mentor Chanakya (Kautilya).", topic: "Ancient History", difficulty: "Medium" },
      { front: "What is the currency of Japan?", back: "The Japanese Yen (¥) — the official currency issued by the Bank of Japan.", topic: "General Knowledge", difficulty: "Easy" },
      { front: "Which gas is most abundant in Earth's atmosphere?", back: "Nitrogen — about 78% of the atmosphere by volume, followed by oxygen at ~21%.", topic: "Science", difficulty: "Easy" },
    ];
  } else if (lower.includes("calculus") || lower.includes("derivative") || lower.includes("integral")) {
    topic = topic || "Calculus";
    cards = [
      { front: "What is the derivative of sin(x) with respect to x?", back: "cos(x) — i.e. d/dx[sin x] = cos x.", topic: "Differentiation", difficulty: "Easy" },
      { front: "State the power rule for differentiation.", back: "d/dx[x^n] = n·x^(n−1) for any real n.", topic: "Differentiation", difficulty: "Easy" },
      { front: "What is ∫ 1/x dx?", back: "ln|x| + C — the natural log of the absolute value, plus the constant of integration.", topic: "Integration", difficulty: "Medium" },
      { front: "State the chain rule for differentiation.", back: "d/dx[f(g(x))] = f'(g(x)) · g'(x) — the outer derivative times the inner derivative.", topic: "Differentiation", difficulty: "Medium" },
      { front: "What is the derivative of e^x?", back: "e^x — the exponential function is its own derivative.", topic: "Differentiation", difficulty: "Easy" },
      { front: "Evaluate ∫ 0 to 1 of x dx.", back: "1/2 — using ∫x dx = x²/2, evaluated as (1²/2) − (0²/2) = 1/2.", topic: "Integration", difficulty: "Medium" },
      { front: "What is L'Hôpital's Rule used for?", back: "To evaluate limits of indeterminate forms 0/0 or ∞/∞ by differentiating numerator and denominator separately.", topic: "Limits", difficulty: "Hard" },
      { front: "What does the Fundamental Theorem of Calculus connect?", back: "It connects differentiation and integration: ∫ₐᵇ f(x) dx = F(b) − F(a) where F' = f.", topic: "Integration", difficulty: "Hard" },
      { front: "What is the derivative of ln(x)?", back: "1/x for x > 0.", topic: "Differentiation", difficulty: "Easy" },
      { front: "Find d/dx[tan(x)].", back: "sec²(x).", topic: "Differentiation", difficulty: "Medium" },
    ];
  } else if (lower.includes("vocab") || lower.includes("english")) {
    topic = topic || "English Vocabulary";
    cards = [
      { front: "What does 'ephemeral' mean?", back: "Lasting for a very short time; transitory. e.g. ephemeral fame.", topic: "Vocabulary", difficulty: "Easy" },
      { front: "Synonym of 'benevolent'?", back: "Kind, generous, charitable — wishing well to others.", topic: "Synonyms", difficulty: "Easy" },
      { front: "Antonym of 'meticulous'?", back: "Careless, sloppy, negligent — the opposite of careful attention to detail.", topic: "Antonyms", difficulty: "Medium" },
      { front: "What does 'ubiquitous' mean?", back: "Present, appearing, or found everywhere. e.g. smartphones are ubiquitous today.", topic: "Vocabulary", difficulty: "Medium" },
      { front: "Idiom meaning of 'bite the bullet'?", back: "To endure a painful or difficult situation with courage, without complaining.", topic: "Idioms", difficulty: "Medium" },
      { front: "What does 'pragmatic' mean?", back: "Dealing with things sensibly and realistically, based on practical rather than theoretical considerations.", topic: "Vocabulary", difficulty: "Hard" },
      { front: "Synonym of 'augment'?", back: "Increase, enlarge, supplement — to make something greater in size or amount.", topic: "Synonyms", difficulty: "Easy" },
      { front: "What does 'candid' mean?", back: "Truthful and straightforward; frank and unreserved in speech.", topic: "Vocabulary", difficulty: "Easy" },
    ];
  } else if (lower.includes("reasoning") || lower.includes("pattern")) {
    topic = topic || "Reasoning — Patterns";
    cards = [
      { front: "Find the next number: 2, 6, 12, 20, 30, ?", back: "42 — differences are 4, 6, 8, 10, 12; second difference is constant 2.", topic: "Number Series", difficulty: "Medium" },
      { front: "If CAT = 24, DOG = 26, what is FOX?", back: "44 — sum of letter positions: F(6)+O(15)+X(24) = 45; or by reverse pattern, 44.", topic: "Coding-Decoding", difficulty: "Hard" },
      { front: "Odd one out: 3, 5, 7, 9, 11, 13", back: "9 — it is the only composite number; the rest are primes.", topic: "Odd One Out", difficulty: "Easy" },
      { front: "Complete the analogy: Book : Author :: Painting : ?", back: "Painter — the creator-to-creation relationship.", topic: "Analogy", difficulty: "Easy" },
      { front: "Next in series: A, C, F, J, O, ?", back: "U — gaps are +2, +3, +4, +5, +6 → O(15) + 6 = U(21).", topic: "Letter Series", difficulty: "Medium" },
      { front: "If 'TABLE' is coded as 'UCAMF', what is 'CHAIR'?", back: "DIBJS — each letter shifted +1 forward in the alphabet.", topic: "Coding-Decoding", difficulty: "Medium" },
      { front: "Which number does not belong: 4, 9, 16, 23, 25, 36?", back: "23 — it is the only prime; the rest are perfect squares.", topic: "Odd One Out", difficulty: "Medium" },
      { front: "Direction: A walks 3 km North, turns East, walks 4 km. Distance from start?", back: "5 km — forms a 3-4-5 right triangle (Pythagoras).", topic: "Direction Sense", difficulty: "Hard" },
    ];
  } else if (lower.includes("quant") || lower.includes("formula") || lower.includes("aptitude")) {
    topic = topic || "Quantitative Aptitude — Formulas";
    cards = [
      { front: "Formula for compound interest (amount) when compounded annually?", back: "A = P(1 + r/100)^n, where P = principal, r = rate %, n = years.", topic: "Interest", difficulty: "Medium" },
      { front: "Formula for speed when distance and time are known?", back: "Speed = Distance / Time. SI unit: m/s; commonly km/h.", topic: "Time-Speed-Distance", difficulty: "Easy" },
      { front: "Profit % formula?", back: "Profit % = (Profit / Cost Price) × 100, where Profit = SP − CP.", topic: "Profit & Loss", difficulty: "Easy" },
      { front: "Formula for average of n numbers?", back: "Average = (Sum of all values) / (Number of values).", topic: "Average", difficulty: "Easy" },
      { front: "Time taken by two pipes together to fill a tank?", back: "If pipes fill in a and b hours alone: T = (a·b)/(a+b) hours.", topic: "Pipes & Cisterns", difficulty: "Medium" },
      { front: "Quadratic formula to solve ax² + bx + c = 0?", back: "x = [−b ± √(b² − 4ac)] / 2a, where the discriminant Δ = b² − 4ac.", topic: "Algebra", difficulty: "Medium" },
      { front: "Formula for area of a trapezium?", back: "A = ½ × (sum of parallel sides) × height = ½(a + b)·h.", topic: "Mensuration", difficulty: "Medium" },
      { front: "If x men finish a job in d days, how many days for (x+k) men?", back: "Days = (x·d)/(x+k) — inverse proportion (assuming equal efficiency).", topic: "Time & Work", difficulty: "Hard" },
    ];
  } else {
    topic = topic || "General Aptitude";
    cards = [
      { front: "What is 15% of 240?", back: "36 — calculate 10% = 24, then 5% = 12; 24 + 12 = 36.", topic: "Percentage", difficulty: "Easy" },
      { front: "If the ratio of A:B is 3:4 and A is 27, what is B?", back: "36 — common multiplier is 9 (27/3); B = 4 × 9 = 36.", topic: "Ratio", difficulty: "Easy" },
      { front: "Average of 5, 10, 15, 20, 25?", back: "15 — sum = 75, divided by 5 = 15.", topic: "Average", difficulty: "Easy" },
      { front: "A train travels 60 km in 45 minutes. What is its speed in km/h?", back: "80 km/h — 45 min = 0.75 h; speed = 60 / 0.75 = 80.", topic: "Speed", difficulty: "Medium" },
      { front: "What is the SI unit of force?", back: "The newton (N) — 1 N = 1 kg·m/s².", topic: "Physics", difficulty: "Easy" },
      { front: "What is HCF of 12, 18, 24?", back: "6 — the largest number that divides all three without remainder.", topic: "Number System", difficulty: "Medium" },
      { front: "Find the missing term: 1, 4, 9, 16, ?, 36", back: "25 — perfect squares of 1, 2, 3, 4, 5, 6.", topic: "Series", difficulty: "Easy" },
      { front: "If a:b = 2:3 and b:c = 4:5, find a:c.", back: "8:15 — combine by making b common (12): a:b:c = 8:12:15.", topic: "Ratio", difficulty: "Hard" },
    ];
  }

  const today = new Date().toISOString();
  const out = cards.slice(0, 10).map((c, i) => ({
    id: `fc${i + 1}`,
    front: c.front,
    back: c.back,
    topic: c.topic,
    difficulty: c.difficulty,
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: today,
    mastery: "New" as const,
  }));

  const sourceMatch = query.match(/source label:\s*([^\n]+)/i);
  const source = sourceMatch?.[1]?.trim() || "Custom topic";

  return {
    id: `fs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    source,
    topic,
    cards: out,
    sources: [{ type: "AI_GENERATED", label: "ExamIntel Flashcard Generator" }],
    generatedAt: today,
  };
}

// ============================================================
// Formula Sheet lookup — searches the built-in SEED_FORMULAS by
// keyword (name / topic / subject match). Returns 3–5 matches, or
// all formulas when no keyword in the query matches anything.
// ============================================================
function mockFormulasLookup(query: string): unknown {
  const lower = query.toLowerCase();

  // Tokenize the query into candidate keywords (drop short / stop words).
  const stop = new Set([
    "the", "a", "an", "of", "for", "and", "or", "to", "in", "is", "are",
    "what", "whats", "formula", "formulas", "formulae", "lookup", "search",
    "find", "me", "please", "give", "show", "list", "all", "with",
  ]);
  const tokens = lower
    .split(/[^a-z0-9&+-]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !stop.has(t));

  const matched = SEED_FORMULAS.filter((f) => {
    const hay = `${f.subject} ${f.topic} ${f.name} ${f.description}`.toLowerCase();
    return tokens.some((tok) => hay.includes(tok));
  });

  // De-dup by id (in case the same formula matches multiple tokens).
  const seen = new Set<string>();
  const unique = matched.filter((f) =>
    seen.has(f.id) ? false : (seen.add(f.id), true)
  );

  // 3–5 matches when possible; if fewer keywords match, fall back to all.
  let result = unique;
  if (unique.length < 3) {
    result = SEED_FORMULAS.slice();
  }
  const capped = result.slice(0, 5);

  return {
    formulas: capped.map((f) => ({
      id: f.id,
      subject: f.subject,
      topic: f.topic,
      name: f.name,
      formula: f.formula,
      description: f.description,
      example: f.example,
      difficulty: f.difficulty,
    })),
  };
}

// ============================================================
// PYQ Browser mock — routes on schema hint "PYQSet"/"PYQList"
// or system/user text containing "PYQ Browser" / "Similar-Question
// Finder". Detects the exam from the query text and returns 8–10
// realistic previous-year questions for SSC CGL, GATE CS, or a
// default mixed-quant set. Years vary across 2020–2024.
// ============================================================
type MockPYQ = {
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
  sourceType: string;
  similarityReason?: string;
};

function mockPYQs(query: string): unknown {
  const q = query.toLowerCase();
  const isSimilar = q.includes("similar-question finder") || q.includes("find similar");
  const reqExamMatch = query.match(/exam:\s*([^\n]+)/i);
  const reqYearMatch = query.match(/year:\s*([^\n]+)/i);
  const reqTopicMatch = query.match(/topic filter:\s*([^\n]+)/i);

  let exam = "SSC CGL";
  if (reqExamMatch && reqExamMatch[1]) {
    const v = reqExamMatch[1].trim();
    if (v.toLowerCase() !== "all") exam = v;
  } else if (q.includes("ssc cgl")) {
    exam = "SSC CGL";
  } else if (q.includes("gate")) {
    exam = "GATE CS";
  } else if (q.includes("upsc")) {
    exam = "UPSC CSE";
  } else if (q.includes("rrb") || q.includes("railway")) {
    exam = "RRB JE";
  } else if (q.includes("banking") || q.includes("ibps") || q.includes("sbi")) {
    exam = "Banking PO";
  }

  const year = reqYearMatch && /^\d{4}$/.test(reqYearMatch[1]?.trim() ?? "") ? reqYearMatch[1].trim() : "";
  const topic = reqTopicMatch && reqTopicMatch[1] ? reqTopicMatch[1].trim() : "";

  const years = year ? Array(10).fill(year) : ["2024", "2023", "2024", "2022", "2023", "2021", "2024", "2020", "2023", "2022"];
  const baseId = isSimilar ? "sim" : "pyq";

  let pyqs: MockPYQ[] = [];

  if (exam === "SSC CGL") {
    pyqs = [
      {
        id: `${baseId}1`,
        exam: "SSC CGL",
        year: years[0],
        topic: "Percentage",
        subject: "Quantitative Aptitude",
        question: "A shopkeeper marks his goods 40% above the cost price and allows a discount of 10%. What is his profit percentage?",
        options: ["26%", "30%", "32%", "36%"],
        correctAnswer: "26%",
        explanation: "If CP = 100, MP = 140. After 10% discount, SP = 126. Profit = 26, so profit % = 26%.",
        difficulty: "Medium",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}2`,
        exam: "SSC CGL",
        year: years[1],
        topic: "Profit & Loss",
        subject: "Quantitative Aptitude",
        question: "If the cost price of 12 articles equals the selling price of 10 articles, the profit percentage is:",
        options: ["15%", "20%", "25%", "18%"],
        correctAnswer: "20%",
        explanation: "Let CP per article = 10. Then SP of 10 = 120, so SP per article = 12. Profit = 2 on CP 10 = 20%.",
        difficulty: "Easy",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}3`,
        exam: "SSC CGL",
        year: years[2],
        topic: "Ratio & Proportion",
        subject: "Quantitative Aptitude",
        question: "If A : B = 2 : 3 and B : C = 4 : 5, then A : C is:",
        options: ["2 : 5", "8 : 15", "8 : 5", "3 : 5"],
        correctAnswer: "8 : 15",
        explanation: "Make B common: A : B = 8 : 12 and B : C = 12 : 15, so A : C = 8 : 15.",
        difficulty: "Medium",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}4`,
        exam: "SSC CGL",
        year: years[3],
        topic: "Time & Work",
        subject: "Quantitative Aptitude",
        question: "A can do a piece of work in 20 days and B in 30 days. Working together, in how many days will they finish it?",
        options: ["10 days", "12 days", "15 days", "18 days"],
        correctAnswer: "12 days",
        explanation: "Combined rate = 1/20 + 1/30 = 5/60 = 1/12. So they finish in 12 days.",
        difficulty: "Easy",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}5`,
        exam: "SSC CGL",
        year: years[4],
        topic: "Series",
        subject: "General Intelligence & Reasoning",
        question: "Find the next number in the series: 2, 6, 12, 20, 30, ?",
        options: ["40", "42", "44", "46"],
        correctAnswer: "42",
        explanation: "Differences are 4, 6, 8, 10, 12 — increasing by 2 each step. Next term = 30 + 12 = 42.",
        difficulty: "Medium",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}6`,
        exam: "SSC CGL",
        year: years[5],
        topic: "Coding-Decoding",
        subject: "General Intelligence & Reasoning",
        question: "If 'TABLE' is coded as 'UCAMF', then 'CHAIR' is coded as:",
        options: ["DIBJS", "DIKJR", "DJBKT", "DJCLT"],
        correctAnswer: "DIBJS",
        explanation: "Each letter is shifted +1: T→U, A→B, B→C, L→M, E→F. Same rule: C→D, H→I, A→B, I→J, R→S.",
        difficulty: "Easy",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}7`,
        exam: "SSC CGL",
        year: years[6],
        topic: "Reading Comprehension",
        subject: "English Language",
        question: "Choose the word most nearly OPPOSITE in meaning to 'BENEVOLENT':",
        options: ["Malevolent", "Generous", "Charitable", "Amiable"],
        correctAnswer: "Malevolent",
        explanation: "'Benevolent' means kind and well-meaning; the antonym is 'Malevolent' (wishing harm).",
        difficulty: "Easy",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}8`,
        exam: "SSC CGL",
        year: years[7],
        topic: "Polity",
        subject: "General Awareness",
        question: "Which Article of the Indian Constitution deals with the Right to Equality?",
        options: ["Article 14", "Article 19", "Article 21", "Article 32"],
        correctAnswer: "Article 14",
        explanation: "Article 14 guarantees equality before law and equal protection of laws to all persons within Indian territory.",
        difficulty: "Medium",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}9`,
        exam: "SSC CGL",
        year: years[8],
        topic: "Mensuration",
        subject: "Quantitative Aptitude",
        question: "The area of a trapezium whose parallel sides are 12 cm and 18 cm and the distance between them is 10 cm is:",
        options: ["150 cm²", "140 cm²", "120 cm²", "180 cm²"],
        correctAnswer: "150 cm²",
        explanation: "Area = ½ × (sum of parallel sides) × height = ½ × (12 + 18) × 10 = ½ × 30 × 10 = 150 cm².",
        difficulty: "Hard",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}10`,
        exam: "SSC CGL",
        year: years[9],
        topic: "Modern History",
        subject: "General Awareness",
        question: "The Quit India Movement was launched by Mahatma Gandhi in which year?",
        options: ["1940", "1942", "1945", "1947"],
        correctAnswer: "1942",
        explanation: "The Quit India Movement was launched on 8 August 1942 with the slogan 'Do or Die'.",
        difficulty: "Easy",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
    ];
  } else if (exam === "GATE CS") {
    pyqs = [
      {
        id: `${baseId}1`,
        exam: "GATE CS",
        year: years[0],
        topic: "Data Structures",
        subject: "Computer Science",
        question: "Which of the following data structures is best suited for implementing a recursive function call mechanism?",
        options: ["Queue", "Stack", "Linked List", "Binary Tree"],
        correctAnswer: "Stack",
        explanation: "Stacks support Last-In-First-Out semantics, naturally matching the call/return order of recursive function invocation.",
        difficulty: "Easy",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}2`,
        exam: "GATE CS",
        year: years[1],
        topic: "Algorithms",
        subject: "Computer Science",
        question: "The worst-case time complexity of QuickSort is:",
        options: ["O(n log n)", "O(n²)", "O(n log² n)", "O(n)"],
        correctAnswer: "O(n²)",
        explanation: "When the pivot is consistently the smallest or largest element, partitions are unbalanced, leading to O(n²) comparisons.",
        difficulty: "Medium",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}3`,
        exam: "GATE CS",
        year: years[2],
        topic: "Operating Systems",
        subject: "Computer Science",
        question: "Which page replacement algorithm suffers from Belady's anomaly?",
        options: ["LRU", "Optimal", "FIFO", "LFU"],
        correctAnswer: "FIFO",
        explanation: "FIFO can exhibit Belady's anomaly: increasing the number of frames can sometimes increase the number of page faults.",
        difficulty: "Hard",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}4`,
        exam: "GATE CS",
        year: years[3],
        topic: "DBMS",
        subject: "Computer Science",
        question: "Which normal form removes partial dependency on a subset of a candidate key?",
        options: ["1NF", "2NF", "3NF", "BCNF"],
        correctAnswer: "2NF",
        explanation: "2NF requires every non-prime attribute to be fully functionally dependent on the whole candidate key, removing partial dependencies.",
        difficulty: "Medium",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}5`,
        exam: "GATE CS",
        year: years[4],
        topic: "Computer Networks",
        subject: "Computer Science",
        question: "In the OSI model, routing and switching occur at which layer?",
        options: ["Layer 2", "Layer 3", "Layer 4", "Layer 7"],
        correctAnswer: "Layer 3",
        explanation: "Layer 3 (Network Layer) is responsible for logical addressing and routing. Layer 2 (Data Link) handles switching within a LAN.",
        difficulty: "Easy",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}6`,
        exam: "GATE CS",
        year: years[5],
        topic: "Theory of Computation",
        subject: "Computer Science",
        question: "Which of the following languages is NOT context-free?",
        options: ["{ aⁿbⁿ | n ≥ 0 }", "{ aⁿbⁿcⁿ | n ≥ 0 }", "{ wwᴿ | w ∈ {a,b}* }", "{ a* }"],
        correctAnswer: "{ aⁿbⁿcⁿ | n ≥ 0 }",
        explanation: "A pushdown automaton has a single stack and cannot match three independent counts simultaneously, so aⁿbⁿcⁿ is context-sensitive, not context-free.",
        difficulty: "Hard",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}7`,
        exam: "GATE CS",
        year: years[6],
        topic: "Discrete Mathematics",
        subject: "Computer Science",
        question: "The number of Boolean functions possible with 3 Boolean variables is:",
        options: ["8", "64", "256", "512"],
        correctAnswer: "256",
        explanation: "With 3 variables there are 2³ = 8 input rows, and each row can map to 0 or 1, giving 2⁸ = 256 possible Boolean functions.",
        difficulty: "Medium",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}8`,
        exam: "GATE CS",
        year: years[7],
        topic: "Digital Logic",
        subject: "Computer Science",
        question: "The minimum number of NAND gates required to implement the Boolean function Y = A · B is:",
        options: ["1", "2", "3", "4"],
        correctAnswer: "2",
        explanation: "A NAND of A and B gives (A·B)′. A second NAND acting as an inverter on the output yields A·B, using 2 NAND gates.",
        difficulty: "Hard",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}9`,
        exam: "GATE CS",
        year: years[8],
        topic: "Compiler Design",
        subject: "Computer Science",
        question: "Which of the following phases of a compiler is responsible for detecting 'undefined variable' errors?",
        options: ["Lexical Analysis", "Syntax Analysis", "Semantic Analysis", "Code Optimization"],
        correctAnswer: "Semantic Analysis",
        explanation: "Symbol table lookups and type/scope checks happen during Semantic Analysis — that's where undefined variables are flagged.",
        difficulty: "Medium",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}10`,
        exam: "GATE CS",
        year: years[9],
        topic: "Algorithms",
        subject: "Computer Science",
        question: "The time complexity of finding the n-th Fibonacci number using the simple recursive method (without memoization) is:",
        options: ["O(n)", "O(n²)", "O(2ⁿ)", "O(log n)"],
        correctAnswer: "O(2ⁿ)",
        explanation: "Naive recursion recomputes overlapping subproblems, leading to an exponential recurrence T(n) = T(n-1) + T(n-2) + O(1), bounded by O(2ⁿ).",
        difficulty: "Medium",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
    ];
  } else {
    // Default — mixed quantitative aptitude questions
    pyqs = [
      {
        id: `${baseId}1`,
        exam,
        year: years[0],
        topic: "Percentage",
        subject: "Quantitative Aptitude",
        question: "What is 15% of 240?",
        options: ["30", "32", "36", "40"],
        correctAnswer: "36",
        explanation: "10% of 240 = 24; 5% = 12. Sum = 36.",
        difficulty: "Easy",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}2`,
        exam,
        year: years[1],
        topic: "Average",
        subject: "Quantitative Aptitude",
        question: "The average of 5 consecutive even numbers is 16. The largest of these numbers is:",
        options: ["18", "20", "22", "24"],
        correctAnswer: "20",
        explanation: "Five consecutive even numbers with average 16 are 12, 14, 16, 18, 20. Largest = 20.",
        difficulty: "Medium",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}3`,
        exam,
        year: years[2],
        topic: "Time, Speed & Distance",
        subject: "Quantitative Aptitude",
        question: "A train travels 60 km in 45 minutes. Its speed in km/h is:",
        options: ["60", "70", "75", "80"],
        correctAnswer: "80",
        explanation: "45 min = 0.75 h. Speed = 60 / 0.75 = 80 km/h.",
        difficulty: "Easy",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}4`,
        exam,
        year: years[3],
        topic: "Simple Interest",
        subject: "Quantitative Aptitude",
        question: "The simple interest on ₹5,000 at 8% per annum for 3 years is:",
        options: ["₹1,000", "₹1,200", "₹1,400", "₹1,500"],
        correctAnswer: "₹1,200",
        explanation: "SI = P × R × T / 100 = 5000 × 8 × 3 / 100 = ₹1,200.",
        difficulty: "Easy",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}5`,
        exam,
        year: years[4],
        topic: "Compound Interest",
        subject: "Quantitative Aptitude",
        question: "The compound interest on ₹10,000 at 10% per annum for 2 years (compounded annually) is:",
        options: ["₹2,000", "₹2,100", "₹2,200", "₹2,500"],
        correctAnswer: "₹2,100",
        explanation: "A = 10000 × (1.1)² = 10000 × 1.21 = 12,100. CI = 12,100 − 10,000 = ₹2,100.",
        difficulty: "Medium",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}6`,
        exam,
        year: years[5],
        topic: "Number System",
        subject: "Quantitative Aptitude",
        question: "The HCF of 12, 18, and 24 is:",
        options: ["2", "4", "6", "12"],
        correctAnswer: "6",
        explanation: "Factors of 12: {1,2,3,4,6,12}; of 18: {1,2,3,6,9,18}; of 24: {1,2,3,4,6,8,12,24}. The largest common is 6.",
        difficulty: "Easy",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}7`,
        exam,
        year: years[6],
        topic: "Mixture & Alligation",
        subject: "Quantitative Aptitude",
        question: "Two mixtures of milk and water are in the ratio 4:1 and 3:2. Mixing them in equal quantities gives a new ratio of:",
        options: ["7:3", "3:1", "5:2", "11:4"],
        correctAnswer: "7:3",
        explanation: "Take 5L of each. Mixture 1 (4:1): milk=4, water=1. Mixture 2 (3:2): milk=3, water=2. Combined: milk=7, water=3 → ratio 7:3.",
        difficulty: "Hard",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}8`,
        exam,
        year: years[7],
        topic: "Probability",
        subject: "Quantitative Aptitude",
        question: "A coin is tossed 3 times. The probability of getting at least 2 heads is:",
        options: ["1/4", "3/8", "1/2", "5/8"],
        correctAnswer: "1/2",
        explanation: "Total outcomes = 8. Favourable (≥2 heads): HHT, HTH, THH, HHH = 4 outcomes. Probability = 4/8 = 1/2.",
        difficulty: "Medium",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}9`,
        exam,
        year: years[8],
        topic: "Ratio & Proportion",
        subject: "Quantitative Aptitude",
        question: "If 15 men can complete a work in 24 days, then 18 men can complete the same work in:",
        options: ["18 days", "20 days", "22 days", "26 days"],
        correctAnswer: "20 days",
        explanation: "Work = 15 × 24 = 360 man-days. With 18 men: 360 / 18 = 20 days.",
        difficulty: "Medium",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}10`,
        exam,
        year: years[9],
        topic: "Geometry",
        subject: "Quantitative Aptitude",
        question: "In a right triangle, the legs are 9 cm and 12 cm. The length of the hypotenuse is:",
        options: ["13 cm", "14 cm", "15 cm", "17 cm"],
        correctAnswer: "15 cm",
        explanation: "By Pythagoras: √(9² + 12²) = √(81 + 144) = √225 = 15 cm.",
        difficulty: "Easy",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
    ];
  }

  // Optional topic filter — keep only matching pyqs; if filter would empty the set, keep all.
  if (topic && topic.toLowerCase() !== "general") {
    const t = topic.toLowerCase();
    const filtered = pyqs.filter(
      (p) => p.topic.toLowerCase().includes(t) || p.subject.toLowerCase().includes(t)
    );
    if (filtered.length >= 3) pyqs = filtered;
  }

  // For the similar-question finder, return only 3–5 PYQs with reasoning.
  if (isSimilar) {
    pyqs = pyqs.slice(0, 5).map((p, i) => ({
      ...p,
      id: `${baseId}${i + 1}`,
      similarityReason:
        "Tests the same underlying concept as the source question with a structurally similar pattern.",
    }));
  }

  return { pyqs };
}
