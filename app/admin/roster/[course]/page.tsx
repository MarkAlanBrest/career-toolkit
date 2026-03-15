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

      <div className="bg-white text-slate-900 rounded-xl p-6 shadow-xl overflow-x-auto">
        <table className="min-w-full border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-3 py-2">First</th>
              <th className="border px-3 py-2">Last</th>
              <th className="border px-3 py-2">Email</th>
              <th className="border px-3 py-2">Access Code</th>
              <th className="border px-3 py-2">Test1</th>
              <th className="border px-3 py-2">Test2</th>
              <th className="border px-3 py-2">Test3</th>
              <th className="border px-3 py-2">Test4</th>
              <th className="border px-3 py-2">Test5</th>
              <th className="border px-3 py-2">Test6</th>
              <th className="border px-3 py-2">Test7</th>
              <th className="border px-3 py-2">Test8</th>
            </tr>
          </thead>

          <tbody>
            {students.map((s) => (
              <tr key={s.ID}>
                <td className="border px-3 py-2">{s.FirstName}</td>
                <td className="border px-3 py-2">{s.LastName}</td>
                <td className="border px-3 py-2">{s.Email}</td>
                <td className="border px-3 py-2">{s.Code}</td>

                {/* Test scores with gray 0 boxes */}
                {[s.Test1, s.Test2, s.Test3, s.Test4, s.Test5, s.Test6, s.Test7, s.Test8].map(
                  (score, i) => (
                    <td
                      key={i}
                      className={`border px-3 py-2 text-center ${
                        score === 0 ? "bg-gray-200 text-gray-600" : ""
                      }`}
                    >
                      {score}
                    </td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
