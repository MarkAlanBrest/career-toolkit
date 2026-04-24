import { type RowDataPacket } from "mysql2";
import {
  buildInteractionSuggestions,
  sampleAssignment,
  type AssignmentObjective,
  type CompletionCriteria,
  type MasteryAssignment,
  type ObjectiveBlock,
  type SlideLayoutStyle,
  type SlideTheme,
} from "../app/masterypath/data";
import { getDbPool, hasDatabaseConfig } from "./db";

export type MasterySourceMode = "upload" | "url" | "paste";
export type MasteryDifficulty = "Foundational" | "Intermediate" | "Advanced";
export type MasteryLayout = "Guided path" | "Mixed media path" | "Scenario path";
export type MasteryPublishState = "draft" | "published";

export type SaveMasteryAssignmentInput = {
  title: string;
  course: string;
  sourceMode: MasterySourceMode;
  sourceUrl?: string;
  content: string;
  objectiveTitle: string;
  objectiveGoal: string;
  blocks?: ObjectiveBlock[];
  completionCriteria?: CompletionCriteria;
  difficulty: MasteryDifficulty;
  layout: MasteryLayout;
  learningSuggestionsAccepted: boolean;
};

export type StoredMasteryAssignment = MasteryAssignment & {
  sourceMode: MasterySourceMode;
  sourceUrl: string;
  content: string;
  difficulty: MasteryDifficulty;
  layout: MasteryLayout;
  learningSuggestionsAccepted: boolean;
  publishState: MasteryPublishState;
};

type MasteryCoursePayloadRow = RowDataPacket & {
  course_id: string;
  title: string;
  payload_json: unknown;
};

let schemaReady = false;

