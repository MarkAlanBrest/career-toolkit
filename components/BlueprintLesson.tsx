"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  Layers3,
  Lock,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Volume2,
  X,
} from "lucide-react";

type LineType = "object" | "hidden" | "center";

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
  const [lineType, setLineType] = useState<LineType>("object");
  const [panel, setPanel] = useState<"activities" | "mastery" | null>(null);

  return (
    <main className="min-h-screen bg-[#f5f1e8] text-[#17202b]">
      <header className="sticky top-0 z-40 border-b border-[#17202b]/10 bg-[#f9f6ef]/95 backdrop-blur-xl">
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
            <span className="flex items-center gap-2 text-[#6e7883]">
              <Clock3 size={16} /> 14 minutes
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-10 px-5 pb-24 pt-10 lg:px-10 xl:grid-cols-[220px_minmax(0,980px)]">
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

            <nav className="mt-4 space-y-1">
              {[
                {
                  number: "01",
                  title: "Drawing orientation",
                  state: "complete",
                },
                {
                  number: "02",
                  title: "Lines & views",
                  state: "active",
                },
                {
                  number: "03",
                  title: "Dimensions & scale",
                  state: "upcoming",
                },
                {
                  number: "04",
                  title: "Symbols & notes",
                  state: "upcoming",
                },
              ].map((sectionItem) => (
                <button
                  key={sectionItem.number}
                  disabled={sectionItem.state === "upcoming"}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                    sectionItem.state === "active"
                      ? "bg-[#fff2d2] text-[#10283f] ring-1 ring-[#d9a036]/25"
                      : sectionItem.state === "complete"
                        ? "text-[#40505c] hover:bg-[#f4f6f6]"
                        : "cursor-default text-[#9aa2a8]"
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
                  {sectionItem.state === "upcoming" && (
                    <Lock size={13} className="shrink-0 text-[#a7adb1]" />
                  )}
                </button>
              ))}
            </nav>

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
            <div className="mt-9 max-w-3xl space-y-6 text-lg leading-8 text-[#4c5966]">
              <p>
                Every line on a technical drawing represents a decision about what
                the reader needs to understand. A thick, continuous object line
                identifies an edge that can be seen from the current viewing
                direction. A dashed hidden line identifies an edge that exists but
                is blocked by material. A center line does something different: it
                locates the axis or midpoint of a symmetrical feature rather than
                describing a physical edge.
              </p>
              <p>
                This means the same physical edge may appear as a visible object
                line in one view and a hidden line in another. The object has not
                changed—only your viewing direction has. If a hole is visible as a
                circle in the front view, its sides may appear as two dashed lines
                in the top view because you are now looking through solid material
                toward an edge you cannot see directly.
              </p>
              <p>
                Skilled readers therefore avoid interpreting any view in isolation.
                They compare the front, top, and side views until each feature has a
                consistent physical explanation. A dashed feature in one view
                should connect logically to visible geometry in another. When those
                relationships agree, the flat drawing begins to describe a complete
                three-dimensional object.
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

          <InlineActivity
            number="01"
            title="Identify the hidden lines"
            description="Work directly on a three-view drawing and select every edge that is hidden from the current viewpoint."
            time="8–10 minutes"
            onClick={() => setPanel("activities")}
          />

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

          <InlineActivity
            number="02"
            title="Match features across views"
            description="Trace five physical features from the front view into the corresponding top and side views."
            time="About 10 minutes"
            onClick={() => setPanel("activities")}
          />

          <NarratedVisualExplainer />

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

          <InlineActivity
            number="03"
            title="Correct the drawing"
            description="Inspect a fabricator’s marked-up drawing, diagnose the line-reading error, and explain your correction."
            time="12–15 minutes"
            onClick={() => setPanel("activities")}
          />

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

          <section className="mt-20 border-t border-[#17202b]/15 pt-14">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-[#a06900]">
                  End of section
                </p>
                <h2 className="mt-3 font-serif text-4xl font-semibold text-[#10283f]">
                  Ready to demonstrate mastery?
                </h2>
                <p className="mt-4 max-w-2xl text-lg leading-8 text-[#59636d]">
                  Complete the independent check to finish Lines &amp; Views.
                  Your coach will step away and no coaching or hints will be available.
                </p>
              </div>
              <Target className="hidden text-[#d39a2a] sm:block" size={54} strokeWidth={1.4} />
            </div>

            <button
              onClick={() => setPanel("mastery")}
              className="group mt-9 flex w-full items-center justify-between gap-6 rounded-3xl bg-[#10283f] p-6 text-left text-white shadow-xl transition hover:-translate-y-1 sm:p-8"
            >
              <span className="flex items-center gap-5">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#f2b744] text-[#10283f]">
                  <CheckCircle2 size={29} />
                </span>
                <span>
                  <span className="block text-xs font-black uppercase tracking-[.17em] text-[#a9bfd0]">
                    Independent · approximately 10 minutes
                  </span>
                  <span className="mt-2 block text-2xl font-bold">
                    Take the section mastery check
                  </span>
                </span>
              </span>
              <ArrowRight className="shrink-0 text-[#f2c568] transition-transform group-hover:translate-x-1" />
            </button>
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
                  Your coach will leave the screen. You’ll receive a new drawing and
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

const explainerFrames = [
  {
    eyebrow: "Step 1 · Orient",
    title: "Start with the complete drawing",
    caption:
      "Before reading individual lines, identify the front, top, and right-side views.",
    narration:
      "Start with the complete drawing. Locate the front, top, and right-side views before interpreting any individual line. These views describe one object from three different directions.",
    focus: "overview",
  },
  {
    eyebrow: "Step 2 · Observe",
    title: "The bore is visible from the front",
    caption:
      "Looking directly into the bore reveals its circular opening as a visible object line.",
    narration:
      "Now focus on the front view. Because we are looking directly into the bore, its circular opening is visible. The thick continuous circle is an object line.",
    focus: "front",
  },
  {
    eyebrow: "Step 3 · Translate",
    title: "The same bore becomes hidden",
    caption:
      "From above, material blocks the bore’s edges, so they appear as evenly spaced dashes.",
    narration:
      "Move to the top view. The bore has not changed, but solid material now blocks our view of its edges. That is why the two edges are drawn as hidden lines.",
    focus: "top",
  },
  {
    eyebrow: "Step 4 · Confirm",
    title: "The side view confirms the feature",
    caption:
      "A second pair of hidden lines verifies that the bore passes through the center of the part.",
    narration:
      "The right-side view gives us confirmation. Its hidden-line pair aligns with the same bore. Comparing views prevents us from mistaking those dashes for a separate feature.",
    focus: "side",
  },
  {
    eyebrow: "Step 5 · Connect",
    title: "Read all three views as one object",
    caption:
      "Visible and hidden lines work together to communicate the bore’s location and direction.",
    narration:
      "Put the views back together. The visible circle and both hidden-line pairs describe one continuous bore. Strong blueprint readers always verify a feature across every available view.",
    focus: "together",
  },
] as const;

function NarratedVisualExplainer() {
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [voiceError, setVoiceError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef("");
  const audioFrameRef = useRef(-1);
  const requestRef = useRef(0);

  function releaseAudio() {
    requestRef.current += 1;
    audioRef.current?.pause();
    audioRef.current = null;
    audioFrameRef.current = -1;
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
    }
  }

  useEffect(() => {
    return () => {
      requestRef.current += 1;
      audioRef.current?.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  async function playFrame(nextIndex: number, restart = false) {
    const existing = audioRef.current;
    if (
      !restart &&
      existing &&
      audioFrameRef.current === nextIndex &&
      existing.currentTime > 0 &&
      existing.currentTime < existing.duration
    ) {
      await existing.play();
      setPlaying(true);
      return;
    }

    releaseAudio();
    const requestId = requestRef.current;
    setFrameIndex(nextIndex);
    setAudioProgress(0);
    setVoiceError("");
    setLoading(true);

    try {
      const response = await fetch("/api/mason/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: explainerFrames[nextIndex].narration }),
      });
      if (!response.ok) throw new Error("voice unavailable");
      const blob = await response.blob();
      if (requestId !== requestRef.current) return;

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioUrlRef.current = url;
      audioRef.current = audio;
      audioFrameRef.current = nextIndex;
      audio.ontimeupdate = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          setAudioProgress(audio.currentTime / audio.duration);
        }
      };
      audio.onended = () => {
        setAudioProgress(1);
        if (nextIndex < explainerFrames.length - 1) {
          void playFrame(nextIndex + 1, true);
        } else {
          setPlaying(false);
        }
      };
      audio.onerror = () => {
        setPlaying(false);
        setVoiceError("The instructor narration could not be played.");
      };
      await audio.play();
      setPlaying(true);
    } catch {
      if (requestId === requestRef.current) {
        setVoiceError(
          "Natural instructor narration will play here when the voice service is connected.",
        );
        setPlaying(false);
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }

  function pause() {
    audioRef.current?.pause();
    setPlaying(false);
  }

  function selectFrame(index: number) {
    releaseAudio();
    setFrameIndex(index);
    setAudioProgress(0);
    setPlaying(false);
    setLoading(false);
    setVoiceError("");
  }

  const frame = explainerFrames[frameIndex];
  const totalProgress =
    ((frameIndex + audioProgress) / explainerFrames.length) * 100;

  return (
    <section className="my-20 overflow-hidden rounded-[2rem] bg-[#10283f] text-white shadow-[0_30px_80px_rgba(16,40,63,.2)]">
      <div className="border-b border-white/10 px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.17em] text-[#f2c568]">
              <Volume2 size={15} /> Narrated visual explainer
            </div>
            <h2 className="mt-2 font-serif text-3xl font-semibold">
              How one bore changes across three views
            </h2>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200">
            About 60 seconds
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.35fr_.65fr]">
        <div className="relative min-h-[390px] overflow-hidden bg-[#e9eff0]">
          <div key={frame.focus} className="explainer-frame absolute inset-0">
            <ExplainerPicture focus={frame.focus} />
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#07111f]/95 via-[#07111f]/70 to-transparent px-6 pb-6 pt-24 sm:px-8">
            <p className="text-xs font-black uppercase tracking-[.17em] text-[#f2c568]">
              {frame.eyebrow}
            </p>
            <p className="mt-2 max-w-2xl text-lg font-semibold leading-7">
              {frame.caption}
            </p>
          </div>
        </div>

        <div className="flex min-h-[390px] flex-col p-6 sm:p-8">
          <div className="flex-1">
            <p className="text-xs font-black uppercase tracking-[.17em] text-[#8ea7ba]">
              Instructor narration
            </p>
            <h3 className="mt-3 text-2xl font-bold leading-8">{frame.title}</h3>
            <p className="mt-5 text-sm leading-7 text-slate-300">
              {frame.narration}
            </p>
            {voiceError && (
              <p className="mt-4 rounded-xl bg-amber-300/10 p-3 text-xs leading-5 text-amber-200">
                {voiceError}
              </p>
            )}
          </div>

          <div className="mt-7">
            <div className="mb-4 flex gap-1.5">
              {explainerFrames.map((item, index) => (
                <button
                  key={item.title}
                  onClick={() => selectFrame(index)}
                  aria-label={`Show visual ${index + 1}: ${item.title}`}
                  className={`h-1.5 flex-1 rounded-full transition ${
                    index < frameIndex
                      ? "bg-[#f2b744]"
                      : index === frameIndex
                        ? "bg-white"
                        : "bg-white/20"
                  }`}
                />
              ))}
            </div>

            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-[#f2b744] transition-[width] duration-200"
                style={{ width: `${totalProgress}%` }}
              />
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    playing ? pause() : void playFrame(frameIndex)
                  }
                  disabled={loading}
                  className="grid h-12 w-12 place-items-center rounded-full bg-[#f2b744] text-[#10283f] transition hover:scale-105 disabled:opacity-60"
                  aria-label={playing ? "Pause explainer" : "Play explainer"}
                >
                  {loading ? (
                    <LoaderCircle className="animate-spin" size={21} />
                  ) : playing ? (
                    <Pause size={20} fill="currentColor" />
                  ) : (
                    <Play className="ml-0.5" size={20} fill="currentColor" />
                  )}
                </button>
                <div>
                  <p className="text-sm font-bold">
                    {loading ? "Preparing narration…" : playing ? "Playing" : "Play explainer"}
                  </p>
                  <p className="text-xs text-slate-400">
                    Visual {frameIndex + 1} of {explainerFrames.length}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  selectFrame(0);
                  void playFrame(0, true);
                }}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-slate-300 hover:bg-white/10 hover:text-white"
                aria-label="Replay explainer"
              >
                <RotateCcw size={17} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .explainer-frame {
          animation: explainer-in 550ms ease-out both;
        }
        @keyframes explainer-in {
          from {
            opacity: 0;
            transform: scale(1.035);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </section>
  );
}

function ExplainerPicture({
  focus,
}: {
  focus: (typeof explainerFrames)[number]["focus"];
}) {
  if (focus === "overview") {
    return (
      <div className="relative h-full w-full bg-white">
        <Image
          src="/lesson-assets/engineering-drawing.png"
          alt="Complete multi-view engineering drawing"
          fill
          className="object-contain p-6 sm:p-10"
        />
      </div>
    );
  }

  const frontActive = focus === "front" || focus === "together";
  const topActive = focus === "top" || focus === "together";
  const sideActive = focus === "side" || focus === "together";

  return (
    <svg
      viewBox="0 0 760 470"
      className="h-full w-full"
      role="img"
      aria-label="Animated orthographic drawing demonstrating a bore across three views"
    >
      <defs>
        <pattern id={`explainer-grid-${focus}`} width="22" height="22" patternUnits="userSpaceOnUse">
          <path d="M 22 0 L 0 0 0 22" fill="none" stroke="#dce5e7" strokeWidth="1" />
        </pattern>
        <filter id={`explainer-glow-${focus}`}>
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="760" height="470" fill="#f7faf9" />
      <rect width="760" height="470" fill={`url(#explainer-grid-${focus})`} />

      <g opacity={frontActive ? 1 : 0.28} className="transition-opacity duration-500">
        <rect x="80" y="65" width="235" height="145" rx="3" fill="#fff" stroke="#16334a" strokeWidth="6" />
        <circle
          cx="197"
          cy="137"
          r="46"
          fill={frontActive ? "#fff3cd" : "#fff"}
          stroke={frontActive ? "#d2931c" : "#16334a"}
          strokeWidth={frontActive ? 9 : 6}
          filter={frontActive ? `url(#explainer-glow-${focus})` : undefined}
        />
        <line x1="197" y1="48" x2="197" y2="226" stroke="#d2931c" strokeWidth="2" strokeDasharray="28 8 8 8" />
        <line x1="62" y1="137" x2="332" y2="137" stroke="#d2931c" strokeWidth="2" strokeDasharray="28 8 8 8" />
        <text x="80" y="43" fill="#435560" fontSize="17" fontWeight="800" letterSpacing="2">FRONT VIEW</text>
      </g>

      <g opacity={topActive ? 1 : 0.28} className="transition-opacity duration-500">
        <rect x="80" y="300" width="235" height="110" rx="3" fill="#fff" stroke="#16334a" strokeWidth="6" />
        <line x1="150" y1="300" x2="150" y2="410" stroke="#d2931c" strokeWidth={topActive ? 7 : 4} strokeDasharray="16 10" />
        <line x1="244" y1="300" x2="244" y2="410" stroke="#d2931c" strokeWidth={topActive ? 7 : 4} strokeDasharray="16 10" />
        <line x1="197" y1="280" x2="197" y2="430" stroke="#d2931c" strokeWidth="2" strokeDasharray="28 8 8 8" />
        <text x="80" y="277" fill="#435560" fontSize="17" fontWeight="800" letterSpacing="2">TOP VIEW</text>
      </g>

      <g opacity={sideActive ? 1 : 0.28} className="transition-opacity duration-500">
        <rect x="475" y="65" width="170" height="145" rx="3" fill="#fff" stroke="#16334a" strokeWidth="6" />
        <line x1="513" y1="65" x2="513" y2="210" stroke="#d2931c" strokeWidth={sideActive ? 7 : 4} strokeDasharray="16 10" />
        <line x1="607" y1="65" x2="607" y2="210" stroke="#d2931c" strokeWidth={sideActive ? 7 : 4} strokeDasharray="16 10" />
        <line x1="560" y1="45" x2="560" y2="230" stroke="#d2931c" strokeWidth="2" strokeDasharray="28 8 8 8" />
        <text x="475" y="43" fill="#435560" fontSize="17" fontWeight="800" letterSpacing="2">RIGHT-SIDE VIEW</text>
      </g>

      {focus === "together" && (
        <g stroke="#d2931c" strokeWidth="4" fill="none" strokeDasharray="7 7">
          <path d="M330 137 C385 137 415 137 460 137" />
          <path d="M197 230 C197 250 197 265 197 282" />
        </g>
      )}

      <g transform="translate(430 305)">
        <rect width="260" height="82" rx="16" fill="#10283f" />
        <text x="22" y="32" fill="#f2c568" fontSize="14" fontWeight="800" letterSpacing="1.5">
          {focus === "front" ? "VISIBLE OBJECT LINE" : focus === "top" || focus === "side" ? "HIDDEN-LINE PAIR" : "ONE CONTINUOUS BORE"}
        </text>
        <text x="22" y="58" fill="#d8e2e8" fontSize="15">
          {focus === "front" ? "Looking into the opening" : focus === "top" || focus === "side" ? "Edges behind solid material" : "Verified across all views"}
        </text>
      </g>
    </svg>
  );
}

function InlineActivity({
  number,
  title,
  description,
  time,
  onClick,
}: {
  number: string;
  title: string;
  description: string;
  time: string;
  onClick: () => void;
}) {
  return (
    <aside className="my-12 overflow-hidden rounded-[1.75rem] border border-[#10283f]/10 bg-white shadow-[0_16px_40px_rgba(16,40,63,.08)]">
      <div className="grid sm:grid-cols-[110px_1fr_auto] sm:items-center">
        <div className="grid h-full min-h-28 place-items-center bg-[#eef3f4] py-6 text-[#10283f]">
          <div className="text-center">
            <Layers3 className="mx-auto text-[#d19829]" size={27} />
            <span className="mt-2 block font-serif text-2xl font-semibold">{number}</span>
          </div>
        </div>
        <div className="p-6 sm:px-7">
          <p className="text-[11px] font-black uppercase tracking-[.17em] text-[#9a6b18]">
            Practice here · {time}
          </p>
          <h3 className="mt-2 text-xl font-bold text-[#10283f]">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#59636d]">
            {description}
          </p>
          <p className="mt-2 text-xs font-semibold text-[#78838b]">
              Your AI coach is available for guidance and feedback.
          </p>
        </div>
        <div className="px-6 pb-6 sm:p-6 sm:pl-0">
          <button
            onClick={onClick}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#10283f] px-5 py-3 font-bold text-white transition hover:bg-[#183c59] sm:w-auto"
          >
            Start activity
            <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </aside>
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
