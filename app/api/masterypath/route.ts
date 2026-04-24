export const runtime = "nodejs";

import { saveMasteryAssignment, getMasteryAssignment } from "../../../lib/masterypath-store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const assignmentId = searchParams.get("assignmentId");
  const courseId = searchParams.get("courseId");

  if (!assignmentId && !courseId) {
    return Response.json(
      { error: "Provide assignmentId or courseId." },
      { status: 400 }
    );
  }

  try {
    const assignment = await getMasteryAssignment({ assignmentId, courseId });

    if (!assignment) {
      return Response.json(
        { error: "Mastery assignment not found." },
        { status: 404 }
      );
    }

    return Response.json(assignment);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to load mastery assignment.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const assignment = await saveMasteryAssignment({
      title: body.title,
      course: body.course,
      sourceMode: body.sourceMode,
      sourceUrl: body.sourceUrl,
      content: body.content,
      objectives: Array.isArray(body.objectives) ? body.objectives : [],
      nodes: Array.isArray(body.nodes) ? body.nodes : undefined,
      masteryRules: Array.isArray(body.masteryRules) ? body.masteryRules : undefined,
      difficulty: body.difficulty,
      layout: body.layout,
      learningSuggestionsAccepted: Boolean(body.learningSuggestionsAccepted),
      masteryTarget:
        typeof body.masteryTarget === "number" ? body.masteryTarget : undefined,
    });

    return Response.json(assignment, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to save mastery assignment.",
      },
      { status: 500 }
    );
  }
}
