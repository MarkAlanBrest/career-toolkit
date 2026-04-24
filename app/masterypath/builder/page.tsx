"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  buildInteractionSuggestions,
  buildObjectiveSuggestions,
  type CompletionCriteria,
  type ObjectiveBlock,
} from "../data";

type Step = 1 | 2 | 3 | 4 | 5;

const steps: Array<{ id: Step; label: string }> = [
  { id: 1, label: "Source" },
  { id: 2, label: "Objective" },
  { id: 3, label: "Build Plan" },
  { id: 4, label: "Block Stack" },
  { id: 5, label: "Save" },
];

function clampBlockTarget(value: number) {
  if (Number.isNaN(value)) return 18;
  return Math.max(6, Math.min(50, value));
}

export default function MasteryPathBuilderPage() {
  const [step, setStep] = useState<Step>(1);
  const [sourceMode, setSourceMode] = useState<"upload" | "url" | "paste">("paste");
  const [assignmentName, setAssignmentName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [content, setContent] = useState("");
  const [objectiveTitle, setObjectiveTitle] = useState("");
  const [objectiveGoal, setObjectiveGoal] = useState("");
  const [difficulty, setDifficulty] = useState<"Foundational" | "Intermediate" | "Advanced">(
    "Intermediate"
  );
  const [layout, setLayout] = useState<"Guided path" | "Mixed media path" | "Scenario path">(
    "Mixed media path"
  );
  const [targetBlockCount, setTargetBlockCount] = useState(18);
  const [learningSuggestionsAccepted, setLearningSuggestionsAccepted] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedCourseId, setSavedCourseId] = useState("");
  const [generatedBlocks, setGeneratedBlocks] = useState<ObjectiveBlock[]>([]);
  const [completionCriteria, setCompletionCriteria] = useState<CompletionCriteria>({
    minBlocksComplete: 10,
    minCorrectInteractions: 3,
    allowRetake: true,
  });
  const [aiError, setAiError] = useState("");
  const [aiBusyStep, setAiBusyStep] = useState<Step | null>(null);

  const objectiveSuggestion = useMemo(
    () => buildObjectiveSuggestions(content),
    [content]
  );

  const interactionSuggestions = useMemo(
    () => buildInteractionSuggestions(objectiveGoal, difficulty),
    [objectiveGoal, difficulty]
  );

  function nextStep() {
    setStep((previous) => Math.min(5, previous + 1) as Step);
  }

  function previousStep() {
    setStep((previous) => Math.max(1, previous - 1) as Step);
  }

  function applyObjectiveSuggestion() {
    setObjectiveTitle(objectiveSuggestion.title);
    setObjectiveGoal(objectiveSuggestion.goal);
  }

  async function generateWithAi(stage: "objective" | "blocks") {
    setAiError("");
    setAiBusyStep(stage === "objective" ? 2 : 4);

    try {
      const response = await fetch("/api/masterypath/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stage,
          title: assignmentName,
          course: courseName,
          sourceMode,
          sourceUrl,
          content,
          objectiveTitle,
          objectiveGoal,
          difficulty,
          layout,
          desiredBlockCount: targetBlockCount,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to generate AI content.");
      }

      if (stage === "objective") {
        const nextTitle =
          typeof payload.objectiveTitle === "string" ? payload.objectiveTitle.trim() : "";
        const nextGoal =
          typeof payload.objectiveGoal === "string" ? payload.objectiveGoal.trim() : "";

        if (!nextTitle && !nextGoal) {
          throw new Error("AI did not return an objective.");
        }

        setObjectiveTitle(nextTitle || objectiveSuggestion.title);
        setObjectiveGoal(nextGoal || objectiveSuggestion.goal);
        return;
      }

      const nextBlocks = Array.isArray(payload.blocks)
        ? payload.blocks
            .map((block: any, index: number) => ({
              id:
                typeof block?.id === "string" && block.id.trim()
                  ? block.id.trim()
                  : `block-${index + 1}`,
              type:
                block?.type === "content-slide" ||
                block?.type === "bullet-slide" ||
                block?.type === "image-slide" ||
                block?.type === "video-slide" ||
                block?.type === "multiple-choice" ||
                block?.type === "true-false" ||
                block?.type === "checkpoint" ||
                block?.type === "review" ||
                block?.type === "reflection"
                  ? block.type
                  : "content-slide",
              title:
                typeof block?.title === "string" && block.title.trim()
                  ? block.title.trim()
                  : `Block ${index + 1}`,
              summary: typeof block?.summary === "string" ? block.summary.trim() : "",
              body: typeof block?.body === "string" ? block.body.trim() : "",
              bullets: Array.isArray(block?.bullets)
                ? block.bullets
                    .map((item: unknown) => (typeof item === "string" ? item.trim() : ""))
                    .filter(Boolean)
                : [],
              callout:
                block?.callout &&
                (typeof block.callout.label === "string" ||
                  typeof block.callout.text === "string")
                  ? {
                      label:
                        typeof block.callout.label === "string"
                          ? block.callout.label.trim()
                          : "",
                      text:
                        typeof block.callout.text === "string"
                          ? block.callout.text.trim()
                          : "",
                    }
                  : null,
              stats: Array.isArray(block?.stats)
                ? block.stats
                    .map((item: any) => ({
                      label: typeof item?.label === "string" ? item.label.trim() : "",
                      value: typeof item?.value === "string" ? item.value.trim() : "",
                    }))
                    .filter((item: { label: string; value: string }) => item.label || item.value)
                : [],
              media:
                block?.media &&
                typeof block.media.url === "string" &&
                block.media.url.trim()
                  ? {
                      type: block.media.type === "video" ? "video" : "image",
                      url: block.media.url.trim(),
                      caption:
                        typeof block.media.caption === "string"
                          ? block.media.caption.trim()
                          : "",
                    }
                  : null,
              theme:
                block?.theme === "ocean" ||
                block?.theme === "sunset" ||
                block?.theme === "forest" ||
                block?.theme === "slate"
                  ? block.theme
                  : "ocean",
              layoutStyle:
                block?.layoutStyle === "split" ||
                block?.layoutStyle === "spotlight" ||
                block?.layoutStyle === "bullet-focus" ||
                block?.layoutStyle === "media-left"
                  ? block.layoutStyle
                  : "split",
              choices: Array.isArray(block?.choices)
                ? block.choices
                    .map((choice: any, choiceIndex: number) => ({
                      id:
                        typeof choice?.id === "string" && choice.id.trim()
                          ? choice.id.trim()
                          : `choice-${choiceIndex + 1}`,
                      text: typeof choice?.text === "string" ? choice.text.trim() : "",
                      isCorrect: Boolean(choice?.isCorrect),
                      feedback:
                        typeof choice?.feedback === "string" ? choice.feedback.trim() : "",
                    }))
                    .filter((choice: { text: string }) => choice.text)
                : [],
              placeholder:
                typeof block?.placeholder === "string" ? block.placeholder.trim() : "",
            }))
            .filter((block: ObjectiveBlock) => block.title || block.body)
        : [];

      if (!nextBlocks.length) {
        throw new Error("AI did not return a block stack.");
      }

      setGeneratedBlocks(nextBlocks);
      setCompletionCriteria({
        minBlocksComplete:
          typeof payload?.completionCriteria?.minBlocksComplete === "number"
            ? payload.completionCriteria.minBlocksComplete
            : Math.min(nextBlocks.length, 10),
        minCorrectInteractions:
          typeof payload?.completionCriteria?.minCorrectInteractions === "number"
            ? payload.completionCriteria.minCorrectInteractions
            : 3,
        allowRetake:
          typeof payload?.completionCriteria?.allowRetake === "boolean"
            ? payload.completionCriteria.allowRetake
            : true,
      });
    } catch (error) {
      setAiError(
        error instanceof Error ? error.message : "Unable to generate AI content."
      );
    } finally {
      setAiBusyStep(null);
    }
  }

  async function saveDraft() {
    setSaving(true);
    setSaved(false);
    setSaveError("");

    try {
      const response = await fetch("/api/masterypath", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: assignmentName,
          course: courseName,
          sourceMode,
          sourceUrl,
          content,
          objectiveTitle,
          objectiveGoal,
          blocks: generatedBlocks,
          completionCriteria,
          difficulty,
          layout,
          learningSuggestionsAccepted,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save assignment.");
      }

      setSaved(true);
      setSavedCourseId(payload.courseId);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to save assignment."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <style>{`
        body{
          margin:0;
          font-family:Arial, Helvetica, sans-serif;
          background:#edf3f8;
          color:#132238;
        }

        .page{
          min-height:100vh;
          display:grid;
          grid-template-rows:auto 1fr;
        }

        .topbar{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          padding:14px 18px;
          border-bottom:1px solid #d6e0ea;
          background:#f8fbfd;
        }

        .brand h1{
          margin:0;
          font-size:20px;
          line-height:1.15;
        }

        .brand p{
          margin:6px 0 0;
          color:#5c6d81;
          font-size:13px;
          line-height:1.5;
          max-width:760px;
        }

        .toolbar{
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          justify-content:flex-end;
        }

        .btn{
          min-height:36px;
          padding:0 12px;
          border-radius:8px;
          border:1px solid #cad7e3;
          background:#fff;
          color:#173a63;
          font-size:12px;
          font-weight:700;
          text-decoration:none;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
        }

        .btn.primary{
          background:#173a63;
          border-color:#173a63;
          color:#fff;
        }

        .btn:disabled{
          opacity:.65;
          cursor:progress;
        }

        .shell{
          display:grid;
          grid-template-columns:260px minmax(0,1fr) 340px;
          min-height:0;
        }

        .steps{
          border-right:1px solid #d6e0ea;
          background:#f8fbfd;
          padding:18px 16px;
          display:flex;
          flex-direction:column;
          gap:12px;
        }

        .steps-label,
        .aside-label{
          font-size:11px;
          font-weight:700;
          text-transform:uppercase;
          letter-spacing:.06em;
          color:#6b7a8c;
        }

        .step{
          display:flex;
          gap:10px;
          align-items:flex-start;
          padding:12px;
          border:1px solid #d8e2eb;
          border-radius:8px;
          background:#fff;
          cursor:pointer;
        }

        .step.active{
          border-color:#245fa8;
          background:#eef5fd;
        }

        .step-index{
          width:26px;
          height:26px;
          border-radius:999px;
          display:grid;
          place-items:center;
          background:#e8f0fa;
          color:#173a63;
          font-size:12px;
          font-weight:800;
          flex-shrink:0;
        }

        .step strong{
          display:block;
          font-size:13px;
          margin-bottom:4px;
        }

        .step span{
          font-size:12px;
          color:#617286;
          line-height:1.45;
        }

        .main{
          padding:20px;
          min-width:0;
        }

        .panel{
          border:1px solid #d6e0ea;
          border-radius:8px;
          background:#fff;
          overflow:hidden;
        }

        .panel-head{
          padding:16px 18px;
          border-bottom:1px solid #e4ecf3;
          background:#f9fbfd;
        }

        .panel-head h2{
          margin:0;
          font-size:22px;
        }

        .panel-head p{
          margin:8px 0 0;
          font-size:13px;
          line-height:1.55;
          color:#58697d;
        }

        .panel-body{
          padding:18px;
          display:grid;
          gap:16px;
        }

        .field{
          display:grid;
          gap:8px;
        }

        .field label{
          font-size:12px;
          font-weight:700;
          color:#35506a;
        }

        input,
        textarea{
          width:100%;
          border:1px solid #ccd8e2;
          border-radius:8px;
          background:#fff;
          color:#172a40;
          font:inherit;
          padding:10px 12px;
          outline:none;
        }

        textarea{
          min-height:140px;
          resize:vertical;
        }

        .segmented{
          display:flex;
          gap:8px;
          flex-wrap:wrap;
        }

        .segmented button{
          min-height:38px;
          padding:0 12px;
          border-radius:8px;
          border:1px solid #cad7e3;
          background:#fff;
          color:#173a63;
          font-size:12px;
          font-weight:700;
          cursor:pointer;
        }

        .segmented button.active{
          background:#173a63;
          color:#fff;
          border-color:#173a63;
        }

        .list{
          display:grid;
          gap:10px;
        }

        .card{
          border:1px solid #d8e2eb;
          border-radius:8px;
          background:#f9fbfd;
          padding:12px;
        }

        .card strong{
          display:block;
          margin-bottom:6px;
          font-size:13px;
          color:#173a63;
        }

        .card p{
          margin:0;
          font-size:12px;
          line-height:1.55;
          color:#57697d;
        }

        .row{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:12px;
        }

        .chips{
          display:flex;
          gap:6px;
          flex-wrap:wrap;
          margin-top:10px;
        }

        .chip{
          display:inline-flex;
          align-items:center;
          min-height:28px;
          padding:0 10px;
          border-radius:999px;
          background:#e8f0fa;
          color:#173a63;
          font-size:11px;
          font-weight:800;
        }

        .footer{
          display:flex;
          justify-content:space-between;
          gap:10px;
          flex-wrap:wrap;
          padding:16px 18px;
          border-top:1px solid #e4ecf3;
          background:#f9fbfd;
        }

        .aside{
          border-left:1px solid #d6e0ea;
          background:#f8fbfd;
          padding:18px 16px;
          display:flex;
          flex-direction:column;
          gap:14px;
        }

        .aside-card{
          border:1px solid #d8e2eb;
          border-radius:8px;
          background:#fff;
          padding:14px;
        }

        .aside-card h3{
          margin:0 0 8px;
          font-size:14px;
          color:#173a63;
        }

        .aside-card p{
          margin:0;
          font-size:12px;
          line-height:1.6;
          color:#56677c;
        }

        .save-ok{
          padding:12px;
          border-radius:8px;
          background:#ebf8f2;
          color:#0f6a4c;
          font-size:13px;
          line-height:1.5;
        }

        .save-error{
          padding:12px;
          border-radius:8px;
          background:#fdecec;
          color:#9c2a2a;
          font-size:13px;
          line-height:1.5;
        }

        @media (max-width: 1100px){
          .shell{
            grid-template-columns:1fr;
          }

          .steps,
          .aside{
            border:0;
            border-bottom:1px solid #d6e0ea;
          }
        }

        @media (max-width: 720px){
          .topbar{
            flex-direction:column;
            align-items:flex-start;
          }

          .toolbar{
            width:100%;
            justify-content:flex-start;
          }

          .main{
            padding:14px;
          }

          .panel-head,
          .panel-body,
          .footer{
            padding:14px;
          }

          .row{
            grid-template-columns:1fr;
          }
        }
      `}</style>

      <div className="page">
        <header className="topbar">
          <div className="brand">
            <h1>MasteryPath Builder</h1>
            <p>
              Build one strong objective per assignment, then stack lots of content and
              interaction blocks under that objective so students can revisit and retake the
              section.
            </p>
          </div>

          <div className="toolbar">
            <Link className="btn" href="/masterypath">
              Student View
            </Link>
            <Link className="btn" href="/">
              Dashboard
            </Link>
          </div>
        </header>

        <div className="shell">
          <aside className="steps">
            <div className="steps-label">Teacher flow</div>
            {steps.map((item) => (
              <button
                className={`step ${step === item.id ? "active" : ""}`}
                key={item.id}
                onClick={() => setStep(item.id)}
                type="button"
              >
                <div className="step-index">{item.id}</div>
                <div>
                  <strong>{item.label}</strong>
                  <span>
                    {item.id === 1
                      ? "Paste source material for the assignment."
                      : item.id === 2
                        ? "Define the one objective students must complete."
                        : item.id === 3
                          ? "Choose difficulty, layout, and block volume."
                          : item.id === 4
                            ? "Generate and review the stacked block sequence."
                            : "Save the final course JSON by course ID."}
                  </span>
                </div>
              </button>
            ))}
          </aside>

          <main className="main">
            <div className="panel">
              <div className="panel-head">
                <h2>
                  {step === 1
                    ? "Provide source content"
                    : step === 2
                      ? "Define the objective"
                      : step === 3
                        ? "Set the build plan"
                        : step === 4
                          ? "Review the block stack"
                          : "Save the assignment"}
                </h2>
                <p>
                  {step === 1
                    ? "Source content becomes the base material for the objective and the block stack."
                    : step === 2
                      ? "This assignment will now have one objective only, so we define it carefully."
                      : step === 3
                        ? "Choose how ambitious the single-objective sequence should be."
                        : step === 4
                          ? "AI proposes a long sequence of content and interaction blocks grouped under the one objective."
                          : "Store the final JSON payload by course ID so the student player can load it."}
                </p>
              </div>

              <div className="panel-body">
                {step === 1 ? (
                  <>
                    <div className="row">
                      <div className="field">
                        <label>Assignment name</label>
                        <input
                          placeholder="Example: Residential Wiring Mastery Path"
                          value={assignmentName}
                          onChange={(event) => setAssignmentName(event.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label>Course</label>
                        <input
                          placeholder="Example: Electrical Technology"
                          value={courseName}
                          onChange={(event) => setCourseName(event.target.value)}
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label>Source mode</label>
                      <div className="segmented">
                        {(["upload", "url", "paste"] as const).map((mode) => (
                          <button
                            className={sourceMode === mode ? "active" : ""}
                            key={mode}
                            onClick={() => setSourceMode(mode)}
                            type="button"
                          >
                            {mode === "upload"
                              ? "Upload file"
                              : mode === "url"
                                ? "Paste URL"
                                : "Paste text"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {sourceMode === "url" ? (
                      <div className="field">
                        <label>Source URL</label>
                        <input
                          placeholder="https://..."
                          value={sourceUrl}
                          onChange={(event) => setSourceUrl(event.target.value)}
                        />
                      </div>
                    ) : null}

                    <div className="field">
                      <label>{sourceMode === "upload" ? "Uploaded text" : "Source content"}</label>
                      <textarea
                        placeholder="Paste source content here for the builder to turn into one strong objective and a long sequence of blocks."
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                      />
                    </div>
                  </>
                ) : null}

                {step === 2 ? (
                  <>
                    <div className="field">
                      <label>AI objective suggestion</label>
                      <div className="card">
                        <strong>{objectiveSuggestion.title}</strong>
                        <p>{objectiveSuggestion.goal}</p>
                      </div>
                    </div>

                    <div className="segmented">
                      <button
                        className="active"
                        disabled={!content.trim() || aiBusyStep === 2}
                        onClick={() => generateWithAi("objective")}
                        type="button"
                      >
                        {aiBusyStep === 2 ? "Generating..." : "Generate with AI"}
                      </button>
                      <button onClick={applyObjectiveSuggestion} type="button">
                        Use quick local draft
                      </button>
                    </div>

                    {aiError && step === 2 ? <div className="save-error">{aiError}</div> : null}

                    <div className="field">
                      <label>Objective title</label>
                      <input
                        placeholder="Example: Choose conductor and breaker sizes correctly"
                        value={objectiveTitle}
                        onChange={(event) => setObjectiveTitle(event.target.value)}
                      />
                    </div>

                    <div className="field">
                      <label>Objective goal</label>
                      <textarea
                        placeholder="Describe what the student must actually demonstrate to complete this objective."
                        value={objectiveGoal}
                        onChange={(event) => setObjectiveGoal(event.target.value)}
                      />
                    </div>
                  </>
                ) : null}

                {step === 3 ? (
                  <>
                    <div className="row">
                      <div className="field">
                        <label>Difficulty</label>
                        <div className="segmented">
                          {(["Foundational", "Intermediate", "Advanced"] as const).map(
                            (value) => (
                              <button
                                className={difficulty === value ? "active" : ""}
                                key={value}
                                onClick={() => setDifficulty(value)}
                                type="button"
                              >
                                {value}
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      <div className="field">
                        <label>Layout direction</label>
                        <div className="segmented">
                          {(
                            ["Guided path", "Mixed media path", "Scenario path"] as const
                          ).map((value) => (
                            <button
                              className={layout === value ? "active" : ""}
                              key={value}
                              onClick={() => setLayout(value)}
                              type="button"
                            >
                              {value}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="field">
                      <label>Target block count</label>
                      <input
                        max={50}
                        min={6}
                        type="number"
                        value={targetBlockCount}
                        onChange={(event) =>
                          setTargetBlockCount(clampBlockTarget(Number(event.target.value)))
                        }
                      />
                    </div>

                    <div className="card">
                      <strong>Current build profile</strong>
                      <p>
                        This assignment has one objective and aims for about{" "}
                        <strong>{targetBlockCount}</strong> stacked blocks. That gives you room
                        for lots of slides, checks, review moments, and retake support.
                      </p>
                    </div>
                  </>
                ) : null}

                {step === 4 ? (
                  <>
                    <div className="field">
                      <label>AI-suggested block stack</label>
                      <div className="segmented">
                        <button
                          className="active"
                          disabled={!objectiveGoal.trim() || aiBusyStep === 4}
                          onClick={() => generateWithAi("blocks")}
                          type="button"
                        >
                          {aiBusyStep === 4 ? "Generating..." : "Generate block stack"}
                        </button>
                      </div>
                      <div className="list">
                        {(generatedBlocks.length
                          ? generatedBlocks.map((block, index) => ({
                              id: block.id || `generated-${index + 1}`,
                              title: block.title,
                              content: block.body || block.summary,
                              chips: [
                                block.type,
                                block.theme,
                                block.layoutStyle,
                                ...(block.choices?.length ? [`${block.choices.length} choices`] : []),
                                ...(block.bullets?.slice(0, 2) || []),
                              ].filter(Boolean) as string[],
                            }))
                          : interactionSuggestions.map((suggestion) => ({
                              id: suggestion.id,
                              title: suggestion.title,
                              content: suggestion.content,
                              chips: suggestion.interactions,
                            }))
                        ).map((item) => (
                          <div className="card" key={item.id}>
                            <strong>{item.title}</strong>
                            <p>{item.content}</p>
                            <div className="chips">
                              {item.chips.map((chip) => (
                                <span className="chip" key={chip}>
                                  {chip}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {aiError && step === 4 ? <div className="save-error">{aiError}</div> : null}

                    <div className="card">
                      <strong>Completion criteria</strong>
                      <p>
                        Complete at least <strong>{completionCriteria.minBlocksComplete}</strong>{" "}
                        blocks and get at least{" "}
                        <strong>{completionCriteria.minCorrectInteractions}</strong> interactive
                        blocks correct. Retake is{" "}
                        <strong>{completionCriteria.allowRetake ? "enabled" : "disabled"}</strong>.
                      </p>
                    </div>

                    <div className="field">
                      <label>Teacher approval</label>
                      <div className="segmented">
                        <button
                          className={learningSuggestionsAccepted ? "active" : ""}
                          onClick={() => setLearningSuggestionsAccepted(true)}
                          type="button"
                        >
                          Stack accepted
                        </button>
                        <button
                          className={!learningSuggestionsAccepted ? "active" : ""}
                          onClick={() => setLearningSuggestionsAccepted(false)}
                          type="button"
                        >
                          Still editing
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}

                {step === 5 ? (
                  <>
                    <div className="card">
                      <strong>Assignment ready to store</strong>
                      <p>
                        Final build: <strong>{assignmentName || "Untitled assignment"}</strong>{" "}
                        for <strong>{courseName || "Untitled course"}</strong>, with one objective
                        and <strong>{generatedBlocks.length || targetBlockCount}</strong> planned
                        blocks.
                      </p>
                    </div>

                    <button
                      className="btn primary"
                      disabled={saving}
                      onClick={saveDraft}
                      type="button"
                    >
                      {saving ? "Saving..." : "Save to database"}
                    </button>

                    {saved ? (
                      <div className="save-ok">
                        Saved as a course JSON payload. The student player can now load it by
                        course ID.
                        {savedCourseId ? (
                          <>
                            {" "}
                            <Link className="btn" href={`/masterypath?courseId=${savedCourseId}`}>
                              Open saved course
                            </Link>
                          </>
                        ) : null}
                      </div>
                    ) : null}

                    {saveError ? <div className="save-error">{saveError}</div> : null}
                  </>
                ) : null}
              </div>

              <div className="footer">
                <button className="btn" onClick={previousStep} type="button">
                  Back
                </button>
                <button className="btn primary" onClick={nextStep} type="button">
                  Continue
                </button>
              </div>
            </div>
          </main>

          <aside className="aside">
            <div className="aside-label">Blueprint</div>

            <div className="aside-card">
              <h3>One objective only</h3>
              <p>
                This assignment now focuses on a single objective so you can stack a large
                amount of content and interaction under one target.
              </p>
            </div>

            <div className="aside-card">
              <h3>Grouped blocks</h3>
              <p>
                Content slides, checks, reviews, and reflection prompts all stay grouped
                inside the same objective so students can revisit the section.
              </p>
            </div>

            <div className="aside-card">
              <h3>Course JSON target</h3>
              <p>
                Save one payload by course ID with the assignment shell, the one objective,
                its completion criteria, and the full block stack.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
