const students = [
  {
    id: 1,
    name: "John Smith",
    email: "john@example.com",
    phone: "555-123-4567",
    progress: "80%",
  },
  {
    id: 2,
    name: "Mary Jones",
    email: "mary@example.com",
    phone: "555-222-7890",
    progress: "100%",
  },
  {
    id: 3,
    name: "David Clark",
    email: "david@example.com",
    phone: "555-777-1111",
    progress: "40%",
  },
];

export default function StudentsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-blue-950">Students</h1>
      <p className="mt-2 text-slate-600">View student information and progress.</p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Progress</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-t border-slate-200">
                <td className="px-4 py-3">{student.name}</td>
                <td className="px-4 py-3">{student.email}</td>
                <td className="px-4 py-3">{student.phone}</td>
                <td className="px-4 py-3">{student.progress}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
