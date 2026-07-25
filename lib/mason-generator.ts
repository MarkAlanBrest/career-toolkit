import type { LessonPlan } from "@/lib/mason";

const lessonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "sectionTitle",
    "opening",
    "objectives",
    "summary",
    "keyFacts",
    "moments",
  ],
  properties: {
    sectionTitle: { type: "string" },
    opening: { type: "string" },
    objectives: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
    keyFacts: { type: "array", items: { type: "string" } },
    moments: {
      type: "array",
      minItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "kind",
          "phase",
          "title",
          "narration",
          "prompt",
          "choices",
          "correctAnswer",
          "feedback",
          "pageNumber",
          "cue",
          "visualAction",
          "focusX",
          "focusY",
          "focusScale",
        ],
        properties: {
          kind: {
            type: "string",
            enum: ["explain", "visual", "question", "scenario", "summary"],
          },
          phase: {
            type: "string",
            enum: ["learn", "activity", "mastery"],
          },
          title: { type: "string" },
          narration: { type: "string" },
          prompt: { type: ["string", "null"] },
          choices: {
            type: ["array", "null"],
            items: { type: "string" },
          },
          correctAnswer: { type: ["integer", "null"] },
          feedback: { type: ["string", "null"] },
          pageNumber: { type: ["integer", "null"], minimum: 1 },
          cue: { type: ["string", "null"] },
          visualAction: {
            type: ["string", "null"],
            enum: ["none", "zoom", "spotlight", "compare", null],
          },
          focusX: { type: ["number", "null"], minimum: 0, maximum: 100 },
          focusY: { type: ["number", "null"], minimum: 0, maximum: 100 },
          focusScale: { type: ["number", "null"], minimum: 1, maximum: 2.5 },
        },
      },
    },
  },
};

export async function generateLessonPlan({
  pdf,
  fileName,
  courseTitle,
  sectionTitle,
  intensity = "standard",
  estimatedMinutes = 15,
}: {
  pdf: Buffer;
  fileName: string;
  courseTitle: string;
  sectionTitle: string;
  intensity?: string;
  estimatedMinutes?: number;
}): Promise<LessonPlan> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Add it to .env before generating a lesson.",
    );
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6-sol",
      instructions: [
        "You are an expert curriculum writer and instructional designer.",
        "Build an accurate, professional lesson using only facts supported by the attached PDF.",
        "The result will be rendered as one continuous, vertically scrolling editorial webpage. It is not a slide deck, chatbot conversation, card carousel, or sequence of tiny fragments.",
        "Write substantial teaching prose. Each explain moment should contain two to four coherent paragraphs separated by blank lines, with concrete examples where the source supports them.",
        "Organize the reading in a natural sequence. Use descriptive headings, a strong opening, useful callouts, and a concise summary.",
        "Use two or three learn-phase PDF visuals only when the original page contains a useful photograph, diagram, chart, or worked example. Ignore logos and decorative art.",
        "For a visual, make the narration explain what the learner should notice. Add a brief cue, and use zoom or spotlight only when a particular detail matters.",
        "Insert two or three activity-phase questions or realistic scenarios immediately after the related teaching. They should require thought and provide detailed instructional feedback.",
        "Finish with two or three mastery-phase questions using new applications of the material. Mastery questions must be independent checks and must not repeat the activity questions.",
        "Use phase learn for explanations, visuals, and summary; phase activity for coached practice; and phase mastery for the final independent check.",
        "Use 9 to 15 moments total. Balance depth to the requested lesson time and course intensity.",
        "For multiple-choice moments, correctAnswer is the zero-based choice index.",
      ].join(" "),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              filename: fileName,
              file_data: `data:application/pdf;base64,${pdf.toString("base64")}`,
            },
            {
              type: "input_text",
              text: `Course: ${courseTitle}\nSection: ${sectionTitle}\nCourse intensity: ${intensity}\nTarget section time: ${estimatedMinutes} minutes\nCreate the continuous editorial lesson now.`,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "mason_lesson_plan",
          strict: true,
          schema: lessonSchema,
        },
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const message =
      data?.error?.message || "OpenAI could not generate this lesson.";
    throw new Error(message);
  }

  const outputText =
    data.output_text ||
    data.output
      ?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content || [])
      .map((item: { text?: string }) => item.text)
      .filter(Boolean)
      .join("");

  if (!outputText) {
    throw new Error("The lesson generator returned no lesson plan.");
  }

  return JSON.parse(outputText) as LessonPlan;
}
