"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function DashboardContent() {
  const params = useSearchParams();
  const code = params.get("code") || "";

  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!code) return;

    fetch(`/api/course?code=${code}`)
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ error: "Failed to load data" }));
  }, [code]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-300">
      <div className="bg-white p-10 rounded-xl shadow-xl w-[520px]">

        <h1 className="text-2xl font-bold text-center mb-6 text-blue-900">
          Course Information
        </h1>

        {!code && (
          <p className="text-center text-red-600">
            No course code provided
          </p>
        )}

        {code && !data && (
          <p className="text-center">Loading data…</p>
        )}

        {data?.error && (
          <p className="text-center text-red-600">{data.error}</p>
        )}

        {data && !data.error && (
          <div className="space-y-4">
            <p><strong>Name:</strong> {data.FirstName} {data.LastName}</p>
            <p><strong>Email:</strong> {data.Email}</p>
            <p><strong>Course ID:</strong> {data.CourseID}</p>
            <p><strong>Progress:</strong> {data.Progress}%</p>

            <button className="mt-6 w-full bg-blue-900 text-white p-3 rounded-lg hover:bg-blue-800">
              Start Course
            </button>
          </div>
        )}

      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
