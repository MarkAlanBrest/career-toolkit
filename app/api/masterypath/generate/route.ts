export const runtime = "nodejs";

type GenerateStage = "blocks";

type GenerateRequestBody = {
  stage?: GenerateStage;
  title?: string;
  course?: string;
  sourceMode?: "upload" | "url" | "paste";
  sourceUrl?: string;
  content?: string;
  objectiveTitle?: string;
  objectiveGoal?: string;
  difficulty?: "Foundational" | "Intermediate" | "Advanced";
  layout?: "Guided path" | "Mixed media path" | "Scenario path";
  desiredBlockCount?: number;
};

const MODEL = "claude-sonnet-4-20250514";

function buildPrompt(body: GenerateRequestBody) {
  return `
You are helping a teacher build possible student interactions from uploaded content.

Return JSON only. Do not wrap the response in markdown fences.

Return:
{
  "completionCriteria": {
    "minBlocksComplete": 12,
    "minCorrectInteractions": 4,
    "allowRetake": true
  },
  "blocks": [
    {
      "id": "...",
      "type": "content-slide",
      "title": "...",
      "summary": "...",
      "body": "...",
      "bullets": ["...", "..."],
      "callout": {
        "label": "...",
        "text": "..."
      },
      "stats": [
        {
          "label": "...",
          "value": "..."
        }
      ],
      "media": {
        "type": "image",
        "url": "...",
        "caption": "..."
      },
      "theme": "ocean",
      "layoutStyle": "split",
      "choices": [
        {
          "id": "...",
          "text": "...",
          "isCorrect": true,
          "feedback": "..."
        }
      ],
      "placeholder": "..."
    }
  ]
}

Allowed block types:
"content-slide", "bullet-slide", "image-slide", "video-slide", "multiple-choice",
"true-false", "checkpoint", "review", "reflection"

Allowed theme values:
"ocean", "sunset", "forest", "slate"

Allowed layoutStyle values:
"split", "spotlight", "bullet-focus", "media-left"

Requirements:
- Do not create or rewrite the teacher's objective.
- Use the teacher's assignment title as the objective label.
- Keep the learner experience simple: interactions first, study tips second.
- Do not build long teaching slides or dense content sections.
- Use most blocks for multiple-choice, true-false, checkpoint, or reflection interactions.
- Use review blocks as short study tips, such as "Please review [topic] again; you could improve here."
- Keep any body text brief and question-like or study-tip-like.
- Include enough checks and review tips so the section can be retaken.
- Use real media URLs only if the input already contains real URLs. Otherwise omit media.
- Output strict JSON only with double-quoted keys and string values.
- Generate about ${body.desiredBlockCount || 14} blocks when stage is "blocks".

Input:
assignmentTitle: ${body.title || ""}
course: ${body.course || ""}
sourceMode: ${body.sourceMode || "paste"}
sourceUrl: ${body.sourceUrl || ""}
difficulty: ${body.difficulty || "Intermediate"}
layout: ${body.layout || "Mixed media path"}
sourceContent:
${body.content || ""}
`.trim();
}

function extractText(data: any) {
  let text = "";

  for (const block of data?.content ?? []) {
    if (block?.type === "text" && typeof block.text === "string") {
      text += block.text;
    }
  }

  return text.trim();
}

function parseJsonFromModel(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }

    throw new Error("AI returned invalid JSON.");
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return Response.json(
      {
        error:
          "Missing ANTHROPIC_API_KEY. Add it to your environment variables, then restart the app.",
      },
      { status: 500 }
    );
  }

  let body: GenerateRequestBody;

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  if (!body.content?.trim()) {
    return Response.json(
      { error: "Add source content before generating AI output." },
      { status: 400 }
    );
  }

  try {
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2600,
        messages: [
          {
            role: "user",
            content: buildPrompt(body),
          },
        ],
      }),
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      const errorMessage =
        data?.error?.message || data?.error || "Anthropic request failed.";
      return Response.json({ error: errorMessage }, { status: 500 });
    }

    return Response.json(parseJsonFromModel(extractText(data)));
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to generate mastery content.",
      },
      { status: 500 }
    );
  }
}
