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
      <div className="bg-white p-10 rounded-xl shadow-xl w-[600px]">

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
          <div className="space-y-3">

            <p>
              <strong>Name:</strong> {data.FirstName} {data.LastName}
            </p>

            <p>
              <strong>Email:</strong> {data.Email}
            </p>

            <p>
              <strong>Course:</strong> {data.CourseName}
            </p>

            <p>
              <strong>Progress:</strong> {data.Progress}%
            </p>

            <p>
              <strong>Start Date:</strong>{" "}
              {data.StartDate
                ? new Date(data.StartDate).toLocaleString()
                : "—"}
            </p>

            <p>
              <strong>End Date:</strong>{" "}
              {data.EndDate
                ? new Date(data.EndDate).toLocaleString()
                : "—"}
            </p>

            <div>
              <strong>Test Scores:</strong>
              <ul className="list-disc ml-6">
                <li>Test 1: {data.Test1 ?? "—"}</li>
                <li>Test 2: {data.Test2 ?? "—"}</li>
                <li>Test 3: {data.Test3 ?? "—"}</li>
                <li>Test 4: {data.Test4 ?? "—"}</li>
                <li>Test 5: {data.Test5 ?? "—"}</li>
                <li>Test 6: {data.Test6 ?? "—"}</li>
                <li>Test 7: {data.Test7 ?? "—"}</li>
                <li>Test 8: {data.Test8 ?? "—"}</li>
              </ul>
            </div>

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
