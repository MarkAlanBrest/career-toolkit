export type Objective = {
  id: string;
  title: string;
  goal: string;
};

export type ContentSection = {
  id: string;
  title: string;
  kind: "lesson" | "chart" | "video" | "interactive";
  summary: string;
  body: string;
};

export type AssignmentQuestion =
  | {
      id: string;
      objectiveId: string;
      type: "multiple-choice";
      prompt: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }
  | {
      id: string;
      objectiveId: string;
      type: "true-false";
      prompt: string;
      correct: boolean;
      explanation: string;
    }
  | {
      id: string;
      objectiveId: string;
      type: "matching";
      prompt: string;
      pairs: { left: string; right: string }[];
      explanation: string;
    };

export type MasteryAssignment = {
  id: string;
  courseId: string;
  title: string;
  course: string;
  description: string;
  masteryTarget: number;
  objectives: Objective[];
  sections: ContentSection[];
  questions: AssignmentQuestion[];
};

export const sampleAssignment: MasteryAssignment = {
  id: "residential-wiring-unit-3",
  courseId: "electrical-tech-101",
  title: "Residential Wiring Mastery Path",
  course: "Electrical Technology",
  description:
    "A guided unit that teaches branch-circuit sizing, conductor roles, and protective devices through short lessons, media moments, and adaptive checks.",
  masteryTarget: 3,
  objectives: [
    {
      id: "sizing",
      title: "Choose conductor and breaker sizes correctly",
      goal: "Match common 15-amp and 20-amp residential circuits to the proper copper conductor size.",
    },
    {
      id: "conductors",
      title: "Identify each conductor's job",
      goal: "Explain the role of hot, neutral, and equipment grounding conductors in a safe circuit.",
    },
    {
      id: "protection",
      title: "Apply GFCI and AFCI rules",
      goal: "Choose the right protection method based on location and risk.",
    },
  ],
  sections: [
    {
      id: "lesson-1",
      title: "Core lesson",
      kind: "lesson",
      summary: "The student gets the main concept in plain language before trying a check.",
      body: "",
    },
    {
      id: "chart-1",
      title: "Quick reference chart",
      kind: "chart",
      summary: "A visual lookup keeps the student from losing the thread.",
      body:
        "15-amp -> 14 AWG copper | 20-amp -> 12 AWG copper | GFCI -> wet or damp shock-risk locations | AFCI -> many habitable areas to reduce arc-fault fire risk.",
    },
    {
      id: "video-1",
      title: "Short video moment",
      kind: "video",
      summary: "A 90-second clip can reinforce safety workflow before the next activity.",
      body:
        "Video placeholder: show lockout, verification of de-energized equipment, conductor identification, and post-install testing.",
    },
    {
      id: "interactive-1",
      title: "Guided interactive check",
      kind: "interactive",
      summary: "The student makes a choice, receives feedback, and either moves forward or loops back to the weak objective.",
      body:
        "Interactive placeholder: choose the right breaker-conductor pair, then explain why a different pairing would be unsafe.",
    },
  ],
  questions: [
    {
      id: "q1",
      objectiveId: "sizing",
      type: "multiple-choice",
      prompt:
        "A standard 20-amp residential branch circuit should normally use which copper conductor size?",
      options: ["10 AWG", "12 AWG", "14 AWG", "16 AWG"],
      correctIndex: 1,
      explanation:
        "12 AWG copper is the typical pairing for a 20-amp residential branch circuit.",
    },
    {
      id: "q2",
      objectiveId: "sizing",
      type: "true-false",
      prompt:
        "True or false: a 15-amp breaker is commonly paired with 14 AWG copper conductors.",
      correct: true,
      explanation:
        "True. That is the common residential pairing for a standard 15-amp circuit.",
    },
    {
      id: "q3",
      objectiveId: "conductors",
      type: "matching",
      prompt: "Match each conductor to its primary job.",
      pairs: [
        { left: "Hot", right: "Carries energized current to the load" },
        { left: "Neutral", right: "Returns current to the source" },
        { left: "Equipment ground", right: "Provides a fault path for safety" },
      ],
      explanation:
        "Each conductor has a distinct role. Keeping those roles straight is basic electrical safety.",
    },
    {
      id: "q4",
      objectiveId: "protection",
      type: "multiple-choice",
      prompt: "Which location most clearly calls for GFCI protection?",
      options: [
        "Bathroom receptacle",
        "Bedroom ceiling fan box",
        "Hallway light switch",
        "Closet luminaire",
      ],
      correctIndex: 0,
      explanation:
        "Bathrooms are classic GFCI locations because the shock hazard is elevated by moisture.",
    },
    {
      id: "q5",
      objectiveId: "protection",
      type: "true-false",
      prompt:
        "True or false: GFCI protection is intended to reduce shock hazard in wet or damp locations.",
      correct: true,
      explanation:
        "True. GFCI devices are used to reduce shock hazard where moisture and grounded contact risks are higher.",
    },
  ],
};

const assignmentsByCourseId: Record<string, MasteryAssignment> = {
  [sampleAssignment.courseId]: sampleAssignment,
  [sampleAssignment.id]: sampleAssignment,
  "electrical-technology": sampleAssignment,
};

export function getAssignmentForCourseId(courseId?: string | null) {
  if (!courseId) return sampleAssignment;
  return assignmentsByCourseId[courseId] ?? sampleAssignment;
}

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
        ? "Start with a compact concept brief, then branch into scenario-based feedback, a distractor-heavy checkpoint, and a mastery loop if the student misses the reasoning."
        : difficulty === "Intermediate"
          ? "Start with a short teaching card, add a guided interactive check, then follow with a confidence boost and a second check if needed."
          : "Start with a simple lesson card, one quick interactive check, and a supportive review hint before the next attempt.",
    interactions:
      difficulty === "Advanced"
        ? ["Scenario question", "Matching", "Reflection prompt", "Targeted retry"]
        : ["Micro lesson", "Multiple choice", "True / false", "Progress nudge"],
  }));
}
