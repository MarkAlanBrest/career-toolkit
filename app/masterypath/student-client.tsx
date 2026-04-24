"use client";

import { useMemo, useState } from "react";
import { type MasteryAssignment, type ObjectiveBlock } from "./data";

function themeClass(block?: ObjectiveBlock | null) {
  if (!block?.theme) return "theme-ocean";
  return `theme-${block.theme}`;
}

function blockLabel(type: ObjectiveBlock["type"]) {
  if (type === "multiple-choice") return "Multiple Choice";
  if (type === "true-false") return "True / False";
  if (type === "checkpoint") return "Checkpoint";
  if (type === "review") return "Review";
  if (type === "reflection") return "Reflection";
  if (type === "image-slide") return "Image";
  if (type === "video-slide") return "Video";
  if (type === "bullet-slide") return "Key Points";
  return "Content";
}

function isInteractiveBlock(block?: ObjectiveBlock | null) {
  return Boolean(
    block &&
      (block.type === "multiple-choice" ||
        block.type === "true-false" ||
        block.type === "checkpoint" ||
        block.type === "reflection")
  );
}

function hasChoices(block?: ObjectiveBlock | null) {
  return Boolean(block?.choices?.length);
}

function videoEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }

    if (parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }

    if (parsed.hostname.includes("vimeo.com")) {
      const videoId = parsed.pathname.replace("/", "");
      return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
    }

    return url;
  } catch {
    return url;
  }
}

