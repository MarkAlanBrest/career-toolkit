"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Eye,
  Layers3,
  Lock,
  Play,
  Send,
  Sparkles,
  Target,
  X,
} from "lucide-react";

type LineType = "object" | "hidden" | "center";
type ChatEntry = { role: "user" | "assistant"; content: string };

const lineDetails: Record<
  LineType,
  { name: string; description: string; use: string; dash: string }
> = {
  object: {
    name: "Object line",
    description: "A thick, continuous line that shows a visible edge or surface.",
    use: "Read these first. They establish the part’s overall shape.",
    dash: "0",
  },
  hidden: {
    name: "Hidden line",
    description:
      "A sequence of short, evenly spaced dashes representing an edge you cannot see from the current view.",
    use: "Use hidden lines to understand holes, recesses, and features behind a visible surface.",
    dash: "14 9",
  },
  center: {
    name: "Center line",
    description:
      "An alternating long-short pattern marking the center of a circle, arc, or symmetrical feature.",
    use: "Center lines locate geometry; they do not represent a physical edge.",
    dash: "28 7 7 7",
  },
};

export default function BlueprintLesson() {
  const [progress, setProgress] = useState(0);
  const [lineType, setLineType] = useState<LineType>("object");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [thinking, setThinking] = useState(false);
  const [panel, setPanel] = useState<"activities" | "mastery" | null>(null);
  const [openSection, setOpenSection] = useState(2);

  useEffect(() => {
    const update = () => {
      const available =
        document.documentElement.scrollHeight - window.innerHeight;
      setProgress(
        available > 0 ? Math.min(100, Math.round((window.scrollY / available) * 100)) : 0,
      );
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  async function askMason(event: FormEvent) {
    event.preventDefault();
    const clean = question.trim();
    if (!clean || thinking) return;
    const next: ChatEntry[] = [...messages, { role: "user", content: clean }];
    setMessages(next);
    setQuestion("");
    setThinking(true);
    try {
      const response = await fetch("/api/mason/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: 0, messages: next }),
      });
      const data = await response.json();
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            data.reply ||
            "Object lines show visible edges. Hidden lines reveal edges behind the visible surface, while center lines locate symmetrical geometry.",
        },
      ]);
    } catch {
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            "Object lines show visible edges. Hidden lines reveal edges behind the visible surface, while center lines locate symmetrical geometry.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f1e8] text-[#17202b]">
      <header className="sticky top-0 z-40 border-b border-[#17202b]/10 bg-[#f9f6ef]/95 backdrop-blur-xl">
        <div className="h-1 bg-[#d8d2c5]">
          <div
            className="h-full bg-[#e0a42b] transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mx-auto flex h-16 max-w-[1680px] items-center justify-between px-5 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#10283f] text-[#f2b744]">
              <BookOpen size={19} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-[#6e7883]">
                Blueprint Reading · Sub-lesson 2 of 7
              </p>
              <p className="text-sm font-bold">The language of lines</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden items-center gap-2 text-[#6e7883] sm:flex">
              <Clock3 size={16} /> 14 minutes
            </span>
            <span className="rounded-full bg-[#10283f] px-3 py-1.5 text-xs font-bold text-white">
              {progress}% read
            </span>
          </div>
        </div>
        <div className="hidden">
          <div className="mx-auto flex max-w-[1100px] items-center px-5 py-2 lg:px-10">
            {[
              ["Read", 0],
              ["Explore lines", 22],
              ["Connect views", 48],
              ["Activities", 76],
              ["Mastery", 94],
            ].map(([label, threshold], index, items) => {
              const reached = progress >= Number(threshold);
              return (
                <div key={String(label)} className="flex min-w-0 flex-1 items-center">
                  <div className="flex min-w-0 flex-col items-center gap-1">
                    <span
                      className={`grid h-5 w-5 place-items-center rounded-full border-2 text-[9px] font-black transition ${
                        reached
                          ? "border-[#d89d29] bg-[#d89d29] text-[#10283f]"
                          : "border-[#b9c0c4] bg-[#f9f6ef] text-[#7a858c]"
                      }`}
                    >
                      {reached ? <CheckCircle2 size={12} /> : index + 1}
                    </span>
                    <span
                      className={`hidden truncate text-[10px] font-bold sm:block ${
                        reached ? "text-[#10283f]" : "text-[#899197]"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {index < items.length - 1 && (
                    <span className="mx-2 mb-4 h-0.5 flex-1 overflow-hidden bg-[#d8dde0]">
                      <span
                        className={`block h-full bg-[#d89d29] transition-all ${
                          progress >= Number(items[index + 1][1]) ? "w-full" : "w-0"
                        }`}
                      />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1680px] grid-cols-1 gap-8 px-5 pb-24 pt-10 lg:px-10 xl:grid-cols-[220px_minmax(0,1fr)_310px]">
        <aside className="hidden xl:block">
          <div className="sticky top-24 overflow-hidden rounded-[1.75rem] bg-white p-4 text-[#10283f] shadow-[0_18px_45px_rgba(16,40,63,.1)] ring-1 ring-[#10283f]/10">
            <div className="border-b border-[#10283f]/10 px-1 pb-5 pt-1">
              <p className="text-[11px] font-black uppercase tracking-[.18em] text-[#a97820]">
                Course contents
              </p>
              <h2 className="mt-2 font-serif text-2xl font-semibold leading-tight text-[#10283f]">
                Blueprint Reading Fundamentals
              </h2>
            </div>

            <nav className="mt-4 max-h-[58vh] space-y-1 overflow-y-auto pr-1">
              {[
                {
                  number: "01",
                  title: "Drawing orientation",
                  state: "complete",
                  items: [
                    { label: "Sheets, views, and title blocks", state: "complete" },
                  ],
                },
                {
                  number: "02",
                  title: "Lines & views",
                  state: "active",
                  items: [
                    { label: "Introduction to line conventions", state: "complete" },
                    { label: "The language of lines", state: "current" },
                    { label: "Activity: Find hidden lines", state: "activity" },
                    { label: "Activity: Match the views", state: "activity" },
                    { label: "Activity: Correct the drawing", state: "activity" },
                    { label: "Mastery check", state: "locked" },
                  ],
                },
                {
                  number: "03",
                  title: "Dimensions & scale",
                  state: "upcoming",
                  items: [
                    { label: "Reading dimensions", state: "locked" },
                    { label: "Scale and measurement", state: "locked" },
                    { label: "Guided activities", state: "locked" },
                    { label: "Mastery check", state: "locked" },
                  ],
                },
                {
                  number: "04",
                  title: "Symbols & notes",
                  state: "upcoming",
                  items: [
                    { label: "Common drawing symbols", state: "locked" },
                    { label: "General and local notes", state: "locked" },
                    { label: "Mastery check", state: "locked" },
                  ],
                },
              ].map((sectionItem) => {
                const sectionNumber = Number(sectionItem.number);
                const expanded = openSection === sectionNumber;
                return (
                  <div key={sectionItem.number}>
                    <button
                      onClick={() =>
                        setOpenSection(expanded ? 0 : sectionNumber)
                      }
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                        sectionItem.state === "active"
                          ? "bg-[#fff2d2] text-[#10283f] ring-1 ring-[#d9a036]/25"
                          : "text-[#596671] hover:bg-[#f4f6f6] hover:text-[#10283f]"
                      }`}
                    >
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[10px] font-black ${
                          sectionItem.state === "complete"
                            ? "bg-emerald-100 text-emerald-800"
                            : sectionItem.state === "active"
                              ? "bg-[#d9a036] text-white"
                              : "bg-[#edf0f1] text-[#7a858c]"
                        }`}
                      >
                        {sectionItem.state === "complete" ? (
                          <CheckCircle2 size={15} />
                        ) : (
                          sectionItem.number
                        )}
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-semibold leading-5">
                        {sectionItem.title}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`shrink-0 transition-transform ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-300 ${
                        expanded
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="ml-6 border-l border-[#10283f]/10 py-2 pl-3">
                          {sectionItem.items.map((item) => (
                            <button
                              key={item.label}
                              onClick={() => {
                                if (item.state === "activity") setPanel("activities");
                                if (
                                  item.label === "Mastery check" &&
                                  item.state !== "locked"
                                ) {
                                  setPanel("mastery");
                                }
                              }}
                              disabled={item.state === "locked"}
                              className={`flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-xs leading-5 transition ${
                                item.state === "current"
                                  ? "bg-[#eef3f4] font-bold text-[#10283f]"
                                  : item.state === "activity"
                                    ? "font-semibold text-[#9a6b18] hover:bg-[#fff8e9]"
                                    : item.state === "complete"
                                      ? "text-[#53616c]"
                                      : "text-[#a1a8ad]"
                              }`}
                            >
                              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center">
                                {item.state === "complete" ? (
                                  <CheckCircle2 size={14} className="text-emerald-600" />
                                ) : item.state === "locked" ? (
                                  <Lock size={12} />
                                ) : item.state === "activity" ? (
                                  <Play size={12} />
                                ) : (
                                  <span className="h-2 w-2 rounded-full bg-[#f2b744]" />
                                )}
                              </span>
                              <span>{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </nav>

            <div className="mt-7 rounded-2xl border border-[#10283f]/10 bg-[#f5f7f7] p-4">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[#66727b]">Course progress</span>
                <span className="text-[#10283f]">18%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#dfe4e5]">
                <div className="h-full w-[18%] rounded-full bg-[#d9a036]" />
              </div>
              <p className="mt-3 text-xs leading-5 text-[#7b858c]">
                1 of 6 sub-lessons completed
              </p>
            </div>
          </div>
        </aside>

        <article>
          <section className="pb-14 pt-8">
            <div className="mb-7 flex items-center gap-3 text-xs font-black uppercase tracking-[.2em] text-[#a06900]">
              <span className="h-px w-10 bg-[#d49a28]" />
              Read & Learn
            </div>
            <h1 className="max-w-4xl font-serif text-5xl font-semibold leading-[1.03] tracking-[-.035em] text-[#10283f] sm:text-7xl">
              Every line is an instruction.
            </h1>
            <p className="mt-7 max-w-3xl text-xl leading-9 text-[#4c5966]">
              A blueprint compresses a three-dimensional object into a precise
              visual language. Before you can read dimensions or tolerances, you
              must know what each line is telling you—and what it is not.
            </p>

            <div className="mt-9 grid gap-4 sm:grid-cols-3">
              {[
                ["Objective", "Distinguish visible, hidden, and center lines"],
                ["Application", "Interpret features across multiple views"],
                ["Standard", "Identify line types without coaching"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="border-l-2 border-[#d7a23a] py-1 pl-4"
                >
                  <p className="text-[11px] font-black uppercase tracking-[.15em] text-[#8b7651]">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="hidden">
            <div className="flex flex-col justify-between gap-4 border-b border-[#10283f]/10 px-6 py-5 sm:flex-row sm:items-center sm:px-8">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-[#a06900]">
                  Your learning path
                </p>
                <h2 className="mt-1 text-xl font-bold text-[#10283f]">
                  Read, practice, then demonstrate
                </h2>
              </div>
              <span className="rounded-full bg-[#edf2f3] px-3 py-1.5 text-xs font-bold text-[#5a6670]">
                Estimated total: 42 minutes
              </span>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["01", "Find the hidden lines", "8–10 min", "activities"],
                ["02", "Match features across views", "10 min", "activities"],
                ["03", "Correct a drawing error", "12–15 min", "activities"],
                ["04", "Independent mastery", "10 min", "mastery"],
              ].map(([number, title, time, target], index) => (
                <button
                  key={title}
                  onClick={() =>
                    setPanel(target === "mastery" ? "mastery" : "activities")
                  }
                  className={`group border-[#10283f]/10 p-6 text-left transition hover:bg-[#fff8e9] ${
                    index < 3 ? "border-b sm:border-r xl:border-b-0" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-3xl text-[#d39a2a]">{number}</span>
                    <ArrowRight
                      size={17}
                      className="text-[#8a949a] transition group-hover:translate-x-1 group-hover:text-[#10283f]"
                    />
                  </div>
                  <p className="mt-6 font-bold leading-6 text-[#10283f]">{title}</p>
                  <p className="mt-2 text-xs font-semibold text-[#7b858c]">{time}</p>
                </button>
              ))}
            </div>
          </section>

          <figure className="overflow-hidden rounded-[2rem] bg-[#10283f] p-4 shadow-[0_30px_80px_rgba(16,40,63,.2)] sm:p-8">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-white">
              <Image
                src="/lesson-assets/engineering-drawing.png"
                alt="Multi-view engineering drawing showing a mechanical part"
                fill
                priority
                className="object-contain p-5"
              />
            </div>
            <figcaption className="flex flex-col justify-between gap-3 px-2 pb-1 pt-5 text-sm text-slate-300 sm:flex-row">
              <span>
                One component, described through coordinated views and line types.
              </span>
              <span className="font-semibold text-[#f2c568]">
                Study the relationships—not each view in isolation.
              </span>
            </figcaption>
          </figure>

          <section className="py-20">
            <p className="mb-3 text-xs font-black uppercase tracking-[.18em] text-[#a06900]">
              The central idea
            </p>
            <h2 className="max-w-3xl font-serif text-4xl font-semibold tracking-tight text-[#10283f] sm:text-5xl">
              Line style communicates visibility and purpose.
            </h2>
            <div className="mt-8 grid gap-8 text-lg leading-8 text-[#4c5966] md:grid-cols-2">
              <p>
                The same physical edge may appear as a visible object line in one
                view and a hidden line in another. The object has not changed—only
                your viewing direction has.
              </p>
              <p>
                Skilled readers constantly compare views. A dashed feature in the
                front view should connect logically to visible geometry in the top
                or side view.
              </p>
            </div>
          </section>

          <section className="rounded-[2rem] border border-[#10283f]/10 bg-white p-6 shadow-sm sm:p-10">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-[#a06900]">
                  Interactive line guide
                </p>
                <h2 className="mt-2 font-serif text-3xl font-semibold text-[#10283f]">
                  Select a line to examine it
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(lineDetails) as LineType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setLineType(type)}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      lineType === type
                        ? "bg-[#10283f] text-white"
                        : "bg-[#edf0f1] text-[#4c5966] hover:bg-[#dfe5e7]"
                    }`}
                  >
                    {lineDetails[type].name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-9 grid gap-8 md:grid-cols-[1.2fr_.8fr] md:items-center">
              <div className="grid min-h-64 place-items-center rounded-2xl bg-[#eef3f4] p-7">
                <svg viewBox="0 0 560 230" className="w-full" role="img">
                  <title>{lineDetails[lineType].name} example</title>
                  <rect
                    x="90"
                    y="45"
                    width="380"
                    height="140"
                    rx="8"
                    fill="none"
                    stroke="#b4c0c7"
                    strokeWidth="2"
                  />
                  <circle
                    cx="280"
                    cy="115"
                    r="47"
                    fill="none"
                    stroke="#b4c0c7"
                    strokeWidth="2"
                  />
                  <line
                    x1="60"
                    y1="115"
                    x2="500"
                    y2="115"
                    stroke="#d79b26"
                    strokeWidth={lineType === "object" ? 8 : 5}
                    strokeDasharray={lineDetails[lineType].dash}
                    className="transition-all duration-500"
                  />
                  <circle cx="280" cy="115" r="7" fill="#10283f" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[.15em] text-[#d0931c]">
                  {lineDetails[lineType].name}
                </p>
                <p className="mt-3 text-lg leading-8 text-[#3d4a56]">
                  {lineDetails[lineType].description}
                </p>
                <div className="mt-5 rounded-xl bg-[#f5f1e8] p-4 text-sm leading-6 text-[#59636d]">
                  <strong className="text-[#10283f]">Reading strategy:</strong>{" "}
                  {lineDetails[lineType].use}
                </div>
              </div>
            </div>
          </section>

          <aside className="my-20 grid overflow-hidden rounded-[2rem] bg-[#dca332] sm:grid-cols-[130px_1fr]">
            <div className="grid place-items-center bg-[#c58b1c] py-8 text-[#10283f]">
              <Eye size={52} strokeWidth={1.5} />
            </div>
            <div className="p-7 sm:p-9">
              <p className="text-xs font-black uppercase tracking-[.18em] text-[#5f430c]">
                Reader’s habit
              </p>
              <p className="mt-3 font-serif text-2xl font-semibold leading-9 text-[#17202b]">
                Never interpret a hidden line alone. Trace it into another view
                until the physical feature becomes visible.
              </p>
            </div>
          </aside>

          <section className="py-4">
            <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-[#a06900]">
                  See the translation
                </p>
                <h2 className="mt-3 font-serif text-4xl font-semibold text-[#10283f]">
                  One feature, three views
                </h2>
                <p className="mt-5 text-lg leading-8 text-[#4c5966]">
                  Imagine a hole drilled through the center of a rectangular
                  block. From the front, you see the circular opening. From the
                  top and side, the hole is behind material, so its edges become
                  hidden lines.
                </p>
              </div>
              <OrthographicDiagram />
            </div>
          </section>

          <section className="my-20 overflow-hidden rounded-[2rem] bg-[#10283f] text-white">
            <div className="grid md:grid-cols-[1fr_1.15fr]">
              <div className="p-8 sm:p-10">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-[#f2c568]">
                  <Play size={14} fill="currentColor" /> 45-second visual
                </div>
                <h2 className="font-serif text-3xl font-semibold">
                  Watch the viewing direction change
                </h2>
                <p className="mt-4 leading-7 text-slate-300">
                  Use the controls to rotate the viewing direction. Notice when
                  the bore changes from a visible circle to two hidden edges.
                </p>
              </div>
              <div className="min-h-72 bg-[#183c59] p-4">
                <iframe
                  className="aspect-video h-full min-h-64 w-full rounded-2xl border-0 bg-black"
                  src="https://www.youtube-nocookie.com/embed/WG6H2pISUzQ?start=0&end=60&rel=0"
                  title="Introduction to orthographic projection"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </section>

          <section className="py-4">
            <p className="text-xs font-black uppercase tracking-[.18em] text-[#a06900]">
              Worked example
            </p>
            <h2 className="mt-3 font-serif text-4xl font-semibold text-[#10283f]">
              Read the front view first—then verify it.
            </h2>
            <div className="mt-8 space-y-4">
              {[
                [
                  "1",
                  "Establish the boundary",
                  "Identify the thick object lines that define the visible outside shape.",
                ],
                [
                  "2",
                  "Locate internal features",
                  "Trace each hidden-line pair and determine which other view makes that feature visible.",
                ],
                [
                  "3",
                  "Confirm centers",
                  "Use center lines to connect circular or symmetrical features across views.",
                ],
              ].map(([number, title, text]) => (
                <div
                  key={number}
                  className="grid gap-4 border-b border-[#17202b]/10 py-6 sm:grid-cols-[70px_1fr]"
                >
                  <span className="font-serif text-5xl text-[#d29a2b]">{number}</span>
                  <div>
                    <h3 className="text-xl font-bold text-[#10283f]">{title}</h3>
                    <p className="mt-2 leading-7 text-[#5a6570]">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <details className="group my-16 border-y border-[#17202b]/15 py-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold text-[#10283f]">
              What about phantom, cutting-plane, and break lines?
              <ChevronRight className="transition-transform group-open:rotate-90" />
            </summary>
            <div className="grid gap-5 pb-2 pt-6 text-[#56616c] sm:grid-cols-3">
              <p>
                <strong className="block text-[#10283f]">Phantom lines</strong>
                Show alternate positions, adjacent parts, or repeated details.
              </p>
              <p>
                <strong className="block text-[#10283f]">Cutting-plane lines</strong>
                Identify where an imaginary cut creates a section view.
              </p>
              <p>
                <strong className="block text-[#10283f]">Break lines</strong>
                Shorten a long object or reveal a limited interior area.
              </p>
            </div>
          </details>

          <section className="hidden">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-[#a06900]">
                  Apply what you learned
                </p>
                <h2 className="mt-3 font-serif text-4xl font-semibold text-[#10283f]">
                  Ready to work with the drawing?
                </h2>
              </div>
              <Target className="hidden text-[#d39a2a] sm:block" size={54} strokeWidth={1.4} />
            </div>

            <div className="mt-9 grid gap-5 sm:grid-cols-2">
              <button
                onClick={() => setPanel("activities")}
                className="group rounded-3xl bg-[#10283f] p-7 text-left text-white shadow-xl transition hover:-translate-y-1"
              >
                <Layers3 className="text-[#f2c568]" size={30} />
                <p className="mt-8 text-xs font-black uppercase tracking-[.17em] text-[#a9bfd0]">
                  Guided practice · 3 activities
                </p>
                <h3 className="mt-2 text-2xl font-bold">Start the activities</h3>
                <p className="mt-3 leading-7 text-slate-300">
                  Identify hidden lines, match views, and correct a misread drawing.
                  Mason can coach you.
                </p>
                <span className="mt-7 flex items-center gap-2 font-bold text-[#f2c568]">
                  Begin practice <ArrowRight className="transition-transform group-hover:translate-x-1" />
                </span>
              </button>

              <button
                onClick={() => setPanel("mastery")}
                className="group rounded-3xl border-2 border-[#10283f] bg-transparent p-7 text-left transition hover:-translate-y-1 hover:bg-white"
              >
                <CheckCircle2 className="text-[#10283f]" size={30} />
                <p className="mt-8 text-xs font-black uppercase tracking-[.17em] text-[#7b6b4d]">
                  Independent · no coaching
                </p>
                <h3 className="mt-2 text-2xl font-bold text-[#10283f]">
                  Take the mastery check
                </h3>
                <p className="mt-3 leading-7 text-[#59636d]">
                  Demonstrate that you can identify and interpret line types in a
                  new drawing.
                </p>
                <span className="mt-7 flex items-center gap-2 font-bold text-[#10283f]">
                  Begin assessment <ArrowRight className="transition-transform group-hover:translate-x-1" />
                </span>
              </button>
            </div>
          </section>

          <p className="mt-16 text-xs leading-5 text-[#7d858c]">
            Example drawing: public-domain engineering drawing from{" "}
            <a
              className="underline"
              href="https://commons.wikimedia.org/wiki/File:Engineering_drawing-dessin_de_definition.png"
            >
              Wikimedia Commons
            </a>
            .
          </p>
        </article>

        <aside className="hidden xl:block">
          <div className="sticky top-24 overflow-hidden rounded-[1.75rem] border border-[#10283f]/10 bg-white shadow-[0_18px_50px_rgba(16,40,63,.1)]">
            <div className="flex items-center gap-3 bg-[#10283f] p-5 text-white">
              <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-[#f2b744] text-[#10283f]">
                <Bot size={27} />
                <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#10283f] bg-emerald-400" />
              </div>
              <div>
                <p className="font-bold">Ask Mason</p>
                <p className="text-xs text-slate-300">Reading this page with you</p>
              </div>
            </div>

            <div className="max-h-[330px] space-y-3 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <>
                  <p className="rounded-2xl rounded-tl-sm bg-[#eef3f4] p-4 text-sm leading-6 text-[#495661]">
                    I know which section and diagram you’re viewing. Ask me to
                    simplify something or show another example.
                  </p>
                  <div className="space-y-2">
                    {[
                      "Explain hidden lines more simply.",
                      "What’s the difference between hidden and center lines?",
                      "Show me another example.",
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => setQuestion(prompt)}
                        className="w-full rounded-xl border border-[#10283f]/10 px-3 py-2.5 text-left text-xs font-semibold text-[#53616c] hover:border-[#d49a28] hover:bg-[#fff9ec]"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                messages.slice(-5).map((message, index) => (
                  <p
                    key={index}
                    className={`rounded-2xl p-3 text-sm leading-6 ${
                      message.role === "user"
                        ? "ml-6 rounded-tr-sm bg-[#f2b744] text-[#17202b]"
                        : "mr-3 rounded-tl-sm bg-[#eef3f4] text-[#495661]"
                    }`}
                  >
                    {message.content}
                  </p>
                ))
              )}
              {thinking && (
                <p className="text-xs font-bold text-[#a06900]">Mason is thinking…</p>
              )}
            </div>

            <form onSubmit={askMason} className="border-t border-[#10283f]/10 p-3">
              <div className="flex items-end gap-2 rounded-xl bg-[#f5f1e8] p-2">
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  rows={2}
                  placeholder="Ask about this lesson…"
                  className="min-h-11 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
                />
                <button
                  disabled={!question.trim() || thinking}
                  className="grid h-10 w-10 place-items-center rounded-xl bg-[#10283f] text-white disabled:opacity-35"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>
        </aside>
      </div>

      {panel && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#07111f]/75 p-5 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-[2rem] bg-[#f9f6ef] p-7 shadow-2xl sm:p-10">
            <button
              onClick={() => setPanel(null)}
              className="absolute right-5 top-5 rounded-full bg-[#10283f]/5 p-2 hover:bg-[#10283f]/10"
            >
              <X size={20} />
            </button>
            {panel === "activities" ? (
              <>
                <Sparkles className="text-[#d19829]" size={34} />
                <p className="mt-6 text-xs font-black uppercase tracking-[.18em] text-[#a06900]">
                  Guided activities
                </p>
                <h2 className="mt-2 font-serif text-4xl font-semibold text-[#10283f]">
                  Practice with real drawings
                </h2>
                <div className="mt-7 space-y-3">
                  {[
                    "Select every hidden line in a three-view drawing",
                    "Match five features across front, top, and side views",
                    "Diagnose and correct a fabricator’s drawing error",
                  ].map((activity, index) => (
                    <div
                      key={activity}
                      className="flex items-center gap-4 rounded-2xl border border-[#10283f]/10 bg-white p-4"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#10283f] font-bold text-white">
                        {index + 1}
                      </span>
                      <p className="font-semibold">{activity}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <Target className="text-[#10283f]" size={34} />
                <p className="mt-6 text-xs font-black uppercase tracking-[.18em] text-[#a06900]">
                  Mastery check
                </p>
                <h2 className="mt-2 font-serif text-4xl font-semibold text-[#10283f]">
                  Independent demonstration
                </h2>
                <p className="mt-5 text-lg leading-8 text-[#59636d]">
                  Mason will leave the screen. You’ll receive a new drawing and
                  complete five line-reading problems without hints or coaching.
                </p>
                <div className="mt-7 rounded-2xl bg-white p-5 text-sm leading-7 text-[#4f5b66]">
                  <strong className="text-[#10283f]">Passing standard:</strong>{" "}
                  correctly identify at least 80% of the features and explain one
                  cross-view relationship.
                </div>
              </>
            )}
            <button className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#10283f] px-5 py-3.5 font-bold text-white">
              Open {panel === "activities" ? "activity workspace" : "mastery check"}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function OrthographicDiagram() {
  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-[#10283f]/10 sm:p-8">
      <svg viewBox="0 0 700 430" className="w-full" role="img">
        <title>Three orthographic views of a block with a central hole</title>
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e7ecee" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="700" height="430" fill="url(#grid)" />
        <g stroke="#16334a" fill="none">
          <rect x="70" y="55" width="210" height="130" strokeWidth="5" />
          <circle cx="175" cy="120" r="42" strokeWidth="5" />
          <line x1="175" y1="45" x2="175" y2="195" stroke="#d49a28" strokeWidth="2" strokeDasharray="26 7 7 7" />
          <line x1="55" y1="120" x2="295" y2="120" stroke="#d49a28" strokeWidth="2" strokeDasharray="26 7 7 7" />

          <rect x="70" y="265" width="210" height="105" strokeWidth="5" />
          <line x1="133" y1="265" x2="133" y2="370" strokeWidth="3" strokeDasharray="14 9" />
          <line x1="217" y1="265" x2="217" y2="370" strokeWidth="3" strokeDasharray="14 9" />
          <line x1="175" y1="250" x2="175" y2="385" stroke="#d49a28" strokeWidth="2" strokeDasharray="26 7 7 7" />

          <rect x="420" y="55" width="150" height="130" strokeWidth="5" />
          <line x1="452" y1="55" x2="452" y2="185" strokeWidth="3" strokeDasharray="14 9" />
          <line x1="538" y1="55" x2="538" y2="185" strokeWidth="3" strokeDasharray="14 9" />
          <line x1="495" y1="40" x2="495" y2="200" stroke="#d49a28" strokeWidth="2" strokeDasharray="26 7 7 7" />
        </g>
        <g fill="#65737f" fontSize="16" fontWeight="700" letterSpacing="2">
          <text x="70" y="30">FRONT VIEW</text>
          <text x="70" y="405">TOP VIEW</text>
          <text x="420" y="30">RIGHT-SIDE VIEW</text>
        </g>
        <path d="M305 120 H390" stroke="#9aa7af" strokeWidth="2" strokeDasharray="5 5" />
        <path d="M175 205 V240" stroke="#9aa7af" strokeWidth="2" strokeDasharray="5 5" />
      </svg>
    </div>
  );
}
