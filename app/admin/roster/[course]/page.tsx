export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import RosterClient from "./RosterClient";

type RosterPageProps = {
  params: {
    course: string;
  };
};

export default async function RosterPage({ params }: RosterPageProps) {
  const courseParam = params.course;

  const courses = await prisma.courseRecords.findMany({
    distinct: ["CourseName"],
    select: { CourseName: true }
  });

  const students = await prisma.courseRecords.findMany({
    where: { CourseName: courseParam }
  });

  return (
    <RosterClient
      courseParam={courseParam}
      courses={courses}
      initialStudents={students}
    />
  );
}
