import MasteryPathStudentClient from "./student-client";
import { sampleAssignment } from "./data";
import {
  getLatestPublishedMasteryAssignment,
  getMasteryAssignment,
} from "../../lib/masterypath-store";

export default async function MasteryPathPage({
  searchParams,
}: {
  searchParams: Promise<{ assignmentId?: string; courseId?: string }>;
}) {
  const params = await searchParams;
  let assignment = null;

  try {
    const storedAssignment =
      params.assignmentId || params.courseId
        ? await getMasteryAssignment({
            assignmentId: params.assignmentId,
            courseId: params.courseId,
          })
        : await getLatestPublishedMasteryAssignment();

    if (storedAssignment) {
      assignment = storedAssignment;
    }
  } catch (error) {
    console.error("Unable to load MasteryPath assignment from the database.", error);
  }

  return <MasteryPathStudentClient assignment={assignment || sampleAssignment} />;
}
