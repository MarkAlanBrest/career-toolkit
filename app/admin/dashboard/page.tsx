// app/admin/dashboard/page.tsx
import Link from "next/link";
import { getAllCourses } from "@/lib/courses";

export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  const courses = getAllCourses();

  return (
    <main className="min-h-screen bg-slate-900 px-4 py-10">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-slate-400 mt-1">
            Manage course folders and generate student course codes.
          </p>
        </header>

        {/* Course List */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-6">
            Available Courses
          </h2>

          {courses.length === 0 ? (
            <p className="text-sm text-slate-400 bg-slate-800 p-4 rounded-lg border border-slate-700">
              No courses found. Add a folder under <code>public/</code> with a{" "}
              <code>module.json</code> file.
            </p>
          ) : (
            <ul className="space-y-5">
              {courses.map((course) => (
                <li
                  key={course.folder}
                  className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white">
                        {course.courseName}
                      </h3>

                      {course.description && (
                        <p className="text-slate-300 mt-1">
                          {course.description}
                        </p>
                      )}

                      {course.duration && (
                        <p className="text-xs text-slate-400 mt-1">
                          Duration: {course.duration}
                        </p>
                      )}

                      <p className="text-xs text-slate-500 mt-2">
                        Folder: <code>{course.folder}</code>
                      </p>
                    </div>

                    <Link
                      href={`/admin/create/${course.folder}`}
                      className="shrink-0 inline-flex items-center px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-md transition"
                    >
                      Create Course Code
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
