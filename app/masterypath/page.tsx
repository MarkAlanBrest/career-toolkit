import MasteryPathStudentClient from "./student-client";

export default async function MasteryPathPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const params = await searchParams;

  return <MasteryPathStudentClient courseId={params.courseId} />;
}
