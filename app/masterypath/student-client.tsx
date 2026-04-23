"use client";

import { useMemo, useState } from "react";
import { type MasteryAssignment } from "./data";

type ProgressMap = Record<
  string,
  {
    score: number;
    streak: number;
    mastered: boolean;
  }
>;

function createProgress(objectiveIds: string[]) {
  return objectiveIds.reduce<ProgressMap>((acc, objectiveId, index) => {
    acc[objectiveId] = {
      score: index === 0 ? 86 : index === 1 ? 72 : 54,
      streak: index === 0 ? 3 : index === 1 ? 2 : 1,
      mastered: index === 0,
    };
    return acc;
  }, {});
}

export default function MasteryPathStudentClient({
  assignment,
}: {
  assignment: MasteryAssignment;
}) {
  const [view, setView] = useState<"content" | "navigation" | "report">("content");
  const [progress] = useState<ProgressMap>(() =>
    createProgress(assignment.objectives.map((objective) => objective.id))
  );

  const reportRows = useMemo(
    () =>
      assignment.objectives.map((objective) => ({
        objective,
        progress: progress[objective.id],
      })),
    [assignment.objectives, progress]
  );

  function handleClose() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.close();
  }

  return (
    <>
      <style>{`
        body{
          margin:0;
          font-family:Arial, Helvetica, sans-serif;
          background:#edf3f8;
        }

        .page{
          min-height:100vh;
          padding:18px;
          display:grid;
          place-items:center;
        }

        .window{
          width:min(1180px,100%);
          min-height:calc(100vh - 36px);
          display:grid;
          grid-template-rows:auto 1fr;
          border:1px solid #d5e0ea;
          border-radius:8px;
          overflow:hidden;
          background:#fff;
          box-shadow:0 18px 48px rgba(19,34,56,.10);
        }

        .toolbar{
          display:grid;
          grid-template-columns:repeat(4, minmax(0, 1fr));
          gap:8px;
          padding:12px;
          border-bottom:1px solid #e3ebf2;
          background:#f8fbfd;
        }

        .toolbar button{
          min-height:38px;
          border-radius:8px;
          border:1px solid #ccd8e2;
          background:#fff;
          color:#173a63;
          font-size:12px;
          font-weight:800;
          cursor:pointer;
          padding:0 12px;
        }

        .toolbar button.active{
          background:#173a63;
          border-color:#173a63;
          color:#fff;
        }

        .screen{
          min-height:0;
          background:#fff;
        }

        .viewer{
          min-height:100%;
          display:grid;
          grid-template-rows:minmax(0,1fr) 260px;
        }

        .viewer-text{
          padding:28px;
          font-size:18px;
          line-height:1.8;
          color:#213348;
          overflow:auto;
        }

        .viewer-media{
          border-top:1px solid #e4edf4;
          display:grid;
          place-items:center;
          background:
            linear-gradient(135deg, rgba(36,95,168,.10), rgba(42,167,128,.10)),
            #edf4fa;
          color:#173a63;
          font-size:16px;
          font-weight:700;
          text-align:center;
          padding:20px;
        }

        .nav{
          padding:18px;
          display:grid;
          gap:12px;
          align-content:start;
        }

        .card{
          border:1px solid #d9e3ec;
          border-radius:8px;
          background:#f9fbfd;
          padding:14px;
        }

        .card strong{
          display:flex;
          justify-content:space-between;
          gap:12px;
          font-size:14px;
          color:#173a63;
        }

        .card p{
          margin:8px 0 0;
          font-size:13px;
          line-height:1.6;
          color:#536579;
        }

        .bar{
          height:8px;
          border-radius:999px;
          overflow:hidden;
          background:#dfe8ef;
          margin-top:10px;
        }

        .bar span{
          display:block;
          height:100%;
          background:linear-gradient(90deg,#245fa8,#2aa780);
        }

        .report{
          padding:18px;
          display:grid;
          gap:10px;
          align-content:start;
        }

        .report-row{
          display:grid;
          grid-template-columns:minmax(0,1fr) 84px 84px 100px;
          gap:12px;
          align-items:center;
          padding:12px 0;
          border-bottom:1px solid #edf2f6;
          font-size:13px;
          color:#22354a;
        }

        .report-row:last-child{
          border-bottom:0;
        }

        .pill{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-height:28px;
          padding:0 10px;
          border-radius:999px;
          background:#edf4fb;
          color:#173a63;
          font-size:11px;
          font-weight:800;
        }

        @media (max-width: 820px){
          .page{
            padding:0;
          }

          .window{
            width:100%;
            min-height:100vh;
            border:0;
            border-radius:0;
          }

          .toolbar{
            grid-template-columns:1fr 1fr;
          }

          .viewer{
            grid-template-rows:minmax(0,1fr) 220px;
          }

          .viewer-text,
          .nav,
          .report{
            padding:14px;
          }

          .report-row{
            grid-template-columns:1fr;
          }
        }
      `}</style>

      <div className="page">
        <div className="window">
          <div className="toolbar">
            <button
              className={view === "content" ? "active" : ""}
              onClick={() => setView("content")}
              type="button"
            >
              Viewing Area
            </button>
            <button
              className={view === "navigation" ? "active" : ""}
              onClick={() => setView("navigation")}
              type="button"
            >
              Navigation/Objectives
            </button>
            <button
              className={view === "report" ? "active" : ""}
              onClick={() => setView("report")}
              type="button"
            >
              Print Final Report
            </button>
            <button onClick={handleClose} type="button">
              Close
            </button>
          </div>

          <div className="screen">
            {view === "content" ? (
              <div className="viewer">
                <div className="viewer-text">{assignment.sections[0]?.body}</div>
                <div className="viewer-media">
                  {assignment.sections[0]?.kind === "video"
                    ? "Video"
                    : assignment.sections[0]?.kind === "chart"
                      ? "Chart"
                      : assignment.sections[0]?.kind === "interactive"
                        ? "Interactive"
                        : "Content"}
                </div>
              </div>
            ) : null}

            {view === "navigation" ? (
              <div className="nav">
                {assignment.objectives.map((objective) => (
                  <div className="card" key={objective.id}>
                    <strong>
                      <span>{objective.title}</span>
                      <span>{progress[objective.id].score}%</span>
                    </strong>
                    <p>{objective.goal}</p>
                    <div className="bar">
                      <span style={{ width: `${progress[objective.id].score}%` }} />
                    </div>
                    <p>
                      {progress[objective.id].streak}/{assignment.masteryTarget} ·{" "}
                      {progress[objective.id].mastered ? "Mastered" : "In progress"}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {view === "report" ? (
              <div className="report">
                {reportRows.map((row) => (
                  <div className="report-row" key={row.objective.id}>
                    <strong>{row.objective.title}</strong>
                    <span>{row.progress.score}%</span>
                    <span>{row.progress.streak}x</span>
                    <span className="pill">
                      {row.progress.mastered ? "Mastered" : "In progress"}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
