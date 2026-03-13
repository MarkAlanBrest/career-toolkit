export default function AdminDashboardPage() {
  const stats = [
    { label: "Total Students", value: "128" },
    { label: "Total Courses", value: "12" },
    { label: "Completed Courses", value: "84" },
    { label: "In Progress", value: "44" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-blue-950">Dashboard</h1>
      <p className="mt-2 text-slate-600">
        Overview of your training platform.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-blue-950">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-5">
          <h2 className="text-xl font-semibold text-blue-950">Quick Actions</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="/admin/create-course"
              className="rounded-xl bg-blue-950 px-4 py-3 text-sm font-medium text-white"
            >
              Create Course
            </a>
            <a
              href="/admin/courses"
              className="rounded-xl bg-slate-200 px-4 py-3 text-sm font-medium text-slate-800"
            >
              View Courses
            </a>
            <a
              href="/admin/reports"
              className="rounded-xl bg-slate-200 px-4 py-3 text-sm font-medium text-slate-800"
            >
              Open Reports
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <h2 className="text-xl font-semibold text-blue-950">Recent Activity</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li>John Smith completed Ladder Safety</li>
            <li>Mary Jones started Electrical Basics</li>
            <li>New course draft created: OSHA Basics</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
