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

export type ContentSection = {
  id: string;
  title: string;
  kind: "lesson" | "chart" | "video" | "interactive";
  summary: string;
  body: string;
  bullets?: string[];
  callout?: SlideCallout | null;
  media?: SlideMedia | null;
  stats?: SlideStat[];
  theme?: SlideTheme;
  layoutStyle?: SlideLayoutStyle;
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
    "A guided unit that teaches branch-circuit sizing, conductor roles, and protective devices through short lessons, visual references, and mastery checks.",
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
      title: "Branch-Circuit Pairings",
      kind: "lesson",
      summary: "Start with the rule students need to remember before they make any decisions.",
      body:
        "Residential branch circuits are built around safe conductor and breaker pairings. The pairing matters because undersized conductors can overheat before protective devices trip.",
      bullets: [
        "15-amp branch circuits commonly use 14 AWG copper.",
        "20-amp branch circuits commonly use 12 AWG copper.",
        "The breaker protects the conductor, not just the device on the end.",
      ],
      callout: {
        label: "Why it matters",
        text: "Students need a clean visual rule first so later scenario questions feel obvious instead of random.",
      },
      stats: [
        { label: "15-amp", value: "14 AWG" },
        { label: "20-amp", value: "12 AWG" },
      ],
      theme: "ocean",
      layoutStyle: "split",
    },
    {
      id: "chart-1",
      title: "Conductor Roles at a Glance",
      kind: "chart",
      summary: "A clean visual board keeps the roles of each conductor easy to compare.",
      body:
        "Students should be able to name the purpose of the hot, neutral, and grounding conductor without confusing current flow with fault protection.",
      bullets: [
        "Hot carries energized current to the load.",
        "Neutral returns current to the source.",
        "Equipment ground provides a fault path for safety.",
      ],
      stats: [
        { label: "Hot", value: "To load" },
        { label: "Neutral", value: "Return path" },
        { label: "Ground", value: "Fault safety" },
      ],
      theme: "slate",
      layoutStyle: "bullet-focus",
    },
    {
      id: "video-1",
      title: "Protection by Location",
      kind: "video",
      summary: "Use a media-style slide when the student should notice pattern and place.",
      body:
        "GFCI protection is used where shock risk is higher, especially in wet or damp environments. AFCI protection is used more broadly to help reduce arc-fault fire risk in many habitable spaces.",
      bullets: [
        "Bathrooms, garages, kitchens, and outdoor locations often trigger GFCI discussions.",
        "AFCI decisions are tied to different safety goals than GFCI decisions.",
      ],
      callout: {
        label: "Watch for",
        text: "Students should connect each protection method to its hazard, not memorize a disconnected list.",
      },
      theme: "sunset",
      layoutStyle: "media-left",
    },
  ],
  questions: [],
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
        ? "Turn this into a high-rigor slide with contrast, scenario framing, and a visible reasoning checkpoint."
        : difficulty === "Intermediate"
          ? "Use a polished teaching slide, a compact comparison block, and a clear checkpoint before moving on."
          : "Use a supportive teaching slide with simple bullets, a visual anchor, and one low-friction check.",
    interactions:
      difficulty === "Advanced"
        ? ["Scenario slide", "Comparison frame", "Decision checkpoint", "Targeted retry"]
        : ["Visual slide", "Bullet list", "Callout", "Quick check"],
  }));
}
