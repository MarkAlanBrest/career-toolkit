"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { type CompletionCriteria, type ObjectiveBlock, type SlideTheme } from "../data";

type Step = 1 | 2 | 3;
type InteractionType = ObjectiveBlock["type"];
type ActivityCounts = Partial<Record<InteractionType, number>>;

const interactionTypes: Array<{
  type: InteractionType;
  title: string;
  description: string;
}> = [
  {
    type: "multiple-choice",
    title: "Multiple choice checks",
    description: "Use answer choices to check whether students recognize the right idea.",
  },
  {
    type: "true-false",
    title: "True / false checks",
    description: "Use quick statements to catch misconceptions and trigger review tips.",
  },
  {
    type: "checkpoint",
    title: "Scenario checkpoints",
    description: "Ask students to apply the content to a small real-world decision.",
  },
  {
    type: "drag-drop",
    title: "Drag and drop",
    description: "Students move terms, tools, or ideas into the correct category.",
  },
  {
    type: "matching",
    title: "Matching",
    description: "Students connect related terms, definitions, examples, or rules.",
  },
  {
    type: "sequencing",
    title: "Sequencing",
    description: "Students place steps, events, or procedures in the correct order.",
  },
  {
    type: "sorting",
    title: "Sorting",
    description: "Students classify examples into the right group.",
  },
  {
    type: "scenario",
    title: "Scenario decisions",
    description: "Students choose what to do in a realistic situation.",
  },
  {
    type: "reflection",
    title: "Reflection prompts",
    description: "Ask students to explain the concept in their own words before mastery.",
  },
];

const themes: Array<{
  id: SlideTheme;
  label: string;
  description: string;
  color: string;
}> = [
  { id: "ocean", label: "Ocean", description: "Clean blue classroom style.", color: "#1585C0" },
  { id: "sunset", label: "Sunset", description: "Warm activity style.", color: "#E0780F" },
  { id: "forest", label: "Forest", description: "Calm focused practice style.", color: "#0F9B6B" },
  { id: "slate", label: "Slate", description: "Neutral assessment style.", color: "#5B45E0" },
];

function contentTopics(content: string, title: string) {
  const sentences = content
    .split(/[.!?]/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, 6);

  if (sentences.length) return sentences;
  return [title || "the uploaded content"];
}

function shortTopic(topic: string) {
  return topic.length > 90 ? `${topic.slice(0, 87)}...` : topic;
}

