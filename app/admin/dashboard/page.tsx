"use client";
import { useState } from "react";

export default function CreateCourseCodeModal({ course, onClose }) {
  const [step, setStep] = useState("form"); // form | confirm
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    const firstName = formData.get("firstName");
    const lastName = formData.get("lastName");
    const email = formData.get("email");

    // Call your API route
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        {step === "form" && (
          <>
            <h2 className="text-xl font-semibold mb-4">
              Create Course Code – {course.courseName}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  First Name
                </label>
                <input
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

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded border"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </>
        )}

        {step === "confirm" && (
          <>
            <h2 className="text-xl font-semibold mb-4">Course Created</h2>

            <p className="text-sm mb-3">
              <strong>Course Code:</strong> {generatedCode}
            </p>

            <p className="text-sm text-green-700 mb-6">
              An email with the course code was sent to the student.
            </p>

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
