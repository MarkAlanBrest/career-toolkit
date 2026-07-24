"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  BookOpen,
  Bot,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Plus,
  Sparkles,
} from "lucide-react";

type CourseListItem = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  published: boolean;
  sections: Array<{ id: number; title: string; position: number }>;
};

export default function MasonStudioPage() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function loadCourses() {
    const response = await fetch("/api/mason/courses");
    if (response.ok) setCourses(await response.json());
    setLoading(false);
  }

  useEffect(() => {
    loadCourses();
  }, []);

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/mason/courses", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Course creation failed.");
      window.location.href = `/admin/mason/${data.course.slug}`;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Course creation failed.");
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <header className="border-b border-white/10 bg-[#07111f]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-400 text-slate-950">
              <Bot size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
                Course authoring
              </p>
              <h1 className="text-xl font-bold">Mason Studio</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/mason/demo"
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/10"
            >
              Preview classroom
            </Link>
            <Link
              href="/admin/dashboard"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900"
            >
              Admin dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        <section>
          <div className="mb-7">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-200">
              <Sparkles size={14} /> PDF to live lesson
            </div>
            <h2 className="max-w-xl text-4xl font-bold tracking-tight">
              Give Mason the source. He builds the class.
            </h2>
            <p className="mt-4 max-w-xl leading-7 text-slate-300">
              Upload the first section PDF. Mason identifies the key concepts,
              useful visuals, teaching moments, scenarios, and knowledge checks.
            </p>
          </div>

          <form
            onSubmit={createCourse}
            className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl"
          >
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Course title</span>
              <input
                name="title"
                required
                placeholder="OSHA 10: Fall Protection"
                className="w-full rounded-xl border border-white/15 bg-[#0d1b2d] px-4 py-3 outline-none focus:border-amber-300"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Description</span>
              <textarea
                name="description"
                rows={2}
                placeholder="What students will learn"
                className="w-full resize-none rounded-xl border border-white/15 bg-[#0d1b2d] px-4 py-3 outline-none focus:border-amber-300"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                First section name
              </span>
              <input
                name="sectionTitle"
                required
                placeholder="Recognizing Fall Hazards"
                className="w-full rounded-xl border border-white/15 bg-[#0d1b2d] px-4 py-3 outline-none focus:border-amber-300"
              />
            </label>
            <label className="block rounded-2xl border-2 border-dashed border-white/15 bg-black/10 p-5 text-center hover:border-amber-300/50">
              <FileText className="mx-auto mb-2 text-amber-300" />
              <span className="block font-semibold">Choose the section PDF</span>
              <span className="mb-3 block text-xs text-slate-400">PDF, up to 25 MB</span>
              <input name="pdf" type="file" accept="application/pdf" required />
            </label>

            {error && (
              <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              disabled={creating}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-60"
            >
              {creating ? (
                <>
                  <LoaderCircle className="animate-spin" size={19} />
                  Mason is reading and designing…
                </>
              ) : (
                <>
                  <Plus size={19} /> Create course
                </>
              )}
            </button>
            <p className="text-center text-xs text-slate-400">
              Generation can take about a minute for a large PDF.
            </p>
          </form>
        </section>

        <section className="rounded-3xl bg-[#edf3f8] p-6 text-slate-900">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Course library
              </p>
              <h2 className="mt-1 text-2xl font-bold">Mason courses</h2>
            </div>
            <BookOpen className="text-slate-400" />
          </div>

          {loading ? (
            <div className="grid h-40 place-items-center text-slate-500">
              <LoaderCircle className="animate-spin" />
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <Bot className="mx-auto mb-3 text-slate-400" size={34} />
              <p className="font-semibold">Your first AI-taught course starts here.</p>
              <p className="mt-1 text-sm text-slate-500">
                Upload a PDF using the form beside this panel.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{course.title}</h3>
                        {course.published && (
                          <CheckCircle2 size={16} className="text-emerald-600" />
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {course.sections.length} section
                        {course.sections.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/mason/${course.slug}`}
                        className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold hover:bg-slate-200"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/mason/${course.slug}`}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"
                      >
                        Teach
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