function slugify(value: string, fallback: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function themeForIndex(index: number): SlideTheme {
  const themes: SlideTheme[] = ["ocean", "sunset", "forest", "slate"];
  return themes[index % themes.length];
}

function layoutForIndex(index: number): SlideLayoutStyle {
  const layouts: SlideLayoutStyle[] = ["split", "spotlight", "bullet-focus", "media-left"];
  return layouts[index % layouts.length];
}

function buildGeneratedBlocks(objectiveGoal: string, difficulty: MasteryDifficulty) {
  const suggestions = buildInteractionSuggestions(objectiveGoal, difficulty);

  return [
    {
      id: "block-1",
      type: "content-slide" as const,
      title: "Review the Core Idea",
      summary: "A short study tip before the first interaction.",
      body:
        `Please review ${objectiveGoal || "the main objective"} again before answering.`,
      bullets: [
        "Review the main rule.",
        "Look for the pattern in the question.",
        "Try the checkpoint when ready.",
      ],
      theme: themeForIndex(0),
      layoutStyle: layoutForIndex(0),
    },
    {
      id: "block-2",
      type: "bullet-slide" as const,
      title: "Study Tip",
      summary: "A brief review prompt before the next check.",
      body: `Please review ${objectiveGoal || "this objective"} again; you could improve here.`,
      bullets: suggestions[0]?.interactions || ["Content slide", "Bullet slide", "Visual cue"],
      theme: themeForIndex(1),
      layoutStyle: "bullet-focus" as const,
    },
    {
      id: "block-3",
      type: "multiple-choice" as const,
      title: "Checkpoint One",
      summary: "Ask a direct question right after the teaching stack.",
      body: `Checkpoint for: ${objectiveGoal || "the objective"}`,
      choices: [
        {
          id: "correct",
          text: "Correct answer placeholder",
          isCorrect: true,
          feedback: "Correct. The student is applying the objective successfully.",
        },
        {
          id: "distractor-1",
          text: "Distractor option",
          feedback: "Please review this checkpoint again; you could improve here.",
        },
        {
          id: "distractor-2",
          text: "Another distractor",
          feedback: "Please review the objective again; you could improve here.",
        },
      ],
      theme: themeForIndex(2),
      layoutStyle: "spotlight" as const,
    },
    {
      id: "block-4",
      type: "review" as const,
      title: "Study Tip",
      summary: "A simple improvement prompt students can revisit during a retake.",
      body: `Please review ${objectiveGoal || "this objective"} again; you could improve here.`,
      bullets: [
        "Rephrase the concept.",
        "Show what the wrong answer overlooked.",
        "Prepare the student for the next checkpoint.",
      ],
      theme: themeForIndex(3),
      layoutStyle: "bullet-focus" as const,
    },
    {
      id: "block-5",
      type: "true-false" as const,
      title: "Checkpoint Two",
      summary: "Confirm the rule again with a fast second interaction.",
      body: "True or false: the rule from this objective still applies when the student sees it in a slightly different form.",
      choices: [
        {
          id: "true",
          text: "True",
          isCorrect: true,
          feedback: "Correct. This supports completion for the objective.",
        },
        {
          id: "false",
          text: "False",
          feedback: "Please review this rule again; you could improve here.",
        },
      ],
      theme: themeForIndex(4),
      layoutStyle: "spotlight" as const,
    },
    {
      id: "block-6",
      type: "reflection" as const,
      title: "Explain the Objective Back",
      summary: suggestions[2]?.content || "End with a short explanation or reflection to consolidate understanding.",
      body: "Write a short explanation of the rule or process in your own words.",
      placeholder: "Type your explanation here...",
      theme: themeForIndex(5),
      layoutStyle: layoutForIndex(5),
    },
  ];
}

function normalizeBlock(block: ObjectiveBlock, index: number): ObjectiveBlock {
  return {
    id: block.id || `block-${index + 1}`,
    type: block.type || "content-slide",
    title: block.title || `Block ${index + 1}`,
    summary: block.summary || "",
    body: block.body || "",
    bullets: Array.isArray(block.bullets) ? block.bullets.filter(Boolean) : [],
    callout:
      block.callout && (block.callout.label || block.callout.text)
        ? {
            label: block.callout.label || "Key point",
            text: block.callout.text || "",
          }
        : null,
    media:
      block.media && block.media.url
        ? {
            type: block.media.type === "video" ? "video" : "image",
            url: block.media.url,
            caption: block.media.caption || "",
          }
        : null,
    stats: Array.isArray(block.stats)
      ? block.stats
          .filter((stat) => stat?.label || stat?.value)
          .map((stat) => ({
            label: stat.label || "Label",
            value: stat.value || "",
          }))
      : [],
    theme: block.theme || themeForIndex(index),
    layoutStyle: block.layoutStyle || layoutForIndex(index),
    choices: Array.isArray(block.choices)
      ? block.choices
          .filter((choice) => choice?.text)
          .map((choice, choiceIndex) => ({
            id: choice.id || `choice-${choiceIndex + 1}`,
            text: choice.text,
            isCorrect: Boolean(choice.isCorrect),
            feedback: choice.feedback || "",
          }))
      : [],
    placeholder: block.placeholder || "",
  };
}

function buildStoredAssignment(
  input: SaveMasteryAssignmentInput
): StoredMasteryAssignment {
  const title = input.title.trim() || sampleAssignment.title;
  const course = input.course.trim() || sampleAssignment.course;
  const objectiveTitle = input.objectiveTitle.trim() || sampleAssignment.objective.title;
  const objectiveGoal = input.objectiveGoal.trim() || sampleAssignment.objective.goal;
  const blocks =
    input.blocks && input.blocks.length
      ? input.blocks.map(normalizeBlock)
      : buildGeneratedBlocks(objectiveGoal, input.difficulty);
  const completionCriteria = input.completionCriteria || {
    minBlocksComplete: Math.min(blocks.length, 6),
    minCorrectInteractions: 2,
    allowRetake: true,
    repeatLoopsRequired: 1,
    loopLevel: "Support" as const,
  };
  const objective: AssignmentObjective = {
    id: slugify(objectiveTitle, sampleAssignment.objective.id),
    title: objectiveTitle,
    goal: objectiveGoal,
    completionCriteria,
    blocks,
  };

  return {
    id: slugify(title, sampleAssignment.id),
    courseId: slugify(course, sampleAssignment.courseId),
    title,
    course,
    description: truncateText(
      input.content.trim() || objectiveGoal || sampleAssignment.description,
      220
    ),
    objective,
    sourceMode: input.sourceMode,
    sourceUrl: input.sourceUrl?.trim() || "",
    content: input.content.trim(),
    difficulty: input.difficulty,
    layout: input.layout,
    learningSuggestionsAccepted: input.learningSuggestionsAccepted,
    publishState: "draft",
  };
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (Buffer.isBuffer(value)) return parseJsonField(value.toString("utf8"), fallback);
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  if (typeof value === "object") return value as T;
  return fallback;
}

async function ensureMasteryAssignmentsTable() {
  if (schemaReady || !hasDatabaseConfig()) return;

  const db = getDbPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS MasteryPathCoursePayloads (
      course_id VARCHAR(191) NOT NULL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      payload_json JSON NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  schemaReady = true;
}

export async function saveMasteryAssignment(input: SaveMasteryAssignmentInput) {
  await ensureMasteryAssignmentsTable();

  const assignment = buildStoredAssignment(input);
  const db = getDbPool();

  await db.query(
    `
      INSERT INTO MasteryPathCoursePayloads (
        course_id,
        title,
        payload_json
      ) VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        payload_json = VALUES(payload_json)
    `,
    [assignment.courseId, assignment.title, JSON.stringify(assignment)]
  );

  return assignment;
}

function mapRowToAssignment(row: MasteryCoursePayloadRow) {
  return parseJsonField<StoredMasteryAssignment | null>(row.payload_json, null);
}

export async function getMasteryAssignment({
  assignmentId,
  courseId,
}: {
  assignmentId?: string | null;
  courseId?: string | null;
}) {
  if (!assignmentId && !courseId) return null;
  if (!hasDatabaseConfig()) return null;

  await ensureMasteryAssignmentsTable();
  const db = getDbPool();

  if (courseId) {
    const [rows] = await db.query<MasteryCoursePayloadRow[]>(
      "SELECT * FROM MasteryPathCoursePayloads WHERE course_id = ? LIMIT 1",
      [courseId]
    );

    return rows[0] ? mapRowToAssignment(rows[0]) : null;
  }

  const [rows] = await db.query<MasteryCoursePayloadRow[]>(
    `
      SELECT *
      FROM MasteryPathCoursePayloads
      WHERE JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.id')) = ?
      LIMIT 1
    `,
    [assignmentId]
  );

  return rows[0] ? mapRowToAssignment(rows[0]) : null;
}

export async function getLatestMasteryAssignment() {
  if (!hasDatabaseConfig()) return null;

  await ensureMasteryAssignmentsTable();
  const db = getDbPool();
  const [rows] = await db.query<MasteryCoursePayloadRow[]>(
    "SELECT * FROM MasteryPathCoursePayloads ORDER BY updated_at DESC LIMIT 1"
  );

  return rows[0] ? mapRowToAssignment(rows[0]) : null;
}
