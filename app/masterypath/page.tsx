"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type QuestionType = "mcq" | "boolean" | "match" | "sequence";

type Objective = {
  id: string;
  title: string;
  lesson: string;
};

type Question =
  | {
      id: string;
      objectiveId: string;
      type: "mcq";
      prompt: string;
      explanation: string;
      hint: string;
      options: { id: string; label: string }[];
      correctOptionId: string;
    }
  | {
      id: string;
      objectiveId: string;
      type: "boolean";
      prompt: string;
      explanation: string;
      hint: string;
      correctBoolean: boolean;
    }
  | {
      id: string;
      objectiveId: string;
      type: "match";
      prompt: string;
      explanation: string;
      hint: string;
      pairs: { left: string; right: string }[];
    }
  | {
      id: string;
      objectiveId: string;
      type: "sequence";
      prompt: string;
      explanation: string;
      hint: string;
      steps: string[];
    };

type Draft = {
  title: string;
  course: string;
  intro: string;
  content: string;
  masteryTarget: number;
  questionsPerObjective: number;
  enabledTypes: Record<QuestionType, boolean>;
  features: {
    hints: boolean;
    reviewLoops: boolean;
    momentum: boolean;
    celebration: boolean;
  };
  objectives: Objective[];
  questions: Question[];
};

type ObjectiveProgress = {
  attempts: number;
  correct: number;
  streak: number;
  mastery: number;
  mastered: boolean;
};

type FeedbackState = {
  correct: boolean;
  explanation: string;
  hint: string;
  objectiveTitle: string;
};

type ActivityItem = {
  id: string;
  tone: "good" | "warn" | "info";
  text: string;
};

const questionTypeLabels: Record<QuestionType, string> = {
  mcq: "Multiple Choice",
  boolean: "True / False",
  match: "Matching",
  sequence: "Sequence",
};

const initialDraft: Draft = {
  title: "Residential Wiring Mastery Path",
  course: "Electrical Technology",
  intro:
    "Students work through adaptive branch-circuit checks, receive immediate feedback, and keep looping on weak objectives until they hit mastery.",
  content:
    "Branch circuits deliver power from the panel to outlets, lighting, and dedicated loads. Standard 15-amp circuits use 14 AWG copper conductors, while 20-amp circuits use 12 AWG copper conductors. GFCI protection is required in wet or damp locations such as bathrooms, garages, unfinished basements, kitchens, crawl spaces, laundry areas, and outdoors. AFCI protection is commonly required in many habitable spaces. The grounded conductor is the neutral, the equipment grounding conductor provides a fault path, and the ungrounded conductor is the hot. Load planning, conductor identification, and protection device selection are all part of safe installation.",
  masteryTarget: 3,
  questionsPerObjective: 5,
  enabledTypes: {
    mcq: true,
    boolean: true,
    match: true,
    sequence: true,
  },
  features: {
    hints: true,
    reviewLoops: true,
    momentum: true,
    celebration: true,
  },
  objectives: [
    {
      id: "sizing",
      title: "Choose the correct conductor and breaker size",
      lesson:
        "15-amp branch circuits pair with 14 AWG copper. 20-amp branch circuits pair with 12 AWG copper. When the conductor size and breaker do not match, the installation becomes unsafe.",
    },
    {
      id: "conductors",
      title: "Identify hot, neutral, and grounding conductors",
      lesson:
        "The hot carries energized current, the neutral returns current to the source, and the equipment grounding conductor provides a low-resistance fault path for safety.",
    },
    {
      id: "protection",
      title: "Apply GFCI and AFCI protection correctly",
      lesson:
        "GFCI protection is used where shock risk is elevated. AFCI protection is commonly used in habitable areas to reduce the risk of arc-fault fires.",
    },
    {
      id: "workflow",
      title: "Plan installation order and troubleshooting steps",
      lesson:
        "Students should be able to inspect the plan, choose materials, de-energize and verify safety, install devices, test operation, and correct faults when a circuit fails.",
    },
  ],
  questions: [
    {
      id: "q1",
      objectiveId: "sizing",
      type: "mcq",
      prompt: "A general-purpose 20-amp branch circuit should normally use which copper conductor size?",
      explanation:
        "20-amp branch circuits are typically paired with 12 AWG copper. Using smaller conductors with a larger breaker can overheat the wiring.",
      hint: "Match the conductor size to the breaker rating before thinking about the load served.",
      options: [
        { id: "a", label: "10 AWG" },
        { id: "b", label: "12 AWG" },
        { id: "c", label: "14 AWG" },
        { id: "d", label: "16 AWG" },
      ],
      correctOptionId: "b",
    },
    {
      id: "q2",
      objectiveId: "sizing",
      type: "boolean",
      prompt: "True or false: A 15-amp breaker is commonly paired with 14 AWG copper conductors.",
      explanation:
        "True. 15-amp branch circuits normally use 14 AWG copper conductors.",
      hint: "Think about the most common pairing used in residential lighting and receptacle circuits.",
      correctBoolean: true,
    },
    {
      id: "q3",
      objectiveId: "conductors",
      type: "match",
      prompt: "Match each conductor to its job in the circuit.",
      explanation:
        "Each conductor has a distinct role. Hot delivers energized current, neutral provides the return path, and equipment grounding supports fault clearing.",
      hint: "One carries energized current, one returns current, and one is mainly for fault protection.",
      pairs: [
        { left: "Hot conductor", right: "Carries energized current to the load" },
        { left: "Neutral conductor", right: "Returns current to the source" },
        { left: "Equipment grounding conductor", right: "Provides a fault path for safety" },
      ],
    },
    {
      id: "q4",
      objectiveId: "conductors",
      type: "mcq",
      prompt: "Which conductor should not normally carry current during standard operation unless a fault occurs?",
      explanation:
        "The equipment grounding conductor is for safety and fault clearing, not normal load current.",
      hint: "Pick the conductor dedicated to protective bonding and fault clearing.",
      options: [
        { id: "a", label: "The hot conductor" },
        { id: "b", label: "The neutral conductor" },
        { id: "c", label: "The equipment grounding conductor" },
        { id: "d", label: "All conductors carry the same normal current" },
      ],
      correctOptionId: "c",
    },
    {
      id: "q5",
      objectiveId: "protection",
      type: "mcq",
      prompt: "Which location most clearly calls for GFCI protection?",
      explanation:
        "Bathrooms are classic GFCI locations because they are wet or damp environments with elevated shock risk.",
      hint: "Think about the place with the strongest moisture and shock hazard.",
      options: [
        { id: "a", label: "Bathroom receptacle" },
        { id: "b", label: "Hallway light switch" },
        { id: "c", label: "Closet light fixture" },
        { id: "d", label: "Bedroom smoke alarm circuit" },
      ],
      correctOptionId: "a",
    },
    {
      id: "q6",
      objectiveId: "protection",
      type: "boolean",
      prompt: "True or false: GFCI protection is intended to reduce shock hazard in wet or damp locations.",
      explanation:
        "True. GFCI devices monitor imbalance in current and are intended to reduce shock hazard.",
      hint: "Remember what the G in GFCI stands for.",
      correctBoolean: true,
    },
    {
      id: "q7",
      objectiveId: "workflow",
      type: "sequence",
      prompt: "Put this installation flow into the safest working order.",
      explanation:
        "Safe work starts with planning and de-energizing, then installation, then testing.",
      hint: "You should not install devices before verifying safety.",
      steps: [
        "Review the circuit plan and required protection",
        "De-energize and verify the circuit is safe",
        "Install conductors and devices",
        "Restore power and test operation",
      ],
    },
    {
      id: "q8",
      objectiveId: "workflow",
      type: "mcq",
      prompt: "A new branch circuit trips as soon as the breaker is reset. What is the best next move?",
      explanation:
        "Stop and troubleshoot before re-energizing repeatedly. Repeated resets can worsen a fault condition.",
      hint: "Do not keep forcing a breaker closed against a likely fault.",
      options: [
        { id: "a", label: "Keep resetting it until it stays on" },
        { id: "b", label: "Swap in a larger breaker" },
        { id: "c", label: "Inspect and troubleshoot the fault before re-energizing" },
        { id: "d", label: "Disconnect the grounding conductor" },
      ],
      correctOptionId: "c",
    },
    {
      id: "q9",
      objectiveId: "sizing",
      type: "sequence",
      prompt: "Order the decision path for selecting a branch-circuit conductor and breaker.",
      explanation:
        "Choose the circuit purpose, verify the expected load, select the protective device, and then match conductor size.",
      hint: "The breaker size comes before you confirm the conductor pairing.",
      steps: [
        "Identify the circuit purpose and expected load",
        "Select the proper ampere rating",
        "Match the conductor size to that rating",
        "Confirm device and receptacle compatibility",
      ],
    },
    {
      id: "q10",
      objectiveId: "protection",
      type: "match",
      prompt: "Match the protective approach to the reason it is used.",
      explanation:
        "GFCI focuses on shock protection, while AFCI focuses on arc-fault fire risk.",
      hint: "One protects people from shock, the other looks for dangerous arcing.",
      pairs: [
        { left: "GFCI", right: "Reduces shock hazard" },
        { left: "AFCI", right: "Detects dangerous arcing conditions" },
      ],
    },
  ],
};

