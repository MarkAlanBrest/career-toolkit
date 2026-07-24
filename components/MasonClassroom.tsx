"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  CheckCircle2,
  CircleStop,
  Image as ImageIcon,
  Menu,
  Mic,
  Send,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import type {
  LessonMoment,
  PublicMasonCourse,
  PublicMasonSection,
} from "@/lib/mason";

type TimelineEntry =
  | { id: string; type: "moment"; momentIndex: number }
  | {
      id: string;
      type: "message";
      role: "user" | "assistant";
      content: string;
    };

type AnswerState = {
  selected: number;
  feedback: string;
  correct: boolean;
};

function firstTimeline(): TimelineEntry[] {
  return [{ id: "moment-0", type: "moment", momentIndex: 0 }];
}

export default function MasonClassroom({ course }: { course: PublicMasonCourse }) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [momentIndex, setMomentIndex] = useState(0);
  const [timeline, setTimeline] = useState<TimelineEntry[]>(firstTimeline);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [question, setQuestion] = useState("");
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const section = course.sections[sectionIndex];
  const totalMoments = useMemo(
    () =>
      course.sections.reduce(
        (sum, item) => sum + item.lessonPlan.moments.length,
        0,
      ),
    [course.sections],
  );
  const completedBefore = course.sections
    .slice(0, sectionIndex)
    .reduce((sum, item) => sum + item.lessonPlan.moments.length, 0);
  const progress = Math.round(
    ((completedBefore + momentIndex + 1) / Math.max(totalMoments, 1)) * 100,
  );
  const atCourseEnd =
    sectionIndex === course.sections.length - 1 &&
    momentIndex === section.lessonPlan.moments.length - 1;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [timeline, thinking]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  function chooseSection(index: number) {
    stopSpeaking();
    setSectionIndex(index);
    setMomentIndex(0);
    setTimeline(firstTimeline());
    setAnswers({});
    setSpeaking(false);
    setMenuOpen(false);
  }

  function continueLesson() {
    if (atCourseEnd) return;
    stopSpeaking();

    if (momentIndex < section.lessonPlan.moments.length - 1) {
      const next = momentIndex + 1;
      setMomentIndex(next);
      setTimeline((current) => [
        ...current,
        { id: `moment-${sectionIndex}-${next}-${Date.now()}`, type: "moment", momentIndex: next },
      ]);
      return;
    }

    const nextSection = sectionIndex + 1;
    setSectionIndex(nextSection);
    setMomentIndex(0);
    setTimeline([
      {
        id: `section-${nextSection}-${Date.now()}`,
        type: "message",
        role: "assistant",
        content: `Great work. Let’s move into ${course.sections[nextSection].title}.`,
      },
      { id: `moment-${nextSection}-0`, type: "moment", momentIndex: 0 },
    ]);
    setAnswers({});
  }

  async function speak(text: string) {
    stopSpeaking();
    setSpeaking(true);

    try {
      const response = await fetch("/api/mason/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error("Natural voice unavailable.");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
        if (audioUrlRef.current === url) audioUrlRef.current = null;
      };
      audio.onerror = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch {
      if (!("speechSynthesis" in window)) {
        setSpeaking(false);
        return;
      }
      const fallback = new SpeechSynthesisUtterance(text);
      fallback.rate = 0.96;
      fallback.onend = () => setSpeaking(false);
      fallback.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(fallback);
    }
  }

  function stopSpeaking() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  function selectAnswer(moment: LessonMoment, index: number, indexInPlan: number) {
    const correct = moment.correctAnswer === index;
    const correction =
      moment.correctAnswer !== null && moment.choices
        ? `The strongest answer is “${moment.choices[moment.correctAnswer]}.”`
        : "Let’s think that through again.";
    const feedback = correct
      ? moment.feedback || "Exactly right."
      : `${correction} ${moment.feedback || ""}`.trim();

    setAnswers((current) => ({
      ...current,
      [indexInPlan]: { selected: index, feedback, correct },
    }));
  }

  async function askMason(event: FormEvent) {
    event.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || thinking) return;

    const userEntry: TimelineEntry = {
      id: `user-${Date.now()}`,
      type: "message",
      role: "user",
      content: cleanQuestion,
    };
    const nextTimeline = [...timeline, userEntry];
    setTimeline(nextTimeline);
    setQuestion("");
    setThinking(true);

    const messages = nextTimeline
      .filter(
        (
          entry,
        ): entry is Extract<TimelineEntry, { type: "message" }> =>
          entry.type === "message",
      )
      .map(({ role, content }) => ({ role, content }));

    try {
      const response = await fetch("/api/mason/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: section.id, messages }),
      });
      const data = await response.json();
      const reply =
        data.reply || data.error || "I couldn’t answer that just yet. Please try again.";
      setTimeline((current) => [
        ...current,
        {
          id: `mason-${Date.now()}`,
          type: "message",
          role: "assistant",
          content: reply,
        },
      ]);
      void speak(reply);
    } catch {
      setTimeline((current) => [
        ...current,
        {
          id: `mason-error-${Date.now()}`,
          type: "message",
          role: "assistant",
          content: "I lost the connection. Please ask me again.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <main className="h-screen overflow-hidden bg-[#f2f5f7] text-slate-900">
      <div className="flex h-full">
        <aside
          className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-800 bg-[#081522] text-white transition-transform lg:static lg:translate-x-0 ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-400 text-slate-950">
                <Bot size={24} />
              </div>
              <div>
                <p className="text-lg font-bold">Mason</p>
                <p className="text-xs text-emerald-300">AI teacher · online</p>
              </div>
            </div>
            <button className="lg:hidden" onClick={() => setMenuOpen(false)}>
              <X />
            </button>
          </div>

          <div className="border-b border-white/10 p-5">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">
              Your course
            </p>
            <h1 className="mt-2 font-bold leading-snug">{course.title}</h1>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-amber-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">{progress}% complete</p>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            <p className="px-2 py-3 text-xs font-bold uppercase tracking-[.15em] text-slate-500">
              Course sections
            </p>
            {course.sections.map((item, index) => (
              <button
                key={item.id}
                onClick={() => chooseSection(index)}
                className={`mb-2 flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                  index === sectionIndex
                    ? "bg-white text-slate-950"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                    index === sectionIndex
                      ? "bg-amber-400"
                      : index < sectionIndex
                        ? "bg-emerald-400/20 text-emerald-300"
                        : "bg-white/10"
                  }`}
                >
                  {index < sectionIndex ? <CheckCircle2 size={16} /> : index + 1}
                </span>
                <span className="line-clamp-2 text-sm font-semibold">{item.title}</span>
              </button>
            ))}
          </nav>
        </aside>

        {menuOpen && (
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-20 bg-black/60 lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
        )}

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button className="lg:hidden" onClick={() => setMenuOpen(true)}>
                <Menu />
              </button>
              <div>
                <p className="truncate font-bold">{section.title}</p>
                <p className="text-xs text-slate-500">
                  A live conversation with your instructor
                </p>
              </div>
            </div>
            {speaking ? (
              <button
                onClick={stopSpeaking}
                className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700"
              >
                <CircleStop size={17} /> Stop voice
              </button>
            ) : (
              <div className="hidden text-right sm:block">
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  Mason natural voice
                </span>
                <p className="mt-1 text-[10px] text-slate-400">AI-generated voice</p>
              </div>
            )}
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
              <div className="mb-10 text-center">
                <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-3xl bg-[#0b1b2c] text-amber-300 shadow-xl">
                  <Bot size={34} />
                </div>
                <h2 className="text-2xl font-bold">Class is in session</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Talk naturally. Ask Mason to slow down, explain why, or show an example.
                </p>
              </div>

              <div className="space-y-8">
                {timeline.map((entry) =>
                  entry.type === "moment" ? (
                    <MasonMoment
                      key={entry.id}
                      moment={section.lessonPlan.moments[entry.momentIndex]}
                      momentIndex={entry.momentIndex}
                      section={section}
                      answer={answers[entry.momentIndex]}
                      onAnswer={selectAnswer}
                      onSpeak={speak}
                    />
                  ) : (
                    <ChatMessage
                      key={entry.id}
                      entry={entry}
                      onSpeak={speak}
                    />
                  ),
                )}

                {thinking && (
                  <div className="flex items-start gap-3">
                    <MasonAvatar />
                    <div className="rounded-3xl rounded-tl-md bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200">
                      <span className="inline-flex gap-1.5">
                        <i className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400" />
                        <i className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400 [animation-delay:150ms]" />
                        <i className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400 [animation-delay:300ms]" />
                      </span>
                    </div>
                  </div>
                )}

                {!thinking && (
                  <div className="flex justify-center pt-2">
                    {atCourseEnd ? (
                      <div className="rounded-2xl bg-emerald-100 px-6 py-4 text-center font-bold text-emerald-900">
                        <CheckCircle2 className="mx-auto mb-1" />
                        You completed this course.
                      </div>
                    ) : (
                      <button
                        onClick={continueLesson}
                        className="rounded-2xl bg-[#0b1b2c] px-7 py-3.5 font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800"
                      >
                        Continue the lesson
                      </button>
                    )}
                  </div>
                )}
                <div ref={endRef} />
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4">
            <form
              onSubmit={askMason}
              className="mx-auto flex max-w-4xl items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-lg focus-within:border-slate-500"
            >
              <button
                type="button"
                title="Voice questions are coming next"
                className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-100"
              >
                <Mic size={20} />
              </button>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={1}
                placeholder="Talk to Mason…"
                className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 outline-none placeholder:text-slate-400"
              />
              <button
                disabled={!question.trim() || thinking}
                className="grid h-11 w-11 place-items-center rounded-xl bg-amber-400 text-slate-950 disabled:opacity-30"
              >
                <Send size={19} />
              </button>
            </form>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              Mason answers from the approved course material.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function MasonAvatar() {
  return (
    <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#0b1b2c] text-amber-300 shadow-md">
      <Bot size={21} />
      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#f2f5f7] bg-emerald-400" />
    </div>
  );
}

function ChatMessage({
  entry,
  onSpeak,
}: {
  entry: Extract<TimelineEntry, { type: "message" }>;
  onSpeak: (text: string) => void;
}) {
  if (entry.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-3xl rounded-tr-md bg-amber-400 px-5 py-3.5 leading-7 text-slate-950 shadow-sm">
          {entry.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <MasonAvatar />
      <div className="max-w-[85%] rounded-3xl rounded-tl-md bg-white px-5 py-4 leading-7 shadow-sm ring-1 ring-slate-200">
        <p>{entry.content}</p>
        <button
          onClick={() => onSpeak(entry.content)}
          className="mt-3 flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900"
        >
          <Volume2 size={14} /> Listen
        </button>
      </div>
    </div>
  );
}

function MasonMoment({
  moment,
  momentIndex,
  section,
  answer,
  onAnswer,
  onSpeak,
}: {
  moment: LessonMoment;
  momentIndex: number;
  section: PublicMasonSection;
  answer?: AnswerState;
  onAnswer: (moment: LessonMoment, index: number, momentIndex: number) => void;
  onSpeak: (text: string) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <MasonAvatar />
      <article className="min-w-0 max-w-[calc(100%-3.25rem)] flex-1 rounded-3xl rounded-tl-md bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.15em] text-slate-500">
            {moment.kind}
          </span>
          <button
            onClick={() =>
              onSpeak(`${moment.title}. ${moment.narration} ${moment.prompt || ""}`)
            }
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900"
          >
            <Volume2 size={15} /> Listen
          </button>
        </div>
        <h3 className="text-xl font-bold sm:text-2xl">{moment.title}</h3>
        <p className="mt-3 text-[17px] leading-8 text-slate-700">
          {moment.narration}
        </p>

        <TeachingVisual moment={moment} section={section} />

        {moment.prompt && (
          <div className="mt-5 rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100">
            <p className="font-bold leading-7 text-slate-900">{moment.prompt}</p>
            {moment.choices && (
              <div className="mt-3 grid gap-2">
                {moment.choices.map((choice, index) => (
                  <button
                    key={choice}
                    onClick={() => onAnswer(moment, index, momentIndex)}
                    className={`rounded-xl border p-3 text-left text-sm font-semibold transition ${
                      answer?.selected === index
                        ? "border-amber-500 bg-amber-300 text-slate-950"
                        : "border-slate-200 bg-white hover:border-slate-400"
                    }`}
                  >
                    <span className="mr-2 text-xs opacity-50">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    {choice}
                  </button>
                ))}
              </div>
            )}
            {answer && (
              <div
                className={`mt-3 rounded-xl p-3 text-sm leading-6 ${
                  answer.correct
                    ? "bg-emerald-100 text-emerald-900"
                    : "bg-amber-100 text-amber-950"
                }`}
              >
                {answer.feedback}
              </div>
            )}
          </div>
        )}
      </article>
    </div>
  );
}

function TeachingVisual({
  moment,
  section,
}: {
  moment: LessonMoment;
  section: PublicMasonSection;
}) {
  if (moment.pageNumber && section.id !== 0) {
    return (
      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <div className="flex items-center justify-between bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600">
          <span className="flex items-center gap-2">
            <ImageIcon size={14} /> Mason is showing the source
          </span>
          <span>Page {moment.pageNumber}</span>
        </div>
        <iframe
          title={`Source page ${moment.pageNumber}`}
          src={`/api/mason/sections/${section.id}/pdf#page=${moment.pageNumber}&toolbar=0&navpanes=0`}
          className="h-[430px] w-full bg-white"
        />
      </div>
    );
  }

  if (moment.kind !== "visual") return null;

  return (
    <div className="mt-5 grid overflow-hidden rounded-2xl border border-slate-200 bg-[#0b1b2c] text-white sm:grid-cols-[.85fr_1.15fr]">
      <div className="flex flex-col justify-center p-5">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-amber-300">
          <Sparkles size={15} /> Mason&apos;s visual
        </div>
        <p className="text-sm leading-6 text-slate-300">
          The base distance is one quarter of the working height.
        </p>
        <div className="mt-4 rounded-xl bg-white/10 p-3 text-center text-xl font-black text-amber-300">
          Height ÷ 4 = Base
        </div>
      </div>
      <div className="relative min-h-60 overflow-hidden bg-gradient-to-b from-sky-200 to-sky-50">
        <div className="absolute bottom-0 right-8 h-[88%] w-4 bg-slate-700" />
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-emerald-800" />
        <div className="absolute bottom-7 left-[30%] h-[82%] w-3 origin-bottom rotate-[19deg] rounded bg-amber-500 shadow-xl">
          {Array.from({ length: 8 }).map((_, index) => (
            <span
              key={index}
              className="absolute -left-2 h-1 w-7 bg-slate-700"
              style={{ bottom: `${index * 12 + 7}%` }}
            />
          ))}
        </div>
        <div className="absolute bottom-10 left-[28%] flex w-[58%] items-center justify-center border-t-2 border-dashed border-slate-500 pt-2 text-xs font-black text-slate-700">
          1 part out
        </div>
        <div className="absolute right-14 top-10 flex h-[68%] items-center border-l-2 border-dashed border-slate-500 pl-2 text-xs font-black text-slate-700">
          4 parts up
        </div>
      </div>
    </div>
  );
}
