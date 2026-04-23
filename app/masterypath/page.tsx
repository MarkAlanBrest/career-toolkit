import MasteryPathStudentClient from "./student-client";
import { sampleAssignment } from "./data";
import { getMasteryAssignment } from "../../lib/masterypath-store";

export default async function MasteryPathPage({
  searchParams,
}: {
  searchParams: Promise<{ assignmentId?: string; courseId?: string }>;
}) {
  const params = await searchParams;
  let assignment = sampleAssignment;

  try {
    const storedAssignment = await getMasteryAssignment({
      assignmentId: params.assignmentId,
      courseId: params.courseId,
    });

    if (storedAssignment) {
      assignment = storedAssignment;
    }
  } catch (error) {
    console.error("Unable to load MasteryPath assignment from the database.", error);
  }

  return <MasteryPathStudentClient assignment={assignment} />;
}
