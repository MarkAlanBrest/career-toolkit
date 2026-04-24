"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  buildInteractionSuggestions,
  buildObjectiveSuggestions,
  type LearningNode,
  type MasteryRule,
} from "../data";

type Step = 1 | 2 | 3 | 4 | 5;

const steps: Array<{ id: Step; label: string }> = [
  { id: 1, label: "Source" },
  { id: 2, label: "Objectives" },
  { id: 3, label: "Difficulty" },
  { id: 4, label: "Learning Flow" },
  { id: 5, label: "Save" },
];

export default function MasteryPathBuilderPage() {
  const [step, setStep] = useState<Step>(1);
  const [sourceMode, setSourceMode] = useState<"upload" | "url" | "paste">("paste");
  const [assignmentName, setAssignmentName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [content, setContent] = useState("");
  const [objectives, setObjectives] = useState<string[]>(["", "", ""]);
  const [difficulty, setDifficulty] = useState<"Foundational" | "Intermediate" | "Advanced">(
    "Intermediate"
  );
  const [layout, setLayout] = useState<"Guided path" | "Mixed media path" | "Scenario path">(
    "Mixed media path"
  );
  const [learningSuggestionsAccepted, setLearningSuggestionsAccepted] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedCourseId, setSavedCourseId] = useState("");
  const [generatedNodes, setGeneratedNodes] = useState<LearningNode[]>([]);
  const [generatedMasteryRules, setGeneratedMasteryRules] = useState<MasteryRule[]>([]);
  const [generatedStartNodeId, setGeneratedStartNodeId] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiBusyStep, setAiBusyStep] = useState<Step | null>(null);

  const objectiveSuggestions = useMemo(
    () => buildObjectiveSuggestions(content),
    [content]
  );

  const interactionSuggestions = useMemo(
    () => buildInteractionSuggestions(objectives, difficulty),
    [objectives, difficulty]
  );

  function nextStep() {
    setStep((previous) => {
      const next = Math.min(5, previous + 1);
      return next as Step;
    });
  }

  function previousStep() {
    setStep((previous) => {
      const next = Math.max(1, previous - 1);
      return next as Step;
    });
  }

  function applyObjectiveSuggestions() {
    setObjectives(objectiveSuggestions);
  }

  async function generateWithAi(stage: "objectives" | "graph") {
    setAiError("");
    setAiBusyStep(stage === "objectives" ? 2 : 4);

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
          objectives,
          difficulty,
          layout,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to generate AI content.");
      }

      if (stage === "objectives") {
        const nextObjectives = Array.isArray(payload.objectives)
          ? payload.objectives
              .map((item: unknown) => (typeof item === "string" ? item.trim() : ""))
              .filter(Boolean)
          : [];

        if (!nextObjectives.length) {
          throw new Error("AI did not return any objectives.");
        }

        setObjectives(nextObjectives);
        return;
      }

      const nextNodes = Array.isArray(payload.nodes)
        ? payload.nodes
            .map((node: any, index: number) => ({
              id:
                typeof node?.id === "string" && node.id.trim()
                  ? node.id.trim()
                  : `generated-node-${index + 1}`,
              objectiveId:
                typeof node?.objectiveId === "string" && node.objectiveId.trim()
                  ? node.objectiveId.trim()
                  : null,
              type:
                node?.type === "lesson" ||
                node?.type === "question" ||
                node?.type === "remediation" ||
                node?.type === "mastery-check" ||
                node?.type === "completion"
                  ? node.type
                  : "lesson",
              title:
                typeof node?.title === "string" && node.title.trim()
                  ? node.title.trim()
                  : `Node ${index + 1}`,
              summary: typeof node?.summary === "string" ? node.summary.trim() : "",
              body: typeof node?.body === "string" ? node.body.trim() : "",
              bullets: Array.isArray(node?.bullets)
                ? node.bullets
                    .map((item: unknown) => (typeof item === "string" ? item.trim() : ""))
                    .filter(Boolean)
                : [],
              callout:
                node?.callout &&
                (typeof node.callout.label === "string" ||
                  typeof node.callout.text === "string")
                  ? {
                      label:
                        typeof node.callout.label === "string"
                          ? node.callout.label.trim()
                          : "",
                      text:
                        typeof node.callout.text === "string"
                          ? node.callout.text.trim()
                          : "",
                    }
                  : null,
              stats: Array.isArray(node?.stats)
                ? node.stats
                    .map((item: any) => ({
                      label: typeof item?.label === "string" ? item.label.trim() : "",
                      value: typeof item?.value === "string" ? item.value.trim() : "",
                    }))
                    .filter((item: { label: string; value: string }) => item.label || item.value)
                : [],
              media:
                node?.media &&
                typeof node.media.url === "string" &&
                node.media.url.trim()
                  ? {
                      type: node.media.type === "video" ? "video" : "image",
                      url: node.media.url.trim(),
                      caption:
                        typeof node.media.caption === "string" ? node.media.caption.trim() : "",
                    }
                  : null,
              theme:
                node?.theme === "ocean" ||
                node?.theme === "sunset" ||
                node?.theme === "forest" ||
                node?.theme === "slate"
                  ? node.theme
                  : "ocean",
              layoutStyle:
                node?.layoutStyle === "split" ||
                node?.layoutStyle === "spotlight" ||
                node?.layoutStyle === "bullet-focus" ||
                node?.layoutStyle === "media-left"
                  ? node.layoutStyle
                  : "split",
              choices: Array.isArray(node?.choices)
                ? node.choices
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
              transitions:
                typeof node?.transitions === "object" && node.transitions
                  ? node.transitions
                  : {},
            }))
            .filter((node: LearningNode) => node.title || node.body)
        : [];

      if (!nextNodes.length) {
        throw new Error("AI did not return any adaptive nodes.");
      }

      setGeneratedNodes(nextNodes);
      setGeneratedStartNodeId(
        typeof payload.startNodeId === "string" && payload.startNodeId.trim()
          ? payload.startNodeId.trim()
          : nextNodes[0]?.id || ""
      );
      setGeneratedMasteryRules(
        Array.isArray(payload.masteryRules)
          ? payload.masteryRules
              .map((rule: any) => ({
                objectiveId:
                  typeof rule?.objectiveId === "string" ? rule.objectiveId.trim() : "",
                masteryStreak:
                  typeof rule?.masteryStreak === "number" ? rule.masteryStreak : 2,
                remediationThreshold:
                  typeof rule?.remediationThreshold === "number"
                    ? rule.remediationThreshold
                    : 1,
              }))
              .filter((rule: MasteryRule) => rule.objectiveId)
          : []
      );
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
          objectives,
          nodes: generatedNodes,
          masteryRules: generatedMasteryRules,
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
        textarea,
        select{
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

        .objective{
          display:grid;
          gap:8px;
          padding:12px;
          border:1px solid #d8e2eb;
          border-radius:8px;
          background:#fff;
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
              A separate teacher workflow: provide source content, let AI suggest
              objectives, tune difficulty and layout, review learning interactions,
              then save the final assignment to the database.
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
                      ? "Upload, paste, or point AI at source material."
                      : item.id === 2
                        ? "Review and edit AI objective suggestions."
                        : item.id === 3
                          ? "Choose rigor, structure, and presentation."
                          : item.id === 4
                        ? "Review AI-proposed adaptive path."
                            : "Store the finished assignment and publish it."}
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
                      ? "Review AI objective suggestions"
                      : step === 3
                        ? "Set difficulty and layout"
                        : step === 4
                          ? "Review adaptive learning graph"
                          : "Save the assignment"}
                </h2>
                <p>
                  {step === 1
                    ? "Teachers can upload text, paste material, or point the builder at a URL. This becomes the input for AI suggestions."
                    : step === 2
                      ? "AI proposes objectives from the source content, but the teacher stays in control and can edit every objective before moving on."
                      : step === 3
                        ? "Difficulty and layout shape how dense, supportive, or scenario-based the student path becomes."
                        : step === 4
                          ? "Once the structure is set, AI proposes an adaptive graph of lesson, question, review, and mastery nodes."
                          : "The last step stores the assignment definition so the student player can load it from the database and track outcomes."}
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
                        placeholder="Paste source content here for the builder to turn into objectives and learning flow."
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                      />
                    </div>
                  </>
                ) : null}

                {step === 2 ? (
                  <>
                    <div className="field">
                      <label>AI-suggested objectives</label>
                      <div className="list">
                        {objectiveSuggestions.map((suggestion) => (
                          <div className="card" key={suggestion}>
                            <strong>{suggestion}</strong>
                            <p>
                              Suggested from the provided source material. Teachers can accept the set or edit line by line below.
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="segmented">
                      <button
                        className="active"
                        disabled={!content.trim() || aiBusyStep === 2}
                        onClick={() => generateWithAi("objectives")}
                        type="button"
                      >
                        {aiBusyStep === 2 ? "Generating..." : "Generate with AI"}
                      </button>
                      <button
                        disabled={!objectiveSuggestions.length}
                        onClick={applyObjectiveSuggestions}
                        type="button"
                      >
                        Use quick local draft
                      </button>
                    </div>

                    {aiError && step === 2 ? <div className="save-error">{aiError}</div> : null}

                    <div className="field">
                      <label>Editable objectives</label>
                      <div className="list">
                        {objectives.map((objective, index) => (
                          <div className="objective" key={`objective-${index + 1}`}>
                            <input
                              value={objective}
                              onChange={(event) =>
                                setObjectives((previous) =>
                                  previous.map((item, itemIndex) =>
                                    itemIndex === index ? event.target.value : item
                                  )
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
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
                        <label>Layout</label>
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

                    <div className="card">
                      <strong>Current build profile</strong>
                      <p>
                        Difficulty is set to <strong>{difficulty}</strong>. Layout is{" "}
                        <strong>{layout}</strong>. This tells AI how much support,
                        branching, and interaction density to put into the student
                        experience.
                      </p>
                    </div>
                  </>
                ) : null}

                {step === 4 ? (
                  <>
                    <div className="field">
                      <label>AI-suggested adaptive path</label>
                      <div className="segmented">
                        <button
                          className="active"
                          disabled={!content.trim() || aiBusyStep === 4}
                          onClick={() => generateWithAi("graph")}
                          type="button"
                        >
                          {aiBusyStep === 4 ? "Generating..." : "Generate adaptive path"}
                        </button>
                      </div>
                      <div className="list">
                        {(generatedNodes.length
                          ? generatedNodes.map((node, index) => ({
                              id: node.id || `generated-${index + 1}`,
                              title: node.title,
                              content: node.body || node.summary,
                              chips: [
                                node.type,
                                node.theme,
                                node.layoutStyle,
                                node.objectiveId || "",
                                ...(node.choices?.length ? [`${node.choices.length} choices`] : []),
                              ].filter(Boolean) as string[],
                            }))
                          : interactionSuggestions.map((suggestion) => ({
                              id: suggestion.id,
                              title: suggestion.title,
                              content: suggestion.content,
                              chips: suggestion.interactions,
                            }))
                        ).map((suggestion) => (
                          <div className="card" key={suggestion.id}>
                            <strong>{suggestion.title}</strong>
                            <p>{suggestion.content}</p>
                            <div className="chips">
                              {suggestion.chips.map((item) => (
                                <span className="chip" key={item}>
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {aiError && step === 4 ? <div className="save-error">{aiError}</div> : null}

                    {generatedStartNodeId ? (
                      <div className="card">
                        <strong>Start node</strong>
                        <p>{generatedStartNodeId}</p>
                      </div>
                    ) : null}

                    <div className="field">
                      <label>Teacher approval</label>
                      <div className="segmented">
                        <button
                          className={learningSuggestionsAccepted ? "active" : ""}
                          onClick={() => setLearningSuggestionsAccepted(true)}
                          type="button"
                        >
                          Suggestions accepted
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
                        Final build: <strong>{assignmentName}</strong> for{" "}
                        <strong>{courseName}</strong>, with {objectives.filter(Boolean).length}{" "}
                        objectives, difficulty set to {difficulty.toLowerCase()}, and layout
                        set to {layout.toLowerCase()}.
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
                        Saved as a course JSON payload. The student player can now load it
                        by course ID.
                        {savedCourseId ? (
                          <>
                            {" "}
                            <Link
                              className="btn"
                              href={`/masterypath?courseId=${savedCourseId}`}
                            >
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
              <h3>Teacher-side intent</h3>
              <p>
                The builder is now separate and linear, so the teacher can think about
                source material, objectives, difficulty, and learning flow one stage at a time.
              </p>
            </div>

            <div className="aside-card">
              <h3>Student-side intent</h3>
              <p>
                The student should see a cleaner assignment player with one focused main
                area, optional progress and navigation panels, and a final report that can
                be submitted for grading.
              </p>
            </div>

            <div className="aside-card">
              <h3>Database target</h3>
              <p>
                Store assignment shell, source metadata, AI suggestions, approved
                objectives, approved learning blocks, interaction definitions, mastery
                rules, student attempts, and final report records.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
