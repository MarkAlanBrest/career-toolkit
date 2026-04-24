export const runtime = "nodejs";

type GenerateStage = "objectives" | "flow";

type GenerateRequestBody = {
  stage?: GenerateStage;
  title?: string;
  course?: string;
  sourceMode?: "upload" | "url" | "paste";
  sourceUrl?: string;
  content?: string;
  objectives?: string[];
  difficulty?: "Foundational" | "Intermediate" | "Advanced";
  layout?: "Guided path" | "Mixed media path" | "Scenario path";
};

const MODEL = "claude-sonnet-4-20250514";

function buildPrompt(body: GenerateRequestBody) {
  const stage = body.stage === "flow" ? "flow" : "objectives";

  return `
You are helping a teacher build a mastery-based learning assignment.

Return JSON only. Do not wrap the response in markdown fences.

If stage is "objectives", return:
{
  "objectives": ["...", "...", "..."]
}

If stage is "flow", return:
{
  "sections": [
    {
      "title": "...",
      "kind": "lesson" | "chart" | "video" | "interactive",
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
        "type": "image" | "video",
        "url": "...",
        "caption": "..."
      },
      "theme": "ocean" | "sunset" | "forest" | "slate",
      "layoutStyle": "split" | "spotlight" | "bullet-focus" | "media-left"
    }
  ]
}

Requirements:
- Keep everything teacher-friendly, accurate, and practical.
- Base the output on the provided source content.
- Objectives should be clear, measurable, and classroom-ready.
- Sections should feel like real instructional slides, not placeholders.
- For "flow", generate 3 to 5 sections.
- Keep each section body concise but substantive.
- Match rigor to the requested difficulty.
- Match structure to the requested layout.
- Use bullets, callouts, stats, and layout variety to make the slides feel designed.
- Include a video media block only when the source URL or source content already contains a real video URL.
- Include an image media block only when a real image URL is provided in the source material. Otherwise leave media out.

Input:
stage: ${stage}
title: ${body.title || ""}
course: ${body.course || ""}
sourceMode: ${body.sourceMode || "paste"}
sourceUrl: ${body.sourceUrl || ""}
difficulty: ${body.difficulty || "Intermediate"}
layout: ${body.layout || "Mixed media path"}
objectives: ${JSON.stringify((body.objectives || []).filter(Boolean))}
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

  return JSON.parse(cleaned);
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

  if (body.stage === "flow" && !(body.objectives || []).filter(Boolean).length) {
    return Response.json(
      { error: "Add or generate at least one objective before generating learning flow." },
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
        max_tokens: 1400,
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

    const parsed = parseJsonFromModel(extractText(data));
    return Response.json(parsed);
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
