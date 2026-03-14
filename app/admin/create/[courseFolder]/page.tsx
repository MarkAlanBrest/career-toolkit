"use client";

import { useState, useEffect } from "react";

type Props = {
  params: { courseFolder: string };
};

export default function CreateCourseCodePage({ params }: Props) {
  const [course, setCourse] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/get-course?folder=" + params.courseFolder, {
        cache: "no-store",
      });
      const data = await res.json();
      setCourse(data.course);
    }
    load();
  }, [params.courseFolder]);

  const [step, setStep] = useState("form");
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");

if (!course) {
  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-4">Loading…</h1>
    </main>
  );
}

  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    const firstName = formData.get("firstName");
    const lastName = formData.get("lastName");
    const email = formData.get("email");

    const res = await fetch("/api/create-course-code", {
      method: "POST",
      body: JSON.stringify({
        courseFolder: course.folder,
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
    <main className="max-w-xl mx-auto px-4 py-8">
      {step === "form" && (
        <>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            Create Course Code – {course.courseName}
          </h1>

          <p className="text-sm text-slate-500 mb-6">
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
                className="w-full border rounded px-3 py-2"
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
                className="w-full border rounded px-3 py-2"
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
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
            >
              {loading ? "Saving..." : "Create Course Code"}
            </button>
          </form>
        </>
      )}

      {step === "confirm" && (
        <>
          <h1 className="text-2xl font-semibold text-slate-900 mb-4">
            Course Created
          </h1>

          <p className="text-sm mb-3">
            <strong>Course Code:</strong> {generatedCode}
          </p>

          <p className="text-sm text-green-700 mb-6">
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
