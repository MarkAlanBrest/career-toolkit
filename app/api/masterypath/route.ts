export const runtime = "nodejs";

import {
  saveMasteryAssignment,
  getMasteryAssignment,
  listMasteryAssignments,
  updateMasteryAssignmentPublishState,
} from "../../../lib/masterypath-store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const assignmentId = searchParams.get("assignmentId");
  const courseId = searchParams.get("courseId");

  if (!assignmentId && !courseId) {
    const assignments = await listMasteryAssignments();
    return Response.json({ assignments });
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
      objectiveTitle: body.objectiveTitle,
      objectiveGoal: body.objectiveGoal,
      blocks: Array.isArray(body.blocks) ? body.blocks : undefined,
      completionCriteria:
        body.completionCriteria && typeof body.completionCriteria === "object"
          ? body.completionCriteria
          : undefined,
      difficulty: body.difficulty,
      layout: body.layout,
      learningSuggestionsAccepted: Boolean(body.learningSuggestionsAccepted),
      publishState: body.publishState === "published" ? "published" : "draft",
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

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const courseId = typeof body.courseId === "string" ? body.courseId : "";
    const publishState = body.publishState === "published" ? "published" : "draft";

    if (!courseId) {
      return Response.json({ error: "Provide courseId." }, { status: 400 });
    }

    const assignment = await updateMasteryAssignmentPublishState({
      courseId,
      publishState,
    });

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
          error instanceof Error ? error.message : "Unable to update mastery assignment.",
      },
      { status: 500 }
    );
  }
}
