export type Objective = {
  id: string;
  title: string;
  goal: string;
};

export type SlideTheme = "ocean" | "sunset" | "forest" | "slate";

export type SlideLayoutStyle =
  | "split"
  | "spotlight"
  | "bullet-focus"
  | "media-left";

export type SlideMedia = {
  type: "image" | "video";
  url: string;
  caption: string;
};

export type SlideCallout = {
  label: string;
  text: string;
};

export type SlideStat = {
  label: string;
  value: string;
};

export type NodeChoice = {
  id: string;
  text: string;
  isCorrect?: boolean;
  feedback?: string;
};

export type MasteryNodeType =
  | "lesson"
  | "question"
  | "remediation"
  | "mastery-check"
  | "completion";

export type LearningNode = {
  id: string;
  objectiveId?: string | null;
  type: MasteryNodeType;
  title: string;
  summary: string;
  body: string;
  bullets?: string[];
  callout?: SlideCallout | null;
  media?: SlideMedia | null;
  stats?: SlideStat[];
  theme?: SlideTheme;
  layoutStyle?: SlideLayoutStyle;
  choices?: NodeChoice[];
  transitions?: Partial<
    Record<"next" | "correct" | "incorrect" | "mastered" | "retry", string>
  >;
};

export type MasteryRule = {
  objectiveId: string;
  masteryStreak: number;
  remediationThreshold: number;
};

export type MasteryAssignment = {
  id: string;
  courseId: string;
  title: string;
  course: string;
  description: string;
  masteryTarget: number;
  startNodeId: string;
  objectives: Objective[];
  nodes: LearningNode[];
  masteryRules: MasteryRule[];
};

