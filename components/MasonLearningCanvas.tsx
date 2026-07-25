"use client";

import { FormEvent, useRef, useState } from "react";
import {
  Bot,
  Check,
  CheckCircle2,
  MessageCircle,
  Send,
  Volume2,
} from "lucide-react";
import type { PublicMasonCourse } from "@/lib/mason";

type HazardId = "ground" | "angle" | "top";
type ChatEntry = { role: "user" | "assistant"; content: string };

const hazards: Array<{
  id: HazardId;
  label: string;
  x: number;
  y: number;
  feedback: string;
}> = [
  {
    id: "ground",
    label: "Unstable ground",
    x: 25,
    y: 82,
    feedback: "Good catch. Loose ground can let the ladder feet shift without warning.",
  },
  {
    id: "angle",
    label: "Incorrect angle",
    x: 48,
    y: 55,
    feedback: "Exactly. The angle controls whether the base slides or the ladder tips backward.",
  },
  {
    id: "top",
    label: "Unsecured top",
    x: 70,
    y: 19,
    feedback: "Right. The upper contact point needs to be stable and secured when required.",
  },
];

export default function MasonLearningCanvas({
  course,
}: {
  course: PublicMasonCourse;
}) {
  const [phase, setPhase] = useState<"inspect" | "position" | "secure" | "complete">(
    "inspect",
  );
  const [found, setFound] = useState<HazardId[]>([]);
  const [baseDistance, setBaseDistance] = useState(2);
  const [feedback, setFeedback] = useState(
    "Before I explain anything, inspect this setup. Click the three areas that deserve attention.",
  );
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const progress =
    phase === "inspect"
      ? Math.round((found.length / hazards.length) * 35)
      : phase === "position"
        ? 55
        : phase === "secure"
          ? 78
          : 100;

  function inspectHazard(id: HazardId) {
    if (phase !== "inspect" || found.includes(id)) return;
    const hazard = hazards.find((item) => item.id === id)!;
    const next = [...found, id];
    setFound(next);
    setFeedback(hazard.feedback);
    void speak(hazard.feedback);

    if (next.length === hazards.length) {
      window.setTimeout(() => {
        const message =
          "You found all three. Now I’m moving us closer to the base. Set the ladder for a sixteen-foot working height.";
        setPhase("position");
        setFeedback(message);
        void speak(message);
      }, 1200);
    }
  }

  function checkDistance() {
    if (baseDistance === 4) {
      const message =
        "That’s it. Sixteen feet divided by four gives us a four-foot base distance. Now secure the ladder by selecting the safest upper contact point.";
      setFeedback(message);
      setPhase("secure");
      void speak(message);
    } else {
      const message =
        baseDistance < 4
          ? "That base is too close. The ladder is becoming too steep. Use the four-to-one relationship."
          : "That base is too far out. The ladder is becoming too shallow. Try the four-to-one relationship.";
      setFeedback(message);
      void speak(message);
    }
  }

  function secureTop() {
    if (phase !== "secure") return;
    const message =
      "Correct. You inspected the environment, positioned the base, and secured the upper contact point. That is a complete setup decision—not a memorized slide.";
    setPhase("complete");
    setFeedback(message);
    void speak(message);
  }

  async function speak(text: string) {
    audioRef.current?.pause();
    setSpeaking(true);
    try {
      const response = await fetch("/api/mason/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error("Natural voice unavailable");
      const url = URL.createObjectURL(await response.blob());
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch {
      const fallback = new SpeechSynthesisUtterance(text);
      fallback.rate = 0.96;
      fallback.onend = () => setSpeaking(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(fallback);
    }
  }

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
      const reply = data.reply || data.error || "Ask me that again.";
      setMessages([...next, { role: "assistant", content: reply }]);
      setFeedback(reply);
      void speak(reply);
    } finally {
      setThinking(false);
    }
  }

  const cameraTransform =
    phase === "position"
      ? "scale(1.55) translate(15%, -15%)"
      : phase === "secure"
        ? "scale(1.35) translate(-9%, 13%)"
        : "scale(1) translate(0, 0)";

  return (
    <main className="h-screen overflow-hidden bg-[#07111f] text-white">
      <div className="grid h-full grid-cols-[88px_1fr] lg:grid-cols-[240px_1fr]">
        <aside className="z-20 border-r border-white/10 bg-[#081522]">
          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-4 lg:px-5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-400 text-slate-950">
              <Bot size={24} />
            </div>
            <div className="hidden lg:block">
              <p className="font-bold">Mason</p>
              <p className="text-xs text-emerald-300">AI instructor</p>
            </div>
          </div>
          <div className="hidden p-5 lg:block">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">
              {course.title}
            </p>
            <div className="mt-5 space-y-4 text-sm">
              {[
                ["Inspect", phase !== "inspect"],
                ["Position", phase === "secure" || phase === "complete"],
                ["Secure", phase === "complete"],
                ["Discuss", false],
              ].map(([label, complete], index) => (
                <div className="flex items-center gap-3" key={String(label)}>
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
                      complete
                        ? "bg-emerald-400 text-slate-950"
                        : index ===
                            ["inspect", "position", "secure", "complete"].indexOf(phase)
                          ? "bg-amber-400 text-slate-950"
                          : "bg-white/10 text-slate-400"
                    }`}
                  >
                    {complete ? <Check size={14} /> : index + 1}
                  </span>
                  <span className={complete ? "text-white" : "text-slate-400"}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="relative min-w-0 overflow-hidden">
          <div className="absolute left-0 right-0 top-0 z-20 flex h-16 items-center justify-between border-b border-white/10 bg-[#07111f]/85 px-5 backdrop-blur">
            <div>
              <p className="text-sm font-bold">Safe Ladder Setup</p>
              <p className="text-xs text-slate-400">Interact with the worksite</p>
            </div>
            <div className="w-40">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="absolute inset-0 top-16 overflow-hidden bg-gradient-to-b from-[#a8d7ed] via-[#d9edf3] to-[#b6c8ad]">
            <div
              className="absolute inset-0 transition-transform duration-[1400ms] ease-[cubic-bezier(.22,1,.36,1)]"
              style={{ transform: cameraTransform }}
            >
              <WorksiteScene
                found={found}
                phase={phase}
                onHazard={inspectHazard}
                onSecure={secureTop}
              />
            </div>

            {phase === "position" && (
              <div className="absolute bottom-40 right-6 z-20 w-[min(420px,calc(100%-3rem))] rounded-3xl bg-slate-950/92 p-5 shadow-2xl backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[.15em] text-amber-300">
                  Position the ladder
                </p>
                <p className="mt-2 font-bold">
                  Working height: 16 feet
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={baseDistance}
                    onChange={(event) => setBaseDistance(Number(event.target.value))}
                    className="flex-1 accent-amber-400"
                  />
                  <span className="w-16 rounded-xl bg-white/10 px-3 py-2 text-center font-black text-amber-300">
                    {baseDistance} ft
                  </span>
                </div>
                <button
                  onClick={checkDistance}
                  className="mt-4 w-full rounded-xl bg-amber-400 py-3 font-bold text-slate-950"
                >
                  Test this position
                </button>
              </div>
            )}

            <div className="absolute bottom-5 left-5 right-5 z-30 flex items-end gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-slate-950 text-amber-300 shadow-xl">
                <Bot size={29} />
              </div>
              <div className="max-w-2xl rounded-3xl rounded-bl-md bg-white/95 px-5 py-4 text-slate-900 shadow-2xl backdrop-blur">
                <p className="leading-7">{feedback}</p>
                <button
                  onClick={() => (speaking ? audioRef.current?.pause() : void speak(feedback))}
                  className="mt-2 flex items-center gap-1.5 text-xs font-bold text-slate-500"
                >
                  <Volume2 size={14} /> {speaking ? "Speaking…" : "Hear Mason"}
                </button>
              </div>
              {phase === "complete" && (
                <div className="ml-auto hidden rounded-2xl bg-emerald-400 px-5 py-4 font-bold text-slate-950 shadow-xl sm:block">
                  <CheckCircle2 className="mr-2 inline" /> Setup complete
                </div>
              )}
            </div>
          </div>

          <form
            onSubmit={askMason}
            className="absolute bottom-5 right-5 z-40 hidden w-80 items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/90 p-2 shadow-2xl backdrop-blur xl:flex"
          >
            <MessageCircle size={18} className="ml-2 text-amber-300" />
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask Mason…"
              className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none"
            />
            <button
              disabled={!question.trim() || thinking}
              className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400 text-slate-950 disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function WorksiteScene({
  found,
  phase,
  onHazard,
  onSecure,
}: {
  found: HazardId[];
  phase: "inspect" | "position" | "secure" | "complete";
  onHazard: (id: HazardId) => void;
  onSecure: () => void;
}) {
  return (
    <div className="relative h-full w-full">
      <div className="absolute left-[8%] top-[8%] h-24 w-36 rounded-full bg-white/30 blur-2xl" />
      <div className="absolute bottom-0 left-0 right-0 h-[24%] bg-[#71805a]" />
      <div className="absolute bottom-[18%] left-[8%] right-[5%] h-[8%] -skew-x-12 bg-[#8d8874]" />
      <div className="absolute bottom-[22%] right-[12%] h-[70%] w-[12%] bg-slate-600 shadow-2xl">
        <div className="absolute inset-x-0 top-[18%] h-3 bg-slate-500" />
        <div className="absolute inset-x-0 top-[45%] h-3 bg-slate-500" />
      </div>

      <div className="absolute bottom-[21%] left-[37%] h-[68%] w-4 origin-bottom rotate-[18deg] rounded bg-amber-500 shadow-2xl">
        {Array.from({ length: 10 }).map((_, index) => (
          <span
            key={index}
            className="absolute -left-3 h-1.5 w-10 rounded bg-slate-700"
            style={{ bottom: `${index * 9.2 + 5}%` }}
          />
        ))}
      </div>

      {hazards.map((hazard) => {
        const active = found.includes(hazard.id);
        const isSecureTarget = phase === "secure" && hazard.id === "top";
        return (
          <button
            key={hazard.id}
            aria-label={hazard.label}
            onClick={() =>
              isSecureTarget ? onSecure() : onHazard(hazard.id)
            }
            className={`absolute z-10 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 transition-all duration-500 ${
              active
                ? "border-emerald-200 bg-emerald-400 text-slate-950 shadow-[0_0_0_10px_rgba(52,211,153,.18)]"
                : isSecureTarget
                  ? "animate-pulse border-amber-200 bg-amber-400/85 text-slate-950 shadow-[0_0_0_14px_rgba(251,191,36,.2)]"
                  : phase === "inspect"
                    ? "border-white bg-white/20 text-white shadow-[0_0_0_10px_rgba(255,255,255,.1)] hover:scale-110 hover:bg-white/35"
                    : "pointer-events-none border-transparent bg-transparent text-transparent"
            }`}
            style={{ left: `${hazard.x}%`, top: `${hazard.y}%` }}
          >
            {active ? <Check size={23} /> : <span className="text-xl font-black">?</span>}
            {(active || isSecureTarget) && (
              <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950/90 px-2 py-1 text-[11px] font-bold text-white">
                {isSecureTarget ? "Secure here" : hazard.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
