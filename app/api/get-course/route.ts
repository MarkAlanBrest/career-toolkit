import { getAllCourses } from "@/lib/courses";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const folder = searchParams.get("folder");

  const courses = getAllCourses();
  const course = courses.find((c) => c.folder === folder);

  return Response.json({ course });
}
