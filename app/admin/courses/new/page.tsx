"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { courseIntensities, courseThemes } from "@/lib/course-options";

export default function NewCoursePage() {
  const router = useRouter();
  const [theme, setTheme] = useState("heritage");
  const [intensity, setIntensity] = useState("standard");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        audience: form.get("audience"),
        estimatedMinutes: form.get("estimatedMinutes"),
        theme,
        intensity,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "The program could not be created.");
      setSaving(false);
      return;
    }
    router.push(`/admin/courses/${data.course.slug}`);
  }

  return (
    <AdminShell title="Create a training program" eyebrow="Program setup">
      <form onSubmit={submit} className="grid gap-7 xl:grid-cols-[1fr_.8fr]">
        <section className="space-y-6 rounded-3xl border border-[#10283f]/10 bg-white p-7 shadow-sm">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#10283f]">
              Program essentials
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#69757e]">
              Start with the learning purpose. Source material and sections are added
              after the program is saved.
            </p>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[#263746]">Program title</span>
            <input
              name="title"
              required
              placeholder="Blueprint Reading Fundamentals"
              className="w-full rounded-xl border border-[#10283f]/15 px-4 py-3 outline-none focus:border-[#c68b1b] focus:ring-2 focus:ring-[#e8c273]/30"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[#263746]">Description</span>
            <textarea
              name="description"
              rows={4}
              placeholder="What will learners be able to do after completing this program?"
              className="w-full resize-none rounded-xl border border-[#10283f]/15 px-4 py-3 leading-6 outline-none focus:border-[#c68b1b] focus:ring-2 focus:ring-[#e8c273]/30"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[#263746]">Intended audience</span>
            <input
              name="audience"
              placeholder="First-year apprentices and entry-level fabricators"
              className="w-full rounded-xl border border-[#10283f]/15 px-4 py-3 outline-none focus:border-[#c68b1b] focus:ring-2 focus:ring-[#e8c273]/30"
            />
          </label>

          <label className="block max-w-xs">
            <span className="mb-2 block text-sm font-bold text-[#263746]">
              Estimated total minutes
            </span>
            <input
              name="estimatedMinutes"
              type="number"
              min={10}
              defaultValue={120}
              className="w-full rounded-xl border border-[#10283f]/15 px-4 py-3 outline-none focus:border-[#c68b1b]"
            />
          </label>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-[#10283f]/10 bg-white p-6">
            <p className="text-xs font-black uppercase tracking-[.17em] text-[#9a6812]">
              Visual theme
            </p>
            <div className="mt-4 space-y-3">
              {courseThemes.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTheme(option.id)}
                  className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                    theme === option.id
                      ? "border-[#c68b1b] bg-[#fff9eb] ring-2 ring-[#e8c273]/25"
                      : "border-[#10283f]/10 hover:bg-[#f6f8f8]"
                  }`}
                >
                  <span className="flex overflow-hidden rounded-full ring-1 ring-black/10">
                    {option.colors.map((color) => (
                      <span key={color} className="h-8 w-5" style={{ background: color }} />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-[#10283f]">{option.name}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-[#6c7881]">
                      {option.description}
                    </span>
                  </span>
                  {theme === option.id && <Check size={18} className="text-[#a06e16]" />}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-[#10283f]/10 bg-white p-6">
            <p className="text-xs font-black uppercase tracking-[.17em] text-[#9a6812]">
              Instructional intensity
            </p>
            <div className="mt-4 space-y-2">
              {courseIntensities.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setIntensity(option.id)}
                  className={`w-full rounded-xl border p-4 text-left ${
                    intensity === option.id
                      ? "border-[#10283f] bg-[#10283f] text-white"
                      : "border-[#10283f]/10 text-[#263746] hover:bg-[#f6f8f8]"
                  }`}
                >
                  <span className="font-bold">{option.name}</span>
                  <span
                    className={`mt-1 block text-xs leading-5 ${
                      intensity === option.id ? "text-slate-300" : "text-[#6c7881]"
                    }`}
                  >
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error}
            </p>
          )}

          <button
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#d9a036] px-5 py-4 font-bold text-[#10283f] shadow-lg disabled:opacity-60"
          >
            {saving ? <LoaderCircle className="animate-spin" size={19} /> : <ArrowRight size={19} />}
            {saving ? "Creating program…" : "Create program and add content"}
          </button>
        </aside>
      </form>
    </AdminShell>
  );
}
