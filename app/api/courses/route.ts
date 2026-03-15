import { getAllCourses } from "@/lib/courses";

export async function GET() {
  const courses = getAllCourses();
  return Response.json(courses);
}
