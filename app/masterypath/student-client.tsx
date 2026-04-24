"use client";

import { useMemo, useState } from "react";
import { type LearningNode, type MasteryAssignment } from "./data";

type ObjectiveState = {
  streak: number;
  attempts: number;
  mastered: boolean;
};

function themeClass(node?: LearningNode | null) {
  if (!node?.theme) return "theme-ocean";
  return `theme-${node.theme}`;
}

function nodeLabel(type: LearningNode["type"]) {
  if (type === "question") return "Checkpoint";
  if (type === "remediation") return "Review";
  if (type === "mastery-check") return "Mastery Check";
  if (type === "completion") return "Completion";
  return "Lesson";
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

function getObjectiveStateMap(assignment: MasteryAssignment | null) {
  if (!assignment) return {};

  return assignment.objectives.reduce<Record<string, ObjectiveState>>((acc, objective) => {
    acc[objective.id] = {
      streak: 0,
      attempts: 0,
      mastered: false,
    };
    return acc;
  }, {});
}

export default function MasteryPathStudentClient({
  assignment,
}: {
  assignment: MasteryAssignment | null;
}) {
  const nodeMap = useMemo(() => {
    return (assignment?.nodes ?? []).reduce<Record<string, LearningNode>>((acc, node) => {
      acc[node.id] = node;
      return acc;
    }, {});
  }, [assignment]);

  const [currentNodeId, setCurrentNodeId] = useState(assignment?.startNodeId || "");
  const [history, setHistory] = useState<string[]>(
    assignment?.startNodeId ? [assignment.startNodeId] : []
  );
  const [selectedChoiceId, setSelectedChoiceId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [pendingNextNodeId, setPendingNextNodeId] = useState("");
  const [objectiveState, setObjectiveState] = useState<Record<string, ObjectiveState>>(() =>
    getObjectiveStateMap(assignment)
  );
  const [visitedNodes, setVisitedNodes] = useState<Record<string, boolean>>(() =>
    assignment?.startNodeId ? { [assignment.startNodeId]: true } : {}
  );

  const currentNode = currentNodeId ? nodeMap[currentNodeId] : null;
  const hasAssignment = Boolean(assignment && currentNode);

  const progressSummary = useMemo(() => {
    const rows = assignment?.objectives.map((objective) => {
      const state = objectiveState[objective.id] || {
        streak: 0,
        attempts: 0,
        mastered: false,
      };

      return {
        title: objective.title,
        goal: objective.goal,
        mastered: state.mastered,
        attempts: state.attempts,
        streak: state.streak,
      };
    }) ?? [];

    return {
      rows,
      masteredCount: rows.filter((row) => row.mastered).length,
    };
  }, [assignment, objectiveState]);

  function handleClose() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.close();
  }

  function moveToNode(nextNodeId: string) {
    if (!nextNodeId || !nodeMap[nextNodeId]) {
      return;
    }

    setCurrentNodeId(nextNodeId);
    setHistory((previous) => [...previous, nextNodeId]);
    setVisitedNodes((previous) => ({
      ...previous,
      [nextNodeId]: true,
    }));
    setSelectedChoiceId("");
    setFeedback("");
    setPendingNextNodeId("");
  }

  function resolveQuestionTransition() {
    if (!assignment || !currentNode || !currentNode.choices?.length) {
      return;
    }

    const choice = currentNode.choices.find((item) => item.id === selectedChoiceId);

    if (!choice) {
      setFeedback("Choose an answer before continuing.");
      return;
    }

    const objectiveId = currentNode.objectiveId;
    const masteryRule = assignment.masteryRules.find(
      (rule) => rule.objectiveId === objectiveId
    );
    const currentObjectiveState = objectiveId
      ? objectiveState[objectiveId] || { streak: 0, attempts: 0, mastered: false }
      : { streak: 0, attempts: 0, mastered: false };
    const isCorrect = Boolean(choice.isCorrect);
    const nextObjectiveState: ObjectiveState = {
      attempts: currentObjectiveState.attempts + 1,
      streak: isCorrect ? currentObjectiveState.streak + 1 : 0,
      mastered:
        currentObjectiveState.mastered ||
        Boolean(
          isCorrect &&
            masteryRule &&
            currentObjectiveState.streak + 1 >= masteryRule.masteryStreak
        ),
    };

    if (objectiveId) {
      setObjectiveState((previous) => ({
        ...previous,
        [objectiveId]: nextObjectiveState,
      }));
    }

    let nextNodeId =
      isCorrect && nextObjectiveState.mastered
        ? currentNode.transitions?.mastered || currentNode.transitions?.correct
        : isCorrect
          ? currentNode.transitions?.correct
          : currentNode.transitions?.incorrect;

    if (!isCorrect && masteryRule) {
      const shouldRetryInline =
        nextObjectiveState.attempts < masteryRule.remediationThreshold &&
        currentNode.transitions?.retry;

      if (shouldRetryInline) {
        nextNodeId = currentNode.transitions?.retry;
      }
    }

    setFeedback(
      choice.feedback ||
        (isCorrect ? "Correct. Move forward." : "Not yet. Review and try again.")
    );
    setPendingNextNodeId(nextNodeId || "");
  }

  function handlePrimaryAction() {
    if (!currentNode) return;

    if (feedback && pendingNextNodeId) {
      moveToNode(pendingNextNodeId);
      return;
    }

    if (currentNode.type === "question" || currentNode.type === "mastery-check") {
      resolveQuestionTransition();
      return;
    }

    if (currentNode.transitions?.next) {
      moveToNode(currentNode.transitions.next);
    }
  }

  function handleBack() {
    if (history.length <= 1) {
      return;
    }

    const nextHistory = history.slice(0, -1);
    const previousNodeId = nextHistory[nextHistory.length - 1];
    setHistory(nextHistory);
    setCurrentNodeId(previousNodeId);
    setSelectedChoiceId("");
    setFeedback("");
    setPendingNextNodeId("");
  }

  function primaryLabel() {
    if (feedback && pendingNextNodeId) {
      return currentNode?.type === "completion" ? "Done" : "Continue";
    }

    if (currentNode?.type === "question" || currentNode?.type === "mastery-check") {
      return "Submit Answer";
    }

    if (currentNode?.type === "completion") {
      return "Path Complete";
    }

    return "Next";
  }

  return (
    <>
      <style>{`
        :root{
          --shell:rgba(9, 18, 34, .72);
          --panel:#f5efe8;
          --ink:#16263e;
          --muted:#5e6d80;
          --line:rgba(22,38,62,.10);
        }

        body{
          margin:0;
          font-family:"Avenir Next","Segoe UI",Arial,sans-serif;
          background:
            radial-gradient(circle at top left, rgba(94,138,255,.24), transparent 28%),
            radial-gradient(circle at bottom right, rgba(255,158,108,.18), transparent 28%),
            linear-gradient(145deg, #081321, #163459);
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
          border-radius:28px;
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
          letter-spacing:.06em;
          text-transform:uppercase;
        }

        .topbar span{
          display:block;
          margin-top:6px;
          font-size:12px;
          color:rgba(255,255,255,.70);
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
          letter-spacing:.05em;
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
          border-radius:28px;
          overflow:hidden;
          background:var(--panel);
          border:1px solid rgba(255,255,255,.12);
          box-shadow:0 24px 60px rgba(6,15,28,.24);
        }

        .empty-state{
          padding:32px;
        }

        .theme-ocean .canvas-main{
          background:
            radial-gradient(circle at top left, rgba(88,143,255,.20), transparent 26%),
            linear-gradient(145deg, #fbfcff, #e9f3ff);
        }

        .theme-sunset .canvas-main{
          background:
            radial-gradient(circle at top left, rgba(255,157,108,.20), transparent 26%),
            linear-gradient(145deg, #fffaf4, #ffe7d6);
        }

        .theme-forest .canvas-main{
          background:
            radial-gradient(circle at top left, rgba(91,176,123,.18), transparent 26%),
            linear-gradient(145deg, #fafdf9, #e8f4ea);
        }

        .theme-slate .canvas-main{
          background:
            radial-gradient(circle at top left, rgba(108,132,177,.18), transparent 26%),
            linear-gradient(145deg, #fafbfe, #ebf0f8);
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

        .canvas-main::before{
          content:"";
          position:absolute;
          inset:0;
          pointer-events:none;
          background:
            linear-gradient(115deg, rgba(255,255,255,.44), transparent 42%),
            linear-gradient(180deg, rgba(255,255,255,.18), transparent 56%);
        }

        .hero{
          position:relative;
          z-index:1;
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
          letter-spacing:.06em;
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
          position:relative;
          z-index:1;
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
          border-radius:24px;
          border:1px solid var(--line);
          background:rgba(255,255,255,.82);
          padding:20px;
          box-shadow:0 14px 28px rgba(21,37,59,.08);
        }

        .card h3,
        .empty-state h3{
          margin:0 0 10px;
          font-size:13px;
          letter-spacing:.08em;
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
          border-radius:18px;
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

        .stats{
          display:grid;
          grid-template-columns:repeat(2, minmax(0,1fr));
          gap:12px;
        }

        .stat{
          border-radius:20px;
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
          letter-spacing:.06em;
          text-transform:uppercase;
          color:#607086;
          font-weight:800;
        }

        .media{
          overflow:hidden;
          border-radius:24px;
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
          border-radius:24px;
          border:1px solid var(--line);
          background:
            linear-gradient(145deg, rgba(255,255,255,.90), rgba(240,244,250,.88));
          display:grid;
          place-items:center;
          position:relative;
          overflow:hidden;
        }

        .placeholder-graphic::before,
        .placeholder-graphic::after{
          content:"";
          position:absolute;
          border-radius:999px;
          background:linear-gradient(135deg, rgba(38,92,168,.20), rgba(44,163,142,.12));
        }

        .placeholder-graphic::before{
          width:220px;
          height:220px;
          top:-80px;
          right:-50px;
        }

        .placeholder-graphic::after{
          width:180px;
          height:180px;
          bottom:-70px;
          left:-40px;
        }

        .graphic-lines{
          width:100%;
          display:grid;
          gap:16px;
          padding:0 26px;
          position:relative;
          z-index:1;
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
          border-radius:20px;
          padding:16px 18px;
          background:linear-gradient(145deg, #fff8ea, #fff1d6);
          border:1px solid rgba(207,155,47,.24);
          color:#6f5112;
          line-height:1.7;
        }

        .summary-bar{
          display:flex;
          justify-content:space-between;
          gap:16px;
          align-items:center;
          padding:18px 24px;
          background:linear-gradient(180deg, rgba(12,25,44,.98), rgba(10,19,35,.98));
          color:#eef5ff;
        }

        .summary-bar strong{
          display:block;
          font-size:12px;
          letter-spacing:.08em;
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
            flex-direction:column;
            align-items:flex-start;
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
        <div className={`shell ${themeClass(currentNode)}`}>
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
                  `courseId` in the URL so the course JSON can load.
                </p>
              </div>
            ) : null}

            {hasAssignment && currentNode ? (
              <div className="canvas">
                <div className="canvas-main">
                  <div className="hero">
                    <div className="pill-row">
                      <span className="pill">{nodeLabel(currentNode.type)}</span>
                      <span className="pill">{currentNode.layoutStyle || "split"}</span>
                      {currentNode.objectiveId ? (
                        <span className="pill">{currentNode.objectiveId}</span>
                      ) : null}
                    </div>
                    <h1>{currentNode.title}</h1>
                    <p>{currentNode.summary || assignment.description}</p>
                  </div>

                  <div className="content-grid">
                    <div className="stack">
                      <div className="card">
                        <h3>Current Node</h3>
                        <p>{currentNode.body}</p>
                      </div>

                      {(currentNode.bullets ?? []).length ? (
                        <div className="card">
                          <h3>Key Points</h3>
                          <ul className="bullet-list">
                            {(currentNode.bullets ?? []).map((bullet) => (
                              <li key={bullet}>
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {currentNode.callout ? (
                        <div className="card">
                          <h3>{currentNode.callout.label}</h3>
                          <p>{currentNode.callout.text}</p>
                        </div>
                      ) : null}

                      {(currentNode.type === "question" ||
                        currentNode.type === "mastery-check") &&
                      currentNode.choices?.length ? (
                        <div className="card">
                          <h3>Choose Your Answer</h3>
                          <div className="choice-list">
                            {currentNode.choices.map((choice) => (
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

                      {feedback ? <div className="feedback">{feedback}</div> : null}
                    </div>

                    <div className="stack">
                      {currentNode.media?.url ? (
                        <div className="media">
                          {currentNode.media.type === "video" ? (
                            <iframe
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              src={videoEmbedUrl(currentNode.media.url)}
                              title={currentNode.title}
                            />
                          ) : (
                            <img alt={currentNode.media.caption || currentNode.title} src={currentNode.media.url} />
                          )}
                          {currentNode.media.caption ? (
                            <div className="media-caption">{currentNode.media.caption}</div>
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

                      {(currentNode.stats ?? []).length ? (
                        <div className="stats">
                          {(currentNode.stats ?? []).map((stat) => (
                            <div className="stat" key={`${stat.label}-${stat.value}`}>
                              <strong>{stat.value}</strong>
                              <span>{stat.label}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="summary-bar">
                  <div>
                    <strong>Adaptive Progress</strong>
                    <p>
                      Mastered {progressSummary.masteredCount} of{" "}
                      {assignment.objectives.length} objectives. This path changes based on
                      the student&apos;s answers.
                    </p>
                  </div>
                  <div className="dots">
                    {assignment.nodes.map((node) => (
                      <span
                        className={`dot ${
                          node.id === currentNode.id
                            ? "active"
                            : visitedNodes[node.id]
                              ? "visited"
                              : ""
                        }`}
                        key={node.id}
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
              disabled={history.length <= 1}
              onClick={handleBack}
              type="button"
            >
              Back
            </button>
            <button
              className="action-btn primary"
              disabled={currentNode?.type === "completion" && !pendingNextNodeId}
              onClick={handlePrimaryAction}
              type="button"
            >
              {primaryLabel()}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
