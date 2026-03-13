const courses = [
  {
    id: 1,
    title: "Ladder Safety",
    status: "Active",
    students: 32,
    slides: 14,
  },
  {
    id: 2,
    title: "Electrical Basics",
    status: "Draft",
    students: 18,
    slides: 10,
  },
  {
    id: 3,
    title: "PPE Training",
    status: "Active",
    students: 24,
    slides: 8,
  },
];

export default function CoursesPage() {
  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-blue-950">Courses</h1>
          <p className="mt-2 text-slate-600">Manage all courses on your site.</p>
        </div>

        <a
          href="/admin/create-course"
          className="rounded-xl bg-blue-950 px-4 py-3 text-sm font-semibold text-white"
        >
          Create Course
        </a>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Students</th>
              <th className="px-4 py-3">Slides</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id} className="border-t border-slate-200">
                <td className="px-4 py-3 font-medium text-slate-800">{course.title}</td>
                <td className="px-4 py-3">{course.status}</td>
                <td className="px-4 py-3">{course.students}</td>
                <td className="px-4 py-3">{course.slides}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button className="rounded-lg bg-slate-200 px-3 py-2">Edit</button>
                    <button className="rounded-lg bg-red-100 px-3 py-2 text-red-700">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
