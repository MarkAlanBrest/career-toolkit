import { getAllCourses } from "@/lib/courses";

type Props = {
  params: { courseFolder: string };
};

export default function CreateCourseCodePage({ params }: Props) {
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
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">
        Create Course Code – {course.courseName}
      </h1>

      <p className="text-sm text-slate-500 mb-6">
        Folder: <code>{course.folder}</code>
      </p>

      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            First Name
          </label>
          <input
            type="text"
            name="firstName"
            className="w-full border border-slate-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Last Name
          </label>
          <input
            type="text"
            name="lastName"
            className="w-full border border-slate-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            className="w-full border border-slate-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
        >
          Create Course Code
        </button>
      </form>
    </main>
  );
}
