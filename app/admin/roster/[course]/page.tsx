"use client";

import { useEffect, useState } from "react";

export default function RosterPage() {
  const course = window.location.pathname.split("/").pop();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/get-roster?course=" + course, {
          cache: "no-store",
        });

        if (!res.ok) {
          console.error("API error:", await res.text());
          return;
        }

        const data = await res.json();
        setStudents(data.students || []);
      } catch (err) {
        console.error("Fetch error:", err);
      }

      setLoading(false);
    }

    load();
  }, [course]);

  if (loading) {
    return (
      <main className="min-h-screen bg-sky-800 flex items-center justify-center px-4">
        <div className="text-white text-lg">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-sky-800 p-10 text-white">
      <h1 className="text-3xl font-bold mb-6">Roster for {course}</h1>

      <div className="bg-white text-slate-900 rounded-xl p-6 shadow-xl">
        <table className="min-w-full border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-3 py-2">Name</th>
              <th className="border px-3 py-2">Email</th>
              <th className="border px-3 py-2">Progress</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.ID}>
                <td className="border px-3 py-2">
                  {s.FirstName} {s.LastName}
                </td>
                <td className="border px-3 py-2">{s.Email}</td>
                <td className="border px-3 py-2">{s.Progress}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