function createProgressState(objectives: Objective[]) {
  return objectives.reduce<Record<string, ObjectiveProgress>>((acc, objective) => {
    acc[objective.id] = {
      attempts: 0,
      correct: 0,
      streak: 0,
      mastery: 12,
      mastered: false,
    };
    return acc;
  }, {});
}

function formatPercent(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

function getEnabledQuestionCount(draft: Draft) {
  return draft.questions.filter((question) => draft.enabledTypes[question.type]).length;
}

function getCoverageMap(draft: Draft) {
  return draft.objectives.map((objective) => ({
    ...objective,
    count: draft.questions.filter(
      (question) =>
        question.objectiveId === objective.id && draft.enabledTypes[question.type]
    ).length,
  }));
}

function evaluateQuestion(
  question: Question,
  choiceAnswer: string | boolean | null,
  matchAnswer: Record<string, string>,
  sequenceAnswer: string[]
) {
  switch (question.type) {
    case "mcq":
      if (typeof choiceAnswer !== "string") return null;
      return choiceAnswer === question.correctOptionId;
    case "boolean":
      if (typeof choiceAnswer !== "boolean") return null;
      return choiceAnswer === question.correctBoolean;
    case "match":
      return question.pairs.every(
        (pair) => matchAnswer[pair.left] && matchAnswer[pair.left] === pair.right
      );
    case "sequence":
      if (sequenceAnswer.length !== question.steps.length) return false;
      return question.steps.every((step, index) => sequenceAnswer[index] === step);
    default:
      return false;
  }
}

export default function MasteryPathPage() {
  const [mode, setMode] = useState<"student" | "builder">("student");
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [progress, setProgress] = useState<Record<string, ObjectiveProgress>>(() =>
    createProgressState(initialDraft.objectives)
  );
  const [seenCounts, setSeenCounts] = useState<Record<string, number>>({});
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [choiceAnswer, setChoiceAnswer] = useState<string | boolean | null>(null);
  const [matchAnswer, setMatchAnswer] = useState<Record<string, string>>({});
  const [sequenceAnswer, setSequenceAnswer] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([
    {
      id: "boot",
      tone: "info",
      text: "Session ready. The engine will route the student to the weakest objective first.",
    },
  ]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const progressRef = useRef(progress);
  const seenCountsRef = useRef(seenCounts);
  const draftRef = useRef(draft);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    seenCountsRef.current = seenCounts;
  }, [seenCounts]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const coverage = useMemo(() => getCoverageMap(draft), [draft]);
  const masteryAverage = useMemo(() => {
    const items = Object.values(progress);
    if (!items.length) return 0;
    return items.reduce((sum, item) => sum + item.mastery, 0) / items.length;
  }, [progress]);

  const currentQuestion = useMemo(
    () => draft.questions.find((question) => question.id === currentQuestionId) ?? null,
    [currentQuestionId, draft.questions]
  );

  function queueNextQuestion() {
    const next = pickNextQuestion(
      draftRef.current,
      progressRef.current,
      seenCountsRef.current
    );

    if (!next) {
      setCurrentQuestionId(null);
      setChoiceAnswer(null);
      setMatchAnswer({});
      setSequenceAnswer([]);
      return;
    }

    setCurrentQuestionId(next.id);
    setChoiceAnswer(null);
    setFeedback(null);

    if (next.type === "match") {
      const seeded: Record<string, string> = {};
      next.pairs.forEach((pair) => {
        seeded[pair.left] = "";
      });
      setMatchAnswer(seeded);
      setSequenceAnswer([]);
    } else if (next.type === "sequence") {
      setSequenceAnswer([...next.steps].reverse());
      setMatchAnswer({});
    } else {
      setMatchAnswer({});
      setSequenceAnswer([]);
    }
  }

  useEffect(() => {
    if (!currentQuestionId) {
      queueNextQuestion();
    }
  }, [currentQuestionId]);

  function pickNextQuestion(
    nextDraft: Draft,
    nextProgress: Record<string, ObjectiveProgress>,
    nextSeen: Record<string, number>
  ) {
    const enabledQuestions = nextDraft.questions.filter(
      (question) => nextDraft.enabledTypes[question.type]
    );

    if (!enabledQuestions.length) return null;

    const rankedObjectives = nextDraft.objectives
      .map((objective) => ({
        objective,
        stats: nextProgress[objective.id] ?? {
          attempts: 0,
          correct: 0,
          streak: 0,
          mastery: 0,
          mastered: false,
        },
      }))
      .sort((a, b) => {
        if (a.stats.mastered !== b.stats.mastered) {
          return Number(a.stats.mastered) - Number(b.stats.mastered);
        }
        if (a.stats.mastery !== b.stats.mastery) {
          return a.stats.mastery - b.stats.mastery;
        }
        return a.stats.attempts - b.stats.attempts;
      });

    for (const item of rankedObjectives) {
      const candidates = enabledQuestions
        .filter((question) => question.objectiveId === item.objective.id)
        .sort((a, b) => (nextSeen[a.id] ?? 0) - (nextSeen[b.id] ?? 0));

      if (candidates.length) return candidates[0];
    }

    return enabledQuestions.sort((a, b) => (nextSeen[a.id] ?? 0) - (nextSeen[b.id] ?? 0))[0];
  }

  function handleSubmitAnswer() {
    if (!currentQuestion) return;

    const correct = evaluateQuestion(
      currentQuestion,
      choiceAnswer,
      matchAnswer,
      sequenceAnswer
    );

    if (correct === null) {
      setFeedback({
        correct: false,
        explanation: "Choose an answer before checking your work.",
        hint: currentQuestion.hint,
        objectiveTitle:
          draft.objectives.find((objective) => objective.id === currentQuestion.objectiveId)
            ?.title ?? "Objective",
      });
      return;
    }

    const objective = draft.objectives.find(
      (item) => item.id === currentQuestion.objectiveId
    );

    const nextProgress = { ...progressRef.current };
    const currentStats = nextProgress[currentQuestion.objectiveId];
    const nextStreak = correct ? currentStats.streak + 1 : 0;
    const nextMastery = correct
      ? Math.min(100, currentStats.mastery + 24)
      : Math.max(8, currentStats.mastery - 10);
    const mastered = nextStreak >= draft.masteryTarget || nextMastery >= 100;

    nextProgress[currentQuestion.objectiveId] = {
      attempts: currentStats.attempts + 1,
      correct: currentStats.correct + (correct ? 1 : 0),
      streak: nextStreak,
      mastery: mastered ? 100 : nextMastery,
      mastered,
    };

    const nextSeen = {
      ...seenCountsRef.current,
      [currentQuestion.id]: (seenCountsRef.current[currentQuestion.id] ?? 0) + 1,
    };

    progressRef.current = nextProgress;
    seenCountsRef.current = nextSeen;
    setProgress(nextProgress);
    setSeenCounts(nextSeen);

    setFeedback({
      correct,
      explanation: currentQuestion.explanation,
      hint: currentQuestion.hint,
      objectiveTitle: objective?.title ?? "Objective",
    });

    setActivity((previous) => [
      {
        id: `${currentQuestion.id}-${Date.now()}`,
        tone: (correct ? "good" : "warn") as ActivityItem["tone"],
        text: correct
          ? `${objective?.title ?? "Objective"} moved forward. Current streak: ${nextStreak}/${draft.masteryTarget}.`
          : `${objective?.title ?? "Objective"} dropped back into review. The next question will target the gap.`,
      },
      ...previous,
    ].slice(0, 6));
  }

  function resetStudentRun() {
    const freshProgress = createProgressState(draft.objectives);
    progressRef.current = freshProgress;
    seenCountsRef.current = {};
    setProgress(freshProgress);
    setSeenCounts({});
    setFeedback(null);
    setActivity([
      {
        id: `reset-${Date.now()}`,
        tone: "info",
        text: "Student run reset. The dashboard is ready for a new mastery session.",
      },
    ]);
    setCurrentQuestionId(null);
    setChoiceAnswer(null);
    setMatchAnswer({});
    setSequenceAnswer([]);
  }

  function updateObjective(
    objectiveId: string,
    field: keyof Objective,
    value: string
  ) {
    setDraft((previous) => ({
      ...previous,
      objectives: previous.objectives.map((objective) =>
        objective.id === objectiveId ? { ...objective, [field]: value } : objective
      ),
    }));
  }

  function addObjective() {
    const id = `custom-${Date.now()}`;
    setDraft((previous) => ({
      ...previous,
      objectives: [
        ...previous.objectives,
        {
          id,
          title: "New mastery objective",
          lesson: "Add the redirect lesson or feedback loop for this objective.",
        },
      ],
    }));
    setProgress((previous) => ({
      ...previous,
      [id]: { attempts: 0, correct: 0, streak: 0, mastery: 8, mastered: false },
    }));
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setDraft((previous) => ({
        ...previous,
        content: String(reader.result ?? "").slice(0, 10000),
      }));
    };
    reader.readAsText(file);
  }

  function moveSequenceItem(index: number, direction: -1 | 1) {
    setSequenceAnswer((previous) => {
      const copy = [...previous];
      const target = index + direction;
      if (target < 0 || target >= copy.length) return previous;
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  function renderStudentQuestion() {
    if (!currentQuestion) {
      return (
        <div className="empty-state">
          <h3>All active objectives are at mastery.</h3>
          <p>Reset the run or adjust the builder to keep practicing.</p>
        </div>
      );
    }

    if (currentQuestion.type === "mcq") {
      return (
        <div className="answer-stack">
          {currentQuestion.options.map((option) => (
            <button
              key={option.id}
              className={`answer-button ${choiceAnswer === option.id ? "selected" : ""}`}
              onClick={() => setChoiceAnswer(option.id)}
              type="button"
            >
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      );
    }

    if (currentQuestion.type === "boolean") {
      return (
        <div className="boolean-row">
          <button
            className={`answer-button compact ${choiceAnswer === true ? "selected" : ""}`}
            onClick={() => setChoiceAnswer(true)}
            type="button"
          >
            True
          </button>
          <button
            className={`answer-button compact ${choiceAnswer === false ? "selected" : ""}`}
            onClick={() => setChoiceAnswer(false)}
            type="button"
          >
            False
          </button>
        </div>
      );
    }

    if (currentQuestion.type === "match") {
      const rightChoices = currentQuestion.pairs.map((pair) => pair.right);
      return (
        <div className="match-grid">
          {currentQuestion.pairs.map((pair) => (
            <label className="match-row" key={pair.left}>
              <span>{pair.left}</span>
              <select
                value={matchAnswer[pair.left] ?? ""}
                onChange={(event) =>
                  setMatchAnswer((previous) => ({
                    ...previous,
                    [pair.left]: event.target.value,
                  }))
                }
              >
                <option value="">Choose match</option>
                {rightChoices.map((choice) => (
                  <option key={choice} value={choice}>
                    {choice}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      );
    }

    return (
      <div className="sequence-list">
        {sequenceAnswer.map((step, index) => (
          <div className="sequence-item" key={`${step}-${index}`}>
            <div className="sequence-order">{index + 1}</div>
            <div className="sequence-text">{step}</div>
            <div className="sequence-controls">
              <button onClick={() => moveSequenceItem(index, -1)} type="button">
                ^
              </button>
              <button onClick={() => moveSequenceItem(index, 1)} type="button">
                v
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <style>{`
        :root{
          color-scheme:light;
        }

        body{
          margin:0;
          font-family:Arial, Helvetica, sans-serif;
          background:#eef3f8;
          color:#102033;
        }

        .app{
          min-height:100vh;
          display:flex;
          flex-direction:column;
        }

        .topbar{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          padding:12px 18px;
          border-bottom:1px solid #d7e1ea;
          background:#f9fbfd;
        }

        .brand{
          display:flex;
          align-items:center;
          gap:12px;
          min-width:0;
        }

        .brand-mark{
          width:34px;
          height:34px;
          display:grid;
          place-items:center;
          border-radius:8px;
          background:#17365c;
          color:#fff;
          font-size:14px;
          font-weight:700;
          flex-shrink:0;
        }

        .brand-copy{
          min-width:0;
        }

        .brand-title{
          font-size:15px;
          font-weight:700;
          line-height:1.15;
        }

        .brand-sub{
          color:#5b6b7c;
          font-size:12px;
          margin-top:2px;
        }

        .toolbar{
          display:flex;
          align-items:center;
          gap:8px;
          flex-wrap:wrap;
          justify-content:flex-end;
        }

        .segmented{
          display:flex;
          border:1px solid #cdd8e3;
          border-radius:8px;
          overflow:hidden;
          background:#fff;
        }

        .segmented button{
          min-width:108px;
          height:34px;
          border:0;
          background:#fff;
          color:#5b6b7c;
          font-size:12px;
          font-weight:700;
          cursor:pointer;
        }

        .segmented button.active{
          background:#17365c;
          color:#fff;
        }

        .icon-btn{
          height:34px;
          padding:0 12px;
          border-radius:8px;
          border:1px solid #cdd8e3;
          background:#fff;
          color:#17365c;
          font-size:12px;
          font-weight:700;
          cursor:pointer;
          text-decoration:none;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:8px;
        }

        .icon-btn.primary{
          background:#17365c;
          border-color:#17365c;
          color:#fff;
        }

        .workspace{
          flex:1;
          display:grid;
          grid-template-columns:300px minmax(0, 1fr);
          min-height:0;
        }

        .rail{
          border-right:1px solid #d7e1ea;
          background:#f7fafd;
          padding:16px;
          display:flex;
          flex-direction:column;
          gap:18px;
          overflow:auto;
        }

        .main{
          background:#fff;
          display:flex;
          flex-direction:column;
          min-width:0;
        }

        .section-label{
          font-size:11px;
          font-weight:700;
          text-transform:uppercase;
          letter-spacing:.06em;
          color:#6f7f90;
          margin-bottom:8px;
        }

        .stats-band{
          display:grid;
          grid-template-columns:repeat(4, minmax(0, 1fr));
          border-bottom:1px solid #d7e1ea;
          background:#f9fbfd;
        }

        .stat{
          padding:16px 18px;
          border-right:1px solid #e3ebf2;
        }

        .stat:last-child{
          border-right:0;
        }

        .stat-value{
          font-size:24px;
          font-weight:800;
          color:#17365c;
          line-height:1;
        }

        .stat-label{
          font-size:12px;
          color:#5b6b7c;
          margin-top:6px;
        }

        .objective-list{
          display:flex;
          flex-direction:column;
          gap:10px;
        }

        .objective-item{
          border:1px solid #d7e1ea;
          border-radius:8px;
          background:#fff;
          padding:12px;
        }

        .objective-top{
          display:flex;
          justify-content:space-between;
          gap:10px;
          align-items:flex-start;
        }

        .objective-name{
          font-size:13px;
          font-weight:700;
          line-height:1.35;
        }

        .objective-tag{
          flex-shrink:0;
          font-size:11px;
          font-weight:700;
          color:#17365c;
          background:#e8f0fa;
          padding:4px 8px;
          border-radius:999px;
        }

        .objective-meter{
          height:8px;
          border-radius:999px;
          overflow:hidden;
          background:#e7edf4;
          margin-top:10px;
        }

        .objective-meter span{
          display:block;
          height:100%;
          background:linear-gradient(90deg,#245fa8,#2aa780);
        }

        .objective-meta{
          display:flex;
          justify-content:space-between;
          gap:8px;
          font-size:11px;
          color:#607183;
          margin-top:8px;
        }

        .lesson-panel,
        .activity-panel,
        .builder-panel{
          border:1px solid #d7e1ea;
          border-radius:8px;
          background:#fff;
          padding:12px;
        }

        .lesson-panel p,
        .activity-panel p{
          margin:0;
          font-size:13px;
          line-height:1.55;
          color:#3f5063;
        }

        .activity-list{
          display:flex;
          flex-direction:column;
          gap:8px;
        }

        .activity-item{
          display:flex;
          gap:10px;
          align-items:flex-start;
          font-size:12px;
          color:#415165;
          line-height:1.45;
        }

        .activity-dot{
          width:10px;
          height:10px;
          border-radius:999px;
          margin-top:4px;
          flex-shrink:0;
        }

        .activity-dot.good{ background:#1f9b70; }
        .activity-dot.warn{ background:#d97706; }
        .activity-dot.info{ background:#245fa8; }

        .content-wrap{
          padding:18px;
          display:grid;
          grid-template-columns:minmax(0, 1.15fr) minmax(280px, .85fr);
          gap:18px;
          min-height:0;
          flex:1;
        }

        .question-stage{
          display:flex;
          flex-direction:column;
          gap:14px;
          min-width:0;
        }

        .stage-head{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:12px;
        }

        .stage-title{
          font-size:22px;
          font-weight:800;
          line-height:1.1;
          color:#102033;
        }

        .stage-sub{
          font-size:13px;
          color:#5d6b7a;
          margin-top:6px;
          line-height:1.5;
          max-width:720px;
        }

        .focus-chip{
          padding:6px 10px;
          border-radius:999px;
          background:#edf4fb;
          color:#17365c;
          font-size:11px;
          font-weight:800;
          white-space:nowrap;
        }

        .question-shell{
          border:1px solid #d7e1ea;
          border-radius:8px;
          overflow:hidden;
          background:#fff;
        }

        .question-top{
          padding:14px 16px;
          border-bottom:1px solid #e5edf3;
          background:#f9fbfd;
        }

        .question-type{
          font-size:11px;
          font-weight:800;
          text-transform:uppercase;
          letter-spacing:.06em;
          color:#6f7f90;
        }

        .question-prompt{
          margin-top:8px;
          font-size:19px;
          line-height:1.4;
          font-weight:700;
          color:#13263c;
        }

        .question-body{
          padding:16px;
        }

        .answer-stack{
          display:flex;
          flex-direction:column;
          gap:10px;
        }

        .answer-button{
          min-height:48px;
          padding:12px 14px;
          border-radius:8px;
          border:1px solid #d0dbe5;
          background:#fff;
          color:#172a40;
          text-align:left;
          font-size:14px;
          line-height:1.4;
          cursor:pointer;
        }

        .answer-button.selected{
          border-color:#245fa8;
          background:#eef5fd;
          box-shadow:inset 0 0 0 1px #245fa8;
        }

        .answer-button.compact{
          min-width:140px;
          text-align:center;
        }

        .boolean-row{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
        }

        .match-grid{
          display:grid;
          gap:10px;
        }

        .match-row{
          display:grid;
          grid-template-columns:minmax(0, 1fr) 220px;
          gap:12px;
          align-items:center;
          font-size:14px;
          color:#203247;
        }

        .match-row select,
        .builder-grid input,
        .builder-grid textarea{
          width:100%;
          border:1px solid #ccd8e2;
          border-radius:8px;
          background:#fff;
          color:#172a40;
          font:inherit;
          padding:10px 12px;
          outline:none;
        }

        .builder-grid textarea{
          min-height:112px;
          resize:vertical;
        }

        .sequence-list{
          display:flex;
          flex-direction:column;
          gap:10px;
        }

        .sequence-item{
          display:grid;
          grid-template-columns:36px minmax(0, 1fr) auto;
          gap:10px;
          align-items:center;
          border:1px solid #d0dbe5;
          border-radius:8px;
          background:#fff;
          padding:10px 12px;
        }

        .sequence-order{
          width:28px;
          height:28px;
          border-radius:999px;
          display:grid;
          place-items:center;
          background:#edf4fb;
          color:#17365c;
          font-size:12px;
          font-weight:800;
        }

        .sequence-text{
          font-size:14px;
          color:#1b2d42;
          line-height:1.4;
        }

        .sequence-controls{
          display:flex;
          gap:6px;
        }

        .sequence-controls button{
          width:30px;
          height:30px;
          border-radius:8px;
          border:1px solid #ccd8e2;
          background:#fff;
          color:#17365c;
          cursor:pointer;
          font-size:12px;
          font-weight:800;
        }

        .stage-actions{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
        }

        .feedback-panel{
          border:1px solid #d7e1ea;
          border-radius:8px;
          background:#fbfdff;
          padding:14px;
        }

        .feedback-banner{
          display:inline-flex;
          align-items:center;
          gap:8px;
          font-size:12px;
          font-weight:800;
          padding:6px 10px;
          border-radius:999px;
        }

        .feedback-banner.good{
          color:#0f6a4c;
          background:#eaf8f2;
        }

        .feedback-banner.warn{
          color:#9a5a05;
          background:#fff5df;
        }

        .feedback-copy{
          margin-top:12px;
          font-size:14px;
          line-height:1.6;
          color:#26384d;
        }

        .feedback-copy strong{
          color:#12253d;
        }

        .focus-aside{
          display:flex;
          flex-direction:column;
          gap:14px;
        }

        .aside-panel{
          border:1px solid #d7e1ea;
          border-radius:8px;
          background:#f9fbfd;
          padding:14px;
        }

        .aside-panel h3{
          margin:0 0 10px;
          font-size:14px;
          color:#17365c;
        }

        .aside-panel p{
          margin:0;
          font-size:13px;
          line-height:1.55;
          color:#455669;
        }

        .mini-meter{
          margin-top:12px;
          display:grid;
          gap:8px;
        }

        .mini-row{
          display:grid;
          grid-template-columns:1fr 44px;
          gap:10px;
          align-items:center;
          font-size:12px;
          color:#4c5e71;
        }

        .mini-row .bar{
          grid-column:1 / 3;
          height:7px;
          border-radius:999px;
          overflow:hidden;
          background:#e5edf3;
        }

        .mini-row .bar span{
          display:block;
          height:100%;
          background:linear-gradient(90deg,#245fa8,#2aa780);
        }

        .builder-shell{
          display:grid;
          grid-template-columns:minmax(0, 1.1fr) minmax(280px, .9fr);
          gap:18px;
          padding:18px;
        }

        .builder-grid{
          display:grid;
          gap:16px;
        }

        .builder-grid label{
          display:grid;
          gap:8px;
          font-size:12px;
          font-weight:700;
          color:#36506b;
        }

        .objective-editor{
          display:grid;
          gap:10px;
        }

        .objective-edit{
          display:grid;
          gap:8px;
          padding:12px;
          border:1px solid #d7e1ea;
          border-radius:8px;
          background:#f9fbfd;
        }

        .objective-edit-head{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
        }

        .objective-index{
          font-size:11px;
          font-weight:800;
          color:#6f7f90;
          text-transform:uppercase;
          letter-spacing:.06em;
        }

        .toggle-row{
          display:grid;
          grid-template-columns:repeat(2, minmax(0, 1fr));
          gap:10px;
        }

        .toggle-chip{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          min-height:44px;
          padding:10px 12px;
          border:1px solid #d0dbe5;
          border-radius:8px;
          background:#fff;
          font-size:12px;
          color:#25384f;
          cursor:pointer;
        }

        .toggle-chip input{
          width:16px;
          height:16px;
        }

        .blueprint-list{
          display:grid;
          gap:10px;
        }

        .blueprint-row{
          border:1px solid #d7e1ea;
          border-radius:8px;
          background:#fff;
          padding:12px;
        }

        .blueprint-row h4{
          margin:0;
          font-size:13px;
          color:#17365c;
        }

        .blueprint-row p{
          margin:8px 0 0;
          font-size:12px;
          line-height:1.5;
          color:#526273;
        }

        .blueprint-meta{
          margin-top:10px;
          display:flex;
          justify-content:space-between;
          gap:10px;
          font-size:11px;
          color:#6d7d8f;
        }

        .empty-state{
          border:1px dashed #c7d4df;
          border-radius:8px;
          background:#f9fbfd;
          padding:20px;
          color:#526273;
        }

        .empty-state h3{
          margin:0 0 6px;
          font-size:18px;
          color:#17365c;
        }

        .empty-state p{
          margin:0;
          font-size:13px;
          line-height:1.5;
        }

        @media (max-width: 1080px){
          .workspace{
            grid-template-columns:1fr;
          }

          .rail{
            border-right:0;
            border-bottom:1px solid #d7e1ea;
          }

          .content-wrap,
          .builder-shell{
            grid-template-columns:1fr;
          }

          .stats-band{
            grid-template-columns:repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px){
          .topbar{
            align-items:flex-start;
            flex-direction:column;
          }

          .toolbar{
            width:100%;
            justify-content:flex-start;
          }

          .segmented{
            width:100%;
          }

          .segmented button{
            flex:1;
            min-width:0;
          }

          .stats-band{
            grid-template-columns:1fr 1fr;
          }

          .content-wrap,
          .builder-shell,
          .rail,
          .question-body,
          .question-top{
            padding:14px;
          }

          .match-row{
            grid-template-columns:1fr;
          }

          .toggle-row{
            grid-template-columns:1fr;
          }
        }
      `}</style>

      <div className="app">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">MP</div>
            <div className="brand-copy">
              <div className="brand-title">{draft.title}</div>
              <div className="brand-sub">{draft.course} adaptive assignment</div>
            </div>
          </div>

          <div className="toolbar">
            <div className="segmented" role="tablist" aria-label="View mode">
              <button
                className={mode === "student" ? "active" : ""}
                onClick={() => setMode("student")}
                type="button"
              >
                Student View
              </button>
              <button
                className={mode === "builder" ? "active" : ""}
                onClick={() => setMode("builder")}
                type="button"
              >
                Builder
              </button>
            </div>

            <button className="icon-btn" onClick={resetStudentRun} type="button">
              Reset Run
            </button>
            <Link className="icon-btn primary" href="/">
              Dashboard
            </Link>
          </div>
        </header>

        <div className="workspace">
          <aside className="rail">
            <div>
              <div className="section-label">Mastery Tracker</div>
              <div className="objective-list">
                {draft.objectives.map((objective) => {
                  const item = progress[objective.id] ?? {
                    attempts: 0,
                    correct: 0,
                    streak: 0,
                    mastery: 0,
                    mastered: false,
                  };

                  return (
                    <div className="objective-item" key={objective.id}>
                      <div className="objective-top">
                        <div className="objective-name">{objective.title}</div>
                        <div className="objective-tag">
                          {item.mastered ? "Mastered" : `${Math.round(item.mastery)}%`}
                        </div>
                      </div>
                      <div className="objective-meter">
                        <span style={{ width: formatPercent(item.mastery) }} />
                      </div>
                      <div className="objective-meta">
                        <span>Streak {item.streak}/{draft.masteryTarget}</span>
                        <span>
                          {item.correct}/{Math.max(item.attempts, 1)} correct
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lesson-panel">
              <div className="section-label">Assignment Intent</div>
              <p>{draft.intro}</p>
            </div>

            <div className="activity-panel">
              <div className="section-label">Adaptive Feed</div>
              <div className="activity-list">
                {activity.map((item) => (
                  <div className="activity-item" key={item.id}>
                    <div className={`activity-dot ${item.tone}`} />
                    <div>{item.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <main className="main">
            <div className="stats-band">
              <div className="stat">
                <div className="stat-value">{Math.round(masteryAverage)}%</div>
                <div className="stat-label">Overall mastery</div>
              </div>
              <div className="stat">
                <div className="stat-value">
                  {draft.objectives.filter((objective) => progress[objective.id]?.mastered).length}
                </div>
                <div className="stat-label">Objectives cleared</div>
              </div>
              <div className="stat">
                <div className="stat-value">{getEnabledQuestionCount(draft)}</div>
                <div className="stat-label">Interactive checks live</div>
              </div>
              <div className="stat">
                <div className="stat-value">{draft.masteryTarget}x</div>
                <div className="stat-label">Streak to mastery</div>
              </div>
            </div>

            {mode === "student" ? (
              <div className="content-wrap">
                <section className="question-stage">
                  <div className="stage-head">
                    <div>
                      <div className="stage-title">Keep the student in motion until mastery.</div>
                      <div className="stage-sub">
                        The engine always pulls the next check from the weakest objective, then redirects with feedback and another attempt until the streak threshold is met.
                      </div>
                    </div>
                    {currentQuestion ? (
                      <div className="focus-chip">
                        Focus:{" "}
                        {draft.objectives.find(
                          (objective) => objective.id === currentQuestion.objectiveId
                        )?.title ?? "Objective"}
                      </div>
                    ) : null}
                  </div>

                  <div className="question-shell">
                    <div className="question-top">
                      <div className="question-type">
                        {currentQuestion ? questionTypeLabels[currentQuestion.type] : "Session"}
                      </div>
                      <div className="question-prompt">
                        {currentQuestion
                          ? currentQuestion.prompt
                          : "Every enabled question has been worked to mastery."}
                      </div>
                    </div>

                    <div className="question-body">{renderStudentQuestion()}</div>
                  </div>

                  <div className="stage-actions">
                    <button className="icon-btn primary" onClick={handleSubmitAnswer} type="button">
                      Check Answer
                    </button>
                    <button className="icon-btn" onClick={queueNextQuestion} type="button">
                      Next Focus
                    </button>
                  </div>

                  {feedback ? (
                    <div className="feedback-panel">
                      <div
                        className={`feedback-banner ${feedback.correct ? "good" : "warn"}`}
                      >
                        {feedback.correct ? "Mastery momentum" : "Redirect to gap"}
                      </div>
                      <div className="feedback-copy">
                        <strong>{feedback.objectiveTitle}:</strong> {feedback.explanation}
                        {draft.features.hints ? (
                          <>
                            <br />
                            <br />
                            <strong>Hint for the next attempt:</strong> {feedback.hint}
                          </>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </section>

                <aside className="focus-aside">
                  <div className="aside-panel">
                    <h3>Current objective lesson</h3>
                    <p>
                      {currentQuestion
                        ? draft.objectives.find(
                            (objective) => objective.id === currentQuestion.objectiveId
                          )?.lesson
                        : "Turn on more question types or reset the run to continue."}
                    </p>
                  </div>

                  <div className="aside-panel">
                    <h3>Progress by objective</h3>
                    <div className="mini-meter">
                      {draft.objectives.map((objective) => (
                        <div className="mini-row" key={objective.id}>
                          <span>{objective.title}</span>
                          <strong>{Math.round(progress[objective.id]?.mastery ?? 0)}%</strong>
                          <div className="bar">
                            <span
                              style={{
                                width: formatPercent(progress[objective.id]?.mastery ?? 0),
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="aside-panel">
                    <h3>Student dashboard snapshot</h3>
                    <p>
                      Attempts:{" "}
                      {Object.values(progress).reduce((sum, item) => sum + item.attempts, 0)}
                      <br />
                      Correct:{" "}
                      {Object.values(progress).reduce((sum, item) => sum + item.correct, 0)}
                      <br />
                      Objectives left:{" "}
                      {
                        draft.objectives.filter(
                          (objective) => !progress[objective.id]?.mastered
                        ).length
                      }
                    </p>
                  </div>
                </aside>
              </div>
            ) : (
              <div className="builder-shell">
                <section className="builder-grid">
                  <div className="builder-panel">
                    <div className="section-label">Assignment Shell</div>
                    <label>
                      Assignment title
                      <input
                        value={draft.title}
                        onChange={(event) =>
                          setDraft((previous) => ({
                            ...previous,
                            title: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Course label
                      <input
                        value={draft.course}
                        onChange={(event) =>
                          setDraft((previous) => ({
                            ...previous,
                            course: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Student-facing intro
                      <textarea
                        value={draft.intro}
                        onChange={(event) =>
                          setDraft((previous) => ({
                            ...previous,
                            intro: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Uploaded or pasted source content
                      <textarea
                        value={draft.content}
                        onChange={(event) =>
                          setDraft((previous) => ({
                            ...previous,
                            content: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <div className="stage-actions">
                      <button
                        className="icon-btn"
                        onClick={() => fileInputRef.current?.click()}
                        type="button"
                      >
                        Upload Text
                      </button>
                      <button className="icon-btn primary" onClick={() => setMode("student")} type="button">
                        Preview Student View
                      </button>
                    </div>
                    <input
                      hidden
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md"
                      onChange={handleUpload}
                    />
                  </div>

                  <div className="builder-panel">
                    <div className="section-label">Objectives</div>
                    <div className="objective-editor">
                      {draft.objectives.map((objective, index) => (
                        <div className="objective-edit" key={objective.id}>
                          <div className="objective-edit-head">
                            <div className="objective-index">Objective {index + 1}</div>
                            <div className="objective-tag">
                              {coverage.find((item) => item.id === objective.id)?.count ?? 0} checks
                            </div>
                          </div>
                          <input
                            value={objective.title}
                            onChange={(event) =>
                              updateObjective(objective.id, "title", event.target.value)
                            }
                          />
                          <textarea
                            value={objective.lesson}
                            onChange={(event) =>
                              updateObjective(objective.id, "lesson", event.target.value)
                            }
                          />
                        </div>
                      ))}
                    </div>
                    <div className="stage-actions">
                      <button className="icon-btn" onClick={addObjective} type="button">
                        Add Objective
                      </button>
                    </div>
                  </div>
                </section>

                <aside className="builder-grid">
                  <div className="builder-panel">
                    <div className="section-label">Mastery Controls</div>
                    <label>
                      Correct streak to clear an objective
                      <input
                        type="number"
                        min={2}
                        max={5}
                        value={draft.masteryTarget}
                        onChange={(event) =>
                          setDraft((previous) => ({
                            ...previous,
                            masteryTarget: Number(event.target.value) || 3,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Target questions per objective
                      <input
                        type="number"
                        min={3}
                        max={10}
                        value={draft.questionsPerObjective}
                        onChange={(event) =>
                          setDraft((previous) => ({
                            ...previous,
                            questionsPerObjective: Number(event.target.value) || 5,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="builder-panel">
                    <div className="section-label">Interaction Types</div>
                    <div className="toggle-row">
                      {(Object.keys(questionTypeLabels) as QuestionType[]).map((type) => (
                        <label className="toggle-chip" key={type}>
                          <span>{questionTypeLabels[type]}</span>
                          <input
                            checked={draft.enabledTypes[type]}
                            onChange={(event) =>
                              setDraft((previous) => ({
                                ...previous,
                                enabledTypes: {
                                  ...previous.enabledTypes,
                                  [type]: event.target.checked,
                                },
                              }))
                            }
                            type="checkbox"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="builder-panel">
                    <div className="section-label">Student Experience</div>
                    <div className="toggle-row">
                      {(
                        Object.keys(draft.features) as Array<keyof Draft["features"]>
                      ).map((feature) => (
                        <label className="toggle-chip" key={feature}>
                          <span>{feature}</span>
                          <input
                            checked={draft.features[feature]}
                            onChange={(event) =>
                              setDraft((previous) => ({
                                ...previous,
                                features: {
                                  ...previous.features,
                                  [feature]: event.target.checked,
                                },
                              }))
                            }
                            type="checkbox"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="builder-panel">
                    <div className="section-label">Blueprint</div>
                    <div className="blueprint-list">
                      {coverage.map((item) => (
                        <div className="blueprint-row" key={item.id}>
                          <h4>{item.title}</h4>
                          <p>{item.lesson}</p>
                          <div className="blueprint-meta">
                            <span>{item.count} enabled checks</span>
                            <span>
                              {item.count >= draft.questionsPerObjective
                                ? "Coverage ready"
                                : "Needs more questions"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
