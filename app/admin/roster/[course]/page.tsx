"use client";

import { useEffect, useState } from "react";

export default function RosterPage() {
  const course = window.location.pathname.split("/").pop();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/get-roster?course=" + course, {
        cache: "no-store",
      });
      const data = await res.json();
      setStudents(data.students);
      setLoading(false);
    }
    load();
  }, [course]);

  if (loading) return <div>Loading…</div>;

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Roster for {course}</h1>

      <table className="min-w-full border border-gray-300">
        <thead>
          <tr>
            <th className="border px-2 py-1">Name</th>
            <th className="border px-2 py-1">Email</th>
            <th className="border px-2 py-1">Progress</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td className="border px-2 py-1">
                {s.FirstName} {s.LastName}
              </td>
              <td className="border px-2 py-1">{s.Email}</td>
              <td className="border px-2 py-1">{s.Progress}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
