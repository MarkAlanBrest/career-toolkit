const reportRows = [
  {
    student: "John Smith",
    course: "Ladder Safety",
    progress: "100%",
    completed: "Yes",
  },
  {
    student: "Mary Jones",
    course: "Electrical Basics",
    progress: "70%",
    completed: "No",
  },
  {
    student: "David Clark",
    course: "PPE Training",
    progress: "100%",
    completed: "Yes",
  },
];

export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-blue-950">Reports</h1>
      <p className="mt-2 text-slate-600">
        Track course completion and student progress.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <input
          className="rounded-xl border border-slate-300 px-4 py-3"
          placeholder="Search student"
        />
        <select className="rounded-xl border border-slate-300 px-4 py-3">
          <option>All Courses</option>
          <option>Ladder Safety</option>
          <option>Electrical Basics</option>
        </select>
        <select className="rounded-xl border border-slate-300 px-4 py-3">
          <option>All Statuses</option>
          <option>Completed</option>
          <option>In Progress</option>
        </select>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Completed</th>
            </tr>
          </thead>
          <tbody>
            {reportRows.map((row, i) => (
              <tr key={i} className="border-t border-slate-200">
                <td className="px-4 py-3">{row.student}</td>
                <td className="px-4 py-3">{row.course}</td>
                <td className="px-4 py-3">{row.progress}</td>
                <td className="px-4 py-3">{row.completed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
