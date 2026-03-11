"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function DashboardContent() {
  const params = useSearchParams();
  const code = params.get("code") || "";

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-300">
      <div className="bg-white p-10 rounded-xl shadow-xl w-[520px]">

        <h1 className="text-2xl font-bold text-center mb-6 text-blue-900">
          Course Information
        </h1>

        <div className="space-y-5">

          <div>
            <p className="text-sm text-gray-500">Course Code</p>
            <p className="text-lg font-semibold tracking-wider">
              {code || "Not provided"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Student Name</p>
            <p className="font-semibold">Loading…</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-semibold">Loading…</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Course</p>
            <p className="font-semibold">Loading…</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Directions</p>
            <p className="text-gray-700">
              Please review all instructions before starting the training.
            </p>
          </div>

        </div>

        <button
          className="mt-8 w-full bg-blue-900 text-white p-3 rounded-lg hover:bg-blue-800 transition"
        >
          Start Course
        </button>

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