function buildInteractionBlocks({
  title,
  content,
  activityCounts,
}: {
  title: string;
  content: string;
  activityCounts: ActivityCounts;
}) {
  const topics = contentTopics(content, title);
  const blocks: ObjectiveBlock[] = [];

  interactionTypes.forEach(({ type }) => {
    const count = Math.max(0, activityCounts[type] || 0);
    Array.from({ length: count }).forEach((_, index) => {
      const topic = topics[index % topics.length] || title || "the uploaded content";
      const topicLabel = shortTopic(topic);
      const id = `${type}-${index + 1}`;

      if (type === "multiple-choice") {
        blocks.push({
          id,
          type,
          title: `Check: ${topicLabel}`,
          summary: "Students choose the strongest answer.",
          body: `Which answer best matches this content: ${topicLabel}`,
          choices: [
            {
              id: "correct",
              text: "The answer that matches the uploaded content.",
              isCorrect: true,
              feedback: "Correct. Keep going.",
            },
            {
              id: "review",
              text: "A common misunderstanding of the content.",
              feedback: `Please review ${topicLabel} again; you could improve here.`,
            },
            {
              id: "not-yet",
              text: "An answer that does not fit this content.",
              feedback: `Please review ${topicLabel} again; you could improve here.`,
            },
          ],
          theme: "ocean",
          layoutStyle: "spotlight",
        });
      }

      if (type === "true-false") {
        blocks.push({
          id,
          type,
          title: `Quick check: ${topicLabel}`,
          summary: "Students confirm whether the statement matches the content.",
          body: `True or false: this statement is supported by the uploaded content: ${topicLabel}`,
          choices: [
            { id: "true", text: "True", isCorrect: true, feedback: "Correct. Keep going." },
            {
              id: "false",
              text: "False",
              feedback: `Please review ${topicLabel} again; you could improve here.`,
            },
          ],
          theme: "sunset",
          layoutStyle: "spotlight",
        });
      }

      if (type === "checkpoint" || type === "scenario") {
        blocks.push({
          id,
          type,
          title: `${type === "checkpoint" ? "Scenario" : "Decision"}: ${topicLabel}`,
          summary: "Students apply the content to a decision.",
          body: `You are using this content in a real situation: ${topicLabel}. What should you do next?`,
          choices: [
            {
              id: "best",
              text: "Use the rule or process described in the content.",
              isCorrect: true,
              feedback: "Correct. Keep going.",
            },
            {
              id: "review",
              text: "Skip the content and guess.",
              feedback: `Please review ${topicLabel} again; you could improve here.`,
            },
          ],
          theme: "forest",
          layoutStyle: "spotlight",
        });
      }

      if (type === "drag-drop" || type === "matching" || type === "sorting") {
        blocks.push({
          id,
          type,
          title: `${type === "drag-drop" ? "Drag" : type === "matching" ? "Match" : "Sort"}: ${topicLabel}`,
          summary: "Students place each item in the correct target.",
          body: `Move each item to the best target based on this content: ${topicLabel}`,
          activityItems: [
            { id: "item-1", text: "Key idea from the content", targetId: "target-1" },
            { id: "item-2", text: "Common distractor or related idea", targetId: "target-2" },
          ],
          activityTargets: [
            { id: "target-1", label: "Best match", accepts: ["item-1"] },
            { id: "target-2", label: "Review again", accepts: ["item-2"] },
          ],
          theme: "forest",
          layoutStyle: "spotlight",
        });
      }

      if (type === "sequencing") {
        blocks.push({
          id,
          type,
          title: `Order the steps: ${topicLabel}`,
          summary: "Students place steps in the correct sequence.",
          body: `Put these steps in the best order for this content: ${topicLabel}`,
          activityItems: [
            { id: "step-1", text: "First important step", order: 1 },
            { id: "step-2", text: "Second important step", order: 2 },
            { id: "step-3", text: "Final check or result", order: 3 },
          ],
          theme: "slate",
          layoutStyle: "spotlight",
        });
      }

      if (type === "reflection") {
        blocks.push({
          id,
          type,
          title: `Explain: ${topicLabel}`,
          summary: "Students explain the content in their own words.",
          body: `Explain this idea in your own words: ${topicLabel}`,
          placeholder: "Type your explanation here...",
          theme: "slate",
          layoutStyle: "split",
        });
      }
    });
  });

  return blocks;
}

function defaultActivityCounts(): ActivityCounts {
  return interactionTypes.reduce((counts, interaction) => {
    counts[interaction.type] =
      interaction.type === "multiple-choice" ||
      interaction.type === "drag-drop" ||
      interaction.type === "matching" ||
      interaction.type === "reflection"
        ? 1
        : 0;
    return counts;
  }, {} as ActivityCounts);
}

function countGradableInteractions(blocks: ObjectiveBlock[]) {
  return blocks.filter((block) =>
    block.type === "multiple-choice" ||
    block.type === "true-false" ||
    block.type === "checkpoint" ||
    block.type === "drag-drop" ||
    block.type === "matching" ||
    block.type === "sequencing" ||
    block.type === "sorting" ||
    block.type === "scenario"
  ).length;
}

