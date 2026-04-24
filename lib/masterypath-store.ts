import { type RowDataPacket } from "mysql2";
import {
  buildInteractionSuggestions,
  sampleAssignment,
  type LearningNode,
  type MasteryAssignment,
  type MasteryRule,
  type Objective,
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
  objectives: string[];
  nodes?: LearningNode[];
  masteryRules?: MasteryRule[];
  difficulty: MasteryDifficulty;
  layout: MasteryLayout;
  learningSuggestionsAccepted: boolean;
  masteryTarget?: number;
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

function buildObjectives(objectives: string[]) {
  const cleaned = objectives.map((objective) => objective.trim()).filter(Boolean);

  return cleaned.map<Objective>((objective, index) => ({
    id: slugify(objective, `objective-${index + 1}`),
    title: truncateText(objective, 80),
    goal: objective,
  }));
}

function themeForIndex(index: number): SlideTheme {
  const themes: SlideTheme[] = ["ocean", "sunset", "forest", "slate"];
  return themes[index % themes.length];
}

function layoutForIndex(index: number): SlideLayoutStyle {
  const layouts: SlideLayoutStyle[] = ["split", "spotlight", "bullet-focus", "media-left"];
  return layouts[index % layouts.length];
}

function buildGeneratedNodes(objectives: Objective[], difficulty: MasteryDifficulty) {
  const interactionSuggestions = buildInteractionSuggestions(
    objectives.map((objective) => objective.goal),
    difficulty
  );

  const nodes: LearningNode[] = [];

  objectives.forEach((objective, index) => {
    const lessonId = `${objective.id}-lesson`;
    const questionId = `${objective.id}-check-1`;
    const reviewId = `${objective.id}-review`;
    const masteryId = `${objective.id}-mastery`;
    const nextObjective = objectives[index + 1];
    const successTarget = nextObjective ? `${nextObjective.id}-lesson` : "completion";
    const suggestion = interactionSuggestions[index];

    nodes.push(
      {
        id: lessonId,
        objectiveId: objective.id,
        type: "lesson",
        title: objective.title,
        summary: objective.goal,
        body: `Teach the student the core idea for ${objective.title.toLowerCase()} before asking them to make a decision.`,
        bullets: [
          objective.goal,
          suggestion?.content || "Teach the concept in one focused slide.",
          "Route the student based on what they demonstrate next.",
        ],
        callout: {
          label: "Adaptive intent",
          text: "The lesson is brief because the routing engine decides whether the student needs more support or can move on.",
        },
        theme: themeForIndex(index),
        layoutStyle: layoutForIndex(index),
        transitions: {
          next: questionId,
        },
      },
      {
        id: questionId,
        objectiveId: objective.id,
        type: "question",
        title: `${objective.title} Check`,
        summary: "The student answers a checkpoint question immediately after the teaching slide.",
        body: `Checkpoint for objective: ${objective.goal}`,
        choices: [
          {
            id: "correct",
            text: "Correct answer placeholder",
            isCorrect: true,
            feedback: "Correct. Move the student closer to mastery for this objective.",
          },
          {
            id: "distractor-1",
            text: "Distractor option",
            feedback: "Not yet. Route the student to review and reteach the concept.",
          },
          {
            id: "distractor-2",
            text: "Another distractor",
            feedback: "This response shows the student still needs support.",
          },
        ],
        theme: themeForIndex(index + 1),
        layoutStyle: "spotlight",
        transitions: {
          correct: masteryId,
          incorrect: reviewId,
          retry: reviewId,
          mastered: successTarget,
        },
      },
      {
        id: reviewId,
        objectiveId: objective.id,
        type: "remediation",
        title: `${objective.title} Review`,
        summary: "The student gets a simplified reteach slide before returning to a stronger check.",
        body: `Reteach the concept behind ${objective.goal} in simpler language, then return to a mastery checkpoint.`,
        bullets: [
          "Reframe the rule in simpler language.",
          "Use one quick example and one caution.",
          "Send the student back into a mastery check.",
        ],
        theme: "forest",
        layoutStyle: "bullet-focus",
        transitions: {
          next: masteryId,
        },
      },
      {
        id: masteryId,
        objectiveId: objective.id,
        type: "mastery-check",
        title: `${objective.title} Mastery Check`,
        summary: "A second correct response can move the student onward, while an error loops them back into support.",
        body: `Mastery gate for ${objective.goal}`,
        choices: [
          {
            id: "mastery-correct",
            text: "Mastery answer placeholder",
            isCorrect: true,
            feedback: "Correct. The student is ready to move forward.",
          },
          {
            id: "mastery-incorrect",
            text: "Incorrect answer placeholder",
            feedback: "Not yet. Return to support before another attempt.",
          },
        ],
        theme: "slate",
        layoutStyle: "spotlight",
        transitions: {
          correct: successTarget,
          mastered: successTarget,
          incorrect: reviewId,
          retry: reviewId,
        },
      }
    );
  });

  nodes.push({
    id: "completion",
    type: "completion",
    title: "Mastery Path Complete",
    summary: "The student exits once they have demonstrated enough correct performance to satisfy the mastery rules.",
    body: "This completion node marks the end of the adaptive path for this course.",
    bullets: [
      "Each student can arrive here through a different route.",
      "Mastery was earned through response-driven branching.",
      "The path can now report which objectives were mastered.",
    ],
    theme: "sunset",
    layoutStyle: "split",
  });

  return nodes;
}

function buildMasteryRules(objectives: Objective[], masteryTarget: number) {
  return objectives.map<MasteryRule>((objective) => ({
    objectiveId: objective.id,
    masteryStreak: masteryTarget,
    remediationThreshold: 1,
  }));
}

function normalizeNode(node: LearningNode, index: number): LearningNode {
  return {
    id: node.id || `node-${index + 1}`,
    objectiveId: node.objectiveId || null,
    type: node.type || "lesson",
    title: node.title || `Node ${index + 1}`,
    summary: node.summary || "",
    body: node.body || "",
    bullets: Array.isArray(node.bullets) ? node.bullets.filter(Boolean) : [],
    callout:
      node.callout && (node.callout.label || node.callout.text)
        ? {
            label: node.callout.label || "Key Point",
            text: node.callout.text || "",
          }
        : null,
    media:
      node.media && node.media.url
        ? {
            type: node.media.type === "video" ? "video" : "image",
            url: node.media.url,
            caption: node.media.caption || "",
          }
        : null,
    stats: Array.isArray(node.stats)
      ? node.stats
          .filter((stat) => stat?.label || stat?.value)
          .map((stat) => ({
            label: stat.label || "Label",
            value: stat.value || "",
          }))
      : [],
    theme: node.theme || themeForIndex(index),
    layoutStyle: node.layoutStyle || layoutForIndex(index),
    choices: Array.isArray(node.choices)
      ? node.choices
          .filter((choice) => choice?.text)
          .map((choice, choiceIndex) => ({
            id: choice.id || `choice-${choiceIndex + 1}`,
            text: choice.text,
            isCorrect: Boolean(choice.isCorrect),
            feedback: choice.feedback || "",
          }))
      : [],
    transitions: node.transitions || {},
  };
}

function buildStoredAssignment(
  input: SaveMasteryAssignmentInput
): StoredMasteryAssignment {
  const title = input.title.trim() || sampleAssignment.title;
  const course = input.course.trim() || sampleAssignment.course;
  const objectives = buildObjectives(input.objectives);
  const content = input.content.trim();
  const masteryTarget = input.masteryTarget ?? sampleAssignment.masteryTarget;
  const description = truncateText(
    content || "AI-built mastery path saved from the teacher builder.",
    220
  );
  const nodes =
    input.nodes && input.nodes.length
      ? input.nodes.map(normalizeNode)
      : buildGeneratedNodes(objectives, input.difficulty);
  const masteryRules =
    input.masteryRules && input.masteryRules.length
      ? input.masteryRules
      : buildMasteryRules(objectives, masteryTarget);

  return {
    id: slugify(title, sampleAssignment.id),
    courseId: slugify(course, sampleAssignment.courseId),
    title,
    course,
    description,
    masteryTarget,
    startNodeId: nodes[0]?.id || "completion",
    sourceMode: input.sourceMode,
    sourceUrl: input.sourceUrl?.trim() || "",
    content,
    difficulty: input.difficulty,
    layout: input.layout,
    learningSuggestionsAccepted: input.learningSuggestionsAccepted,
    publishState: "draft",
    objectives,
    nodes,
    masteryRules,
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