export const sampleAssignment: MasteryAssignment = {
  id: "residential-wiring-unit-3",
  courseId: "electrical-tech-101",
  title: "Residential Wiring Mastery Path",
  course: "Electrical Technology",
  description:
    "An adaptive mastery path that teaches circuit sizing and protection through short teaching slides, checks, remediation, and mastery exits.",
  masteryTarget: 2,
  startNodeId: "intro-sizing",
  objectives: [
    {
      id: "sizing",
      title: "Choose conductor and breaker sizes correctly",
      goal: "Match common 15-amp and 20-amp residential circuits to the proper copper conductor size.",
    },
    {
      id: "protection",
      title: "Apply GFCI and AFCI rules",
      goal: "Choose the right protection method based on location and hazard.",
    },
  ],
  masteryRules: [
    {
      objectiveId: "sizing",
      masteryStreak: 2,
      remediationThreshold: 1,
    },
    {
      objectiveId: "protection",
      masteryStreak: 2,
      remediationThreshold: 1,
    },
  ],
  nodes: [
    {
      id: "intro-sizing",
      objectiveId: "sizing",
      type: "lesson",
      title: "Circuit Sizing Starts With the Pairing",
      summary: "Students first see the safe breaker-to-conductor pairing before being tested.",
      body:
        "In residential wiring, the breaker and conductor work together as a safety pair. Standard 15-amp circuits commonly use 14 AWG copper, while standard 20-amp circuits commonly use 12 AWG copper.",
      bullets: [
        "15-amp branch circuits commonly use 14 AWG copper.",
        "20-amp branch circuits commonly use 12 AWG copper.",
        "The breaker protects the conductor from overheating.",
      ],
      callout: {
        label: "Pattern to notice",
        text: "Bigger breaker means the conductor usually has to carry more current safely.",
      },
      stats: [
        { label: "15-amp", value: "14 AWG" },
        { label: "20-amp", value: "12 AWG" },
      ],
      theme: "ocean",
      layoutStyle: "split",
      transitions: {
        next: "check-sizing-1",
      },
    },
    {
      id: "check-sizing-1",
      objectiveId: "sizing",
      type: "question",
      title: "Sizing Check",
      summary: "The student makes an immediate decision based on the rule they just studied.",
      body: "A standard 20-amp residential branch circuit should normally use which copper conductor size?",
      choices: [
        {
          id: "a",
          text: "10 AWG",
          feedback: "10 AWG is larger than needed for the standard pairing described here.",
        },
        {
          id: "b",
          text: "12 AWG",
          isCorrect: true,
          feedback: "Correct. 12 AWG copper is the common pairing for a standard 20-amp circuit.",
        },
        {
          id: "c",
          text: "14 AWG",
          feedback: "14 AWG is commonly paired with a 15-amp circuit, not 20-amp.",
        },
      ],
      theme: "sunset",
      layoutStyle: "spotlight",
      transitions: {
        correct: "check-sizing-2",
        mastered: "intro-protection",
        incorrect: "review-sizing",
        retry: "review-sizing",
      },
    },
    {
      id: "review-sizing",
      objectiveId: "sizing",
      type: "remediation",
      title: "Sizing Review",
      summary: "The student is routed to a simpler recovery slide when the first check shows a gap.",
      body:
        "When a circuit rating increases, the conductor must still carry that current safely without overheating. For the common residential pairings in this lesson, 15-amp matches 14 AWG copper and 20-amp matches 12 AWG copper.",
      bullets: [
        "Do not guess based on the outlet alone.",
        "Think about what conductor size the breaker is protecting.",
        "Return to the checkpoint and test the rule again.",
      ],
      callout: {
        label: "Recovery move",
        text: "If the student missed the question, we reteach the rule in simpler language and then test again.",
      },
      theme: "forest",
      layoutStyle: "bullet-focus",
      transitions: {
        next: "check-sizing-2",
      },
    },
    {
      id: "check-sizing-2",
      objectiveId: "sizing",
      type: "mastery-check",
      title: "Mastery Check: Sizing",
      summary: "A second successful response confirms the student can move forward.",
      body: "True or false: A standard 15-amp breaker is commonly paired with 14 AWG copper conductors.",
      choices: [
        {
          id: "true",
          text: "True",
          isCorrect: true,
          feedback: "Correct. That is the standard pairing taught in this path.",
        },
        {
          id: "false",
          text: "False",
          feedback: "This is false only if the lesson had taught a different common pairing, but it did not.",
        },
      ],
      theme: "slate",
      layoutStyle: "spotlight",
      transitions: {
        correct: "intro-protection",
        mastered: "intro-protection",
        incorrect: "review-sizing",
        retry: "review-sizing",
      },
    },
    {
      id: "intro-protection",
      objectiveId: "protection",
      type: "lesson",
      title: "Protection Depends on the Hazard",
      summary: "Students move into the next objective only after mastering the first.",
      body:
        "GFCI protection reduces shock hazard in wet or damp environments. AFCI protection addresses a different hazard: arc-fault fire risk in many habitable spaces.",
      bullets: [
        "GFCI is strongly tied to shock-risk locations.",
        "AFCI is tied to arc-fault fire protection.",
        "Do not treat GFCI and AFCI as interchangeable.",
      ],
      callout: {
        label: "Core distinction",
        text: "The location matters, but the hazard behind the rule matters more.",
      },
      stats: [
        { label: "GFCI", value: "Shock risk" },
        { label: "AFCI", value: "Arc-fault risk" },
      ],
      theme: "sunset",
      layoutStyle: "media-left",
      transitions: {
        next: "check-protection-1",
      },
    },
    {
      id: "check-protection-1",
      objectiveId: "protection",
      type: "question",
      title: "Protection Check",
      summary: "The student identifies the location that most clearly signals GFCI use.",
      body: "Which location most clearly calls for GFCI protection?",
      choices: [
        {
          id: "bathroom",
          text: "Bathroom receptacle",
          isCorrect: true,
          feedback: "Correct. Bathrooms are classic GFCI locations because shock risk is elevated by moisture.",
        },
        {
          id: "bedroom",
          text: "Bedroom ceiling fan box",
          feedback: "That choice does not most clearly signal GFCI shock protection.",
        },
        {
          id: "closet",
          text: "Closet luminaire",
          feedback: "That is not the clearest GFCI example in this set.",
        },
      ],
      theme: "ocean",
      layoutStyle: "spotlight",
      transitions: {
        correct: "check-protection-2",
        mastered: "completion",
        incorrect: "review-protection",
        retry: "review-protection",
      },
    },
    {
      id: "review-protection",
      objectiveId: "protection",
      type: "remediation",
      title: "Protection Review",
      summary: "If the student confuses the safety purpose, the path slows down and reteaches.",
      body:
        "When moisture and grounded contact raise the shock hazard, GFCI protection is a strong clue. AFCI addresses a different problem and should not replace hazard-based reasoning.",
      bullets: [
        "Ask what hazard the device addresses.",
        "Bathrooms, garages, kitchens, and outdoor areas are common GFCI discussion points.",
        "Return to the check and apply the rule again.",
      ],
      theme: "forest",
      layoutStyle: "bullet-focus",
      transitions: {
        next: "check-protection-2",
      },
    },
    {
      id: "check-protection-2",
      objectiveId: "protection",
      type: "mastery-check",
      title: "Mastery Check: Protection",
      summary: "A second successful decision closes the loop and exits the path.",
      body: "True or false: GFCI protection is intended to reduce shock hazard in wet or damp locations.",
      choices: [
        {
          id: "true",
          text: "True",
          isCorrect: true,
          feedback: "Correct. That is the main safety purpose emphasized in this path.",
        },
        {
          id: "false",
          text: "False",
          feedback: "The lesson specifically tied GFCI to shock-risk environments.",
        },
      ],
      theme: "slate",
      layoutStyle: "spotlight",
      transitions: {
        correct: "completion",
        mastered: "completion",
        incorrect: "review-protection",
        retry: "review-protection",
      },
    },
    {
      id: "completion",
      type: "completion",
      title: "Mastery Path Complete",
      summary: "The student exits after demonstrating enough correct performance to satisfy the mastery rules.",
      body:
        "You reached the end of this path by moving through instruction, checks, remediation when needed, and mastery verification.",
      bullets: [
        "You were routed based on your answers, not a fixed slide order.",
        "Different students can finish through different paths.",
        "This is the structure the full product should use.",
      ],
      theme: "sunset",
      layoutStyle: "split",
    },
  ],
};

