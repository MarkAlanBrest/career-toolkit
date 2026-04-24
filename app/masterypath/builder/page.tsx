"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { type CompletionCriteria, type ObjectiveBlock } from "../data";

type Step = 1 | 2 | 3;
type LoopLevel = "Support" | "Practice" | "Mastery";

const interactionTypes = [
  {
    type: "multiple-choice",
    title: "Multiple choice checks",
    description: "Use direct answer choices to check whether students recognize the right idea.",
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
    type: "reflection",
    title: "Reflection prompts",
    description: "Ask students to explain the concept in their own words before mastery.",
  },
] as const;

const loopLevels: Array<{
  id: LoopLevel;
  loops: number;
  correct: number;
  description: string;
}> = [
  {
    id: "Support",
    loops: 1,
    correct: 2,
    description: "One successful pass through the interactions.",
  },
  {
    id: "Practice",
    loops: 2,
    correct: 4,
    description: "Two successful loops before the objective is considered mastered.",
  },
  {
    id: "Mastery",
    loops: 3,
    correct: 6,
    description: "Three successful loops for stronger retention.",
  },
];

function slugify(value: string, fallback: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

function contentTopics(content: string, title: string) {
  const sentences = content
    .split(/[.!?]/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, 6);

  if (sentences.length) return sentences;
  return [title || "the uploaded content"];
}

function buildInteractionBlocks({
  title,
  content,
  selectedTypes,
}: {
  title: string;
  content: string;
  selectedTypes: string[];
}) {
  const topics = contentTopics(content, title);
  const blocks: ObjectiveBlock[] = [];

  selectedTypes.forEach((type) => {
    topics.slice(0, 3).forEach((topic, index) => {
      const topicLabel = topic.length > 90 ? `${topic.slice(0, 87)}...` : topic;
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
            {
              id: "true",
              text: "True",
              isCorrect: true,
              feedback: "Correct. Keep going.",
            },
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

      if (type === "checkpoint") {
        blocks.push({
          id,
          type,
          title: `Scenario: ${topicLabel}`,
          summary: "Students apply the content to a decision.",
          body: `In a realistic situation, what should you do first based on this content: ${topicLabel}`,
          choices: [
            {
              id: "apply",
              text: "Apply the rule or idea from the uploaded content.",
              isCorrect: true,
              feedback: "Correct. Keep going.",
            },
            {
              id: "guess",
              text: "Guess without checking the content.",
              feedback: `Please review ${topicLabel} again; you could improve here.`,
            },
          ],
          theme: "forest",
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

export default function MasteryPathBuilderPage() {
  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [content, setContent] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    "multiple-choice",
    "true-false",
    "reflection",
  ]);
  const [loopLevel, setLoopLevel] = useState<LoopLevel>("Practice");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedCourseId, setSavedCourseId] = useState("");

  const selectedLevel = loopLevels.find((level) => level.id === loopLevel) || loopLevels[1];
  const interactionBlocks = useMemo(
    () => buildInteractionBlocks({ title, content, selectedTypes }),
    [content, selectedTypes, title]
  );
  const completionCriteria: CompletionCriteria = {
    minBlocksComplete: interactionBlocks.length,
    minCorrectInteractions: selectedLevel.correct,
    allowRetake: true,
    repeatLoopsRequired: selectedLevel.loops,
    loopLevel,
  };

  function toggleType(type: string) {
    setSelectedTypes((previous) =>
      previous.includes(type)
        ? previous.filter((item) => item !== type)
        : [...previous, type]
    );
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
          title,
          course,
          sourceMode: "paste",
          sourceUrl: "",
          content,
          objectiveTitle: title,
          objectiveGoal: title,
          blocks: interactionBlocks,
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
      setSavedCourseId(payload.courseId);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save assignment.");
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
          background:#eef3f7;
          color:#132238;
        }

        .page{
          min-height:100vh;
          display:grid;
          grid-template-rows:auto 1fr;
        }

        .topbar{
          display:flex;
          justify-content:space-between;
          gap:16px;
          align-items:center;
          padding:16px 20px;
          background:#fbfdff;
          border-bottom:1px solid #d8e2eb;
        }

        h1,
        h2,
        p{
          margin:0;
        }

        .brand{
          display:grid;
          gap:6px;
        }

        .brand h1{
          font-size:22px;
        }

        .brand p{
          color:#607286;
          font-size:13px;
          line-height:1.5;
        }

        .toolbar{
          display:flex;
          gap:8px;
          flex-wrap:wrap;
        }

        .btn{
          min-height:38px;
          padding:0 13px;
          border-radius:8px;
          border:1px solid #c8d5e0;
          background:#fff;
          color:#173a63;
          font-size:12px;
          font-weight:800;
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
          opacity:.6;
          cursor:not-allowed;
        }

        .shell{
          width:min(1120px,100%);
          margin:0 auto;
          padding:20px;
          display:grid;
          gap:16px;
        }

        .steps{
          display:grid;
          grid-template-columns:repeat(3, minmax(0,1fr));
          gap:10px;
        }

        .step{
          border:1px solid #d8e2eb;
          background:#fff;
          border-radius:8px;
          padding:12px;
          text-align:left;
          cursor:pointer;
        }

        .step.active{
          border-color:#245fa8;
          background:#eef5fd;
        }

        .step strong{
          display:block;
          font-size:13px;
          margin-bottom:4px;
        }

        .step span{
          color:#617286;
          font-size:12px;
        }

        .panel{
          border:1px solid #d8e2eb;
          border-radius:8px;
          background:#fff;
          overflow:hidden;
        }

        .panel-head{
          padding:18px;
          border-bottom:1px solid #e4ecf3;
          background:#fbfdff;
          display:grid;
          gap:8px;
        }

        .panel-head h2{
          font-size:22px;
        }

        .panel-head p{
          color:#5f7084;
          font-size:13px;
          line-height:1.55;
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
          color:#344f6a;
          font-size:12px;
          font-weight:800;
        }

        input,
        textarea{
          width:100%;
          box-sizing:border-box;
          border:1px solid #ccd8e2;
          border-radius:8px;
          padding:11px 12px;
          font:inherit;
          color:#172a40;
          background:#fff;
        }

        textarea{
          min-height:260px;
          resize:vertical;
        }

        .grid{
          display:grid;
          grid-template-columns:repeat(2, minmax(0,1fr));
          gap:12px;
        }

        .card{
          border:1px solid #d8e2eb;
          border-radius:8px;
          background:#f9fbfd;
          padding:14px;
          display:grid;
          gap:8px;
        }

        .card.selected{
          border-color:#245fa8;
          background:#eef5fd;
        }

        .card strong{
          color:#173a63;
          font-size:14px;
        }

        .card p{
          color:#586b7f;
          font-size:12px;
          line-height:1.55;
        }

        .chips{
          display:flex;
          gap:6px;
          flex-wrap:wrap;
        }

        .chip{
          min-height:26px;
          display:inline-flex;
          align-items:center;
          padding:0 9px;
          border-radius:999px;
          background:#e4edf7;
          color:#173a63;
          font-size:11px;
          font-weight:800;
        }

        .footer{
          padding:16px 18px;
          border-top:1px solid #e4ecf3;
          background:#fbfdff;
          display:flex;
          justify-content:space-between;
          gap:10px;
          flex-wrap:wrap;
        }

        .save-ok,
        .save-error{
          padding:12px;
          border-radius:8px;
          font-size:13px;
          line-height:1.5;
        }

        .save-ok{
          background:#ebf8f2;
          color:#0f6a4c;
        }

        .save-error{
          background:#fdecec;
          color:#9c2a2a;
        }

        @media (max-width:760px){
          .topbar{
            align-items:flex-start;
            flex-direction:column;
          }

          .shell{
            padding:12px;
          }

          .steps,
          .grid{
            grid-template-columns:1fr;
          }
        }
      `}</style>

      <div className="page">
        <header className="topbar">
          <div className="brand">
            <h1>MasteryPath Builder</h1>
            <p>Upload or paste content, choose interaction types, then set repeat loops until mastery.</p>
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

        <main className="shell">
          <div className="steps">
            {[
              ["1", "Content", "Title and source material"],
              ["2", "Interactions", "Choose possible checks"],
              ["3", "Loops", "Set mastery repeats"],
            ].map(([id, label, description]) => (
              <button
                className={`step ${step === Number(id) ? "active" : ""}`}
                key={id}
                onClick={() => setStep(Number(id) as Step)}
                type="button"
              >
                <strong>
                  {id}. {label}
                </strong>
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
                    ? "Possible Interactions"
                    : "Repeat Loops Until Mastered"}
              </h2>
              <p>
                {step === 1
                  ? "The teacher writes the title and provides the material. No AI objective generation is needed."
                  : step === 2
                    ? "Select the interaction patterns this content should use. The cards below are generated from the uploaded text."
                    : "Choose how many successful loops students need before the assignment is mastered."}
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
                    <label>Content to use</label>
                    <textarea
                      onChange={(event) => setContent(event.target.value)}
                      placeholder="Paste the source content students should be checked on."
                      value={content}
                    />
                  </div>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <div className="grid">
                    {interactionTypes.map((interaction) => (
                      <button
                        className={`card ${
                          selectedTypes.includes(interaction.type) ? "selected" : ""
                        }`}
                        key={interaction.type}
                        onClick={() => toggleType(interaction.type)}
                        type="button"
                      >
                        <strong>{interaction.title}</strong>
                        <p>{interaction.description}</p>
                      </button>
                    ))}
                  </div>

                  <div className="card">
                    <strong>Generated interaction preview</strong>
                    <p>
                      {interactionBlocks.length} interactions will be created from{" "}
                      {contentTopics(content, title).length} content topics.
                    </p>
                    <div className="chips">
                      {interactionBlocks.slice(0, 12).map((block) => (
                        <span className="chip" key={block.id}>
                          {block.type}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <div className="grid">
                    {loopLevels.map((level) => (
                      <button
                        className={`card ${loopLevel === level.id ? "selected" : ""}`}
                        key={level.id}
                        onClick={() => setLoopLevel(level.id)}
                        type="button"
                      >
                        <strong>{level.id}</strong>
                        <p>{level.description}</p>
                        <div className="chips">
                          <span className="chip">{level.loops} loop(s)</span>
                          <span className="chip">{level.correct} correct</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="card">
                    <strong>Save summary</strong>
                    <p>
                      {title || "Untitled assignment"} will save with {interactionBlocks.length}{" "}
                      interactions and a {loopLevel.toLowerCase()} loop requirement.
                    </p>
                  </div>

                  <button
                    className="btn primary"
                    disabled={saving || !title.trim() || !content.trim() || !interactionBlocks.length}
                    onClick={saveDraft}
                    type="button"
                  >
                    {saving ? "Saving..." : "Save Assignment"}
                  </button>

                  {saved ? (
                    <div className="save-ok">
                      Saved.
                      {savedCourseId ? (
                        <>
                          {" "}
                          <Link className="btn" href={`/masterypath?courseId=${savedCourseId}`}>
                            Open student view
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
