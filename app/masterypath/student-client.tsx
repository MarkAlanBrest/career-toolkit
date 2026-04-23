"use client";

import { useMemo, useState } from "react";
import { getAssignmentForCourseId } from "./data";

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
  courseId,
}: {
  courseId?: string | null;
}) {
  const assignment = useMemo(
    () => getAssignmentForCourseId(courseId),
    [courseId]
  );

  const [view, setView] = useState<"content" | "navigation" | "results">("content");
  const [sectionIndex, setSectionIndex] = useState(0);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [progress] = useState<ProgressMap>(() =>
    createProgress(assignment.objectives.map((objective) => objective.id))
  );

  const activeSection = assignment.sections[sectionIndex];

  const achievedGrade = useMemo(() => {
    const scores = Object.values(progress).map((item) => item.score);
    return Math.round(
      scores.reduce((sum, value) => sum + value, 0) / Math.max(scores.length, 1)
    );
  }, [progress]);

  const reportRows = useMemo(
    () =>
      assignment.objectives.map((objective) => ({
        objective,
        progress: progress[objective.id],
      })),
    [assignment.objectives, progress]
  );

  return (
    <>
      <style>{`
        body{
          margin:0;
          font-family:Arial, Helvetica, sans-serif;
          background:#eef3f8;
          color:#132238;
        }

        .page{
          min-height:100vh;
          padding:18px;
          display:grid;
          place-items:center;
        }

        .window{
          width:min(1180px, 100%);
          min-height:calc(100vh - 36px);
          display:grid;
          grid-template-rows:auto auto 1fr;
          border:1px solid #d6e0ea;
          border-radius:8px;
          background:#fff;
          box-shadow:0 20px 50px rgba(19,34,56,.10);
          overflow:hidden;
        }

        .topbar{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          padding:14px 18px;
          border-bottom:1px solid #e1e9f1;
          background:#f9fbfd;
        }

        .brand{
          min-width:0;
        }

        .eyebrow{
          font-size:11px;
          font-weight:700;
          text-transform:uppercase;
          letter-spacing:.06em;
          color:#6b7a8c;
        }

        .brand h1{
          margin:4px 0 0;
          font-size:19px;
          line-height:1.15;
        }

        .brand p{
          margin:4px 0 0;
          color:#5d6d80;
          font-size:12px;
        }

        .grade-box{
          min-width:116px;
          padding:10px 14px;
          border-radius:8px;
          background:#173a63;
          color:#fff;
          text-align:center;
          flex-shrink:0;
        }

        .grade-box strong{
          display:block;
          font-size:26px;
          line-height:1;
        }

        .grade-box span{
          display:block;
          margin-top:5px;
          font-size:11px;
          font-weight:700;
          text-transform:uppercase;
          letter-spacing:.06em;
          opacity:.9;
        }

        .toolbar{
          display:flex;
          align-items:center;
          gap:8px;
          flex-wrap:wrap;
          padding:12px 18px;
          border-bottom:1px solid #e7edf3;
          background:#fff;
        }

        .tool-btn{
          min-height:36px;
          padding:0 12px;
          border-radius:8px;
          border:1px solid #ccd8e2;
          background:#fff;
          color:#173a63;
          font-size:12px;
          font-weight:800;
          cursor:pointer;
          display:inline-flex;
          align-items:center;
          justify-content:center;
        }

        .tool-btn.active{
          background:#173a63;
          border-color:#173a63;
          color:#fff;
        }

        .main{
          min-height:0;
          background:#fff;
        }

        .content-view,
        .nav-view,
        .results-view{
          min-height:100%;
        }

        .stage,
        .panel{
          min-height:100%;
          border:0;
          border-radius:0;
          background:#fff;
          overflow:hidden;
        }

        .stage{
          display:grid;
          grid-template-rows:auto 1fr;
        }

        .stage-head,
        .panel-head{
          padding:16px 18px;
          border-bottom:1px solid #e6edf3;
          background:#f9fbfd;
        }

        .stage-kind{
          font-size:11px;
          font-weight:700;
          text-transform:uppercase;
          letter-spacing:.06em;
          color:#6b7a8c;
        }

        .stage-head h3,
        .panel-head h3{
          margin:8px 0 0;
          font-size:22px;
        }

        .stage-body,
        .panel-body{
          padding:24px;
          display:grid;
          gap:18px;
          align-content:start;
        }

        .lead{
          font-size:15px;
          line-height:1.75;
          color:#24374d;
        }

        .visual{
          min-height:320px;
          border:1px solid #d8e2eb;
          border-radius:8px;
          background:
            linear-gradient(135deg, rgba(36,95,168,.10), rgba(42,167,128,.10)),
            #edf4fa;
          display:grid;
          place-items:center;
          text-align:center;
          padding:20px;
          color:#173a63;
          font-size:15px;
          font-weight:700;
        }

        .action-row{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
        }

        .primary,
        .secondary{
          min-height:38px;
          padding:0 14px;
          border-radius:8px;
          font-size:12px;
          font-weight:800;
          cursor:pointer;
        }

        .primary{
          border:0;
          background:#173a63;
          color:#fff;
        }

        .secondary{
          border:1px solid #ccd8e2;
          background:#fff;
          color:#173a63;
        }

        .objective-card{
          border:1px solid #dce5ed;
          border-radius:8px;
          background:#f9fbfd;
          padding:12px;
        }

        .objective-top{
          display:flex;
          justify-content:space-between;
          gap:10px;
          align-items:flex-start;
        }

        .objective-top strong{
          font-size:14px;
          line-height:1.35;
        }

        .objective-top span{
          flex-shrink:0;
          font-size:12px;
          font-weight:800;
          color:#173a63;
        }

        .objective-card p{
          margin:8px 0 0;
          font-size:12px;
          line-height:1.55;
          color:#58697c;
        }

        .bar{
          height:8px;
          border-radius:999px;
          overflow:hidden;
          background:#dee8ef;
          margin-top:10px;
        }

        .bar span{
          display:block;
          height:100%;
          background:linear-gradient(90deg,#245fa8,#2aa780);
        }

        .report-row{
          display:grid;
          grid-template-columns:minmax(0,1fr) 80px 90px 100px;
          gap:12px;
          align-items:center;
          padding:10px 0;
          border-bottom:1px solid #edf2f6;
          font-size:13px;
        }

        .report-row:last-child{
          border-bottom:0;
        }

        .report-pill{
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

        .submit-note{
          padding:12px;
          border-radius:8px;
          background:${reportSubmitted ? "#ebf8f2" : "#fff8e8"};
          color:${reportSubmitted ? "#0f6a4c" : "#8a5a07"};
          font-size:13px;
          line-height:1.55;
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

          .topbar{
            flex-wrap:wrap;
          }

          .toolbar{
            padding:10px 14px;
          }

          .stage-head,
          .stage-body,
          .panel-head,
          .panel-body{
            padding:14px;
          }

          .report-row{
            grid-template-columns:1fr;
          }
        }
      `}</style>

      <div className="page">
        <div className="window">
          <header className="topbar">
            <div className="brand">
              <div className="eyebrow">{assignment.course}</div>
              <h1>{assignment.title}</h1>
              <p>Course ID: {assignment.courseId}</p>
            </div>

            <div className="grade-box">
              <strong>{achievedGrade}%</strong>
              <span>Achieved Grade</span>
            </div>
          </header>

          <div className="toolbar">
            <button
              className={`tool-btn ${view === "content" ? "active" : ""}`}
              onClick={() => setView("content")}
              type="button"
            >
              Viewing
            </button>
            <button
              className={`tool-btn ${view === "navigation" ? "active" : ""}`}
              onClick={() => setView("navigation")}
              type="button"
            >
              Navigation / Progress
            </button>
            <button
              className={`tool-btn ${view === "results" ? "active" : ""}`}
              onClick={() => setView("results")}
              type="button"
            >
              Print
            </button>
          </div>

          <main className="main">
            {view === "content" ? (
              <section className="content-view">
                <div className="stage">
                  <div className="stage-head">
                    <div className="stage-kind">{activeSection.kind}</div>
                    <h3>{activeSection.title}</h3>
                  </div>

                  <div className="stage-body">
                    <div className="lead">{activeSection.body}</div>

                    <div className="visual">
                      {activeSection.kind === "lesson"
                        ? "Lesson content area"
                        : activeSection.kind === "chart"
                          ? "Chart content area"
                          : activeSection.kind === "video"
                            ? "Video content area"
                            : "Interactive content area"}
                    </div>

                    <div className="action-row">
                      <button
                        className="primary"
                        onClick={() =>
                          setSectionIndex((value) =>
                            Math.min(assignment.sections.length - 1, value + 1)
                          )
                        }
                        type="button"
                      >
                        Next Content
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {view === "navigation" ? (
              <section className="nav-view">
                <div className="panel">
                  <div className="panel-head">
                    <h3>Navigation / Progress</h3>
                  </div>
                  <div className="panel-body">
                    {assignment.objectives.map((objective) => (
                      <div className="objective-card" key={objective.id}>
                        <div className="objective-top">
                          <strong>{objective.title}</strong>
                          <span>{progress[objective.id].score}%</span>
                        </div>
                        <p>{objective.goal}</p>
                        <div className="bar">
                          <span style={{ width: `${progress[objective.id].score}%` }} />
                        </div>
                        <p>
                          Streak {progress[objective.id].streak}/{assignment.masteryTarget} ·{" "}
                          {progress[objective.id].mastered ? "Mastered" : "Still working"}
                        </p>
                      </div>
                    ))}

                    {assignment.sections.map((section, index) => (
                      <button
                        className="secondary"
                        key={section.id}
                        onClick={() => {
                          setSectionIndex(index);
                          setView("content");
                        }}
                        type="button"
                      >
                        {section.title}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {view === "results" ? (
              <section className="results-view">
                <div className="panel">
                  <div className="panel-head">
                    <h3>Print</h3>
                  </div>
                  <div className="panel-body">
                    {reportRows.map((row) => (
                      <div className="report-row" key={row.objective.id}>
                        <strong>{row.objective.title}</strong>
                        <span>{row.progress.score}%</span>
                        <span>{row.progress.streak}x streak</span>
                        <span className="report-pill">
                          {row.progress.mastered ? "Mastered" : "In progress"}
                        </span>
                      </div>
                    ))}

                    <div className="action-row">
                      <button
                        className="primary"
                        onClick={() => setReportSubmitted(true)}
                        type="button"
                      >
                        Submit Final Report
                      </button>
                      <button className="secondary" onClick={() => window.print()} type="button">
                        Print Report
                      </button>
                    </div>

                    <div className="submit-note">
                      {reportSubmitted
                        ? "Report submitted."
                        : "Final report ready to submit and print."}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}
          </main>
        </div>
      </div>
    </>
  );
}
