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

export type BlockChoice = {
  id: string;
  text: string;
  isCorrect?: boolean;
  feedback?: string;
};

export type ActivityItem = {
  id: string;
  text: string;
  targetId?: string;
  order?: number;
};

export type ActivityTarget = {
  id: string;
  label: string;
  accepts?: string[];
};

export type ObjectiveBlockType =
  | "content-slide"
  | "bullet-slide"
  | "image-slide"
  | "video-slide"
  | "multiple-choice"
  | "true-false"
  | "checkpoint"
  | "drag-drop"
  | "matching"
  | "sequencing"
  | "sorting"
  | "scenario"
  | "review"
  | "reflection";

export type ObjectiveBlock = {
  id: string;
  type: ObjectiveBlockType;
  title: string;
  summary: string;
  body: string;
  bullets?: string[];
  callout?: SlideCallout | null;
  media?: SlideMedia | null;
  imageUrl?: string;
  imageAlt?: string;
  videoUrl?: string;
  caption?: string;
  stats?: SlideStat[];
  theme?: SlideTheme;
  layoutStyle?: SlideLayoutStyle;
  showWhenPreviousIncorrect?: boolean;
  choices?: BlockChoice[];
  activityItems?: ActivityItem[];
  activityTargets?: ActivityTarget[];
  placeholder?: string;
};

export type CompletionCriteria = {
  minBlocksComplete: number;
  minCorrectInteractions: number;
  allowRetake: boolean;
  repeatLoopsRequired?: number;
  loopLevel?: "Support" | "Practice" | "Mastery";
};

export type AssignmentObjective = {
  id: string;
  title: string;
  goal: string;
  completionCriteria: CompletionCriteria;
  blocks: ObjectiveBlock[];
};

export type MasteryAssignment = {
  id: string;
  courseId: string;
  title: string;
  course: string;
  description: string;
  objective: AssignmentObjective;
};

export const sampleAssignment: MasteryAssignment = {
  id: "residential-wiring-unit-3",
  courseId: "electrical-tech-101",
  title: "Residential Wiring Mastery Path",
  course: "Electrical Technology",
  description:
    "A single-objective mastery assignment with stacked content and interactive blocks that students can revisit and retake.",
  objective: {
    id: "circuit-sizing",
    title: "Choose conductor and breaker sizes correctly",
    goal: "Students should correctly pair common 15-amp and 20-amp residential circuits with the proper copper conductor size and explain why the pairing matters.",
    completionCriteria: {
      minBlocksComplete: 6,
      minCorrectInteractions: 2,
      allowRetake: true,
    },
    blocks: [
      {
        id: "block-1",
        type: "content-slide",
        title: "Start With the Pairing Rule",
        summary: "The first slide teaches the central rule in direct language.",
        body:
          "Residential branch circuits are built around safe breaker-to-conductor pairings. The conductor must be able to carry the current that the breaker allows before tripping.",
        bullets: [
          "15-amp branch circuits commonly use 14 AWG copper.",
          "20-amp branch circuits commonly use 12 AWG copper.",
          "The breaker is protecting the conductor, not just the device at the end.",
        ],
        callout: {
          label: "Core idea",
          text: "Students need to see the pattern cleanly before we ask them to reason with it.",
        },
        stats: [
          { label: "15-amp", value: "14 AWG" },
          { label: "20-amp", value: "12 AWG" },
        ],
        theme: "ocean",
        layoutStyle: "split",
      },
      {
        id: "block-2",
        type: "bullet-slide",
        title: "What the Student Should Notice",
        summary: "This slide slows down and frames the rule as a safety relationship.",
        body:
          "A higher circuit rating demands a conductor that can safely carry more current. If students memorize the pairings without understanding the protection relationship, they usually struggle in scenarios.",
        bullets: [
          "Think about overheating risk.",
          "Think about what the breaker allows before opening.",
          "Think about conductor size as part of the safety system.",
        ],
        theme: "slate",
        layoutStyle: "bullet-focus",
      },
      {
        id: "block-3",
        type: "multiple-choice",
        title: "Checkpoint One",
        summary: "The student applies the rule immediately after the content slides.",
        body:
          "A standard 20-amp residential branch circuit should normally use which copper conductor size?",
        choices: [
          {
            id: "a",
            text: "10 AWG",
            feedback: "Please review 20-amp conductor sizing again; you could improve here.",
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
            feedback: "Please review 20-amp conductor sizing again; you could improve here.",
          },
        ],
        theme: "sunset",
        layoutStyle: "spotlight",
      },
      {
        id: "block-4",
        type: "review",
        title: "Quick Review",
        summary: "This is the kind of review block we can revisit during a retake.",
        body:
          "When a circuit rating increases, the conductor must still carry the allowed current safely. That is why the common pairing changes from 14 AWG copper at 15 amps to 12 AWG copper at 20 amps.",
        bullets: [
          "Do not guess based only on the outlet or room.",
          "Ask what the breaker is allowing.",
          "Ask what conductor size safely matches that limit.",
        ],
        theme: "forest",
        layoutStyle: "bullet-focus",
      },
      {
        id: "block-5",
        type: "true-false",
        title: "Checkpoint Two",
        summary: "A second interaction confirms whether the student can state the matching rule correctly.",
        body: "True or false: A standard 15-amp breaker is commonly paired with 14 AWG copper conductors.",
        choices: [
          {
            id: "true",
            text: "True",
            isCorrect: true,
            feedback: "Correct. That is the standard pairing taught in this objective.",
          },
          {
            id: "false",
            text: "False",
            feedback: "Please review 15-amp conductor sizing again; you could improve here.",
          },
        ],
        theme: "sunset",
        layoutStyle: "spotlight",
      },
      {
        id: "block-6",
        type: "reflection",
        title: "Explain the Rule Back",
        summary: "A reflection block gives the objective some depth before the student exits.",
        body:
          "In one or two sentences, explain why breaker size and conductor size need to be paired correctly in a residential branch circuit.",
        placeholder: "Type your explanation here...",
        theme: "ocean",
        layoutStyle: "split",
      },
    ],
  },
};

export function buildInteractionSuggestions(objectiveGoal: string, difficulty: string) {
  if (!objectiveGoal.trim()) {
    return [
      {
        id: "suggestion-1",
        title: "Stack content and checks together",
        content:
          "Build a long sequence of teaching slides and interactions so the student can practice, review, and retake the same objective.",
        interactions: ["Content slides", "Checkpoint", "Review", "Reflection"],
      },
    ];
  }

  return [
    {
      id: "suggestion-1",
      title: "Teach the rule before the decision",
      content:
        difficulty === "Advanced"
          ? "Open with polished teaching slides, comparison visuals, and scenario framing before the first check."
          : "Open with polished teaching slides, key bullets, and one simple visual anchor before the first check.",
      interactions: ["Content slide", "Bullet slide", "Visual cue"],
    },
    {
      id: "suggestion-2",
      title: "Layer interactive checks throughout",
      content:
        difficulty === "Advanced"
          ? "Use several checks, corrective review, and a final mastery gate so students prove the objective more than once."
          : "Use multiple checks and review blocks so students can practice the same objective from different angles.",
      interactions: ["Multiple choice", "True / false", "Review", "Checkpoint"],
    },
    {
      id: "suggestion-3",
      title: "End with explanation or reflection",
      content:
        "Close the objective with a reflection or explanation prompt so students restate the rule in their own words before they finish.",
      interactions: ["Reflection", "Short response", "Retake-ready section"],
    },
  ];
}