export default function MasteryPathStudentClient({
  assignment,
}: {
  assignment: MasteryAssignment | null;
}) {
  const objective = assignment?.objective ?? null;
  const blocks = useMemo(() => objective?.blocks ?? [], [objective]);
  const criteria = objective?.completionCriteria;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [completedBlocks, setCompletedBlocks] = useState<Record<string, boolean>>({});
  const [correctInteractions, setCorrectInteractions] = useState<Record<string, boolean>>({});
  const [reflectionText, setReflectionText] = useState<Record<string, string>>({});

  const currentBlock = blocks[currentIndex] ?? null;
  const hasAssignment = Boolean(assignment && objective && currentBlock);
  const completedCount = Object.values(completedBlocks).filter(Boolean).length;
  const correctCount = Object.values(correctInteractions).filter(Boolean).length;
  const interactiveCount = blocks.filter(isInteractiveBlock).length;
  const requiredBlocks = Math.min(criteria?.minBlocksComplete ?? blocks.length, blocks.length);
  const requiredCorrect = Math.min(criteria?.minCorrectInteractions ?? 0, interactiveCount);
  const isLastBlock = currentIndex >= blocks.length - 1;
  const objectiveComplete =
    completedCount >= requiredBlocks && correctCount >= requiredCorrect && blocks.length > 0;

  function handleClose() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.close();
  }

  function markBlockComplete(block: ObjectiveBlock, correct?: boolean) {
    setCompletedBlocks((previous) => ({
      ...previous,
      [block.id]: true,
    }));

    if (correct) {
      setCorrectInteractions((previous) => ({
        ...previous,
        [block.id]: true,
      }));
    }
  }

  function moveToIndex(nextIndex: number) {
    setCurrentIndex(Math.max(0, Math.min(blocks.length - 1, nextIndex)));
    setSelectedChoiceId("");
    setFeedback("");
  }

  function submitChoice(block: ObjectiveBlock) {
    const choice = block.choices?.find((item) => item.id === selectedChoiceId);

    if (!choice) {
      setFeedback("Choose an answer before continuing.");
      return false;
    }

    const isCorrect = Boolean(choice.isCorrect);
    markBlockComplete(block, isCorrect);
    setFeedback(
      choice.feedback ||
        (isCorrect ? "Correct. Keep going." : "Not quite. Review the feedback, then continue.")
    );
    return true;
  }

  function submitReflection(block: ObjectiveBlock) {
    const value = reflectionText[block.id]?.trim() || "";

    if (!value) {
      setFeedback("Add a short response before continuing.");
      return false;
    }

    markBlockComplete(block, true);
    setFeedback("Response saved. Keep going.");
    return true;
  }

  function handlePrimaryAction() {
    if (!currentBlock) return;

    if (feedback) {
      if (!isLastBlock) {
        moveToIndex(currentIndex + 1);
        return;
      }

      if (!objectiveComplete) {
        moveToIndex(0);
      }

      return;
    }

    if (hasChoices(currentBlock)) {
      submitChoice(currentBlock);
      return;
    }

    if (currentBlock.type === "reflection") {
      submitReflection(currentBlock);
      return;
    }

    markBlockComplete(currentBlock);

    if (!isLastBlock) {
      moveToIndex(currentIndex + 1);
      return;
    }

    setFeedback("Block complete. Review your progress or retake the objective.");
  }

  function handleRetake() {
    if (!criteria?.allowRetake) return;

    setCurrentIndex(0);
    setSelectedChoiceId("");
    setFeedback("");
    setCompletedBlocks({});
    setCorrectInteractions({});
    setReflectionText({});
  }

  function primaryLabel() {
    if (feedback && !isLastBlock) return "Continue";
    if (feedback && isLastBlock) return objectiveComplete ? "Objective Complete" : "Review Blocks";
    if (hasChoices(currentBlock)) return "Submit Answer";
    if (currentBlock?.type === "reflection") return "Save Response";
    if (isLastBlock) return "Complete Block";
    return "Next";
  }

  return (
    <>
      <style>{`
        :root{
          --shell:rgba(9, 18, 34, .72);
          --panel:#f7f4ef;
          --ink:#16263e;
          --muted:#5e6d80;
          --line:rgba(22,38,62,.10);
        }

        body{
          margin:0;
          font-family:"Avenir Next","Segoe UI",Arial,sans-serif;
          background:linear-gradient(145deg, #0b1726, #183653);
          color:var(--ink);
        }

        .page{
          min-height:100vh;
          display:grid;
          place-items:center;
          padding:20px;
        }

        .shell{
          width:min(1240px,100%);
          min-height:calc(100vh - 40px);
          display:grid;
          grid-template-rows:auto 1fr auto;
          border-radius:24px;
          overflow:hidden;
          border:1px solid rgba(255,255,255,.10);
          background:var(--shell);
          backdrop-filter:blur(18px);
          box-shadow:0 28px 90px rgba(0,0,0,.34);
        }

        .topbar,
        .bottombar{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          padding:18px 22px;
          color:rgba(255,255,255,.88);
        }

        .topbar{
          border-bottom:1px solid rgba(255,255,255,.08);
        }

        .bottombar{
          border-top:1px solid rgba(255,255,255,.08);
        }

        .topbar strong{
          display:block;
          font-size:15px;
          letter-spacing:0;
          text-transform:uppercase;
        }

        .topbar span{
          display:block;
          margin-top:6px;
          font-size:12px;
          color:rgba(255,255,255,.70);
        }

        .action-row{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          justify-content:flex-end;
        }

        .action-btn{
          min-height:42px;
          padding:0 18px;
          border-radius:999px;
          border:1px solid rgba(255,255,255,.12);
          background:rgba(255,255,255,.08);
          color:#fff;
          font-size:12px;
          font-weight:800;
          letter-spacing:0;
          cursor:pointer;
        }

        .action-btn.primary{
          background:linear-gradient(135deg, #244f96, #2a9d8f);
          border-color:transparent;
        }

        .action-btn:disabled{
          opacity:.45;
          cursor:not-allowed;
        }

        .stage{
          padding:20px;
          display:grid;
          place-items:center;
        }

        .canvas,
        .empty-state{
          width:min(1100px,100%);
          min-height:100%;
          border-radius:24px;
          overflow:hidden;
          background:var(--panel);
          border:1px solid rgba(255,255,255,.12);
          box-shadow:0 24px 60px rgba(6,15,28,.24);
        }

        .empty-state{
          padding:32px;
        }

        .theme-ocean .canvas-main{
          background:linear-gradient(145deg, #fbfcff, #e9f3ff);
        }

        .theme-sunset .canvas-main{
          background:linear-gradient(145deg, #fffaf4, #ffe7d6);
        }

        .theme-forest .canvas-main{
          background:linear-gradient(145deg, #fafdf9, #e8f4ea);
        }

        .theme-slate .canvas-main{
          background:linear-gradient(145deg, #fafbfe, #ebf0f8);
        }

        .canvas{
          display:grid;
          grid-template-rows:auto 1fr auto;
        }

        .canvas-main{
          min-width:0;
          padding:34px;
          display:grid;
          gap:22px;
          position:relative;
        }

        .hero{
          display:grid;
          gap:16px;
        }

        .pill-row{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
        }

        .pill{
          min-height:30px;
          display:inline-flex;
          align-items:center;
          padding:0 12px;
          border-radius:999px;
          background:#fff;
          border:1px solid var(--line);
          font-size:11px;
          font-weight:900;
          letter-spacing:0;
          text-transform:uppercase;
          color:#264164;
        }

        .hero h1{
          margin:0;
          font-family:Georgia,"Times New Roman",serif;
          font-size:44px;
          line-height:1.02;
          color:#15263d;
        }

        .hero p{
          margin:0;
          max-width:760px;
          font-size:17px;
          line-height:1.75;
          color:#4f6075;
        }

        .content-grid{
          display:grid;
          grid-template-columns:minmax(0,1.12fr) minmax(300px,.88fr);
          gap:18px;
          align-content:start;
        }

        .stack{
          display:grid;
          gap:18px;
          align-content:start;
        }

        .card{
          border-radius:8px;
          border:1px solid var(--line);
          background:rgba(255,255,255,.84);
          padding:20px;
          box-shadow:0 14px 28px rgba(21,37,59,.08);
        }

        .card h3,
        .empty-state h3{
          margin:0 0 10px;
          font-size:13px;
          letter-spacing:0;
          text-transform:uppercase;
          color:#365173;
        }

        .card p,
        .empty-state p{
          margin:0;
          line-height:1.75;
          color:#425266;
        }

        .bullet-list{
          display:grid;
          gap:12px;
          margin:0;
          padding:0;
          list-style:none;
        }

        .bullet-list li{
          display:grid;
          grid-template-columns:18px 1fr;
          gap:12px;
          line-height:1.7;
          color:#1d3048;
        }

        .bullet-list li::before{
          content:"";
          width:10px;
          height:10px;
          margin-top:8px;
          border-radius:999px;
          background:linear-gradient(135deg, #285daa, #2ea48d);
          box-shadow:0 0 0 5px rgba(46,164,141,.10);
        }

        .choice-list{
          display:grid;
          gap:12px;
        }

        .choice{
          width:100%;
          text-align:left;
          border-radius:8px;
          border:1px solid var(--line);
          background:#fff;
          padding:16px 16px 16px 18px;
          color:#22354d;
          font-size:15px;
          line-height:1.55;
          cursor:pointer;
        }

        .choice.selected{
          border-color:#255da9;
          background:linear-gradient(145deg, #eef5ff, #f6fbff);
          box-shadow:0 10px 22px rgba(37,93,169,.12);
        }

        .response-box{
          min-height:150px;
          width:100%;
          resize:vertical;
          border-radius:8px;
          border:1px solid var(--line);
          padding:16px;
          color:#22354d;
          font:inherit;
          line-height:1.6;
          box-sizing:border-box;
        }

        .stats{
          display:grid;
          grid-template-columns:repeat(2, minmax(0,1fr));
          gap:12px;
        }

        .stat{
          border-radius:8px;
          padding:16px;
          background:#fff;
          border:1px solid var(--line);
        }

        .stat strong{
          display:block;
          font-size:26px;
          line-height:1.05;
          color:#173153;
        }

        .stat span{
          display:block;
          margin-top:8px;
          font-size:11px;
          letter-spacing:0;
          text-transform:uppercase;
          color:#607086;
          font-weight:800;
        }

        .media{
          overflow:hidden;
          border-radius:8px;
          border:1px solid var(--line);
          background:#102038;
          min-height:220px;
        }

        .media iframe,
        .media img{
          display:block;
          width:100%;
          min-height:220px;
          height:100%;
          border:0;
          object-fit:cover;
        }

        .media-caption{
          padding:12px 14px;
          background:#fff;
          font-size:13px;
          line-height:1.6;
          color:#4f6176;
          border-top:1px solid var(--line);
        }

        .placeholder-graphic{
          min-height:220px;
          border-radius:8px;
          border:1px solid var(--line);
          background:linear-gradient(145deg, rgba(255,255,255,.92), rgba(237,244,241,.90));
          display:grid;
          place-items:center;
          overflow:hidden;
        }

        .graphic-lines{
          width:100%;
          display:grid;
          gap:16px;
          padding:0 26px;
        }

        .graphic-line{
          height:12px;
          border-radius:999px;
          background:linear-gradient(90deg, rgba(33,74,132,.88), rgba(51,171,147,.56));
        }

        .graphic-line:nth-child(2){ width:78%; }
        .graphic-line:nth-child(3){ width:62%; }
        .graphic-line:nth-child(4){ width:86%; }

        .feedback{
          border-radius:8px;
          padding:16px 18px;
          background:linear-gradient(145deg, #fff8ea, #fff1d6);
          border:1px solid rgba(207,155,47,.24);
          color:#6f5112;
          line-height:1.7;
        }

        .summary-bar{
          display:grid;
          grid-template-columns:minmax(0,1fr) auto;
          gap:16px;
          align-items:center;
          padding:18px 24px;
          background:linear-gradient(180deg, rgba(12,25,44,.98), rgba(10,19,35,.98));
          color:#eef5ff;
        }

        .summary-bar strong{
          display:block;
          font-size:12px;
          letter-spacing:0;
          text-transform:uppercase;
          color:#8cbcff;
        }

        .summary-bar p{
          margin:8px 0 0;
          line-height:1.65;
          color:rgba(238,245,255,.82);
        }

        .dots{
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          justify-content:flex-end;
          max-width:360px;
        }

        .dot{
          width:12px;
          height:12px;
          border-radius:999px;
          background:rgba(255,255,255,.18);
        }

        .dot.active{
          background:#f6d57e;
          box-shadow:0 0 0 4px rgba(246,213,126,.18);
        }

        .dot.visited{
          background:#69ccb1;
        }

        @media (max-width: 980px){
          .content-grid{
            grid-template-columns:1fr;
          }
        }

        @media (max-width: 760px){
          .page{
            padding:0;
          }

          .shell{
            width:100%;
            min-height:100vh;
            border-radius:0;
          }

          .stage{
            padding:10px;
          }

          .topbar,
          .bottombar,
          .summary-bar{
            grid-template-columns:1fr;
            flex-direction:column;
            align-items:flex-start;
          }

          .action-row{
            justify-content:flex-start;
          }

          .canvas-main,
          .empty-state{
            padding:22px;
          }

          .hero h1{
            font-size:34px;
          }
        }
      `}</style>

      <div className="page">
        <div className={`shell ${themeClass(currentBlock)}`}>
          <div className="topbar">
            <div>
              <strong>{assignment?.title || "MasteryPath"}</strong>
              <span>{assignment?.course || "No course loaded"}</span>
            </div>
            <button className="action-btn" onClick={handleClose} type="button">
              Close
            </button>
          </div>

          <div className="stage">
            {!hasAssignment ? (
              <div className="empty-state">
                <h3>No Saved Course Found</h3>
                <p>
                  Save a MasteryPath from the builder first, then open the player with a
                  courseId in the URL so the course JSON can load.
                </p>
              </div>
            ) : null}

            {hasAssignment && currentBlock && assignment ? (
              <div className="canvas">
                <div className="canvas-main">
                  <div className="hero">
                    <div className="pill-row">
                      <span className="pill">{blockLabel(currentBlock.type)}</span>
                      <span className="pill">
                        Block {currentIndex + 1} of {blocks.length}
                      </span>
                      <span className="pill">{objective.title}</span>
                    </div>
                    <h1>{currentBlock.title}</h1>
                    <p>{currentBlock.summary || objective.goal}</p>
                  </div>

                  <div className="content-grid">
                    <div className="stack">
                      <div className="card">
                        <h3>Current Block</h3>
                        <p>{currentBlock.body}</p>
                      </div>

                      {(currentBlock.bullets ?? []).length ? (
                        <div className="card">
                          <h3>Key Points</h3>
                          <ul className="bullet-list">
                            {(currentBlock.bullets ?? []).map((bullet) => (
                              <li key={bullet}>
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {currentBlock.callout ? (
                        <div className="card">
                          <h3>{currentBlock.callout.label}</h3>
                          <p>{currentBlock.callout.text}</p>
                        </div>
                      ) : null}

                      {hasChoices(currentBlock) ? (
                        <div className="card">
                          <h3>Choose Your Answer</h3>
                          <div className="choice-list">
                            {currentBlock.choices?.map((choice) => (
                              <button
                                className={`choice ${
                                  selectedChoiceId === choice.id ? "selected" : ""
                                }`}
                                key={choice.id}
                                onClick={() => setSelectedChoiceId(choice.id)}
                                type="button"
                              >
                                {choice.text}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {currentBlock.type === "reflection" ? (
                        <div className="card">
                          <h3>Response</h3>
                          <textarea
                            className="response-box"
                            onChange={(event) =>
                              setReflectionText((previous) => ({
                                ...previous,
                                [currentBlock.id]: event.target.value,
                              }))
                            }
                            placeholder={currentBlock.placeholder || "Type your response here..."}
                            value={reflectionText[currentBlock.id] || ""}
                          />
                        </div>
                      ) : null}

                      {feedback ? <div className="feedback">{feedback}</div> : null}
                    </div>

                    <div className="stack">
                      {currentBlock.media?.url ? (
                        <div className="media">
                          {currentBlock.media.type === "video" ? (
                            <iframe
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              src={videoEmbedUrl(currentBlock.media.url)}
                              title={currentBlock.title}
                            />
                          ) : (
                            <img
                              alt={currentBlock.media.caption || currentBlock.title}
                              src={currentBlock.media.url}
                            />
                          )}
                          {currentBlock.media.caption ? (
                            <div className="media-caption">{currentBlock.media.caption}</div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="placeholder-graphic">
                          <div className="graphic-lines">
                            <div className="graphic-line" />
                            <div className="graphic-line" />
                            <div className="graphic-line" />
                            <div className="graphic-line" />
                          </div>
                        </div>
                      )}

                      {(currentBlock.stats ?? []).length ? (
                        <div className="stats">
                          {(currentBlock.stats ?? []).map((stat) => (
                            <div className="stat" key={`${stat.label}-${stat.value}`}>
                              <strong>{stat.value}</strong>
                              <span>{stat.label}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="card">
                        <h3>Completion Target</h3>
                        <p>
                          Complete {requiredBlocks} blocks and answer {requiredCorrect}
                          interactive blocks correctly. Current progress: {completedCount}
                          blocks, {correctCount} correct.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="summary-bar">
                  <div>
                    <strong>{objectiveComplete ? "Objective Complete" : "Objective Progress"}</strong>
                    <p>{objective.goal}</p>
                  </div>
                  <div className="dots">
                    {blocks.map((block, index) => (
                      <span
                        className={`dot ${
                          index === currentIndex
                            ? "active"
                            : completedBlocks[block.id]
                              ? "visited"
                              : ""
                        }`}
                        key={block.id}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="bottombar">
            <button
              className="action-btn"
              disabled={currentIndex <= 0}
              onClick={() => moveToIndex(currentIndex - 1)}
              type="button"
            >
              Back
            </button>
            <div className="action-row">
              {criteria?.allowRetake ? (
                <button
                  className="action-btn"
                  disabled={!completedCount && currentIndex === 0}
                  onClick={handleRetake}
                  type="button"
                >
                  Retake
                </button>
              ) : null}
              <button
                className="action-btn primary"
                disabled={isLastBlock && Boolean(feedback) && objectiveComplete}
                onClick={handlePrimaryAction}
                type="button"
              >
                {primaryLabel()}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
