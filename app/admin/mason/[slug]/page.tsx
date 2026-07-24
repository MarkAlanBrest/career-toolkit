"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Bot, FilePlus2, LoaderCircle, Play, Send } from "lucide-react";

type Course = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  published: boolean;
  sections: Array<{
    id: number;
    title: string;
    position: number;
    fileName: string;
    lessonPlan: { objectives: string[]; moments: unknown[] };
  }>;
};

export default function MasonCourseEditor() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [course, setCourse] = useState<Course | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!slug) return;
    const response = await fetch(`/api/mason/courses/${slug}`);
    if (response.ok) setCourse(await response.json());
  }

  useEffect(() => {
    if (!slug) return;
    let active = true;
    fetch(`/api/mason/courses/${slug}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data) setCourse(data);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  async function addSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    setError("");
    const response = await fetch(`/api/mason/courses/${slug}/sections`, {
      method: "POST",
      body: new FormData(form),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "The section could not be created.");
      setSaving(false);
      return;
    }
    form.reset();
    await load();
    setSaving(false);
  }

  async function togglePublished() {
    if (!course) return;
    const response = await fetch(`/api/mason/courses/${course.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !course.published }),
    });
    if (response.ok) await load();
  }

  if (!course) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#07111f] text-white">
        <LoaderCircle className="animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#edf3f8] text-slate-900">
      <header className="bg-[#07111f] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-400 text-slate-950">
              <Bot />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-amber-300">
                Mason Studio
              </p>
              <h1 className="text-xl font-bold">{course.title}</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/mason"
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold"
            >
              All courses
            </Link>
            <Link
              href={`/mason/${course.slug}`}
              className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950"
            >
              <Play size={16} /> Preview
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-7 px-6 py-9 lg:grid-cols-[1.15fr_.85fr]">
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Course structure</p>
              <h2 className="text-2xl font-bold">Lesson sections</h2>
            </div>
            <button
              onClick={togglePublished}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                course.published
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {course.published ? "Published" : "Draft"}
            </button>
          </div>

          <div className="space-y-4">
            {course.sections.map((section) => (
              <article
                key={section.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex gap-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-900 font-bold text-white">
                    {section.position}
                  </div>
                  <div>
                    <h3 className="font-bold">{section.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">{section.fileName}</p>
                    <p className="mt-3 text-sm text-slate-600">
                      {section.lessonPlan.objectives.length} objectives ·{" "}
                      {section.lessonPlan.moments.length} teaching moments
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside>
          <form
            onSubmit={addSection}
            className="sticky top-6 space-y-4 rounded-3xl bg-[#0c1b2e] p-6 text-white shadow-xl"
          >
            <div className="flex items-center gap-3">
              <FilePlus2 className="text-amber-300" />
              <div>
                <p className="font-bold">Add another section</p>
                <p className="text-xs text-slate-400">One PDF per course section</p>
              </div>
            </div>
            <input
              name="sectionTitle"
              required
              placeholder="Section name"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-amber-300"
            />
            <input
              name="pdf"
              type="file"
              accept="application/pdf"
              required
              className="w-full rounded-xl border border-dashed border-white/20 p-4 text-sm"
            />
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <LoaderCircle size={18} className="animate-spin" /> Building lesson…
                </>
              ) : (
                <>
                  <Send size={18} /> Send PDF to Mason
                </>
              )}
            </button>
          </form>
        </aside>
      </div>
    </main>
  );
}
