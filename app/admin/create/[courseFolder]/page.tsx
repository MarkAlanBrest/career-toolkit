"use client";

import { useState, useEffect } from "react";

export default function CreateCourseCodePage() {
  // Get folder name from URL
  const courseFolder = window.location.pathname.split("/").pop();
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
      <main className="max-w-xl mx-auto px-4 py-8 text-white bg-slate-900 min-h-screen">
        <h1 className="text-xl font-semibold mb-4">Loading…</h1>
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
    <main className="max-w-xl mx-auto px-4 py-8 text-white bg-slate-900 min-h-screen">
      {step === "form" && (
        <>
          <h1 className="text-2xl font-semibold mb-2">
            Create Course Code – {course.courseName}
          </h1>

          <p className="text-sm mb-6">
            Folder: <code>{course.folder}</code>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                className="w-full border rounded px-3 py-2 text-black"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                className="w-full border rounded px-3 py-2 text-black"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                className="w-full border rounded px-3 py-2 text-black"
                required
              />
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
              >
                {loading ? "Saving..." : "Create Course Code"}
              </button>

              <a
                href="/admin/dashboard"
                className="block w-full text-center bg-slate-700 text-white py-2 rounded-md hover:bg-slate-600"
              >
                Cancel
              </a>
            </div>
          </form>
        </>
      )}

      {step === "confirm" && (
        <>
          <h1 className="text-2xl font-semibold mb-4">Course Created</h1>

          <p className="text-sm mb-3">
            <strong>Course Code:</strong> {generatedCode}
          </p>

          <p className="text-sm text-green-400 mb-6">
            An email with the course code was sent to the student.
          </p>

          <a
            href="/admin/dashboard"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </a>
        </>
      )}
    </main>
  );
}
