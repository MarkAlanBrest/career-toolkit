// app/admin/dashboard/page.tsx
import Link from "next/link";
import { getAllCourses } from "@/lib/courses";

export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  const courses = getAllCourses();

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-white mb-8">
        Admin Dashboard
      </h1>

      <section>
        <h2 className="text-xl font-semibold text-white mb-4">
          Available Courses
        </h2>

        {courses.length === 0 ? (
          <p className="text-sm text-slate-600">
            No courses found. Add a folder under <code>public/</code> with a{" "}
            <code>module.json</code> file.
          </p>
        ) : (
          <ul className="space-y-4">
            {courses.map((course) => (
              <li
                key={course.folder}
                className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">
                      {course.courseName}
                    </div>

                    {course.description && (
                      <p className="text-sm text-slate-600 mt-1">
                        {course.description}
                      </p>
                    )}

                    {course.duration && (
                      <p className="text-xs text-slate-500 mt-1">
                        Duration: {course.duration}
                      </p>
                    )}

                    <p className="text-xs text-slate-400 mt-1">
                      Folder: <code>{course.folder}</code>
                    </p>
                  </div>

                  <Link
                    href={`/admin/create/${course.folder}`}
                    className="inline-flex items-center px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                  >
                    Create Course Code
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
