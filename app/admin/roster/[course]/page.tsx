"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

// ----------------------
// TYPES
// ----------------------
type CourseItem = {
  FolderName: string;
  CourseName: string;
};

type StudentItem = {
  ID: number;
  FirstName: string;
  LastName: string;
  Email: string;
  Code: string;
  Progress: number;
  Completed?: boolean;
  Test1?: number;
  Test2?: number;
  Test3?: number;
  Test4?: number;
  Test5?: number;
  Test6?: number;
  Test7?: number;
  Test8?: number;
};

// ----------------------
// PAGE COMPONENT
// ----------------------
export default function RosterPage() {
  const router = useRouter();
  const params = useParams();
  const courseParam = params?.course as string;

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "current" | "completed">("all");

  // Load list of all courses for dropdown
  useEffect(() => {
    async function loadCourses() {
      const res = await fetch("/api/courses");
      const data = await res.json();
      setCourses(data);
    }
    loadCourses();
  }, []);

  // Load roster for selected course
  useEffect(() => {
    if (!courseParam) return;

    async function loadRoster() {
      setLoading(true);
const res = await fetch(`/api/getRoster?course=${courseParam}`);
      const data = await res.json();
      setStudents(data);
      setLoading(false);
    }

    loadRoster();
  }, [courseParam]);

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCourse = e.target.value;
    router.push(`/admin/roster/${newCourse}`);
  };

  const handleFieldChange = (
    id: number,
    field: keyof StudentItem,
    value: string
  ) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.ID !== id) return s;
        // numeric fields
        const numericFields: (keyof StudentItem)[] = [
          "Progress",
          "Test1",
          "Test2",
          "Test3",
          "Test4",
          "Test5",
          "Test6",
          "Test7",
          "Test8",
        ];
        if (numericFields.includes(field)) {
          return { ...s, [field]: value === "" ? undefined : Number(value) };
        }
        return { ...s, [field]: value };
      })
    );
  };

  const handleSave = async (student: StudentItem) => {
    await fetch("/api/update-student", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(student),
    });
    // you could add a toast or visual confirmation here later
  };

  const handleDelete = async (id: number) => {
    const ok = window.confirm(
      "Are you sure you want to delete this student record? This cannot be undone."
    );
    if (!ok) return;

    await fetch(`/api/delete-student?id=${id}`, {
      method: "DELETE",
    });

    setStudents((prev) => prev.filter((s) => s.ID !== id));
  };

  // Derived filtered list
  const filteredStudents = students.filter((s) => {
    const term = search.toLowerCase().trim();
    const matchesSearch =
      term === "" ||
      s.FirstName.toLowerCase().includes(term) ||
      s.LastName.toLowerCase().includes(term) ||
      s.Email.toLowerCase().includes(term);

    let matchesStatus = true;
    if (statusFilter === "completed") {
      matchesStatus = !!s.Completed;
    } else if (statusFilter === "current") {
      matchesStatus = !s.Completed;
    }

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <main className="p-10 text-white">
        Loading roster...
      </main>
    );
  }

  return (
    <main className="p-10 text-white">
      <h1 className="text-3xl font-bold mb-6">Class Roster</h1>

      {/* Top Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Course Dropdown */}
        <div>
          <label className="mr-3 text-lg">Select Course:</label>
          <select
            value={courseParam}
            onChange={handleCourseChange}
            className="text-black p-2 rounded"
          >
            {courses.map((c) => (
              <option key={c.FolderName} value={c.FolderName}>
                {c.CourseName}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-black p-2 rounded min-w-[250px]"
          />
        </div>

        {/* Status Filters */}
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded border ${
              statusFilter === "all" ? "bg-slate-300 text-black" : "border-slate-500"
            }`}
            onClick={() => setStatusFilter("all")}
          >
            All
          </button>
          <button
            className={`px-3 py-1 rounded border ${
              statusFilter === "current" ? "bg-slate-300 text-black" : "border-slate-500"
            }`}
            onClick={() => setStatusFilter("current")}
          >
            Current
          </button>
          <button
            className={`px-3 py-1 rounded border ${
              statusFilter === "completed" ? "bg-slate-300 text-black" : "border-slate-500"
            }`}
            onClick={() => setStatusFilter("completed")}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-800">
              <th className="px-3 py-2 text-left">First</th>
              <th className="px-3 py-2 text-left">Last</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Progress</th>
              <th className="px-3 py-2 text-left">Test1</th>
              <th className="px-3 py-2 text-left">Test2</th>
              <th className="px-3 py-2 text-left">Test3</th>
              <th className="px-3 py-2 text-left">Test4</th>
              <th className="px-3 py-2 text-left">Test5</th>
              <th className="px-3 py-2 text-left">Test6</th>
              <th className="px-3 py-2 text-left">Test7</th>
              <th className="px-3 py-2 text-left">Test8</th>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((s) => (
              <tr key={s.ID} className="border-b border-slate-700">
                <td className="px-3 py-2">
                  <input
                    className="w-full text-black px-1 rounded"
                    value={s.FirstName}
                    onChange={(e) =>
                      handleFieldChange(s.ID, "FirstName", e.target.value)
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="w-full text-black px-1 rounded"
                    value={s.LastName}
                    onChange={(e) =>
                      handleFieldChange(s.ID, "LastName", e.target.value)
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="w-full text-black px-1 rounded"
                    value={s.Email}
                    onChange={(e) =>
                      handleFieldChange(s.ID, "Email", e.target.value)
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="w-20 text-black px-1 rounded"
                    value={s.Progress ?? ""}
                    onChange={(e) =>
                      handleFieldChange(s.ID, "Progress", e.target.value)
                    }
                  />
                </td>
                {(["Test1","Test2","Test3","Test4","Test5","Test6","Test7","Test8"] as const).map((field) => (
                  <td key={field} className="px-3 py-2">
                    <input
                      className="w-16 text-black px-1 rounded"
                      value={s[field] ?? ""}
                      onChange={(e) =>
                        handleFieldChange(s.ID, field, e.target.value)
                      }
                    />
                  </td>
                ))}
                <td className="px-3 py-2">
                  {/* Code is NOT editable */}
                  <span className="text-slate-300">{s.Code}</span>
                </td>
                <td className="px-3 py-2 space-x-2">
                  <button
                    className="px-2 py-1 bg-green-600 rounded text-xs"
                    onClick={() => handleSave(s)}
                  >
                    Save
                  </button>
                  <button
                    className="px-2 py-1 bg-red-700 rounded text-xs"
                    onClick={() => handleDelete(s.ID)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {filteredStudents.length === 0 && (
              <tr>
                <td
                  colSpan={14}
                  className="px-3 py-4 text-center text-slate-400"
                >
                  No students match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      <div className="mt-4 text-sm text-slate-300">
        Showing {filteredStudents.length} of {students.length} students
      </div>
    </main>
  );
}