export function buildObjectiveSuggestions(content: string) {
  const text = content.trim();

  if (!text) {
    return [
      "Identify the central concept students need to remember.",
      "Apply the concept in a realistic scenario.",
      "Explain the most common mistake and how to avoid it.",
    ];
  }

  const sentences = text
    .split(/[.!?]/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, 3);

  return sentences.map((sentence, index) => {
    const trimmed = sentence.length > 78 ? `${sentence.slice(0, 75)}...` : sentence;
    if (index === 0) return `Explain: ${trimmed}`;
    if (index === 1) return `Apply: ${trimmed}`;
    return `Evaluate: ${trimmed}`;
  });
}

export function buildInteractionSuggestions(objectives: string[], difficulty: string) {
  const baseObjectives = objectives.filter(Boolean);

  return baseObjectives.map((objective, index) => ({
    id: `suggestion-${index + 1}`,
    title: objective,
    content:
      difficulty === "Advanced"
        ? "Build a short teach-check-remediate-mastery sequence with branching after each response."
        : difficulty === "Intermediate"
          ? "Build a polished lesson slide, a question, a recovery slide, and a mastery check."
          : "Build a supportive lesson slide, one simple check, and an easy review path before mastery.",
    interactions:
      difficulty === "Advanced"
        ? ["Teach", "Checkpoint", "Reteach", "Mastery gate"]
        : ["Lesson", "Question", "Review", "Mastery check"],
  }));
}
