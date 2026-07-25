"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  Volume2,
} from "lucide-react";
import type { LessonMoment } from "@/lib/mason";

type Frame = {
  title: string;
  caption: string;
  narration: string;
  visualItems: string[];
};

function fallbackFrames(moment: LessonMoment): Frame[] {
  const items = moment.visualItems?.filter(Boolean).slice(0, 5) || [];
  if (items.length) {
    return items.map((item, index) => ({
      title: `${moment.title} · ${index + 1}`,
      caption: item,
      narration: `${item}. ${index === 0 ? moment.narration : ""}`.trim(),
      visualItems: [item],
    }));
  }
  return [
    {
      title: moment.title,
      caption: moment.cue || "Follow the key idea as the explanation unfolds.",
      narration: moment.narration,
      visualItems: [moment.title],
    },
  ];
}

function ExplainerVisual({
  style,
  frames,
  active,
}: {
  style: NonNullable<LessonMoment["explainerStyle"]>;
  frames: Frame[];
  active: number;
}) {
  const frame = frames[active];

  if (style === "guided-focus") {
    return (
      <div className="grid min-h-[350px] gap-8 p-7 sm:p-10 md:grid-cols-[1.15fr_.85fr] md:items-center">
        <div className="relative grid min-h-[250px] place-items-center overflow-hidden rounded-[2rem] border border-white/10 bg-white/[.04]">
          <span className="absolute h-52 w-52 rounded-full border border-[var(--accent)]/35" />
          <span className="absolute h-36 w-36 rounded-full border-2 border-[var(--accent)]/70 shadow-[0_0_70px_rgba(255,255,255,.08)]" />
          <span className="relative z-10 max-w-[240px] px-6 text-center text-2xl font-semibold leading-8">
            {frame.visualItems[0] || frame.title}
          </span>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-white/45">Focus point {active + 1}</p>
          <h3 className="mt-3 text-3xl font-semibold leading-tight">{frame.title}</h3>
          <div className="mt-6 space-y-3">
            {frame.visualItems.slice(1).map((item) => (
              <p key={item} className="flex gap-3 text-sm leading-6 text-white/70">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                {item}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (style === "compare-reveal") {
    const prior = frames[Math.max(0, active - 1)];
    return (
      <div className="grid min-h-[350px] gap-px bg-white/10 sm:grid-cols-2">
        <div className="bg-[var(--dark)] p-8 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-white/40">
            {active === 0 ? "Starting point" : "Before"}
          </p>
          <p className="mt-7 text-2xl font-semibold leading-8 text-white/55">{prior.caption}</p>
        </div>
        <div className="relative overflow-hidden bg-white/[.06] p-8 sm:p-10">
          <span className="absolute right-5 top-3 text-[7rem] font-semibold leading-none text-white/[.04]">
            {active + 1}
          </span>
          <p className="relative text-xs font-bold uppercase tracking-[.2em] text-[var(--accent)]">
            Reveal
          </p>
          <h3 className="relative mt-7 text-3xl font-semibold leading-tight">{frame.title}</h3>
          <p className="relative mt-5 text-lg leading-8 text-white/70">{frame.caption}</p>
        </div>
      </div>
    );
  }

  if (style === "step-build") {
    return (
      <div className="min-h-[350px] p-7 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-white/45">
          Building the idea
        </p>
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {frames.map((item, index) => (
            <div
              key={`${item.title}-${index}`}
              className={`relative rounded-2xl border p-5 transition-all duration-500 ${
                index <= active
                  ? "border-[var(--accent)]/60 bg-white/[.08] opacity-100"
                  : "border-white/10 bg-white/[.02] opacity-30"
              }`}
            >
              {index < active && (
                <Check className="absolute right-4 top-4 text-[var(--accent)]" size={17} />
              )}
              <span className="text-sm font-bold text-[var(--accent)]">{index + 1}</span>
              <p className="mt-5 font-semibold leading-6">{item.title}</p>
              {index === active && (
                <p className="mt-3 text-sm leading-6 text-white/60">{item.caption}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[350px] overflow-hidden p-7 sm:p-10">
      {frames.map((item, index) => {
        const distance = index - active;
        if (distance < 0 || distance > 2) return null;
        return (
          <div
            key={`${item.title}-${index}`}
            className="absolute inset-x-7 top-8 min-h-[275px] rounded-3xl border border-white/10 bg-[#f7f2e8] p-8 text-[var(--ink)] shadow-2xl transition-all duration-500 sm:inset-x-10"
            style={{
              zIndex: 10 - distance,
              transform: `translate(${distance * 14}px, ${distance * 12}px) scale(${1 - distance * 0.035})`,
              opacity: 1 - distance * 0.25,
            }}
          >
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--accent)]">
              Frame {index + 1} of {frames.length}
            </p>
            <h3 className="mt-5 max-w-xl text-3xl font-semibold leading-tight">{item.title}</h3>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{item.caption}</p>
            <div className="mt-7 flex flex-wrap gap-2">
              {item.visualItems.map((label) => (
                <span key={label} className="rounded-full bg-[var(--pale)] px-4 py-2 text-sm font-semibold">
                  {label}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function NarratedExplainer({ moment }: { moment: LessonMoment }) {
  const frames = useMemo(
    () => (moment.explainerFrames?.length ? moment.explainerFrames : fallbackFrames(moment)),
    [moment],
  );
  const style =
    moment.explainerStyle ||
    (moment.visualType === "anatomy"
      ? "guided-focus"
      : moment.visualType === "comparison"
        ? "compare-reveal"
        : moment.visualType === "formula"
          ? "step-build"
          : "flipbook");
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  function clearAudio() {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setAudioProgress(0);
  }

  useEffect(() => () => clearAudio(), []);

  async function playFrame(index: number) {
    clearAudio();
    setActive(index);
    setLoading(true);
    try {
      const frame = frames[index];
      const response = await fetch("/api/mason/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: frame.narration }),
      });
      if (!response.ok) throw new Error("Narration unavailable");
      const url = URL.createObjectURL(await response.blob());
      const audio = new Audio(url);
      urlRef.current = url;
      audioRef.current = audio;
      audio.ontimeupdate = () => {
        setAudioProgress(audio.duration ? audio.currentTime / audio.duration : 0);
      };
      audio.onended = () => {
        if (index < frames.length - 1) playFrame(index + 1);
        else {
          setPlaying(false);
          setAudioProgress(1);
        }
      };
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    if (loading) return;
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else if (audioRef.current) {
      audioRef.current.play();
      setPlaying(true);
    } else {
      playFrame(active);
    }
  }

  function move(index: number) {
    clearAudio();
    setPlaying(false);
    setActive(Math.max(0, Math.min(frames.length - 1, index)));
  }

  const overallProgress = ((active + audioProgress) / frames.length) * 100;

  return (
    <div className="overflow-hidden rounded-3xl bg-[var(--dark)] text-white shadow-[0_30px_80px_rgba(15,23,42,.22)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-5 sm:px-8">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-white/55">
          <Volume2 size={15} className="text-[var(--accent)]" /> Narrated visual explainer
        </p>
        <span className="rounded-full bg-white/[.07] px-3 py-1 text-xs font-semibold text-white/50">
          {style.replace("-", " ")}
        </span>
      </div>

      <ExplainerVisual style={style} frames={frames} active={active} />

      <div className="border-t border-white/10 bg-black/10 px-6 py-6 sm:px-8">
        <p className="min-h-14 text-sm leading-6 text-white/65">{frames[active].narration}</p>
        <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/10">
          <span
            className="block h-full bg-[var(--accent)] transition-[width] duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => move(active - 1)}
              disabled={active === 0}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/70 disabled:opacity-25"
              aria-label="Previous frame"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={toggle}
              className="flex h-12 items-center gap-2 rounded-full bg-white px-5 font-bold text-[var(--dark)]"
            >
              {loading ? (
                <LoaderCircle className="animate-spin" size={19} />
              ) : playing ? (
                <Pause size={19} fill="currentColor" />
              ) : (
                <Play size={19} fill="currentColor" />
              )}
              {loading ? "Preparing…" : playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={() => move(active + 1)}
              disabled={active === frames.length - 1}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/70 disabled:opacity-25"
              aria-label="Next frame"
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={() => move(0)}
              className="grid h-10 w-10 place-items-center rounded-full text-white/45 hover:text-white"
              aria-label="Replay from beginning"
            >
              <RotateCcw size={17} />
            </button>
          </div>
          <div className="hidden gap-1.5 sm:flex">
            {frames.map((frame, index) => (
              <button
                type="button"
                key={`${frame.title}-${index}`}
                onClick={() => move(index)}
                className={`h-2 rounded-full transition-all ${
                  index === active ? "w-7 bg-[var(--accent)]" : "w-2 bg-white/20"
                }`}
                aria-label={`Show frame ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
