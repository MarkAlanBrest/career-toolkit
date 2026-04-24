import { type RowDataPacket } from "mysql2";
import {
  buildInteractionSuggestions,
  sampleAssignment,
  type AssignmentQuestion,
  type ContentSection,
  type MasteryAssignment,
  type Objective,
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

type MasteryAssignmentRow = RowDataPacket & {
  id: string;
  course_id: string;
  title: string;
  course: string;
  description: string;
  source_mode: MasterySourceMode;
  source_url: string | null;
  source_content: string;
  difficulty: MasteryDifficulty;
  layout_type: MasteryLayout;
  mastery_target: number;
  learning_suggestions_accepted: number;
  publish_state: MasteryPublishState;
  objectives_json: unknown;
  sections_json: unknown;
  questions_json: unknown;
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

function pickSectionKind(layout: MasteryLayout, index: number): ContentSection["kind"] {
  if (layout === "Scenario path") {
    return "interactive";
  }

  if (layout === "Guided path") {
    return "lesson";
  }

  const kinds: ContentSection["kind"][] = ["chart", "video", "interactive"];
  return kinds[index % kinds.length];
}

function buildSections(
  content: string,
  objectives: Objective[],
  difficulty: MasteryDifficulty,
  layout: MasteryLayout
) {
  const sourceBody = content.trim() || "Source content will appear here.";
  const interactionSuggestions = buildInteractionSuggestions(
    objectives.map((objective) => objective.goal),
    difficulty
  );

  const sections: ContentSection[] = [
    {
      id: "lesson-1",
      title: "Source lesson",
      kind: "lesson",
      summary: "Imported source content from the teacher builder.",
      body: sourceBody,
    },
  ];

  interactionSuggestions.forEach((suggestion, index) => {
    sections.push({
      id: `section-${index + 2}`,
      title: suggestion.title,
      kind: pickSectionKind(layout, index),
      summary: suggestion.interactions.join(" | "),
      body: suggestion.content,
    });
  });

  return sections;
}

function buildQuestions(): AssignmentQuestion[] {
  return [];
}

function buildStoredAssignment(
  input: SaveMasteryAssignmentInput
): StoredMasteryAssignment {
  const title = input.title.trim() || sampleAssignment.title;
  const course = input.course.trim() || sampleAssignment.course;
  const objectives = buildObjectives(input.objectives);
  const content = input.content.trim();
  const description = truncateText(
    content || "AI-built mastery path saved from the teacher builder.",
    220
  );

  return {
    id: slugify(title, sampleAssignment.id),
    courseId: slugify(course, sampleAssignment.courseId),
    title,
    course,
    description,
    masteryTarget: input.masteryTarget ?? sampleAssignment.masteryTarget,
    sourceMode: input.sourceMode,
    sourceUrl: input.sourceUrl?.trim() || "",
    content,
    difficulty: input.difficulty,
    layout: input.layout,
    learningSuggestionsAccepted: input.learningSuggestionsAccepted,
    publishState: "draft",
    objectives,
    sections: buildSections(content, objectives, input.difficulty, input.layout),
    questions: buildQuestions(),
  };
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value == null) {
    return fallback;
  }

  if (Buffer.isBuffer(value)) {
    return parseJsonField(value.toString("utf8"), fallback);
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  if (typeof value === "object") {
    return value as T;
  }

  return fallback;
}

function mapRowToAssignment(row: MasteryAssignmentRow): StoredMasteryAssignment {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    course: row.course,
    description: row.description,
    masteryTarget: row.mastery_target,
    sourceMode: row.source_mode,
    sourceUrl: row.source_url ?? "",
    content: row.source_content,
    difficulty: row.difficulty,
    layout: row.layout_type,
    learningSuggestionsAccepted: Boolean(row.learning_suggestions_accepted),
    publishState: row.publish_state,
    objectives: parseJsonField<Objective[]>(row.objectives_json, []),
    sections: parseJsonField<ContentSection[]>(row.sections_json, []),
    questions: parseJsonField<AssignmentQuestion[]>(row.questions_json, []),
  };
}

async function ensureMasteryAssignmentsTable() {
  if (schemaReady || !hasDatabaseConfig()) {
    return;
  }

  const db = getDbPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS MasteryAssignments (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      course_id VARCHAR(191) NOT NULL,
      title VARCHAR(255) NOT NULL,
      course VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      source_mode VARCHAR(32) NOT NULL,
      source_url TEXT NULL,
      source_content LONGTEXT NOT NULL,
      difficulty VARCHAR(32) NOT NULL,
      layout_type VARCHAR(64) NOT NULL,
      mastery_target INT NOT NULL DEFAULT 3,
      learning_suggestions_accepted TINYINT(1) NOT NULL DEFAULT 0,
      publish_state VARCHAR(32) NOT NULL DEFAULT 'draft',
      objectives_json JSON NOT NULL,
      sections_json JSON NOT NULL,
      questions_json JSON NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_mastery_assignments_course_id (course_id)
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
      INSERT INTO MasteryAssignments (
        id,
        course_id,
        title,
        course,
        description,
        source_mode,
        source_url,
        source_content,
        difficulty,
        layout_type,
        mastery_target,
        learning_suggestions_accepted,
        publish_state,
        objectives_json,
        sections_json,
        questions_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        course_id = VALUES(course_id),
        title = VALUES(title),
        course = VALUES(course),
        description = VALUES(description),
        source_mode = VALUES(source_mode),
        source_url = VALUES(source_url),
        source_content = VALUES(source_content),
        difficulty = VALUES(difficulty),
        layout_type = VALUES(layout_type),
        mastery_target = VALUES(mastery_target),
        learning_suggestions_accepted = VALUES(learning_suggestions_accepted),
        publish_state = VALUES(publish_state),
        objectives_json = VALUES(objectives_json),
        sections_json = VALUES(sections_json),
        questions_json = VALUES(questions_json)
    `,
    [
      assignment.id,
      assignment.courseId,
      assignment.title,
      assignment.course,
      assignment.description,
      assignment.sourceMode,
      assignment.sourceUrl || null,
      assignment.content,
      assignment.difficulty,
      assignment.layout,
      assignment.masteryTarget,
      assignment.learningSuggestionsAccepted ? 1 : 0,
      assignment.publishState,
      JSON.stringify(assignment.objectives),
      JSON.stringify(assignment.sections),
      JSON.stringify(assignment.questions),
    ]
  );

  return assignment;
}

export async function getMasteryAssignment({
  assignmentId,
  courseId,
}: {
  assignmentId?: string | null;
  courseId?: string | null;
}) {
  if (!assignmentId && !courseId) {
    return null;
  }

  if (!hasDatabaseConfig()) {
    return null;
  }

  await ensureMasteryAssignmentsTable();

  const db = getDbPool();

  if (assignmentId) {
    const [rows] = await db.query<MasteryAssignmentRow[]>(
      "SELECT * FROM MasteryAssignments WHERE id = ? LIMIT 1",
      [assignmentId]
    );

    return rows[0] ? mapRowToAssignment(rows[0]) : null;
  }

  const [rows] = await db.query<MasteryAssignmentRow[]>(
    "SELECT * FROM MasteryAssignments WHERE course_id = ? ORDER BY updated_at DESC LIMIT 1",
    [courseId]
  );

  return rows[0] ? mapRowToAssignment(rows[0]) : null;
}

export async function getLatestMasteryAssignment() {
  if (!hasDatabaseConfig()) {
    return null;
  }

  await ensureMasteryAssignmentsTable();

  const db = getDbPool();
  const [rows] = await db.query<MasteryAssignmentRow[]>(
    "SELECT * FROM MasteryAssignments ORDER BY updated_at DESC LIMIT 1"
  );

  return rows[0] ? mapRowToAssignment(rows[0]) : null;
}
