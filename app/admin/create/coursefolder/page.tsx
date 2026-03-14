// app/admin/create/[courseFolder]/page.tsx
import { getAllCourses } from "@/lib/courses";

type Props = {
  params: { courseFolder: string };
};

export default function CreateStudentPage({ params }: Props) {
  const courses = getAllCourses();
  const course = courses.find((c) => c.folder === params.courseFolder);

  if (!course) {
    return (
      <main className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold mb-4">Course not found</h1>
        <p className="text-sm text-gray-600">
          No course found for folder <code>{params.courseFolder}</code>.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      {/* ✅ Updated header goes here */}
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">
        Create Course Code – {course.courseName}
      </h1>

      <p className="text-sm text-slate-500 mb-6">
        Folder: <code>{course.folder}</code>
      </p>

      {/* Replace this with your real form + DB + email wiring */}
      <p className="text-sm text-gray-600">
        TODO: student form goes here (first name, last name, email, dates,
        etc.).
      </p>
    </main>
  );
}
