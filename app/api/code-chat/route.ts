export const runtime = "nodejs";

type ChatState = "pa" | "oh" | "both";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Source = {
  title: string;
  url: string;
};

const MODEL = "claude-sonnet-4-20250514";

const ALLOWED_DOMAINS = [
  "codes.iccsafe.org",
  "pa.gov",
  "dli.pa.gov",
  "pacodeandbulletin.gov",
  "pabulletin.com",
  "codes.ohio.gov",
  "com.ohio.gov",
  "commerce.ohio.gov",
];

const BUILDING_CODE_TERMS = [
  "accessibility",
  "ada",
  "addition",
  "alteration",
  "assembly",
  "basement",
  "bathroom",
  "beam",
  "bedroom",
  "building",
  "certificate of occupancy",
  "ceiling",
  "clearance",
  "code",
  "combustion",
  "commercial",
  "concrete",
  "construction",
  "corridor",
  "deck",
  "door",
  "drain",
  "egress",
  "electrical",
  "energy",
  "exit",
  "fire",
  "fixture",
  "foundation",
  "furnace",
  "garage",
  "gas",
  "guard",
  "handrail",
  "hvac",
  "ibc",
  "icc",
  "iecc",
  "ifc",
  "imc",
  "ipc",
  "irc",
  "means of egress",
  "mechanical",
  "occupancy",
  "ohio building code",
  "outlet",
  "permit",
  "plumbing",
  "ramp",
  "railing",
  "receptacle",
  "residential",
  "roof",
  "smoke",
  "sprinkler",
  "stair",
  "stud",
  "structure",
  "ucc",
  "vent",
  "wall",
  "water heater",
  "window",
];

function normalizeState(value: unknown): ChatState {
  if (value === "pa" || value === "oh" || value === "both") return value;
  return "both";
}

function isBuildingCodeQuestion(text: string) {
  const lower = text.toLowerCase();
  return BUILDING_CODE_TERMS.some((term) => lower.includes(term));
}

function stateLabel(state: ChatState) {
  if (state === "pa") return "Pennsylvania (PA)";
  if (state === "oh") return "Ohio (OH)";
  return "Pennsylvania (PA) and Ohio (OH)";
}

function systemPrompt(state: ChatState) {
  return `You are a specialized building code tutor for trade-school students.

Scope:
- Answer only building-code, construction-code, fire-code, accessibility, energy-code, plumbing-code, mechanical-code, electrical-code, permit, inspection, occupancy, and egress questions.
- The selected jurisdiction is ${stateLabel(state)}.
- If the user asks about another state or a non-building-code topic, politely decline and invite a PA or Ohio building code question.
- If the selected jurisdiction is PA, answer only for Pennsylvania unless the user explicitly asks to compare Ohio.
- If the selected jurisdiction is OH, answer only for Ohio unless the user explicitly asks to compare Pennsylvania.
- If the selected jurisdiction is both, compare PA and OH clearly.

Preferred sources:
- ICC Digital Codes: codes.iccsafe.org
- Pennsylvania UCC and Labor & Industry sources: pa.gov, dli.pa.gov, Pennsylvania Bulletin, PA Code and Bulletin
- Ohio official code and building standards sources: codes.ohio.gov, com.ohio.gov, commerce.ohio.gov

Answer rules:
1. Start with a short direct answer.
2. Use PA: and/or OH: labels when more than one jurisdiction is discussed.
3. Cite section numbers when available, such as [IBC 1005.1], [OBC 1006], [IRC R310], [PA UCC], or [OAC 4101].
4. Say when local amendments or the authority having jurisdiction may change the answer.
5. Include a "Sources:" line with 1-4 URLs from official/ICC sources.
6. Keep the tone clear and student-friendly.
7. Do not provide legal advice or design certification. Remind users to verify with the local code official for real projects.`;
}

function getTextAndSources(data: any) {
  let reply = "";
  const sources = new Map<string, Source>();

  function addSource(item: any) {
    const url = item?.url;
    if (!url || typeof url !== "string") return;
    sources.set(url, {
      url,
      title:
        typeof item.title === "string" && item.title.trim()
          ? item.title
          : url,
    });
  }

  for (const block of data?.content ?? []) {
    if (block?.type === "text" && typeof block.text === "string") {
      reply += block.text;
      for (const citation of block.citations ?? []) addSource(citation);
    }

    if (block?.type === "web_search_tool_result") {
      for (const result of block.content ?? []) addSource(result);
    }
  }

  return {
    reply: reply.trim(),
    sources: Array.from(sources.values()).slice(0, 4),
  };
}

function cleanMessages(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter(
      (message): message is ChatMessage =>
        (message?.role === "user" || message?.role === "assistant") &&
        typeof message?.content === "string" &&
        message.content.trim().length > 0
    )
    .slice(-8)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 4000),
    }));
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

  let body: any;

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const state = normalizeState(body?.state);
  const messages = cleanMessages(body?.messages);
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");

  if (!latestUserMessage) {
    return Response.json(
      { error: "Please send a building code question." },
      { status: 400 }
    );
  }

  if (!isBuildingCodeQuestion(latestUserMessage.content)) {
    return Response.json({
      reply:
        "I can only help with Pennsylvania and Ohio building code questions. Try asking about egress, occupancy, fire ratings, accessibility, permits, stairs, plumbing, mechanical, electrical, or another code topic.",
      sources: [],
    });
  }

  let anthropicResponse: Response;

  try {
    anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        system: systemPrompt(state),
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 4,
            allowed_domains: ALLOWED_DOMAINS,
            user_location: {
              type: "approximate",
              country: "US",
              timezone: "America/New_York",
            },
          },
        ],
        messages,
      }),
    });
  } catch {
    return Response.json(
      {
        error:
          "The server could not reach Anthropic. Check internet access, deployment networking, and the ANTHROPIC_API_KEY environment variable.",
      },
      { status: 502 }
    );
  }

  const data = await anthropicResponse.json().catch(() => ({}));

  if (!anthropicResponse.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      "The code assistant could not reach the AI service.";

    return Response.json({ error: message }, { status: anthropicResponse.status });
  }

  const result = getTextAndSources(data);

  if (!result.reply) {
    return Response.json({
      reply:
        "I could not find a reliable answer from the allowed ICC, Pennsylvania, or Ohio code sources. Try rephrasing the question with the building type, code topic, and jurisdiction.",
      sources: result.sources,
    });
  }

  return Response.json(result);
}
