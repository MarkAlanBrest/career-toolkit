"use client";

import { useEffect, useMemo, useState } from "react";

type Student = {
  ID: number;
  FirstName: string;
  LastName: string;
  Email: string;
  Code: string;
  CourseName?: string;
  StartDate?: string;
  EndDate?: string;
  Test1: number;
  Test2: number;
  Test3: number;
  Test4: number;
  Test5: number;
  Test6: number;
  Test7: number;
  Test8: number;
  Progress?: number;
  SlidesPath?: string;
};

const testFields = [
  "Test1",
  "Test2",
  "Test3",
  "Test4",
  "Test5",
  "Test6",
  "Test7",
  "Test8",
] as const;

type TestField = (typeof testFields)[number];

export default function RosterPage() {
  const course =
    typeof window !== "undefined"
      ? window.location.pathname.split("/").pop()
      : "";
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editedRows, setEditedRows] = useState<
    Record<number, Partial<Student>>
  >({});
  const [activeCell, setActiveCell] = useState<{
    id: number;
    field: keyof Student;
  } | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/get-roster?course=" + course, {
          cache: "no-store",
        });

        if (!res.ok) {
          console.error("API error:", await res.text());
          return;
        }

        const data = await res.json();
        setStudents(data.students || []);
      } catch (err) {
        console.error("Fetch error:", err);
      }

      setLoading(false);
    }

    if (course) load();
  }, [course]);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;
    return students.filter((s) => {
      const first = s.FirstName?.toLowerCase() || "";
      const last = s.LastName?.toLowerCase() || "";
      const email = s.Email?.toLowerCase() || "";
      return (
        first.includes(term) || last.includes(term) || email.includes(term)
      );
    });
  }, [students, search]);

  function handleCellClick(id: number, field: keyof Student) {
    // lock ID and CourseName (not editable anyway, but just in case)
    if (field === "ID" || field === "CourseName") return;
    setActiveCell({ id, field });
  }

  function handleCellChange(
    id: number,
    field: keyof Student,
    value: string
  ): void {
    setEditedRows((prev) => {
      const current = prev[id] || {};
      let castValue: any = value;

      if (testFields.includes(field as TestField)) {
        const num = Number(value);
        castValue = Number.isNaN(num) ? 0 : num;
      }

      return {
        ...prev,
        [id]: {
          ...current,
          [field]: castValue,
        },
      };
    });
  }

  async function handleSaveRow(id: number) {
    const updates = editedRows[id];
    if (!updates || Object.keys(updates).length === 0) return;

    try {
      setSavingId(id);
      const res = await fetch("/api/update-student", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, updates }),
      });

      if (!res.ok) {
        console.error("Update error:", await res.text());
        return;
      }

      setStudents((prev) =>
        prev.map((s) =>
          s.ID === id
            ? {
                ...s,
                ...updates,
              }
            : s
        )
      );
      setEditedRows((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      setActiveCell(null);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSavingId(null);
    }
  }

  async function handleDeleteRow(id: number) {
    const student = students.find((s) => s.ID === id);
    if (!student) return;

    const ok = window.confirm(
      `Are you sure you want to delete ${student.FirstName} ${student.LastName}? This cannot be undone.`
    );
    if (!ok) return;

    try {
      setDeletingId(id);
      const res = await fetch(`/api/delete-student?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        console.error("Delete error:", await res.text());
        return;
      }

      setStudents((prev) => prev.filter((s) => s.ID !== id));
      setEditedRows((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (activeCell?.id === id) setActiveCell(null);
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeletingId(null);
    }
  }

  function exportCSV() {
    if (!filteredStudents.length) return;

    const headers = [
      "FirstName",
      "LastName",
      "Email",
      "Code",
      ...testFields,
    ];

    const rows = filteredStudents.map((s) =>
      [
        s.FirstName,
        s.LastName,
        s.Email,
        s.Code,
        ...testFields.map((f) => (s as any)[f]),
      ].join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roster-${course || "course"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-sky-800 flex items-center justify-center px-4">
        <div className="text-white text-lg">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-sky-800 p-10 text-white">
      <h1 className="text-3xl font-bold mb-6">Roster for {course}</h1>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by first, last, or email…"
          className="w-full sm:w-80 rounded-md px-3 py-2 text-sm text-slate-900 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <button
          onClick={exportCSV}
          className="mt-2 sm:mt-0 inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          Export CSV
        </button>
      </div>

      <div className="bg-white text-slate-900 rounded-xl p-6 shadow-xl overflow-x-auto">
        <table className="min-w-full border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-3 py-2 w-20">Actions</th>
              <th className="border px-3 py-2">First</th>
              <th className="border px-3 py-2">Last</th>
              <th className="border px-3 py-2">Email</th>
              <th className="border px-3 py-2">Access Code</th>
              {testFields.map((t) => (
                <th key={t} className="border px-3 py-2 text-center">
                  {t}
                </th>
              ))}
              <th className="border px-3 py-2 w-24 text-center">Save</th>
            </tr>
          </thead>

          <tbody>
            {filteredStudents.map((s) => {
              const rowEdits = editedRows[s.ID] || {};
              const hasEdits = Object.keys(rowEdits).length > 0;

              return (
                <tr key={s.ID}>
                  {/* Delete button (left) */}
                  <td className="border px-3 py-2 text-center">
                    <button
                      onClick={() => handleDeleteRow(s.ID)}
                      disabled={deletingId === s.ID}
                      className="text-xs rounded-md bg-red-600 px-2 py-1 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {deletingId === s.ID ? "…" : "Delete"}
                    </button>
                  </td>

                  {/* FirstName */}
                  <EditableCell
                    student={s}
                    field="FirstName"
                    activeCell={activeCell}
                    rowEdits={rowEdits}
                    onClick={handleCellClick}
                    onChange={handleCellChange}
                  />

                  {/* LastName */}
                  <EditableCell
                    student={s}
                    field="LastName"
                    activeCell={activeCell}
                    rowEdits={rowEdits}
                    onClick={handleCellClick}
                    onChange={handleCellChange}
                  />

                  {/* Email */}
                  <EditableCell
                    student={s}
                    field="Email"
                    activeCell={activeCell}
                    rowEdits={rowEdits}
                    onClick={handleCellClick}
                    onChange={handleCellChange}
                  />

                  {/* Code */}
                  <EditableCell
                    student={s}
                    field="Code"
                    activeCell={activeCell}
                    rowEdits={rowEdits}
                    onClick={handleCellClick}
                    onChange={handleCellChange}
                  />

                  {/* Tests */}
                  {testFields.map((field) => (
                    <EditableCell
                      key={field}
                      student={s}
                      field={field}
                      activeCell={activeCell}
                      rowEdits={rowEdits}
                      onClick={handleCellClick}
                      onChange={handleCellChange}
                      isTest
                    />
                  ))}

                  {/* Save button (right) */}
                  <td className="border px-3 py-2 text-center">
                    <button
                      onClick={() => handleSaveRow(s.ID)}
                      disabled={!hasEdits || savingId === s.ID}
                      className="text-xs rounded-md bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {savingId === s.ID ? "Saving…" : "Save"}
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredStudents.length === 0 && (
              <tr>
                <td
                  colSpan={5 + testFields.length + 2}
                  className="border px-3 py-4 text-center text-slate-500"
                >
                  No students match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

type EditableCellProps = {
  student: Student;
  field: keyof Student;
  activeCell: { id: number; field: keyof Student } | null;
  rowEdits: Partial<Student>;
  onClick: (id: number, field: keyof Student) => void;
  onChange: (id: number, field: keyof Student, value: string) => void;
  isTest?: boolean;
};

function EditableCell({
  student,
  field,
  activeCell,
  rowEdits,
  onClick,
  onChange,
  isTest,
}: EditableCellProps) {
  const id = student.ID;
  
const isActive =
  activeCell !== null &&
  activeCell.id === id &&
  activeCell.field === field;

  const rawValue =
  rowEdits && rowEdits[field] !== undefined
    ? rowEdits[field]
    : (student as any)[field];


  const displayValue =
    rawValue === null || rawValue === undefined ? "" : String(rawValue);

  const isZeroTest = isTest && Number(displayValue) === 0 && !isActive;

  if (isActive) {
    return (
      <td className="border px-3 py-2">
        <input
          autoFocus
          type={isTest ? "number" : "text"}
          value={displayValue}
          onChange={(e) => onChange(id, field, e.target.value)}
          onBlur={() => {
            // keep edits but exit active state
          }}
          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </td>
    );
  }

  return (
    <td
      className={`border px-3 py-2 ${
        isTest ? "text-center" : ""
      } ${isZeroTest ? "bg-gray-200 text-gray-600" : ""}`}
      onClick={() => onClick(id, field)}
    >
      {isTest ? displayValue || "0" : displayValue}
    </td>
  );
}
