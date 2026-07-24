"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleStop,
  Image as ImageIcon,
  Menu,
  MessageCircle,
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

type Message = { role: "user" | "assistant"; content: string };

export default function MasonClassroom({ course }: { course: PublicMasonCourse }) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [momentIndex, setMomentIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const section = course.sections[sectionIndex];
  const moment = section.lessonPlan.moments[momentIndex];
  const totalMoments = course.sections.reduce(
    (sum, item) => sum + item.lessonPlan.moments.length,
    0,
  );
  const completedBefore = course.sections
    .slice(0, sectionIndex)
    .reduce((sum, item) => sum + item.lessonPlan.moments.length, 0);
  const progress = Math.round(
    ((completedBefore + momentIndex + 1) / Math.max(totalMoments, 1)) * 100,
  );

  useEffect(() => {
    setAnswer(null);
    setAnswerFeedback("");
  }, [sectionIndex, momentIndex]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function chooseSection(index: number) {
    window.speechSynthesis?.cancel();
    setSectionIndex(index);
    setMomentIndex(0);
    setMessages([]);
    setMenuOpen(false);
  }

  function nextMoment() {
    window.speechSynthesis?.cancel();
    if (momentIndex < section.lessonPlan.moments.length - 1) {
      setMomentIndex((value) => value + 1);
      return;
    }
    if (sectionIndex < course.sections.length - 1) {
      chooseSection(sectionIndex + 1);
    }
  }

  function previousMoment() {
    window.speechSynthesis?.cancel();
    if (momentIndex > 0) {
      setMomentIndex((value) => value - 1);
      return;
    }
    if (sectionIndex > 0) {
      const previous = course.sections[sectionIndex - 1];
      setSectionIndex(sectionIndex - 1);
      setMomentIndex(previous.lessonPlan.moments.length - 1);
    }
  }

  function speak(text = `${moment.title}. ${moment.narration} ${moment.prompt || ""}`) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.96;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  function selectAnswer(index: number) {
    setAnswer(index);
    if (moment.correctAnswer === index) {
      setAnswerFeedback(moment.feedback || "That’s right.");
    } else {
      const correction =
        moment.correctAnswer !== null && moment.choices
          ? `The strongest answer is “${moment.choices[moment.correctAnswer]}.”`
          : "Let’s think through that once more.";
      setAnswerFeedback(`${correction} ${moment.feedback || ""}`.trim());
    }
  }

  async function askMason(event: FormEvent) {
    event.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || thinking) return;
    const nextMessages: Message[] = [
      ...messages,
      { role: "user", content: cleanQuestion },
    ];
    setMessages(nextMessages);
    setQuestion("");
    setThinking(true);

    try {
      const response = await fetch("/api/mason/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: section.id,
          messages: nextMessages,
        }),
      });
      const data = await response.json();
      const reply =
        data.reply || data.error || "I couldn’t answer that just yet. Please try again.";
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
    } catch {
      setMessages([
        ...nextMessages,
        { role: "assistant", content: "I lost the connection. Please ask me again." },
      ]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <main className="h-screen overflow-hidden bg-[#07111f] text-white">
      <div className="flex h-full">
        <aside
          className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-white/10 bg-[#091625] transition-transform lg:static lg:translate-x-0 ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-400 text-slate-950">
                <Bot size={22} />
              </div>
              <div>
                <p className="font-bold">Mason</p>
                <p className="text-xs text-emerald-300">Your AI instructor</p>
              </div>
            </div>
            <button className="lg:hidden" onClick={() => setMenuOpen(false)}>
              <X />
            </button>
          </div>

          <div className="border-b border-white/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-[.15em] text-slate-500">
              Course
            </p>
            <h1 className="mt-2 font-bold leading-snug">{course.title}</h1>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-amber-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">{progress}% explored</p>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            <p className="px-2 py-3 text-xs font-semibold uppercase tracking-[.15em] text-slate-500">
              Lesson sections
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
          <div className="border-t border-white/10 p-4 text-xs text-slate-500">
            Source-grounded instruction
          </div>
        </aside>

        {menuOpen && (
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-20 bg-black/60 lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
        )}

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#07111f] px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button className="lg:hidden" onClick={() => setMenuOpen(true)}>
                <Menu />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{section.title}</p>
                <p className="text-xs text-slate-400">
                  Teaching moment {momentIndex + 1} of{" "}
                  {section.lessonPlan.moments.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {speaking ? (
                <button
                  onClick={stopSpeaking}
                  className="flex items-center gap-2 rounded-xl bg-red-400/15 px-3 py-2 text-sm font-semibold text-red-200"
                >
                  <CircleStop size={17} /> Stop
                </button>
              ) : (
                <button
                  onClick={() => speak()}
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/5"
                >
                  <Volume2 size={17} /> Hear Mason
                </button>
              )}
            </div>
          </header>

          <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,.55fr)]">
            <div className="min-h-0 overflow-y-auto p-4 sm:p-7">
              <div className="mx-auto flex min-h-full max-w-5xl flex-col">
                <div className="mb-4 flex items-center gap-3">
                  <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 shadow-[0_12px_40px_rgba(251,191,36,.2)]">
                    <Bot size={29} />
                    <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#07111f] bg-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold">Mason</p>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-300">
                        {moment.kind}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Teaching from {section.fileName}
                    </p>
                  </div>
                </div>

                <article className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#11243a] to-[#0b192a] p-6 shadow-2xl sm:p-9">
                  <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-amber-300/5 blur-3xl" />
                  <p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-amber-300">
                    {moment.kind === "scenario"
                      ? "Your decision"
                      : moment.kind === "question"
                        ? "Check your thinking"
                        : "Let’s explore"}
                  </p>
                  <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    {moment.title}
                  </h2>
                  <p className="mt-5 max-w-4xl text-lg leading-8 text-slate-200">
                    {moment.narration}
                  </p>

                  <TeachingVisual moment={moment} section={section} />

                  {moment.prompt && (
                    <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-5">
                      <p className="text-lg font-bold">{moment.prompt}</p>
                      {moment.choices && (
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          {moment.choices.map((choice, index) => (
                            <button
                              key={choice}
                              onClick={() => selectAnswer(index)}
                              className={`rounded-xl border p-4 text-left text-sm font-semibold transition ${
                                answer === index
                                  ? "border-amber-300 bg-amber-300 text-slate-950"
                                  : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                              }`}
                            >
                              <span className="mr-2 text-xs opacity-60">
                                {String.fromCharCode(65 + index)}.
                              </span>
                              {choice}
                            </button>
                          ))}
                        </div>
                      )}
                      {answerFeedback && (
                        <div
                          className={`mt-4 rounded-xl p-4 text-sm leading-6 ${
                            answer === moment.correctAnswer
                              ? "bg-emerald-400/15 text-emerald-100"
                              : "bg-sky-400/15 text-sky-100"
                          }`}
                        >
                          {answerFeedback}
                        </div>
                      )}
                    </div>
                  )}
                </article>

                <div className="mt-5 flex items-center justify-between">
                  <button
                    onClick={previousMoment}
                    disabled={sectionIndex === 0 && momentIndex === 0}
                    className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold disabled:opacity-30"
                  >
                    <ArrowLeft size={17} /> Back
                  </button>
                  <div className="hidden items-center gap-1.5 sm:flex">
                    {section.lessonPlan.moments.map((_, index) => (
                      <span
                        key={index}
                        className={`h-1.5 rounded-full transition-all ${
                          index === momentIndex
                            ? "w-6 bg-amber-400"
                            : index < momentIndex
                              ? "w-2 bg-emerald-400"
                              : "w-2 bg-white/15"
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={nextMoment}
                    disabled={
                      sectionIndex === course.sections.length - 1 &&
                      momentIndex === section.lessonPlan.moments.length - 1
                    }
                    className="flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-30"
                  >
                    Continue <ArrowRight size={17} />
                  </button>
                </div>
              </div>
            </div>

            <aside className="flex min-h-0 flex-col border-l border-white/10 bg-[#0a1727]">
              <div className="border-b border-white/10 p-4">
                <div className="flex items-center gap-2 font-bold">
                  <MessageCircle size={18} className="text-amber-300" />
                  Talk with Mason
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Interrupt, ask why, or request another example.
                </p>
              </div>
              <div
                ref={transcriptRef}
                className="flex-1 space-y-4 overflow-y-auto p-4"
              >
                <div className="rounded-2xl rounded-tl-sm bg-white/7 p-4 text-sm leading-6 text-slate-200">
                  I’m here with you throughout the lesson. Ask me anything about
                  this section.
                </div>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`rounded-2xl p-4 text-sm leading-6 ${
                      message.role === "user"
                        ? "ml-7 rounded-tr-sm bg-amber-400 text-slate-950"
                        : "mr-3 rounded-tl-sm bg-white/7 text-slate-200"
                    }`}
                  >
                    {message.content}
                    {message.role === "assistant" && (
                      <button
                        onClick={() => speak(message.content)}
                        className="mt-2 flex items-center gap-1 text-xs font-bold text-amber-300"
                      >
                        <Volume2 size={13} /> Listen
                      </button>
                    )}
                  </div>
                ))}
                {thinking && (
                  <div className="mr-16 rounded-2xl rounded-tl-sm bg-white/7 p-4">
                    <span className="inline-flex gap-1">
                      <i className="h-2 w-2 animate-pulse rounded-full bg-amber-300" />
                      <i className="h-2 w-2 animate-pulse rounded-full bg-amber-300 [animation-delay:150ms]" />
                      <i className="h-2 w-2 animate-pulse rounded-full bg-amber-300 [animation-delay:300ms]" />
                    </span>
                  </div>
                )}
              </div>
              <form onSubmit={askMason} className="border-t border-white/10 p-4">
                <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 focus-within:border-amber-300/50">
                  <button
                    type="button"
                    title="Voice questions are coming next"
                    className="rounded-xl p-2 text-slate-400 hover:bg-white/5"
                  >
                    <Mic size={18} />
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
                    placeholder="Ask Mason a question…"
                    className="max-h-28 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-slate-500"
                  />
                  <button
                    disabled={!question.trim() || thinking}
                    className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400 text-slate-950 disabled:opacity-30"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </aside>
          </div>
        </section>
      </div>
    </main>
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
      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white">
        <div className="flex items-center justify-between bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600">
          <span className="flex items-center gap-2">
            <ImageIcon size={14} /> Source visual
          </span>
          <span>PDF page {moment.pageNumber}</span>
        </div>
        <iframe
          title={`Source page ${moment.pageNumber}`}
          src={`/api/mason/sections/${section.id}/pdf#page=${moment.pageNumber}&toolbar=0&navpanes=0`}
          className="h-[440px] w-full bg-white"
        />
      </div>
    );
  }

  if (moment.kind === "visual") {
    return (
      <div className="mt-6 grid overflow-hidden rounded-2xl border border-sky-300/15 bg-[#081421] sm:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col justify-center p-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-sky-300">
            <Sparkles size={15} /> Mason&apos;s visual board
          </div>
          <p className="text-sm leading-6 text-slate-300">
            The base distance is one quarter of the working height.
          </p>
          <div className="mt-4 rounded-xl bg-white/5 p-4 text-center text-2xl font-black text-amber-300">
            Height ÷ 4 = Base
          </div>
        </div>
        <div className="relative min-h-64 overflow-hidden bg-gradient-to-b from-sky-200 to-sky-50">
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

  return null;
}
