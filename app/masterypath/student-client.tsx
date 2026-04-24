"use client";

import { useMemo, useState } from "react";
import { type ContentSection, type MasteryAssignment } from "./data";

function themeClass(section?: ContentSection | null) {
  if (!section?.theme) return "theme-ocean";
  return `theme-${section.theme}`;
}

function sectionLabel(kind: ContentSection["kind"]) {
  if (kind === "chart") return "Visual Reference";
  if (kind === "video") return "Media Slide";
  if (kind === "interactive") return "Interactive Moment";
  return "Lesson Slide";
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

function objectiveForSection(
  assignment: MasteryAssignment,
  sectionIndex: number
) {
  if (!assignment.objectives.length) {
    return null;
  }

  return assignment.objectives[Math.min(sectionIndex, assignment.objectives.length - 1)];
}

export default function MasteryPathStudentClient({
  assignment,
}: {
  assignment: MasteryAssignment | null;
}) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [completedSlides, setCompletedSlides] = useState<Record<string, boolean>>({});

  const hasAssignment = Boolean(assignment);
  const sections = assignment?.sections ?? [];
  const currentSection = sections[currentSectionIndex] ?? null;
  const currentObjective = assignment
    ? objectiveForSection(assignment, currentSectionIndex)
    : null;
  const completedCount = useMemo(
    () => sections.filter((section) => completedSlides[section.id]).length,
    [completedSlides, sections]
  );
  const completionPercent = sections.length
    ? Math.round((completedCount / sections.length) * 100)
    : 0;

  function handleClose() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.close();
  }

  function markCurrentComplete() {
    if (!currentSection) {
      return;
    }

    setCompletedSlides((previous) => ({
      ...previous,
      [currentSection.id]: true,
    }));
  }

  function goBack() {
    if (showSummary) {
      setShowSummary(false);
      return;
    }

    if (currentSectionIndex === 0) {
      return;
    }

    setCurrentSectionIndex((previous) => previous - 1);
  }

  function goNext() {
    if (!currentSection) {
      return;
    }

    markCurrentComplete();

    if (currentSectionIndex >= sections.length - 1) {
      setShowSummary(true);
      return;
    }

    setCurrentSectionIndex((previous) => previous + 1);
  }

  return (
    <>
      <style>{`
        :root{
          --bg:#0d1f36;
          --shell:rgba(11, 22, 39, .72);
          --panel:#f6f0e8;
          --ink:#15253b;
          --muted:#5f6d80;
          --line:rgba(21,37,59,.10);
          --light:#ffffff;
        }

        body{
          margin:0;
          font-family:"Avenir Next","Segoe UI",Arial,sans-serif;
          background:
            radial-gradient(circle at top left, rgba(79,132,255,.22), transparent 28%),
            radial-gradient(circle at bottom right, rgba(252,150,102,.18), transparent 28%),
            linear-gradient(145deg, #081525, #153156);
          color:var(--ink);
        }

        .page{
          min-height:100vh;
          display:grid;
          place-items:center;
          padding:20px;
        }

        .frame{
          width:min(1240px, 100%);
          min-height:calc(100vh - 40px);
          display:grid;
          grid-template-rows:auto 1fr auto;
          border-radius:28px;
          overflow:hidden;
          border:1px solid rgba(255,255,255,.10);
          background:var(--shell);
          backdrop-filter:blur(18px);
          box-shadow:0 28px 90px rgba(0,0,0,.32);
        }

        .topbar{
          display:flex;
          justify-content:space-between;
          gap:16px;
          align-items:center;
          padding:18px 22px;
          border-bottom:1px solid rgba(255,255,255,.08);
          color:rgba(255,255,255,.86);
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

        .topbar button,
        .nav-btn{
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

        .topbar button:disabled,
        .nav-btn:disabled{
          opacity:.45;
          cursor:not-allowed;
        }

        .stage{
          padding:20px;
          display:grid;
          place-items:center;
        }

        .slide-shell,
        .empty-shell,
        .summary-shell{
          width:min(1100px, 100%);
          min-height:100%;
          border-radius:28px;
          overflow:hidden;
          background:var(--panel);
          border:1px solid rgba(255,255,255,.12);
          box-shadow:0 24px 60px rgba(6,15,28,.24);
        }

        .empty-shell,
        .summary-shell{
          padding:32px;
          display:grid;
          align-content:start;
          gap:18px;
        }

        .slide-shell{
          display:grid;
          grid-template-columns:minmax(0, 1.2fr) minmax(320px, .8fr);
        }

        .slide-main{
          min-width:0;
          padding:34px 34px 26px;
          display:grid;
          grid-template-rows:auto auto 1fr;
          gap:22px;
          position:relative;
          overflow:hidden;
        }

        .slide-main::before{
          content:"";
          position:absolute;
          inset:0;
          pointer-events:none;
          background:
            linear-gradient(115deg, rgba(255,255,255,.44), transparent 42%),
            linear-gradient(180deg, rgba(255,255,255,.18), transparent 56%);
        }

        .theme-ocean .slide-main{
          background:
            radial-gradient(circle at top left, rgba(84,142,255,.24), transparent 28%),
            linear-gradient(145deg, #fbfcff, #e9f3ff);
        }

        .theme-sunset .slide-main{
          background:
            radial-gradient(circle at top left, rgba(255,153,102,.22), transparent 28%),
            linear-gradient(145deg, #fffaf4, #ffe8d8);
        }

        .theme-forest .slide-main{
          background:
            radial-gradient(circle at top left, rgba(88,171,124,.20), transparent 28%),
            linear-gradient(145deg, #fbfdf9, #e6f4ea);
        }

        .theme-slate .slide-main{
          background:
            radial-gradient(circle at top left, rgba(102,127,173,.20), transparent 28%),
            linear-gradient(145deg, #fafbfe, #ebf0f8);
        }

        .slide-kicker{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          align-items:center;
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

        .slide-title{
          position:relative;
          z-index:1;
        }

        .slide-title h1{
          margin:0;
          font-family:Georgia,"Times New Roman",serif;
          font-size:44px;
          line-height:1.02;
          color:#17293f;
        }

        .slide-title p{
          margin:14px 0 0;
          max-width:760px;
          font-size:17px;
          line-height:1.75;
          color:#4c5d72;
        }

        .slide-grid{
          position:relative;
          z-index:1;
          display:grid;
          grid-template-columns:minmax(0,1fr) minmax(280px,.72fr);
          gap:18px;
          align-content:start;
        }

        .block{
          border-radius:24px;
          border:1px solid var(--line);
          background:rgba(255,255,255,.78);
          padding:20px 20px 18px;
          box-shadow:0 14px 28px rgba(21,37,59,.08);
        }

        .block h3,
        .summary-shell h3,
        .empty-shell h3{
          margin:0 0 10px;
          font-size:13px;
          letter-spacing:.08em;
          text-transform:uppercase;
          color:#365173;
        }

        .block p,
        .summary-shell p,
        .empty-shell p{
          margin:0;
          color:#415265;
          line-height:1.75;
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
          align-items:start;
          color:#1e3149;
          line-height:1.7;
        }

        .bullet-list li::before{
          content:"";
          width:10px;
          height:10px;
          border-radius:999px;
          margin-top:8px;
          background:linear-gradient(135deg, #265ca8, #2ca38e);
          box-shadow:0 0 0 5px rgba(44,163,142,.10);
        }

        .visual-stack{
          display:grid;
          gap:18px;
          align-content:start;
        }

        .graphic-card{
          min-height:220px;
          display:grid;
          place-items:center;
          border-radius:24px;
          border:1px solid var(--line);
          background:
            linear-gradient(140deg, rgba(255,255,255,.9), rgba(241,245,250,.86));
          position:relative;
          overflow:hidden;
        }

        .graphic-card::before,
        .graphic-card::after{
          content:"";
          position:absolute;
          border-radius:999px;
          background:linear-gradient(135deg, rgba(38,92,168,.20), rgba(44,163,142,.12));
        }

        .graphic-card::before{
          width:220px;
          height:220px;
          top:-80px;
          right:-60px;
        }

        .graphic-card::after{
          width:180px;
          height:180px;
          bottom:-70px;
          left:-40px;
        }

        .graphic-lines{
          width:100%;
          display:grid;
          gap:16px;
          position:relative;
          z-index:1;
          padding:0 24px;
        }

        .graphic-line{
          height:12px;
          border-radius:999px;
          background:linear-gradient(90deg, rgba(32,73,131,.88), rgba(50,169,145,.56));
        }

        .graphic-line:nth-child(2){ width:78%; }
        .graphic-line:nth-child(3){ width:62%; }
        .graphic-line:nth-child(4){ width:86%; }

        .stats{
          display:grid;
          grid-template-columns:repeat(2, minmax(0,1fr));
          gap:12px;
        }

        .stat{
          border-radius:20px;
          padding:16px;
          background:rgba(255,255,255,.88);
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

        .media-card{
          overflow:hidden;
          border-radius:24px;
          border:1px solid var(--line);
          background:#0f2036;
          min-height:220px;
        }

        .media-card iframe,
        .media-card img{
          display:block;
          width:100%;
          height:100%;
          min-height:220px;
          border:0;
          object-fit:cover;
        }

        .media-caption{
          padding:12px 14px;
          background:#fff;
          color:#4d5f76;
          font-size:13px;
          line-height:1.6;
          border-top:1px solid var(--line);
        }

        .objective-strip{
          display:flex;
          justify-content:space-between;
          gap:16px;
          align-items:center;
          padding:24px 24px 24px 18px;
          background:linear-gradient(180deg, rgba(13,28,49,.98), rgba(11,22,39,.98));
          color:#f4f8ff;
        }

        .objective-strip strong{
          display:block;
          font-size:12px;
          letter-spacing:.08em;
          text-transform:uppercase;
          color:#8ab8ff;
        }

        .objective-strip p{
          margin:8px 0 0;
          line-height:1.65;
          color:rgba(244,248,255,.82);
        }

        .bottombar{
          display:flex;
          justify-content:space-between;
          gap:16px;
          align-items:center;
          padding:18px 22px;
          border-top:1px solid rgba(255,255,255,.08);
          color:#fff;
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
          background:#f7d57d;
          box-shadow:0 0 0 4px rgba(247,213,125,.18);
        }

        .dot.done{
          background:#67cbb1;
        }

        .summary-grid{
          display:grid;
          gap:16px;
          grid-template-columns:repeat(3, minmax(0,1fr));
        }

        .summary-card{
          border-radius:24px;
          border:1px solid var(--line);
          background:#fff;
          padding:20px;
          box-shadow:0 14px 28px rgba(21,37,59,.08);
        }

        .summary-card strong{
          display:block;
          font-size:28px;
          color:#183253;
        }

        .summary-card span{
          display:block;
          margin-top:10px;
          font-size:12px;
          color:#5e6c80;
          text-transform:uppercase;
          letter-spacing:.06em;
          font-weight:800;
        }

        @media (max-width: 980px){
          .slide-shell{
            grid-template-columns:1fr;
          }

          .slide-grid,
          .summary-grid{
            grid-template-columns:1fr;
          }
        }

        @media (max-width: 760px){
          .page{
            padding:0;
          }

          .frame{
            width:100%;
            min-height:100vh;
            border-radius:0;
          }

          .stage{
            padding:10px;
          }

          .slide-main,
          .summary-shell,
          .empty-shell{
            padding:22px;
          }

          .slide-title h1{
            font-size:34px;
          }

          .bottombar,
          .topbar,
          .objective-strip{
            flex-direction:column;
            align-items:flex-start;
          }
        }
      `}</style>

      <div className="page">
        <div className={`frame ${themeClass(currentSection)}`}>
          <div className="topbar">
            <div>
              <strong>{assignment?.title || "MasteryPath"}</strong>
              <span>
                {assignment?.course || "No course loaded"} {hasAssignment ? `| ${completionPercent}% complete` : ""}
              </span>
            </div>
            <button onClick={handleClose} type="button">
              Close
            </button>
          </div>

          <div className="stage">
            {!hasAssignment ? (
              <div className="empty-shell">
                <h3>No Saved Course Found</h3>
                <p>
                  Save a MasteryPath from the builder first, then open the player with a
                  `courseId` in the URL so the course JSON can load.
                </p>
              </div>
            ) : null}

            {hasAssignment && !showSummary && currentSection ? (
              <div className="slide-shell">
                <div className="slide-main">
                  <div className="slide-kicker">
                    <span className="pill">{sectionLabel(currentSection.kind)}</span>
                    <span className="pill">
                      Slide {currentSectionIndex + 1} of {sections.length}
                    </span>
                    {currentSection.layoutStyle ? (
                      <span className="pill">{currentSection.layoutStyle}</span>
                    ) : null}
                  </div>

                  <div className="slide-title">
                    <h1>{currentSection.title}</h1>
                    <p>{currentSection.summary || assignment.description}</p>
                  </div>

                  <div className="slide-grid">
                    <div className="visual-stack">
                      <div className="block">
                        <h3>Slide Narrative</h3>
                        <p>{currentSection.body}</p>
                      </div>

                      {(currentSection.bullets ?? []).length ? (
                        <div className="block">
                          <h3>Key Points</h3>
                          <ul className="bullet-list">
                            {(currentSection.bullets ?? []).map((bullet) => (
                              <li key={bullet}>
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {currentSection.callout ? (
                        <div className="block">
                          <h3>{currentSection.callout.label}</h3>
                          <p>{currentSection.callout.text}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="visual-stack">
                      {currentSection.media?.url ? (
                        <div className="media-card">
                          {currentSection.media.type === "video" ? (
                            <iframe
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              src={videoEmbedUrl(currentSection.media.url)}
                              title={currentSection.title}
                            />
                          ) : (
                            <img alt={currentSection.media.caption || currentSection.title} src={currentSection.media.url} />
                          )}
                          {currentSection.media.caption ? (
                            <div className="media-caption">{currentSection.media.caption}</div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="graphic-card">
                          <div className="graphic-lines">
                            <div className="graphic-line" />
                            <div className="graphic-line" />
                            <div className="graphic-line" />
                            <div className="graphic-line" />
                          </div>
                        </div>
                      )}

                      {(currentSection.stats ?? []).length ? (
                        <div className="stats">
                          {(currentSection.stats ?? []).map((stat) => (
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

                <div className="objective-strip">
                  <div>
                    <strong>Current Objective</strong>
                    <p>
                      {currentObjective?.title || "No objective mapped yet"}
                      {currentObjective?.goal ? `: ${currentObjective.goal}` : ""}
                    </p>
                  </div>
                  <button className="nav-btn" onClick={markCurrentComplete} type="button">
                    Mark Slide Complete
                  </button>
                </div>
              </div>
            ) : null}

            {hasAssignment && showSummary ? (
              <div className="summary-shell">
                <h3>Course Summary</h3>
                <p>
                  This summary is based on the actual slides completed in this session,
                  not placeholder report values.
                </p>

                <div className="summary-grid">
                  <div className="summary-card">
                    <strong>{completedCount}</strong>
                    <span>Slides completed</span>
                  </div>
                  <div className="summary-card">
                    <strong>{sections.length}</strong>
                    <span>Total slides</span>
                  </div>
                  <div className="summary-card">
                    <strong>{completionPercent}%</strong>
                    <span>Course completion</span>
                  </div>
                </div>

                <div className="block">
                  <h3>Objectives Covered</h3>
                  <ul className="bullet-list">
                    {assignment.objectives.map((objective) => (
                      <li key={objective.id}>
                        <span>{objective.goal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>

          <div className="bottombar">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className="nav-btn"
                disabled={!showSummary && currentSectionIndex === 0}
                onClick={goBack}
                type="button"
              >
                Back
              </button>
              <button
                className="nav-btn"
                disabled={!hasAssignment || !currentSection || showSummary}
                onClick={goNext}
                type="button"
              >
                {currentSectionIndex >= sections.length - 1 ? "Finish" : "Next"}
              </button>
            </div>

            <div className="dots">
              {sections.map((section, index) => (
                <span
                  className={`dot ${
                    showSummary
                      ? completedSlides[section.id]
                        ? "done"
                        : ""
                      : index === currentSectionIndex
                        ? "active"
                        : completedSlides[section.id]
                          ? "done"
                          : ""
                  }`}
                  key={section.id}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
