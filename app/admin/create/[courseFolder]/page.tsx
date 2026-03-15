"use client";

import { useState, useEffect } from "react";

export default function CreateCourseCodePage() {
  // Get folder name from URL
const courseFolder = window?.location?.pathname?.split("/")?.pop() || "";

  
  console.log("FOLDER:", courseFolder);

  const [course, setCourse] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          "/api/get-course?folder=" + courseFolder,
          { cache: "no-store" }
        );

        if (!res.ok) return;

        const data = await res.json();

        setCourse({
          ...data.course,
          folder: courseFolder,
        });
      } catch (err) {
        console.error("Fetch error:", err);
      }
    }

    load();
  }, [courseFolder]);

  const [step, setStep] = useState("form");
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");

  if (!course) {
    return (
      <main className="min-h-screen bg-sky-800 flex items-center justify-center px-4">
        <div className="text-white text-lg">Loading…</div>
      </main>
    );
  }


  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const firstName = String(formData.get("firstName"));
    const lastName = String(formData.get("lastName"));
    const email = String(formData.get("email"));

    const res = await fetch("/api/create-course-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseFolder: courseFolder,
        firstName,
        lastName,
        email,
      }),
    });

    const data = await res.json();

    setGeneratedCode(data.courseCode);
    setLoading(false);
    setStep("confirm");
  }

  return (
    <main className="min-h-screen bg-sky-800 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl p-10">

        {step === "form" && (
          <>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Create Course Code
            </h1>

            <p className="text-sm text-slate-600 mb-6">
              Course: <strong>{course.courseName}</strong>
              <br />
              Folder: <code>{course.folder}</code>
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  className="w-full rounded-md px-3 py-2 bg-slate-100 text-slate-900 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  className="w-full rounded-md px-3 py-2 bg-slate-100 text-slate-900 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  className="w-full rounded-md px-3 py-2 bg-slate-100 text-slate-900 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? "Saving..." : "Create Course Code"}
              </button>

              <a
                href="/admin/dashboard"
                className="block w-full text-center bg-slate-200 text-slate-800 py-2 rounded-md font-medium hover:bg-slate-300 transition"
              >
                Cancel
              </a>
            </form>
          </>
        )}

        {step === "confirm" && (
          <>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">
              Course Code Created
            </h1>

            <p className="text-lg font-semibold text-blue-600 mb-2">
              {generatedCode}
            </p>

            <p className="text-sm text-green-600 mb-6">
              An email with the course code was sent to the student.
            </p>

            <a
              href="/admin/dashboard"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition"
            >
              Back to Dashboard
            </a>
          </>
        )}

      </div>
    </main>
  );
}