function normalizeAiBlocks(blocks: unknown): ObjectiveBlock[] {
  if (!Array.isArray(blocks)) return [];

  return blocks
    .map((block: any, index: number) => ({
      id: typeof block?.id === "string" && block.id.trim() ? block.id.trim() : `ai-activity-${index + 1}`,
      type:
        interactionTypes.some((item) => item.type === block?.type) || block?.type === "review"
          ? block.type
          : "checkpoint",
      title:
        typeof block?.title === "string" && block.title.trim()
          ? block.title.trim()
          : `Activity ${index + 1}`,
      summary: typeof block?.summary === "string" ? block.summary.trim() : "",
      body: typeof block?.body === "string" ? block.body.trim() : "",
      choices: Array.isArray(block?.choices)
        ? block.choices
            .map((choice: any, choiceIndex: number) => ({
              id:
                typeof choice?.id === "string" && choice.id.trim()
                  ? choice.id.trim()
                  : `choice-${choiceIndex + 1}`,
              text: typeof choice?.text === "string" ? choice.text.trim() : "",
              isCorrect: Boolean(choice?.isCorrect),
              feedback: typeof choice?.feedback === "string" ? choice.feedback.trim() : "",
            }))
            .filter((choice: { text: string }) => choice.text)
        : [],
      activityItems: Array.isArray(block?.activityItems)
        ? block.activityItems
            .map((item: any, itemIndex: number) => ({
              id:
                typeof item?.id === "string" && item.id.trim()
                  ? item.id.trim()
                  : `item-${itemIndex + 1}`,
              text: typeof item?.text === "string" ? item.text.trim() : "",
              targetId: typeof item?.targetId === "string" ? item.targetId.trim() : "",
              order: typeof item?.order === "number" ? item.order : itemIndex + 1,
            }))
            .filter((item: { text: string }) => item.text)
        : [],
      activityTargets: Array.isArray(block?.activityTargets)
        ? block.activityTargets
            .map((target: any, targetIndex: number) => ({
              id:
                typeof target?.id === "string" && target.id.trim()
                  ? target.id.trim()
                  : `target-${targetIndex + 1}`,
              label: typeof target?.label === "string" ? target.label.trim() : "",
              accepts: Array.isArray(target?.accepts)
                ? target.accepts.filter((item: unknown) => typeof item === "string")
                : [],
            }))
            .filter((target: { label: string }) => target.label)
        : [],
      placeholder: typeof block?.placeholder === "string" ? block.placeholder.trim() : "",
      theme: "ocean" as const,
      layoutStyle: "spotlight" as const,
    }))
    .filter((block: ObjectiveBlock) => block.title || block.body);
}

