"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
type ContentSlide = {
  type: "content";
  title: string;
  text: string;
  image?: string;
  imagePosition?: "left" | "right" | "top" | "none";
};

type VideoSlide = {
  type: "video";
  title: string;
  text?: string;
  video: string;
};

type QuizSlide = {
  type: "quiz";
  question: string;
  options: string[];
  correct: number;
  correctText?: string;
  incorrectText?: string;
};

type TrueFalseSlide = {
  type: "truefalse";
  question: string;
  correct: boolean;
  correctText?: string;
  incorrectText?: string;
};

type StepsSlide = {
  type: "steps";
  title: string;
  steps: string[];
};

type HotspotSlide = {
  type: "hotspots";
  title: string;
  image: string;
  points: {
    x: number;
    y: number;
    text: string;
  }[];
};

type CalloutSlide = {
  type: "callout";
  title: string;
  text: string;
};

type CompletionSlide = {
  type: "completion";
  title: string;
  text: string;
};

type Slide =
  | ContentSlide
  | VideoSlide
  | QuizSlide
  | TrueFalseSlide
  | StepsSlide
  | HotspotSlide
  | CalloutSlide
  | CompletionSlide;

function CourseContent()  {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const params = useSearchParams();
const code = params.get("code") || "";

  const [quizFeedback, setQuizFeedback] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const [tfFeedback, setTfFeedback] = useState("");
  const [tfSelected, setTfSelected] = useState<boolean | null>(null);

  const [revealedSteps, setRevealedSteps] = useState(1);
  const [hotspotText, setHotspotText] = useState("");

  const synthRef = useRef<SpeechSynthesis | null>(null);

  const current = slides[index];



useEffect(() => {
  if (!code) return;

  async function loadCourse() {
    try {
      // 1) Get student record
      const res = await fetch(`/api/course?code=${encodeURIComponent(code)}`);
      const record = await res.json();

      if (!record || record.error) {
        setLoading(false);
        return;
      }

      // 2) Convert "Ladder Safety" → "LadderSafety"
const folder = record.CourseName.replace(/\s+/g, "").replace(/[^a-zA-Z0-9_-]/g, "");
      // 3) Load correct JSON
const mod = await fetch(`/${folder}/module.json`);      
const data = await mod.json();

      setSlides(data.slides || []);

      // 4) Start position from Progress
      const start =
        record.Progress && Number(record.Progress) > 0
          ? Number(record.Progress)
          : 0;

      setIndex(start);

    } catch (err) {
      console.error("Failed to load course:", err);
    } finally {
      setLoading(false);
    }
  }

  loadCourse();
}, [code]);

  useEffect(() => {
    setQuizFeedback("");
    setSelectedAnswer(null);
    setTfFeedback("");
    setTfSelected(null);
    setRevealedSteps(1);
    setHotspotText("");
  }, [index]);

  const speakSlide = () => {
    if (!current || !synthRef.current) return;

    synthRef.current.cancel();

    let textToRead = "";

    switch (current.type) {
      case "content":
        textToRead = `${current.title}. ${current.text}`;
        break;
      case "video":
        textToRead = `${current.title}. ${current.text || ""}`;
        break;
      case "quiz":
        textToRead = `${current.question}. Choices are: ${current.options.join(", ")}`;
        break;
      case "truefalse":
        textToRead = `${current.question}. True or False.`;
        break;
      case "steps":
        textToRead = `${current.title}. Step 1: ${current.steps[0]}`;
        break;
      case "hotspots":
        textToRead = `${current.title}. Click the highlighted points on the image to learn more.`;
        break;
      case "callout":
        textToRead = `${current.title}. ${current.text}`;
        break;
      case "completion":
        textToRead = `${current.title}. ${current.text}`;
        break;
    }

    const utter = new SpeechSynthesisUtterance(textToRead);
    synthRef.current.speak(utter);
  };

  const stopSpeaking = () => {
    synthRef.current?.cancel();
  };

  const nextSlide = () => {
    if (index < slides.length - 1) {
      setIndex((prev) => prev + 1);
    }
  };

  const prevSlide = () => {
    if (index > 0) {
      setIndex((prev) => prev - 1);
    }
  };

  const renderContentSlide = (slide: ContentSlide) => {
    const imagePosition = slide.imagePosition || "right";

    if (imagePosition === "top") {
      return (
        <div className="flex flex-col gap-6">
          {slide.image && (
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full max-h-[350px] object-cover rounded-2xl border border-slate-600"
            />
          )}
          <div>
            <h2 className="text-3xl font-bold text-white mb-4">{slide.title}</h2>
            <p className="text-lg leading-8 text-slate-200 whitespace-pre-line">{slide.text}</p>
          </div>
        </div>
      );
    }

    if (imagePosition === "none" || !slide.image) {
      return (
        <div>
          <h2 className="text-3xl font-bold text-white mb-4">{slide.title}</h2>
          <p className="text-lg leading-8 text-slate-200 whitespace-pre-line">{slide.text}</p>
        </div>
      );
    }

    return (
      <div
        className={`grid grid-cols-1 md:grid-cols-2 gap-8 items-center ${
          imagePosition === "left" ? "" : ""
        }`}
      >
        {imagePosition === "left" && (
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full rounded-2xl border border-slate-600 object-cover max-h-[400px]"
          />
        )}

        <div>
          <h2 className="text-3xl font-bold text-white mb-4">{slide.title}</h2>
          <p className="text-lg leading-8 text-slate-200 whitespace-pre-line">{slide.text}</p>
        </div>

        {imagePosition === "right" && (
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full rounded-2xl border border-slate-600 object-cover max-h-[400px]"
          />
        )}
      </div>
    );
  };

  const renderVideoSlide = (slide: VideoSlide) => {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-3">{slide.title}</h2>
          {slide.text && (
            <p className="text-lg leading-8 text-slate-200 whitespace-pre-line">{slide.text}</p>
          )}
        </div>

        <video
          controls
          className="w-full rounded-2xl border border-slate-600 bg-black"
        >
          <source src={slide.video} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  };

  const renderQuizSlide = (slide: QuizSlide) => {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-white">{slide.question}</h2>

        <div className="grid gap-4">
          {slide.options.map((option, i) => {
            const isSelected = selectedAnswer === i;
            return (
              <button
                key={i}
                onClick={() => {
                  setSelectedAnswer(i);
                  if (i === slide.correct) {
                    setQuizFeedback(
                      slide.correctText || "Correct!"
                    );
                  } else {
                    setQuizFeedback(
                      slide.incorrectText ||
                        `Incorrect. The correct answer is: ${slide.options[slide.correct]}`
                    );
                  }
                }}
                className={`text-left p-4 rounded-xl border transition ${
                  isSelected
                    ? "bg-blue-900 border-blue-400 text-white"
                    : "bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>

        {quizFeedback && (
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-4 text-slate-100">
            {quizFeedback}
          </div>
        )}
      </div>
    );
  };

  const renderTrueFalseSlide = (slide: TrueFalseSlide) => {
    const handleAnswer = (answer: boolean) => {
      setTfSelected(answer);
      if (answer === slide.correct) {
        setTfFeedback(slide.correctText || "Correct!");
      } else {
        setTfFeedback(
          slide.incorrectText ||
            `Incorrect. The correct answer is ${slide.correct ? "True" : "False"}.`
        );
      }
    };

    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-white">{slide.question}</h2>

        <div className="flex gap-4">
          <button
            onClick={() => handleAnswer(true)}
            className={`px-6 py-4 rounded-xl border ${
              tfSelected === true
                ? "bg-blue-900 border-blue-400 text-white"
                : "bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700"
            }`}
          >
            True
          </button>

          <button
            onClick={() => handleAnswer(false)}
            className={`px-6 py-4 rounded-xl border ${
              tfSelected === false
                ? "bg-blue-900 border-blue-400 text-white"
                : "bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700"
            }`}
          >
            False
          </button>
        </div>

        {tfFeedback && (
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-4 text-slate-100">
            {tfFeedback}
          </div>
        )}
      </div>
    );
  };

  const renderStepsSlide = (slide: StepsSlide) => {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-white">{slide.title}</h2>

        <div className="space-y-4">
          {slide.steps.slice(0, revealedSteps).map((step, i) => (
            <div
              key={i}
              className="bg-slate-800 border border-slate-600 rounded-xl p-4 text-slate-100"
            >
              <span className="font-semibold text-blue-300">Step {i + 1}:</span> {step}
            </div>
          ))}
        </div>

        {revealedSteps < slide.steps.length && (
          <button
            onClick={() => setRevealedSteps((prev) => prev + 1)}
            className="px-5 py-3 bg-blue-900 hover:bg-blue-800 text-white rounded-xl"
          >
            Reveal Next Step
          </button>
        )}
      </div>
    );
  };

  const renderHotspotsSlide = (slide: HotspotSlide) => {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-white">{slide.title}</h2>

        <div className="relative w-full max-w-4xl mx-auto">
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full rounded-2xl border border-slate-600"
          />

          {slide.points.map((point, i) => (
            <button
              key={i}
              onClick={() => setHotspotText(point.text)}
              className="absolute w-6 h-6 rounded-full bg-yellow-400 border-2 border-black hover:scale-110 transition"
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`,
                transform: "translate(-50%, -50%)",
              }}
              aria-label={`Hotspot ${i + 1}`}
            />
          ))}
        </div>

        {hotspotText && (
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-4 text-slate-100">
            {hotspotText}
          </div>
        )}
      </div>
    );
  };

  const renderCalloutSlide = (slide: CalloutSlide) => {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="w-full max-w-3xl bg-yellow-300 text-slate-900 rounded-3xl shadow-xl p-10 text-center">
          <h2 className="text-3xl font-bold mb-4">{slide.title}</h2>
          <p className="text-xl leading-9">{slide.text}</p>
        </div>
      </div>
    );
  };

  const renderCompletionSlide = (slide: CompletionSlide) => {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-bold text-green-300">{slide.title}</h2>
          <p className="text-xl text-slate-200">{slide.text}</p>
        </div>
      </div>
    );
  };

  const renderSlide = () => {
    if (!current) return null;

    switch (current.type) {
      case "content":
        return renderContentSlide(current);
      case "video":
        return renderVideoSlide(current);
      case "quiz":
        return renderQuizSlide(current);
      case "truefalse":
        return renderTrueFalseSlide(current);
      case "steps":
        return renderStepsSlide(current);
      case "hotspots":
        return renderHotspotsSlide(current);
      case "callout":
        return renderCalloutSlide(current);
      case "completion":
        return renderCompletionSlide(current);
      default:
        return <div className="text-white">Unknown slide type</div>;
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center">
        <div className="text-xl">Loading course...</div>
      </main>
    );
  }

  if (!slides.length) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center">
        <div className="text-xl">No slides found.</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 px-6 py-10">
    <div className="max-w-4xl mx-auto">
        <div className="bg-slate-900/70 border border-slate-700 rounded-3xl p-8 shadow-2xl">
        
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            
            
            <div>
              <p className="text-slate-300 text-sm">
                Slide {index + 1} of {slides.length}
              </p>
              <div className="w-64 h-3 bg-slate-700 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${((index + 1) / slides.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={speakSlide}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl"
              >
                Read Slide
              </button>
              <button
                onClick={stopSpeaking}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl"
              >
                Stop
              </button>
            </div>
          </div>

         <div className="min-h-[380px] text-slate-800">{renderSlide()}</div>

          <div className="flex justify-between mt-10">
            <button
              onClick={prevSlide}
              disabled={index === 0}
              className="px-5 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white"
            >
              Previous
            </button>

            <button
              onClick={nextSlide}
              disabled={index === slides.length - 1}
              className="px-5 py-3 rounded-xl bg-blue-900 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
export default function CoursePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center">
        <div className="text-xl">Loading course...</div>
      </main>
    }>
      <CourseContent />
    </Suspense>
  );
}