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
  activityCounts?: Record<string, number>;
  slideCounts?: Record<string, number>;
  seedBlocks?: unknown[];
  deckStyle?: "trade" | "clinical" | "bold" | "minimal";
  includeContentSlides?: boolean;
  includeMissedExplanationSlides?: boolean;
};

const MODEL = "claude-sonnet-4-20250514";

function buildPrompt(body: GenerateRequestBody) {
  const requestedCounts = Object.entries(body.activityCounts || {})
    .filter(([, count]) => Number(count) > 0)
    .map(([type, count]) => `${type}: ${count}`)
    .join(", ");
  const requestedSlides = Object.entries(body.slideCounts || {})
    .filter(([, count]) => Number(count) > 0)
    .map(([type, count]) => `${type}: ${count}`)
    .join(", ");
  const seedBlocks = Array.isArray(body.seedBlocks)
    ? JSON.stringify(
        body.seedBlocks.map((block: any, index) => ({
          position: index + 1,
          id: block?.id,
          type: block?.type,
          title: block?.title,
          body: block?.body,
          imageUrl: block?.imageUrl,
          videoUrl: block?.videoUrl,
          caption: block?.caption,
          choices: block?.choices,
          activityItems: block?.activityItems,
          activityTargets: block?.activityTargets,
          showWhenPreviousIncorrect: block?.showWhenPreviousIncorrect,
        })),
        null,
        2
      )
    : "";

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
      "showWhenPreviousIncorrect": false,
      "choices": [
        {
          "id": "...",
          "text": "...",
          "isCorrect": true,
          "feedback": "..."
        }
      ],
      "activityItems": [
        {
          "id": "...",
          "text": "...",
          "targetId": "...",
          "order": 1
        }
      ],
      "activityTargets": [
        {
          "id": "...",
          "label": "...",
          "accepts": ["..."]
        }
      ],
      "placeholder": "..."
    }
  ]
}

Allowed block types:
"content-slide", "bullet-slide", "image-slide", "video-slide", "multiple-choice",
"true-false", "checkpoint", "drag-drop", "matching", "sequencing", "sorting",
"scenario", "review", "reflection"

Allowed theme values:
"ocean", "sunset", "forest", "slate"

Allowed layoutStyle values:
"split", "spotlight", "bullet-focus", "media-left", "stat-grid", "callout", "process"

Requirements:
- Do not create or rewrite the teacher's objective.
- Use the teacher's assignment title as the objective label.
- Build the output like a polished slide deck, not a worksheet.
- If seed blocks are provided, preserve their order, type, and teacher-entered settings such as media URLs, choices, targets, and conditional display flags.
- Use concise slide titles, strong summaries, useful callouts, stats, bullets, and visual/media slides where the source supports them.
- Deck visual style: ${body.deckStyle || "trade"}.
- Match these requested content slide counts when provided: ${requestedSlides || "use your best mix"}.
- Match these requested activity slide counts when provided: ${requestedCounts || "use your best mix"}.
- Content slides before each activity: ${body.includeContentSlides ? "yes" : "no"}.
- Explanation slides after missed activities: ${body.includeMissedExplanationSlides ? "yes" : "no"}.
- If content slides are enabled, add one brief "content-slide" immediately before each activity block.
- If missed explanation slides are enabled, add one "review" block immediately after each activity block and set "showWhenPreviousIncorrect": true on that review block.
- For content-slide, bullet-slide, review, and image-slide blocks, make them feel like presentation slides: use bullets, callout, stats, layoutStyle, captions, and media fields when relevant.
- Include drag-drop, matching, sequencing, sorting, scenario decisions, reflection, and quick checks where appropriate.
- For drag-drop, matching, and sorting, provide activityItems with targetId values and activityTargets with matching ids.
- For sequencing, provide activityItems with order values starting at 1.
- Do not create study-tip or review-only blocks unless missed explanation slides are enabled.
- Every block should be an activity the student can interact with, except optional content slides and missed-explanation review slides.
- Keep any body text brief and activity-like.
- Include enough checks and review tips so the section can be retaken.
- Use real media URLs only if the input already contains real URLs. Otherwise omit media.
- Output strict JSON only with double-quoted keys and string values.
- Generate about ${body.desiredBlockCount || 14} activity blocks when stage is "blocks", plus requested content and missed-explanation slides.

Input:
assignmentTitle: ${body.title || ""}
course: ${body.course || ""}
sourceMode: ${body.sourceMode || "paste"}
sourceUrl: ${body.sourceUrl || ""}
difficulty: ${body.difficulty || "Intermediate"}
layout: ${body.layout || "Mixed media path"}
sourceContent:
${body.content || ""}

seedBlocks:
${seedBlocks || "[]"}
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

async function repairJsonWithModel({
  apiKey,
  invalidJson,
  parseError,
}: {
  apiKey: string;
  invalidJson: string;
  parseError: unknown;
}) {
  const repairResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 6000,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: `
Repair this malformed JSON so it parses correctly.

Return valid JSON only. Do not explain the fix. Do not wrap it in markdown.

Parser error:
${parseError instanceof Error ? parseError.message : "Invalid JSON"}

Malformed JSON:
${invalidJson}
`.trim(),
        },
      ],
    }),
  });

  const repairData = await repairResponse.json();

  if (!repairResponse.ok) {
    throw new Error(
      repairData?.error?.message || repairData?.error || "Unable to repair AI JSON."
    );
  }

  return parseJsonFromModel(extractText(repairData));
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
        max_tokens: 6000,
        temperature: 0,
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

    const text = extractText(data);

    try {
      return Response.json(parseJsonFromModel(text));
    } catch (parseError) {
      return Response.json(
        await repairJsonWithModel({
          apiKey,
          invalidJson: text,
          parseError,
        })
      );
    }
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
