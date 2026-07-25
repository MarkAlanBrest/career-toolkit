"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CourseCodePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!code.trim()) {
      setError("Please enter a course code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/enroll?code=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        setError("Invalid course code.");
        setLoading(false);
        return;
      }

      if (data.claimed) {
        router.push(
          `/training/${data.course.slug}?code=${encodeURIComponent(code)}`,
        );
      } else {
        router.push(`/enroll?code=${encodeURIComponent(code)}`);
      }
    } catch {
      setError("Server error.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 text-white">

      {/* ===== TOP BAR ===== */}
      <header className="bg-slate-950/70 border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-8 py-5 flex justify-between items-center">

          <div>
            <h1 className="text-xl font-bold">Career Safety Training</h1>
            <p className="text-sm text-slate-300">
              Professional training for a safer, stronger workforce
            </p>
          </div>

          {/* 🔑 LOGIN BOX — TOP RIGHT */}
          <form onSubmit={handleSubmit} className="flex items-center gap-3">

            <input
              type="text"
              placeholder="Enter Course Code"
              className="px-4 py-2 rounded bg-white text-slate-900 uppercase tracking-wider"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded font-semibold disabled:opacity-50"
            >
              {loading ? "Checking…" : "Enter"}
            </button>

          </form>

        </div>
      </header>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="text-center text-red-400 mt-4">
          {error}
        </div>
      )}

      {/* ===== HERO SECTION ===== */}
      <section className="max-w-6xl mx-auto px-8 py-16 grid md:grid-cols-2 gap-12 items-center">

        <div>
          <h2 className="text-4xl font-bold mb-6">
            Industry-Ready Safety Training
          </h2>

          <p className="text-lg text-slate-200 mb-6 leading-relaxed">
            Build practical workplace skills through interactive courses,
            knowledge checks, final assessments, and completion certificates.
          </p>

          <ul className="space-y-3 text-slate-200">
            <li>✔ Practical, job-focused safety lessons</li>
            <li>✔ Knowledge checks with instant feedback</li>
            <li>✔ Progress saved automatically</li>
            <li>✔ Final assessments and completion certificates</li>
            <li>✔ Resume-building workplace credentials</li>
          </ul>
          <Link
            href="/lesson/blueprint-reading"
            className="mt-8 inline-flex rounded-xl bg-amber-400 px-6 py-3 font-bold text-slate-950 hover:bg-amber-300"
          >
            View an example lesson
          </Link>
        </div>

        <div className="bg-slate-800 rounded-2xl p-8 border border-slate-600 shadow-2xl">
          <h3 className="text-2xl font-bold mb-4">Why Safety Training Matters</h3>

          <p className="text-slate-200 leading-relaxed mb-4">
            Employers value workers who recognize hazards, follow procedures,
            and contribute to a strong safety culture from day one.
          </p>

          <p className="text-slate-200 leading-relaxed">
            Enter the course code provided by your instructor to begin or
            resume training from your last completed lesson.
          </p>
        </div>

      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className="bg-slate-800/60 border-y border-slate-700 py-14">

        <div className="max-w-6xl mx-auto px-8 grid md:grid-cols-3 gap-8 text-center">

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
            <h4 className="text-xl font-semibold mb-3">Interactive Learning</h4>
            <p className="text-slate-300">
              Learn through focused lessons, scenarios, and interactive activities.
            </p>
          </div>

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
            <h4 className="text-xl font-semibold mb-3">Knowledge Checks</h4>
            <p className="text-slate-300">
              Get instant feedback and see how well you understand key concepts.
            </p>
          </div>

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
            <h4 className="text-xl font-semibold mb-3">Completion Certificate</h4>
            <p className="text-slate-300">
              Pass the final assessment and print your training certificate.
            </p>
          </div>

        </div>

      </section>

      {/* ===== FOOTER ===== */}
      <footer className="text-center py-8 text-slate-400 text-sm space-y-2">

        <div>Professional Safety Training Platform</div>

        {/* 🔒 SMALL ADMIN LINK */}
        <div>
          <a
            href="/admin/login"
            className="text-slate-500 hover:text-slate-400 text-xs"
          >
            Training Administrator
          </a>
        </div>

      </footer>

    </main>
  );
}
