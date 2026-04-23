"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { sampleAssignment } from "./data";

type ProgressMap = Record<
  string,
  {
    score: number;
    streak: number;
    mastered: boolean;
  }
>;

function createProgress() {
  return sampleAssignment.objectives.reduce<ProgressMap>((acc, objective, index) => {
    acc[objective.id] = {
      score: index === 0 ? 82 : index === 1 ? 63 : 41,
      streak: index === 0 ? 3 : index === 1 ? 2 : 1,
      mastered: index === 0,
    };
    return acc;
  }, {});
}

export default function MasteryPathStudentPage() {
  const [showProgress, setShowProgress] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [progress] = useState<ProgressMap>(createProgress);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const activeSection = sampleAssignment.sections[sectionIndex];

  const strongestObjective = useMemo(() => {
    return [...sampleAssignment.objectives].sort(
      (a, b) => progress[b.id].score - progress[a.id].score
    )[0];
  }, [progress]);

  const weakestObjective = useMemo(() => {
    return [...sampleAssignment.objectives].sort(
      (a, b) => progress[a.id].score - progress[b.id].score
    )[0];
  }, [progress]);

  const finalReport = useMemo(() => {
    const rows = sampleAssignment.objectives.map((objective) => ({
      title: objective.title,
      score: progress[objective.id].score,
      streak: progress[objective.id].streak,
      mastered: progress[objective.id].mastered,
    }));

    const average =
      rows.reduce((sum, row) => sum + row.score, 0) / Math.max(rows.length, 1);

    return { rows, average };
  }, [progress]);

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
          padding:12px 18px;
          border-bottom:1px solid #d6e0ea;
          background:#f8fbfd;
          position:sticky;
          top:0;
          z-index:20;
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
          font-size:18px;
          line-height:1.15;
        }

        .brand p{
          margin:4px 0 0;
          color:#5c6d81;
          font-size:12px;
        }

        .toolbar{
          display:flex;
          align-items:center;
          gap:8px;
          flex-wrap:wrap;
          justify-content:flex-end;
        }

        .tool-btn{
          height:34px;
          padding:0 12px;
          border-radius:8px;
          border:1px solid #cad7e3;
          background:#fff;
          color:#173a63;
          font-size:12px;
          font-weight:700;
          cursor:pointer;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          text-decoration:none;
        }

        .shell{
          display:grid;
          grid-template-columns:${showNav ? "250px " : ""}minmax(0,1fr)${showProgress ? " 300px" : ""};
          min-height:0;
        }

        .nav{
          border-right:1px solid #d6e0ea;
          background:#f8fbfd;
          padding:16px;
          display:flex;
          flex-direction:column;
          gap:10px;
        }

        .nav-title,
        .progress-title{
          font-size:11px;
          font-weight:700;
          text-transform:uppercase;
          letter-spacing:.06em;
          color:#6b7a8c;
        }

        .nav button{
          text-align:left;
          border:1px solid #d8e2eb;
          border-radius:8px;
          background:#fff;
          padding:12px;
          cursor:pointer;
          color:#1b2f47;
        }

        .nav button.active{
          border-color:#245fa8;
          background:#eef5fd;
        }

        .nav button strong{
          display:block;
          font-size:13px;
          margin-bottom:4px;
        }

        .nav button span{
          display:block;
          font-size:12px;
          color:#617286;
          line-height:1.45;
        }

        .main{
          padding:20px;
          min-width:0;
        }

        .hero{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:16px;
          margin-bottom:16px;
        }

        .hero h2{
          margin:0;
          font-size:26px;
          line-height:1.1;
        }

        .hero p{
          margin:8px 0 0;
          max-width:760px;
          font-size:14px;
          line-height:1.6;
          color:#56677c;
        }

        .hero-chip{
          flex-shrink:0;
          padding:8px 12px;
          border-radius:999px;
          background:#e9f1fa;
          color:#173a63;
          font-size:12px;
          font-weight:800;
        }

        .viewer{
          display:grid;
          grid-template-columns:minmax(0,1.1fr) 320px;
          gap:16px;
        }

        .stage,
        .side-card,
        .progress{
          border:1px solid #d6e0ea;
          border-radius:8px;
          background:#fff;
        }

        .stage-head{
          padding:16px 18px;
          border-bottom:1px solid #e4ecf3;
          background:#f9fbfd;
        }

        .stage-kind{
          font-size:11px;
          font-weight:700;
          text-transform:uppercase;
          letter-spacing:.06em;
          color:#6b7a8c;
        }

        .stage-head h3{
          margin:8px 0 0;
          font-size:22px;
          line-height:1.2;
        }

        .stage-body{
          padding:18px;
          display:grid;
          gap:16px;
        }

        .lead{
          font-size:15px;
          line-height:1.7;
          color:#26374b;
        }

        .media-block{
          display:grid;
          gap:12px;
          padding:14px;
          border:1px solid #dce6ef;
          border-radius:8px;
          background:#f8fbfd;
        }

        .media-visual{
          min-height:180px;
          border-radius:8px;
          display:grid;
          place-items:center;
          color:#173a63;
          font-size:15px;
          font-weight:700;
          background:
            linear-gradient(135deg, rgba(36,95,168,.12), rgba(42,167,128,.12)),
            #eaf2f8;
          border:1px solid #d4e1ec;
          text-align:center;
          padding:20px;
        }

        .interaction{
          display:grid;
          gap:10px;
        }

        .interaction button{
          min-height:46px;
          border-radius:8px;
          border:1px solid #cedae5;
          background:#fff;
          color:#173a63;
          font-size:13px;
          font-weight:700;
          cursor:pointer;
          text-align:left;
          padding:12px 14px;
        }

        .footer-actions{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
        }

        .primary{
          height:38px;
          padding:0 14px;
          border-radius:8px;
          border:0;
          background:#173a63;
          color:#fff;
          font-size:12px;
          font-weight:800;
          cursor:pointer;
        }

        .secondary{
          height:38px;
          padding:0 14px;
          border-radius:8px;
          border:1px solid #cedae5;
          background:#fff;
          color:#173a63;
          font-size:12px;
          font-weight:800;
          cursor:pointer;
        }

        .side-stack{
          display:grid;
          gap:16px;
        }

        .side-card{
          padding:14px;
        }

        .side-card h4{
          margin:0 0 8px;
          font-size:14px;
          color:#173a63;
        }

        .side-card p{
          margin:0;
          font-size:13px;
          line-height:1.6;
          color:#516276;
        }

        .goal-list{
          display:grid;
          gap:10px;
          margin-top:12px;
        }

        .goal{
          border:1px solid #dce6ef;
          border-radius:8px;
          padding:10px;
          background:#f9fbfd;
        }

        .goal strong{
          display:block;
          font-size:13px;
          margin-bottom:4px;
        }

        .goal span{
          font-size:12px;
          color:#5f7084;
          line-height:1.45;
        }

        .progress{
          border-left:1px solid #d6e0ea;
          background:#f8fbfd;
          padding:16px;
          display:flex;
          flex-direction:column;
          gap:14px;
        }

        .meter{
          display:grid;
          gap:10px;
        }

        .meter-row{
          display:grid;
          gap:8px;
        }

        .meter-top{
          display:flex;
          justify-content:space-between;
          gap:10px;
          font-size:12px;
          color:#3f5268;
        }

        .bar{
          height:8px;
          border-radius:999px;
          overflow:hidden;
          background:#dfe8ef;
        }

        .bar span{
          display:block;
          height:100%;
          background:linear-gradient(90deg,#245fa8,#2aa780);
        }

        .report{
          margin-top:16px;
          border:1px solid #d6e0ea;
          border-radius:8px;
          background:#fff;
          overflow:hidden;
        }

        .report-head{
          padding:14px 18px;
          border-bottom:1px solid #e4ecf3;
          background:#f9fbfd;
        }

        .report-head h3{
          margin:0;
          font-size:18px;
        }

        .report-body{
          padding:18px;
        }

        .report-grid{
          display:grid;
          gap:10px;
        }

        .report-row{
          display:grid;
          grid-template-columns:minmax(0,1fr) 70px 70px 90px;
          gap:10px;
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
          font-size:11px;
          font-weight:800;
          background:#edf4fb;
          color:#173a63;
        }

        .submit-note{
          margin-top:14px;
          padding:12px;
          border-radius:8px;
          background:${reportSubmitted ? "#ebf8f2" : "#fff8e8"};
          color:${reportSubmitted ? "#0f6a4c" : "#8a5a07"};
          font-size:13px;
          line-height:1.5;
        }

        @media (max-width: 1120px){
          .shell{
            grid-template-columns:minmax(0,1fr);
          }

          .viewer{
            grid-template-columns:1fr;
          }

          .progress,
          .nav{
            border-left:0;
            border-right:0;
            border-top:1px solid #d6e0ea;
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

          .stage-head,
          .stage-body,
          .report-head,
          .report-body{
            padding:14px;
          }

          .report-row{
            grid-template-columns:1fr;
          }
        }
      `}</style>

      <div className="page">
        <header className="topbar">
          <div className="brand">
            <div className="eyebrow">{sampleAssignment.course}</div>
            <h1>{sampleAssignment.title}</h1>
            <p>{sampleAssignment.description}</p>
          </div>

          <div className="toolbar">
            <button className="tool-btn" onClick={() => setShowNav((value) => !value)} type="button">
              Menu
            </button>
            <button
              className="tool-btn"
              onClick={() => setShowProgress((value) => !value)}
              type="button"
            >
              Progress
            </button>
            <Link className="tool-btn" href="/masterypath/builder">
              Builder
            </Link>
            <Link className="tool-btn" href="/">
              Dashboard
            </Link>
          </div>
        </header>

        <div className="shell">
          {showNav ? (
            <aside className="nav">
              <div className="nav-title">Assignment Navigation</div>
              {sampleAssignment.sections.map((section, index) => (
                <button
                  className={index === sectionIndex ? "active" : ""}
                  key={section.id}
                  onClick={() => setSectionIndex(index)}
                  type="button"
                >
                  <strong>{section.title}</strong>
                  <span>{section.summary}</span>
                </button>
              ))}
            </aside>
          ) : null}

          <main className="main">
            <div className="hero">
              <div>
                <h2>Clean student player with guided learning and adaptive checks.</h2>
                <p>
                  The student stays focused on one learning block at a time. Progress,
                  goals, and assignment navigation stay available behind simple buttons
                  instead of crowding the lesson area.
                </p>
              </div>
              <div className="hero-chip">Needs help on: {weakestObjective.title}</div>
            </div>

            <div className="viewer">
              <section>
                <div className="stage">
                  <div className="stage-head">
                    <div className="stage-kind">{activeSection.kind}</div>
                    <h3>{activeSection.title}</h3>
                  </div>

                  <div className="stage-body">
                    <div className="lead">{activeSection.body}</div>

                    <div className="media-block">
                      <div className="media-visual">
                        {activeSection.kind === "chart"
                          ? "Chart area for wiring lookups, process maps, and score visuals"
                          : activeSection.kind === "video"
                            ? "Video area for short teacher clips, demos, or narrated review"
                            : activeSection.kind === "interactive"
                              ? "Interactive area for drag, click, match, hotspot, and scenario activities"
                              : "Learning content area for diagrams, annotated images, and step-by-step teaching"}
                      </div>

                      <div className="interaction">
                        <button type="button">
                          Quick check: route the student into the next adaptive question
                        </button>
                        <button type="button">
                          Review help: reopen the smallest lesson needed for the weak objective
                        </button>
                      </div>
                    </div>

                    <div className="footer-actions">
                      <button
                        className="primary"
                        onClick={() =>
                          setSectionIndex((value) =>
                            Math.min(sampleAssignment.sections.length - 1, value + 1)
                          )
                        }
                        type="button"
                      >
                        Next learning block
                      </button>
                      <button
                        className="secondary"
                        onClick={() =>
                          setSectionIndex((value) => Math.max(0, value - 1))
                        }
                        type="button"
                      >
                        Previous block
                      </button>
                    </div>
                  </div>
                </div>

                <div className="report">
                  <div className="report-head">
                    <h3>Final report for grading</h3>
                  </div>
                  <div className="report-body">
                    <div className="report-grid">
                      {finalReport.rows.map((row) => (
                        <div className="report-row" key={row.title}>
                          <strong>{row.title}</strong>
                          <span>{row.score}%</span>
                          <span>{row.streak}x</span>
                          <span className="report-pill">
                            {row.mastered ? "Mastered" : "In progress"}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="footer-actions" style={{ marginTop: 16 }}>
                      <button
                        className="primary"
                        onClick={() => setReportSubmitted(true)}
                        type="button"
                      >
                        Submit final report
                      </button>
                    </div>

                    <div className="submit-note">
                      Overall average: {Math.round(finalReport.average)}%.{" "}
                      {reportSubmitted
                        ? "This prototype now marks the report as submitted for grading."
                        : "In the real version, this report would write to the database and send a grade-ready record back to Canvas."}
                    </div>
                  </div>
                </div>
              </section>

              <aside className="side-stack">
                <div className="side-card">
                  <h4>Goals toward mastery</h4>
                  <div className="goal-list">
                    {sampleAssignment.objectives.map((objective) => (
                      <div className="goal" key={objective.id}>
                        <strong>{objective.title}</strong>
                        <span>{objective.goal}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="side-card">
                  <h4>Adaptive direction</h4>
                  <p>
                    Strongest objective: {strongestObjective.title}
                    <br />
                    Weakest objective: {weakestObjective.title}
                    <br />
                    Next action: redirect the student into content and interaction that raises the weakest objective score first.
                  </p>
                </div>
              </aside>
            </div>
          </main>

          {showProgress ? (
            <aside className="progress">
              <div className="progress-title">Progress, scores, goals</div>
              <div className="meter">
                {sampleAssignment.objectives.map((objective) => (
                  <div className="meter-row" key={objective.id}>
                    <div className="meter-top">
                      <strong>{objective.title}</strong>
                      <span>{progress[objective.id].score}%</span>
                    </div>
                    <div className="bar">
                      <span style={{ width: `${progress[objective.id].score}%` }} />
                    </div>
                    <div className="meter-top">
                      <span>Streak {progress[objective.id].streak}/{sampleAssignment.masteryTarget}</span>
                      <span>
                        {progress[objective.id].mastered ? "Mastered" : "Still building"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </>
  );
}
