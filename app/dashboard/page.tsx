"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function Content() {
  const router = useRouter();

  const params = useSearchParams();
  const code = params?.get("code") ?? "";

  const [d, setD] = useState<any>(null);

  useEffect(() => {
    if (!code) return;

    fetch(`/api/course?code=${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((data) => {
        // 🔵 EXPIRATION CHECK
        if (data?.EndDate) {
          const now = new Date();
          const end = new Date(data.EndDate);

          if (now > end) {
            alert("This course has expired.");
            setD(null);
            return;
          }
        }

        setD(data);
      });
  }, [code]);

  if (!code) return <div className="p-10">No course code.</div>;
  if (!d) return <div className="p-10">Loading…</div>;
  if (d.error) return <div className="p-10 text-red-600">{d.error}</div>;

const currentSlide = d.Progress ?? 0;
  const totalSlides = d.TotalSlides || "—";

  // 🔵 FORMAT DATES
  const startDate = d.StartDate ? new Date(d.StartDate).toLocaleDateString() : "Not started";
  const endDate = d.EndDate ? new Date(d.EndDate).toLocaleDateString() : "—";

  return (
    <main className="min-h-screen bg-slate-300 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-xl w-[600px] space-y-6">

        <h1 className="text-2xl font-bold text-blue-900 text-center">
          Course Dashboard
        </h1>

        <div className="space-y-2">
          <p><b>Name:</b> {d.FirstName} {d.LastName}</p>
          <p><b>Email:</b> {d.Email}</p>
          <p><b>Course:</b> {d.CourseName}</p>
          <p><b>Progress:</b> Slide {currentSlide} of {totalSlides}</p>

          {/* 🔵 NEW DATE FIELDS */}
          <p><b>Start Date:</b> {startDate}</p>
          <p><b>Available Until:</b> {endDate}</p>
        </div>

        <div className="bg-slate-100 border rounded-lg p-4 space-y-2 text-sm">
          <p><b>Instructions:</b></p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Review all slides carefully.</li>
            <li>You must pass the final test with 80% or higher to receive a certificate.</li>
            <li>Your progress is saved automatically.</li>
            <li>You may leave and return later using the same course code.</li>
            <li>Use the navigation buttons to move between slides.</li>
          </ul>
        </div>

        <button
          onClick={() => router.push(`/course?code=${encodeURIComponent(code)}`)}
          className="w-full bg-blue-900 text-white p-3 rounded-lg hover:bg-blue-800"
        >
          Start / Resume Course
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
