"use client";

import { useSearchParams } from "next/navigation";

export default function DashboardPage() {
  const params = useSearchParams();
  const code = params.get("code") || "";

  // Temporary course data (replace with DB later)
  const courses: Record<string, any> = {
    OSHA10: {
      studentName: "John Smith",
      email: "john@example.com",
      courseName: "OSHA 10 Safety Training",
      directions:
        "Complete all modules in order. Pass the final assessment with 70% or higher to receive certification.",
    },
    LADDER1: {
      studentName: "Jane Doe",
      email: "jane@example.com",
      courseName: "Ladder Safety Training",
      directions:
        "Review each lesson carefully. You must complete the quiz at the end to proceed.",
    },
  };

  const course = courses[code];

  if (!course) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-300">
        <div className="bg-white p-10 rounded-xl shadow-lg w-96 text-center">
          <h1 className="text-xl font-bold mb-4">Invalid Course Code</h1>
          <p>Please check your code and try again.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-300">
      <div className="bg-white p-10 rounded-xl shadow-lg w-[500px]">

        <h1 className="text-2xl font-bold mb-6 text-center">
          Course Information
        </h1>

        <div className="space-y-4">

          <div>
            <p className="text-sm text-gray-600">Student Name</p>
            <p className="font-semibold">{course.studentName}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-semibold">{course.email}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Course</p>
            <p className="font-semibold">{course.courseName}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Directions</p>
            <p>{course.directions}</p>
          </div>

        </div>

      </div>
    </main>
  );
}

