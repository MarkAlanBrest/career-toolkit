"use client";

import { useEffect, useMemo, useState } from "react";

type Student = {
  id: number;
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

  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // NEW: modal edit state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState<Partial<Student>>({});

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

  function exportCSV() {
    if (!filteredStudents.length) return;

    const headers = ["FirstName", "LastName", "Email", "Code", ...testFields];

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

  // --- Edit modal helpers ---

  function openEdit(student: Student) {
    setEditingStudent(student);
    setEditForm({ ...student });
  }

  function closeEdit() {
    setEditingStudent(null);
    setEditForm({});
  }

  async function handleSaveEdit() {
    if (!editingStudent) return;

    const id = editingStudent.id;



    try {
      setSavingId(id);
      const res = await fetch("/api/update-student", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, updates: editForm }),
      });

      if (!res.ok) {
        console.error("Update error:", await res.text());
        return;
      }

      setStudents((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...editForm } : s ))



      );
      closeEdit();
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSavingId(null);
    }
  }

  async function handleDeleteRow(id: number) {
    const student = students.find((s) => s.id === id);     
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

      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeletingId(null);
    }
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
              <th className="border px-3 py-2 w-24">Actions</th>
              <th className="border px-3 py-2">First</th>
              <th className="border px-3 py-2">Last</th>
              <th className="border px-3 py-2">Email</th>
              <th className="border px-3 py-2">Access Code</th>
              {testFields.map((t) => (
                <th key={t} className="border px-3 py-2 text-center">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((s) => (
              <tr key={s.id}>
                <td className="border px-3 py-2 text-center">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => openEdit(s)}
                      className="text-xs rounded-md bg-sky-600 px-2 py-1 text-white hover:bg-sky-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRow(s.id)}
                      disabled={deletingId === s.id}
                      className="text-xs rounded-md bg-red-600 px-2 py-1 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {deletingId === s.id ? "…" : "Delete"}
                    </button>
                  </div>
                </td>
                <td className="border px-3 py-2">{s.FirstName}</td>
                <td className="border px-3 py-2">{s.LastName}</td>
                <td className="border px-3 py-2">{s.Email}</td>
                <td className="border px-3 py-2">{s.Code}</td>
                {testFields.map((field) => (
                  <td key={field} className="border px-3 py-2 text-center">
                    {(s as any)[field]}
                  </td>
                ))}
              </tr>
            ))}

            {filteredStudents.length === 0 && (
              <tr>
                <td
                  colSpan={5 + testFields.length}
                  className="border px-3 py-4 text-center text-slate-500"
                >
                  No students match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          form={editForm}
          setForm={setEditForm}
          onClose={closeEdit}
          onSave={handleSaveEdit}
          saving={savingId === editingStudent.id}
        />
      )}
    </main>
  );
}

type EditStudentModalProps = {
  student: Student;
  form: Partial<Student>;
  setForm: React.Dispatch<React.SetStateAction<Partial<Student>>>;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
};

function EditStudentModal({
  student,
  form,
  setForm,
  onClose,
  onSave,
  saving,
}: EditStudentModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white text-slate-900 p-6 rounded-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          Edit {student.FirstName} {student.LastName}
        </h2>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          <LabeledInput
            label="First Name"
            value={form.FirstName ?? ""}
            onChange={(v) =>
              setForm((prev) => ({ ...prev, FirstName: v }))
            }
          />
          <LabeledInput
            label="Last Name"
            value={form.LastName ?? ""}
            onChange={(v) =>
              setForm((prev) => ({ ...prev, LastName: v }))
            }
          />
          <LabeledInput
            label="Email"
            value={form.Email ?? ""}
            onChange={(v) => setForm((prev) => ({ ...prev, Email: v }))}
          />
          <LabeledInput
            label="Access Code"
            value={form.Code ?? ""}
            onChange={(v) => setForm((prev) => ({ ...prev, Code: v }))}
          />

          {testFields.map((field) => (
            <LabeledInput
              key={field}
              label={field}
              type="number"
              value={
                form[field] !== undefined
                  ? String(form[field])
                  : String((student as any)[field] ?? "")
              }
              onChange={(v) =>
                setForm((prev) => ({
                  ...prev,
                  [field]: v === "" ? 0 : Number(v),
                }))
              }
            />
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-300 rounded"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-3 py-1 bg-emerald-600 text-white rounded disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

type LabeledInputProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
};

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
}: LabeledInputProps) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1">{label}</label>
      <input
        type={type}
        className="w-full border px-2 py-1 rounded text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