export default function MasteryPathBuilderPage() {
  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [content, setContent] = useState("");
  const [activityCounts, setActivityCounts] = useState<ActivityCounts>(() => defaultActivityCounts());
  const [selectedTheme, setSelectedTheme] = useState<SlideTheme>("ocean");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedCourseId, setSavedCourseId] = useState("");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [aiBlocks, setAiBlocks] = useState<ObjectiveBlock[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");

  const interactionBlocks = useMemo(
    () => buildInteractionBlocks({ title, content, activityCounts }),
    [activityCounts, content, title]
  );
  const finalBlocks = useMemo(
    () =>
      (aiBlocks.length ? aiBlocks : interactionBlocks).map((block) => ({
        ...block,
        theme: selectedTheme,
      })),
    [aiBlocks, interactionBlocks, selectedTheme]
  );
  const requiredCorrectInteractions = Math.max(1, countGradableInteractions(finalBlocks));
  const completionCriteria: CompletionCriteria = {
    minBlocksComplete: finalBlocks.length,
    minCorrectInteractions: requiredCorrectInteractions,
    allowRetake: true,
    repeatLoopsRequired: 1,
    loopLevel: "Practice",
  };

  function setActivityCount(type: InteractionType, count: number) {
    setAiBlocks([]);
    setActivityCounts((previous) => ({
      ...previous,
      [type]: Math.max(0, Math.min(12, count)),
    }));
  }

  async function handleFileUpload(file?: File) {
    if (!file) return;
    setContent(await file.text());
  }

  function savedAssignmentUrl() {
    if (!savedCourseId) return "";
    const path = `/masterypath?courseId=${savedCourseId}`;
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${path}`;
  }

  async function copySavedUrl() {
    const url = savedAssignmentUrl();
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      window.setTimeout(() => setCopiedUrl(false), 1800);
    } catch {
      setSaveError("Unable to copy the URL. Open Preview and copy it from the address bar.");
    }
  }

  async function generateWithAi() {
    setAiBusy(true);
    setAiError("");

    try {
      const response = await fetch("/api/masterypath/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "blocks",
          title,
          course,
          sourceMode: "paste",
          content,
          desiredBlockCount: Object.values(activityCounts).reduce((sum, count) => sum + count, 0),
          activityCounts,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to generate activities.");
      }

      const nextBlocks = normalizeAiBlocks(payload.blocks);
      if (!nextBlocks.length) throw new Error("AI did not return activities.");
      setAiBlocks(nextBlocks);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Unable to generate activities.");
    } finally {
      setAiBusy(false);
    }
  }

  async function saveDraft() {
    setSaving(true);
    setSaved(false);
    setSaveError("");

    try {
      const response = await fetch("/api/masterypath", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          course,
          sourceMode: "paste",
          sourceUrl: "",
          content,
          objectiveTitle: title,
          objectiveGoal: title,
          blocks: finalBlocks,
          completionCriteria,
          difficulty: "Intermediate",
          layout: "Guided path",
          learningSuggestionsAccepted: true,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save assignment.");
      }

      setSaved(true);
      setSavedCourseId(payload.courseId || "");
      setCopiedUrl(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save assignment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: Arial, Helvetica, sans-serif;
          background: #F0EDF8;
          color: #1A1528;
        }
        .page { min-height: 100vh; display: grid; grid-template-rows: auto 1fr; }
        .topbar {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
          padding: 16px 24px;
          background: #fff;
          border-bottom: 1px solid #E8E2F5;
        }
        h1, h2, p { margin: 0; }
        .brand { display: grid; gap: 6px; }
        .brand h1 { font-size: 22px; font-weight: 700; }
        .brand p { color: #7068A0; font-size: 13px; line-height: 1.5; }
        .toolbar, .footer, .chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .btn {
          min-height: 38px;
          padding: 0 14px;
          border-radius: 8px;
          border: 1px solid #E2DCF0;
          background: #fff;
          color: #3D29B8;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-family: inherit;
        }
        .btn.primary { background: #5B45E0; border-color: #5B45E0; color: #fff; }
        .btn:disabled { opacity: .55; cursor: not-allowed; }
        .shell {
          width: min(1120px, 100%);
          margin: 0 auto;
          padding: 24px;
          display: grid;
          gap: 16px;
        }
        .steps, .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .step, .card {
          border: 1px solid #E2DCF0;
          background: #fff;
          border-radius: 8px;
          padding: 14px;
          text-align: left;
          cursor: pointer;
          font-family: inherit;
        }
        .step.active, .card.selected { border-color: #5B45E0; background: #EDEAFC; }
        .step strong, .card strong { display: block; color: #1A1528; font-size: 14px; margin-bottom: 5px; }
        .step span, .card p { color: #7068A0; font-size: 12px; line-height: 1.55; }
        .activity-count-card {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 14px;
          align-items: center;
          cursor: default;
        }
        .counter {
          display: grid;
          grid-template-columns: 32px 42px 32px;
          gap: 6px;
          align-items: center;
        }
        .counter button {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid #E2DCF0;
          background: #fff;
          color: #3D29B8;
          cursor: pointer;
          font: inherit;
          font-weight: 700;
        }
        .counter input {
          height: 32px;
          padding: 0;
          text-align: center;
          font-weight: 700;
        }
        .panel { border: 1px solid #E8E2F5; border-radius: 8px; background: #fff; overflow: hidden; }
        .panel-head { padding: 18px; border-bottom: 1px solid #E8E2F5; display: grid; gap: 8px; }
        .panel-head h2 { font-size: 22px; }
        .panel-head p { color: #7068A0; font-size: 13px; line-height: 1.55; }
        .panel-body { padding: 18px; display: grid; gap: 16px; }
        .field { display: grid; gap: 8px; }
        .field label { color: #4D456C; font-size: 12px; font-weight: 700; }
        input, textarea {
          width: 100%;
          border: 1px solid #E2DCF0;
          border-radius: 8px;
          padding: 11px 12px;
          font: inherit;
          color: #1A1528;
          background: #fff;
        }
        textarea { min-height: 260px; resize: vertical; }
        .theme-swatch {
          width: 32px;
          height: 6px;
          border-radius: 999px;
          margin-bottom: 8px;
        }
        .chip {
          min-height: 26px;
          display: inline-flex;
          align-items: center;
          padding: 0 9px;
          border-radius: 999px;
          background: #F4F1FB;
          color: #5B45E0;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid #E2DCF0;
        }
        .footer {
          padding: 16px 18px;
          border-top: 1px solid #E8E2F5;
          background: #fff;
          justify-content: space-between;
        }
        .save-ok, .save-error {
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
          line-height: 1.5;
        }
        .save-ok { background: #E6FAF4; color: #0A7050; }
        .save-error { background: #FEE8ED; color: #B01F3D; }
        @media (max-width: 760px) {
          .topbar { align-items: flex-start; flex-direction: column; }
          .shell { padding: 12px; }
          .steps, .grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="page">
        <header className="topbar">
          <div className="brand">
            <h1>MasteryPath Builder</h1>
            <p>Upload or paste content, then set how many of each activity students should complete.</p>
          </div>
          <div className="toolbar">
            <Link className="btn" href="/masterypath/assignments">Assignments</Link>
            <Link className="btn" href="/masterypath">Student View</Link>
            <Link className="btn" href="/">Dashboard</Link>
          </div>
        </header>

        <main className="shell">
          <div className="steps">
            {[
              ["1", "Content", "Title and source material"],
              ["2", "Activities", "Set activity counts"],
              ["3", "Save", "Review and publish"],
            ].map(([id, label, description]) => (
              <button
                className={`step ${step === Number(id) ? "active" : ""}`}
                key={id}
                onClick={() => setStep(Number(id) as Step)}
                type="button"
              >
                <strong>{id}. {label}</strong>
                <span>{description}</span>
              </button>
            ))}
          </div>

          <section className="panel">
            <div className="panel-head">
              <h2>
                {step === 1
                  ? "Add Assignment Content"
                  : step === 2
                    ? "Activity Counts"
                    : "Save Assignment"}
              </h2>
              <p>
                {step === 1
                  ? "The teacher writes the title and provides the material."
                  : step === 2
                    ? "Set how many of each activity type this assignment should include."
                    : "Review the activity mix, then save the assignment."}
              </p>
            </div>

            <div className="panel-body">
              {step === 1 ? (
                <>
                  <div className="grid">
                    <div className="field">
                      <label>Assignment title</label>
                      <input
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Example: Residential Wiring Review"
                        value={title}
                      />
                    </div>
                    <div className="field">
                      <label>Course</label>
                      <input
                        onChange={(event) => setCourse(event.target.value)}
                        placeholder="Example: Electrical Technology"
                        value={course}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label>Upload content</label>
                    <input
                      accept=".txt,.md,.csv,.json"
                      onChange={(event) => handleFileUpload(event.target.files?.[0])}
                      type="file"
                    />
                  </div>

                  <div className="field">
                    <label>Paste or edit content</label>
                    <textarea
                      onChange={(event) => setContent(event.target.value)}
                      placeholder="Paste the source content students should be checked on."
                      value={content}
                    />
                  </div>

                  <div className="field">
                    <label>Student activity theme</label>
                    <div className="grid">
                      {themes.map((theme) => (
                        <button
                          className={`card ${selectedTheme === theme.id ? "selected" : ""}`}
                          key={theme.id}
                          onClick={() => setSelectedTheme(theme.id)}
                          type="button"
                        >
                          <span className="theme-swatch" style={{ background: theme.color }} />
                          <strong>{theme.label}</strong>
                          <p>{theme.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <div className="card">
                    <strong>AI activity builder</strong>
                    <p>
                      Let AI recommend and build a mixed set of drag/drop, matching, sequencing,
                      sorting, scenario, reflection, and check activities from the content.
                    </p>
                    <button
                      className="btn primary"
                      disabled={aiBusy || !title.trim() || !content.trim()}
                      onClick={generateWithAi}
                      type="button"
                    >
                      {aiBusy ? "Building activities..." : "Build activities with AI"}
                    </button>
                    {aiBlocks.length ? (
                      <p>Using {aiBlocks.length} AI-built activities. Manual cards remain available as a fallback.</p>
                    ) : null}
                    {aiError ? <div className="save-error">{aiError}</div> : null}
                  </div>

                  <div className="grid">
                    {interactionTypes.map((interaction) => (
                      <div
                        className={`card activity-count-card ${activityCounts[interaction.type] ? "selected" : ""}`}
                        key={interaction.type}
                      >
                        <div>
                          <strong>{interaction.title}</strong>
                          <p>{interaction.description}</p>
                        </div>
                        <div className="counter" aria-label={`${interaction.title} count`}>
                          <button
                            onClick={() => setActivityCount(interaction.type, (activityCounts[interaction.type] || 0) - 1)}
                            type="button"
                          >
                            -
                          </button>
                          <input
                            aria-label={`${interaction.title} count`}
                            min={0}
                            max={12}
                            onChange={(event) =>
                              setActivityCount(interaction.type, Number(event.target.value) || 0)
                            }
                            type="number"
                            value={activityCounts[interaction.type] || 0}
                          />
                          <button
                            onClick={() => setActivityCount(interaction.type, (activityCounts[interaction.type] || 0) + 1)}
                            type="button"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="card">
                    <strong>Generated interaction preview</strong>
                    <p>
                      {finalBlocks.length} interactions will be created from{" "}
                      {contentTopics(content, title).length} content topics.
                    </p>
                    <div className="chips">
                      {finalBlocks.slice(0, 16).map((block) => (
                        <span className="chip" key={block.id}>{block.type}</span>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <div className="card">
                    <strong>Save summary</strong>
                    <p>
                      {title || "Untitled assignment"} will save with {finalBlocks.length}{" "}
                      activities, the {selectedTheme} theme, and {requiredCorrectInteractions} required correct interactions.
                    </p>
                    <div className="chips">
                      {interactionTypes
                        .filter((interaction) => activityCounts[interaction.type] > 0)
                        .map((interaction) => (
                          <span className="chip" key={interaction.type}>
                            {activityCounts[interaction.type]} {interaction.title}
                          </span>
                        ))}
                    </div>
                  </div>

                  <button
                    className="btn primary"
                    disabled={saving || !title.trim() || !content.trim() || !finalBlocks.length}
                    onClick={saveDraft}
                    type="button"
                  >
                    {saving ? "Saving..." : "Save Assignment"}
                  </button>

                  {saved ? (
                    <div className="save-ok">
                      Saved.{" "}
                      <Link className="btn" href="/masterypath/assignments">Manage assignments</Link>{" "}
                      {savedCourseId ? (
                        <>
                          <Link className="btn" href={`/masterypath?courseId=${savedCourseId}`}>Preview</Link>{" "}
                          <button className="btn" onClick={copySavedUrl} type="button">
                            {copiedUrl ? "URL copied" : "Copy URL"}
                          </button>
                        </>
                      ) : null}
                    </div>
                  ) : null}

                  {saveError ? <div className="save-error">{saveError}</div> : null}
                </>
              ) : null}
            </div>

            <div className="footer">
              <button
                className="btn"
                disabled={step === 1}
                onClick={() => setStep((previous) => Math.max(1, previous - 1) as Step)}
                type="button"
              >
                Back
              </button>
              <button
                className="btn primary"
                disabled={step === 3}
                onClick={() => setStep((previous) => Math.min(3, previous + 1) as Step)}
                type="button"
              >
                Continue
              </button>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
