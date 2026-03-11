"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CourseCodePage() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!code.trim()) {
      setError("Please enter a course code.");
      return;
    }

    // Pass code to dashboard (can validate later with DB)
    router.push(`/dashboard?code=${encodeURIComponent(code)}`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-300">
      <div className="bg-white p-10 rounded-xl shadow-lg w-96">

        <h1 className="text-2xl font-bold mb-6 text-center">
          Enter Course Code
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            type="text"
            placeholder="Course Code"
            className="w-full border p-3 rounded text-center uppercase tracking-wider"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-blue-900 text-white p-3 rounded hover:bg-blue-800"
          >
            Continue
          </button>

        </form>

      </div>
    </main>
  );
}
