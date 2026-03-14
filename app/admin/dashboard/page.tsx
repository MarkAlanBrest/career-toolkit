// app/admin/dashboard/page.tsx
import Link from "next/link";
import { getAllCourses } from "@/lib/courses";

export const dynamic = "force-dynamic"; // ensure fresh read of public/ if you want

export default function AdminDashboardPage() {
  const courses = getAllCourses();

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Admin Dashboard</h1>

      <section>
        <h2 className="text-xl font-semibold mb-4">Available Courses</h2>

        {courses.length === 0 ? (
          <p className="text-sm text-gray-600">
            No courses found. Add a folder under <code>public/</code> with a{" "}
            <code>module.json</code> file.
          </p>
        ) : (
          <ul className="space-y-3">
            {courses.map((course) => (
              <li
                key={course.folder}
                className="border rounded-md p-4 flex items-start justify-between gap-4"
              >
                <div>
                  <div className="font-medium">{course.courseName}</div>
                  {course.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {course.description}
                    </p>
                  )}
                  {course.duration && (
                    <p className="text-xs text-gray-500 mt-1">
                      Duration: {course.duration}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Folder: <code>{course.folder}</code>
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <Link
                    href={`/admin/create/${course.folder}`}
                    className="inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Create Student
                  </Link>
                  {/* Future: link to preview player, analytics, etc. */}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
