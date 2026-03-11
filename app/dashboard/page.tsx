"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function Content() {
  const code = useSearchParams().get("code") || "";
  const [d, setD] = useState<any>(null);

  useEffect(() => {
    if (code)
      fetch(`/api/course?code=${encodeURIComponent(code)}`)
        .then(r => r.json())
        .then(setD);
  }, [code]);

  if (!code) return <div className="p-10">No course code.</div>;
  if (!d) return <div className="p-10">Loading…</div>;
  if (d.error) return <div className="p-10 text-red-600">{d.error}</div>;

  return (
    <main className="min-h-screen bg-slate-300 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-xl w-[520px] space-y-3">

        <h1 className="text-2xl font-bold text-blue-900 text-center mb-4">
          Course Information
        </h1>

        <p><b>Name:</b> {d.FirstName} {d.LastName}</p>
        <p><b>Email:</b> {d.Email}</p>
        <p><b>Course:</b> {d.CourseName}</p>
        <p><b>Progress:</b> {d.Progress}%</p>

        <p>
          <b>Start:</b>{" "}
          {d.StartDate ? new Date(d.StartDate).toLocaleString() : "—"}
        </p>

        <p>
          <b>End:</b>{" "}
          {d.EndDate ? new Date(d.EndDate).toLocaleString() : "—"}
        </p>

        <button className="mt-4 w-full bg-blue-900 text-white p-3 rounded-lg hover:bg-blue-800">
          Start Course
        </button>

      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-10">Loading…</div>}>
      <Content />
    </Suspense>
  );
}
