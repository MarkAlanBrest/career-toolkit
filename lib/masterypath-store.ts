import { type RowDataPacket } from "mysql2";
import {
  buildInteractionSuggestions,
  sampleAssignment,
  type AssignmentQuestion,
  type ContentSection,
  type MasteryAssignment,
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
  sections?: ContentSection[];
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

function layoutForKind(kind: ContentSection["kind"]): SlideLayoutStyle {
  if (kind === "video") {
    return "media-left";
  }

  if (kind === "chart") {
    return "bullet-focus";
  }

  if (kind === "interactive") {
    return "spotlight";
  }

  return "split";
}

function pickSectionKind(layout: MasteryLayout, index: number): ContentSection["kind"] {
  if (layout === "Scenario path") {
    return index === 0 ? "lesson" : "interactive";
  }

  if (layout === "Guided path") {
    return index % 2 === 0 ? "lesson" : "chart";
  }

  const kinds: ContentSection["kind"][] = ["lesson", "chart", "video", "interactive"];
  return kinds[index % kinds.length];
}

function buildSections(
  content: string,
  objectives: Objective[],
  difficulty: MasteryDifficulty,
  layout: MasteryLayout
) {
  const sourceBody = content.trim() || "Source content will appear here.";
  const sentences = sourceBody
    .split(/[.!?]/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const interactionSuggestions = buildInteractionSuggestions(
    objectives.map((objective) => objective.goal),
    difficulty
  );

  return objectives.map<ContentSection>((objective, index) => {
    const kind = pickSectionKind(layout, index);
    const sourceChunk =
      sentences.slice(index, index + 3).join(". ") ||
      sentences.slice(0, 2).join(". ") ||
      sourceBody;
    const relatedSuggestion = interactionSuggestions[index];

    return {
      id: `slide-${index + 1}`,
      title: objective.title,
      kind,
      summary: objective.goal,
      body: sourceChunk.endsWith(".") ? sourceChunk : `${sourceChunk}.`,
      bullets: [
        objective.goal,
        relatedSuggestion?.content || "Use the slide to reinforce the central rule.",
        `Difficulty target: ${difficulty}`,
      ],
      callout: {
        label: "Teaching move",
        text:
          relatedSuggestion?.interactions.join(" | ") ||
          "Introduce the concept, compare examples, then check for understanding.",
      },
      stats: [
        { label: "Objective", value: `${index + 1}` },
        { label: "Difficulty", value: difficulty },
      ],
      theme: themeForIndex(index),
      layoutStyle: layoutForKind(kind),
    };
  });
}

function buildQuestions(): AssignmentQuestion[] {
  return [];
}

function normalizeSection(section: ContentSection, index: number): ContentSection {
  return {
    id: section.id || `slide-${index + 1}`,
    title: section.title || `Slide ${index + 1}`,
    kind: section.kind || "lesson",
    summary: section.summary || "",
    body: section.body || "",
    bullets: Array.isArray(section.bullets) ? section.bullets.filter(Boolean) : [],
    callout:
      section.callout && (section.callout.label || section.callout.text)
        ? {
            label: section.callout.label || "Key point",
            text: section.callout.text || "",
          }
        : null,
    media:
      section.media && section.media.url
        ? {
            type: section.media.type === "video" ? "video" : "image",
            url: section.media.url,
            caption: section.media.caption || "",
          }
        : null,
    stats: Array.isArray(section.stats)
      ? section.stats
          .filter((stat) => stat?.label || stat?.value)
          .map((stat) => ({
            label: stat.label || "Label",
            value: stat.value || "",
          }))
      : [],
    theme: section.theme || themeForIndex(index),
    layoutStyle: section.layoutStyle || layoutForKind(section.kind || "lesson"),
  };
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
  const sections =
    input.sections && input.sections.length
      ? input.sections.map(normalizeSection)
      : buildSections(content, objectives, input.difficulty, input.layout);

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
    sections,
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

async function ensureMasteryAssignmentsTable() {
  if (schemaReady || !hasDatabaseConfig()) {
    return;
  }

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
  const payload = parseJsonField<StoredMasteryAssignment | null>(row.payload_json, null);
  return payload;
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
  if (!hasDatabaseConfig()) {
    return null;
  }

  await ensureMasteryAssignmentsTable();

  const db = getDbPool();
  const [rows] = await db.query<MasteryCoursePayloadRow[]>(
    "SELECT * FROM MasteryPathCoursePayloads ORDER BY updated_at DESC LIMIT 1"
  );

  return rows[0] ? mapRowToAssignment(rows[0]) : null;
}
