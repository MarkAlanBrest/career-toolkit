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
}: {
  pdf: Buffer;
  fileName: string;
  courseTitle: string;
  sectionTitle: string;
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
        "You are an expert AI teacher and instructional designer.",
        "Build a lively, accurate lesson using only facts supported by the attached PDF.",
        "Do not create a slide deck. Create a sequence of short teaching moments that alternate explanation, visual attention, questions, and realistic scenarios.",
        "Use PDF page numbers for moments where the original page contains a useful photograph, diagram, chart, or visual example. Ignore logos and decorative art.",
        "Choreograph useful visuals. Add a short natural cue the instructor says before showing one, choose zoom or spotlight when a specific detail matters, and provide percentage focus coordinates plus a restrained zoom scale. Use none and null coordinates when no visual action is needed.",
        "Make narration conversational and suitable to speak aloud.",
        "Use 8 to 14 moments. Include at least two questions or scenarios and finish with a summary.",
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
              text: `Course: ${courseTitle}\nSection: ${sectionTitle}\nCreate the lesson plan now.`,
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
