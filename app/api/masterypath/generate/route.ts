export const runtime = "nodejs";

type GenerateStage = "objectives" | "graph";

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
  const stage = body.stage === "graph" ? "graph" : "objectives";

  return `
You are helping a teacher build an adaptive mastery-based learning experience.

Return JSON only. Do not wrap the response in markdown fences.

If stage is "objectives", return:
{
  "objectives": ["...", "...", "..."]
}

If stage is "graph", return:
{
  "startNodeId": "...",
  "masteryRules": [
    {
      "objectiveId": "...",
      "masteryStreak": 2,
      "remediationThreshold": 1
    }
  ],
  "nodes": [
    {
      "id": "...",
      "objectiveId": "...",
      "type": "lesson",
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
      "transitions": {
        "next": "...",
        "correct": "...",
        "incorrect": "...",
        "mastered": "...",
        "retry": "..."
      }
    }
  ]
}

Requirements:
- Build an adaptive path, not a linear slideshow.
- For each objective, create a teach -> question -> remediation -> mastery-check pattern.
- Different answers should lead to different next nodes.
- The student should be able to recover from errors and loop until mastery.
- Make the content feel polished and visual, with bullets, callouts, and stats where useful.
- Keep the student stage focused: one main node at a time.
- Use real media URLs only if the input already includes real URLs. Otherwise omit media.
- Keep IDs stable and machine-friendly.
- Allowed node types: "lesson", "question", "remediation", "mastery-check", "completion".
- Allowed media types: "image", "video".
- Allowed themes: "ocean", "sunset", "forest", "slate".
- Allowed layoutStyle values: "split", "spotlight", "bullet-focus", "media-left".
- Output strict JSON only with double-quoted keys and string values.

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

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const extracted = cleaned.slice(firstBrace, lastBrace + 1);
      return JSON.parse(extracted);
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

  if (body.stage === "graph" && !(body.objectives || []).filter(Boolean).length) {
    return Response.json(
      { error: "Add or generate at least one objective before generating the adaptive graph." },
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
        max_tokens: 2200,
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
          error instanceof Error ? error.message : "Unable to generate mastery graph.",
      },
      { status: 500 }
    );
  }
}
