"use client";

import { useMemo, useState } from "react";
import { type ContentSection, type MasteryAssignment } from "./data";

type ViewMode = "content" | "navigation" | "report";
type ConfidenceLevel = 0 | 1 | 2;

type ObjectiveProgressRow = {
  id: string;
  title: string;
  goal: string;
  completedCount: number;
  totalCount: number;
  score: number;
  mastered: boolean;
  confidenceLabel: string;
};

function splitContent(text: string) {
  const chunks = text
    .split(/\n{2,}|\|/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (chunks.length) {
    return chunks.slice(0, 4);
  }

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (sentences.length <= 2) {
    return sentences;
  }

  const grouped: string[] = [];
  for (let index = 0; index < sentences.length; index += 2) {
    grouped.push(sentences.slice(index, index + 2).join(" "));
  }

  return grouped.slice(0, 4);
}

function extractChips(section: ContentSection) {
  const text = `${section.summary} ${section.body}`;
  return text
    .split(/[|,.;]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 3)
    .slice(0, 5);
}

function mediaLabel(kind: ContentSection["kind"]) {
  if (kind === "video") return "Guided media moment";
  if (kind === "chart") return "Visual reference board";
  if (kind === "interactive") return "Interactive checkpoint";
  return "Instructional slide";
}

function actionPrompt(kind: ContentSection["kind"]) {
  if (kind === "video") return "Watch for the sequence, safety callouts, and the moment the process could fail.";
  if (kind === "chart") return "Compare the values, patterns, and exceptions before moving on.";
  if (kind === "interactive") return "Make a decision, check your reasoning, and adjust if needed.";
  return "Read the lesson, identify the rule, and connect it to the objective.";
}

function confidenceLabel(level: number) {
  if (level >= 2) return "Ready to apply";
  if (level >= 1) return "Almost there";
  return "Needs review";
}

function sectionAccent(kind: ContentSection["kind"]) {
  if (kind === "video") return "video";
  if (kind === "chart") return "chart";
  if (kind === "interactive") return "interactive";
  return "lesson";
}

export default function MasteryPathStudentClient({
  assignment,
}: {
  assignment: MasteryAssignment | null;
}) {
  const hasAssignment = Boolean(assignment);
  const sections = assignment?.sections ?? [];
  const objectives = assignment?.objectives ?? [];
  const [view, setView] = useState<ViewMode>("content");
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [completedSections, setCompletedSections] = useState<Record<string, boolean>>({});
  const [sectionConfidence, setSectionConfidence] = useState<Record<string, ConfidenceLevel>>({});
  const [visitedSections, setVisitedSections] = useState<Record<string, boolean>>(() =>
    sections[0] ? { [sections[0].id]: true } : {}
  );

  const currentSection = sections[currentSectionIndex] ?? null;

  const sectionObjectiveMap = useMemo(() => {
    return sections.reduce<Record<string, string | null>>((acc, section, index) => {
      if (!objectives.length) {
        acc[section.id] = null;
        return acc;
      }

      if (index === 0) {
        acc[section.id] = objectives[0].id;
        return acc;
      }

      acc[section.id] = objectives[Math.min(index - 1, objectives.length - 1)].id;
      return acc;
    }, {});
  }, [objectives, sections]);

  const objectiveRows = useMemo<ObjectiveProgressRow[]>(() => {
    return objectives.map((objective) => {
      const relatedSections = sections.filter(
        (section) => sectionObjectiveMap[section.id] === objective.id
      );
      const totalCount = Math.max(relatedSections.length, 1);
      const completedCount = relatedSections.filter(
        (section) => completedSections[section.id]
      ).length;
      const confidenceValues = relatedSections
        .map((section) => sectionConfidence[section.id])
        .filter((value): value is ConfidenceLevel => value !== undefined);
      const averageConfidence = confidenceValues.length
        ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
        : 0;
      const completionRatio = completedCount / totalCount;
      const confidenceRatio = averageConfidence / 2;
      const score = Math.round(completionRatio * 70 + confidenceRatio * 30);

      return {
        id: objective.id,
        title: objective.title,
        goal: objective.goal,
        completedCount,
        totalCount,
        score,
        mastered: completedCount === totalCount && averageConfidence >= 1.5,
        confidenceLabel: confidenceLabel(averageConfidence),
      };
    });
  }, [completedSections, objectives, sectionConfidence, sectionObjectiveMap, sections]);

  const overallProgress = useMemo(() => {
    if (!sections.length) {
      return 0;
    }

    return Math.round(
      (sections.filter((section) => completedSections[section.id]).length / sections.length) *
        100
    );
  }, [completedSections, sections]);

  const reportSummary = useMemo(() => {
    if (!objectiveRows.length) {
      return {
        averageScore: 0,
        masteredCount: 0,
      };
    }

    return {
      averageScore: Math.round(
        objectiveRows.reduce((sum, row) => sum + row.score, 0) / objectiveRows.length
      ),
      masteredCount: objectiveRows.filter((row) => row.mastered).length,
    };
  }, [objectiveRows]);

  function handleClose() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.close();
  }

  function openSection(index: number) {
    const nextSection = sections[index];
    if (!nextSection) {
      return;
    }

    setVisitedSections((previous) => ({
      ...previous,
      [nextSection.id]: true,
    }));
    setCurrentSectionIndex(index);
    setView("content");
  }

  function completeCurrentSection() {
    if (!currentSection) {
      return;
    }

    setCompletedSections((previous) => ({
      ...previous,
      [currentSection.id]: true,
    }));
  }

  function goToNextSection() {
    if (!currentSection || currentSectionIndex >= sections.length - 1) {
      setView("report");
      return;
    }

    completeCurrentSection();
    openSection(currentSectionIndex + 1);
  }

  function goToPreviousSection() {
    if (currentSectionIndex <= 0) {
      return;
    }

    openSection(currentSectionIndex - 1);
  }

  return (
    <>
      <style>{`
        :root{
          --bg-1:#0c1b33;
          --bg-2:#16345d;
          --panel:#f7f3ec;
          --ink:#102038;
          --muted:#5e6980;
          --edge:rgba(17, 31, 54, .14);
          --teal:#2b9d8f;
          --gold:#d9a441;
          --rose:#f08172;
          --sky:#5f91ff;
        }

        body{
          margin:0;
          font-family:"Trebuchet MS","Gill Sans","Segoe UI",sans-serif;
          color:var(--ink);
          background:
            radial-gradient(circle at top left, rgba(95,145,255,.24), transparent 28%),
            radial-gradient(circle at bottom right, rgba(240,129,114,.16), transparent 30%),
            linear-gradient(145deg, var(--bg-1), var(--bg-2));
        }

        .page{
          min-height:100vh;
          padding:20px;
          display:grid;
          place-items:center;
        }

        .window{
          width:min(1320px,100%);
          min-height:calc(100vh - 40px);
          display:grid;
          grid-template-rows:auto 1fr;
          border:1px solid rgba(255,255,255,.12);
          border-radius:26px;
          overflow:hidden;
          background:rgba(10,20,36,.58);
          backdrop-filter:blur(22px);
          box-shadow:0 28px 80px rgba(0,0,0,.28);
        }

        .toolbar{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          align-items:center;
          justify-content:space-between;
          padding:16px 18px;
          border-bottom:1px solid rgba(255,255,255,.08);
          background:linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.03));
        }

        .toolbar-group{
          display:flex;
          gap:8px;
          flex-wrap:wrap;
        }

        .toolbar button{
          min-height:40px;
          border-radius:999px;
          border:1px solid rgba(255,255,255,.12);
          background:rgba(255,255,255,.06);
          color:#f7fafc;
          font-size:12px;
          font-weight:800;
          letter-spacing:.03em;
          cursor:pointer;
          padding:0 16px;
        }

        .toolbar button.active{
          background:linear-gradient(135deg, #f0ede7, #dbcab4);
          color:#0d2340;
          border-color:transparent;
        }

        .toolbar-meta{
          display:flex;
          align-items:center;
          gap:14px;
          color:rgba(255,255,255,.82);
          font-size:12px;
          font-weight:700;
        }

        .screen{
          min-height:0;
          padding:18px;
        }

        .empty-state,
        .report-shell,
        .nav-shell,
        .slide-shell{
          min-height:100%;
          border-radius:24px;
          overflow:hidden;
          border:1px solid var(--edge);
          background:
            linear-gradient(180deg, rgba(255,255,255,.82), rgba(248,245,239,.96)),
            var(--panel);
        }

        .empty-state{
          display:grid;
          place-items:center;
          padding:32px;
        }

        .empty-card{
          width:min(640px, 100%);
          padding:28px;
          border-radius:24px;
          border:1px solid rgba(17,31,54,.08);
          background:linear-gradient(145deg, #fff8f0, #f0f6fb);
          box-shadow:0 18px 40px rgba(16,32,56,.10);
        }

        .empty-card strong,
        .report-card strong,
        .nav-card strong{
          display:block;
          font-size:18px;
          color:#102038;
        }

        .empty-card p,
        .report-card p,
        .nav-card p{
          margin:10px 0 0;
          color:var(--muted);
          line-height:1.7;
        }

        .slide-shell{
          display:grid;
          grid-template-columns:minmax(0, 1.55fr) 360px;
        }

        .slide-main{
          min-width:0;
          display:grid;
          grid-template-rows:auto 1fr auto;
          background:
            linear-gradient(180deg, rgba(255,255,255,.85), rgba(255,255,255,.72)),
            radial-gradient(circle at top left, rgba(95,145,255,.14), transparent 28%);
        }

        .slide-top{
          padding:28px 30px 18px;
          border-bottom:1px solid rgba(17,31,54,.08);
        }

        .eyebrow{
          display:inline-flex;
          align-items:center;
          gap:8px;
          min-height:32px;
          padding:0 12px;
          border-radius:999px;
          background:#eff4ff;
          color:#25406b;
          font-size:11px;
          font-weight:900;
          letter-spacing:.08em;
          text-transform:uppercase;
        }

        .slide-main.lesson .eyebrow{ background:#eaf7f0; color:#1f5e4c; }
        .slide-main.chart .eyebrow{ background:#eef1ff; color:#30489c; }
        .slide-main.video .eyebrow{ background:#fff0e8; color:#9d4a2f; }
        .slide-main.interactive .eyebrow{ background:#fff2f5; color:#8b3358; }

        .headline{
          margin:18px 0 12px;
          font-family:Georgia,"Times New Roman",serif;
          font-size:40px;
          line-height:1.04;
          color:#132238;
        }

        .lede{
          margin:0;
          max-width:760px;
          color:#49576b;
          font-size:17px;
          line-height:1.75;
        }

        .meta-row{
          margin-top:18px;
          display:flex;
          gap:10px;
          flex-wrap:wrap;
        }

        .meta-pill{
          min-height:30px;
          display:inline-flex;
          align-items:center;
          padding:0 12px;
          border-radius:999px;
          background:#ffffff;
          border:1px solid rgba(17,31,54,.08);
          color:#33435c;
          font-size:11px;
          font-weight:800;
          letter-spacing:.04em;
          text-transform:uppercase;
        }

        .slide-content{
          padding:28px 30px 20px;
          display:grid;
          gap:18px;
          align-content:start;
        }

        .content-card{
          border-radius:22px;
          padding:20px;
          border:1px solid rgba(17,31,54,.08);
          background:
            linear-gradient(145deg, rgba(255,255,255,.94), rgba(244,238,230,.92));
          box-shadow:0 14px 32px rgba(17,31,54,.08);
        }

        .content-card h3,
        .side-card h3,
        .report-card h3,
        .nav-card h3{
          margin:0 0 10px;
          font-size:15px;
          letter-spacing:.04em;
          text-transform:uppercase;
          color:#2f4668;
        }

        .content-card p{
          margin:0;
          font-size:16px;
          line-height:1.8;
          color:#243549;
        }

        .slide-footer{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          flex-wrap:wrap;
          padding:18px 30px 28px;
        }

        .primary-actions,
        .secondary-actions,
        .confidence-row,
        .chip-row{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
        }

        .action-btn{
          min-height:42px;
          padding:0 18px;
          border-radius:999px;
          border:1px solid rgba(17,31,54,.12);
          background:#fff;
          color:#183050;
          font-size:12px;
          font-weight:800;
          letter-spacing:.04em;
          cursor:pointer;
        }

        .action-btn.primary{
          background:linear-gradient(135deg, #143a68, #2d8a8e);
          border-color:transparent;
          color:#fff;
        }

        .action-btn.gold{
          background:linear-gradient(135deg, #f6ebc8, #dfb85e);
          border-color:transparent;
          color:#2b2416;
        }

        .action-btn.active{
          background:linear-gradient(135deg, #ffe8db, #f09b73);
          border-color:transparent;
          color:#3b1f16;
        }

        .slide-side{
          min-width:0;
          padding:24px;
          display:grid;
          gap:16px;
          align-content:start;
          background:
            radial-gradient(circle at top, rgba(43,157,143,.18), transparent 26%),
            linear-gradient(180deg, rgba(17,31,54,.96), rgba(13,27,50,.98));
          color:#eef4ff;
        }

        .side-card{
          border-radius:22px;
          padding:18px;
          border:1px solid rgba(255,255,255,.08);
          background:rgba(255,255,255,.06);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.06);
        }

        .side-card h3{
          color:#eaf2ff;
        }

        .side-card p{
          margin:0;
          color:rgba(234,242,255,.82);
          line-height:1.7;
        }

        .progress-bar{
          height:10px;
          overflow:hidden;
          border-radius:999px;
          background:rgba(255,255,255,.10);
          margin-top:10px;
        }

        .progress-bar span{
          display:block;
          height:100%;
          border-radius:999px;
          background:linear-gradient(90deg, #76d3c2, #f7d67c);
        }

        .mini-list{
          display:grid;
          gap:10px;
        }

        .mini-item{
          padding:12px 14px;
          border-radius:16px;
          background:rgba(255,255,255,.08);
          border:1px solid rgba(255,255,255,.06);
          font-size:13px;
          line-height:1.6;
          color:#f1f6ff;
        }

        .mini-item strong{
          display:block;
          margin-bottom:4px;
          font-size:12px;
          letter-spacing:.06em;
          text-transform:uppercase;
          color:#99c6ff;
        }

        .chip{
          min-height:28px;
          display:inline-flex;
          align-items:center;
          padding:0 10px;
          border-radius:999px;
          background:rgba(255,255,255,.08);
          border:1px solid rgba(255,255,255,.08);
          font-size:11px;
          font-weight:800;
          letter-spacing:.04em;
          text-transform:uppercase;
          color:#eef4ff;
        }

        .nav-shell,
        .report-shell{
          padding:24px;
          display:grid;
          gap:18px;
          align-content:start;
          background:
            radial-gradient(circle at top left, rgba(95,145,255,.12), transparent 20%),
            linear-gradient(180deg, rgba(255,255,255,.88), rgba(246,241,233,.95));
        }

        .nav-grid,
        .report-grid{
          display:grid;
          gap:14px;
        }

        .nav-card,
        .report-card{
          border-radius:22px;
          padding:20px;
          border:1px solid rgba(17,31,54,.08);
          background:rgba(255,255,255,.88);
          box-shadow:0 16px 30px rgba(17,31,54,.08);
        }

        .nav-card button{
          margin-top:16px;
        }

        .stats-row{
          display:grid;
          grid-template-columns:repeat(3, minmax(0, 1fr));
          gap:14px;
        }

        .stat-card{
          border-radius:18px;
          padding:18px;
          background:linear-gradient(145deg, #102a49, #1f4b74);
          color:#f5f8ff;
          box-shadow:0 16px 30px rgba(17,31,54,.16);
        }

        .stat-card strong{
          display:block;
          font-size:28px;
          line-height:1;
          margin-bottom:8px;
        }

        .stat-card span{
          font-size:12px;
          letter-spacing:.06em;
          text-transform:uppercase;
          color:rgba(245,248,255,.76);
          font-weight:800;
        }

        .objective-row{
          display:grid;
          grid-template-columns:minmax(0, 1fr) 110px 140px 130px;
          gap:14px;
          align-items:center;
          padding:16px 0;
          border-bottom:1px solid rgba(17,31,54,.08);
        }

        .objective-row:last-child{
          border-bottom:0;
        }

        .objective-title{
          font-weight:800;
          color:#132238;
        }

        .objective-goal{
          margin-top:6px;
          color:#5b697b;
          line-height:1.65;
          font-size:13px;
        }

        .report-pill{
          min-height:30px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          padding:0 12px;
          border-radius:999px;
          font-size:11px;
          font-weight:900;
          letter-spacing:.05em;
          text-transform:uppercase;
        }

        .report-pill.mastered{
          background:#e7f7f0;
          color:#126245;
        }

        .report-pill.progress{
          background:#fff3dd;
          color:#8b5d06;
        }

        @media (max-width: 1180px){
          .slide-shell{
            grid-template-columns:1fr;
          }
        }

        @media (max-width: 860px){
          .page{
            padding:0;
          }

          .window{
            width:100%;
            min-height:100vh;
            border-radius:0;
          }

          .screen{
            padding:10px;
          }

          .slide-top,
          .slide-content,
          .slide-footer,
          .slide-side,
          .nav-shell,
          .report-shell{
            padding:18px;
          }

          .headline{
            font-size:30px;
          }

          .stats-row,
          .objective-row{
            grid-template-columns:1fr;
          }
        }
      `}</style>

      <div className="page">
        <div className="window">
          <div className="toolbar">
            <div className="toolbar-group">
              <button
                className={view === "content" ? "active" : ""}
                onClick={() => setView("content")}
                type="button"
              >
                Slide Player
              </button>
              <button
                className={view === "navigation" ? "active" : ""}
                onClick={() => setView("navigation")}
                type="button"
              >
                Objectives
              </button>
              <button
                className={view === "report" ? "active" : ""}
                onClick={() => setView("report")}
                type="button"
              >
                Live Report
              </button>
            </div>

            <div className="toolbar-meta">
              <span>{assignment?.course || "MasteryPath"}</span>
              <span>{overallProgress}% complete</span>
              <button onClick={handleClose} type="button">
                Close
              </button>
            </div>
          </div>

          <div className="screen">
            {!hasAssignment ? (
              <div className="empty-state">
                <div className="empty-card">
                  <strong>No saved assignment found</strong>
                  <p>
                    Save a MasteryPath from the builder first, or open the player with an
                    `assignmentId` in the URL so the lesson can load from the database.
                  </p>
                </div>
              </div>
            ) : null}

            {hasAssignment && view === "content" && currentSection ? (
              <div className="slide-shell">
                <div className={`slide-main ${sectionAccent(currentSection.kind)}`}>
                  <div className="slide-top">
                    <span className="eyebrow">
                      {mediaLabel(currentSection.kind)}
                    </span>
                    <h1 className="headline">{currentSection.title}</h1>
                    <p className="lede">
                      {currentSection.summary || assignment.description}
                    </p>
                    <div className="meta-row">
                      <span className="meta-pill">
                        Slide {currentSectionIndex + 1} of {sections.length}
                      </span>
                      <span className="meta-pill">
                        {visitedSections[currentSection.id] ? "Opened" : "New"}
                      </span>
                      <span className="meta-pill">
                        {completedSections[currentSection.id] ? "Completed" : "In progress"}
                      </span>
                    </div>
                  </div>

                  <div className="slide-content">
                    {splitContent(currentSection.body || currentSection.summary).map((chunk) => (
                      <div className="content-card" key={chunk}>
                        <h3>Learning Moment</h3>
                        <p>{chunk}</p>
                      </div>
                    ))}

                    <div className="content-card">
                      <h3>What To Do With This Slide</h3>
                      <p>{actionPrompt(currentSection.kind)}</p>
                    </div>
                  </div>

                  <div className="slide-footer">
                    <div className="secondary-actions">
                      <button
                        className="action-btn"
                        disabled={currentSectionIndex === 0}
                        onClick={goToPreviousSection}
                        type="button"
                      >
                        Back
                      </button>
                      <button
                        className="action-btn gold"
                        onClick={completeCurrentSection}
                        type="button"
                      >
                        Mark complete
                      </button>
                    </div>

                    <div className="primary-actions">
                      <button
                        className="action-btn primary"
                        onClick={goToNextSection}
                        type="button"
                      >
                        {currentSectionIndex === sections.length - 1
                          ? "Finish and open report"
                          : "Next slide"}
                      </button>
                    </div>
                  </div>
                </div>

                <aside className="slide-side">
                  <div className="side-card">
                    <h3>Lesson Snapshot</h3>
                    <p>{assignment.title}</p>
                    <div className="progress-bar">
                      <span style={{ width: `${overallProgress}%` }} />
                    </div>
                    <p style={{ marginTop: 10 }}>
                      This report now reflects the student actions on this page, not fixed
                      placeholder scores.
                    </p>
                  </div>

                  <div className="side-card">
                    <h3>Confidence Check</h3>
                    <p>
                      Choose how ready you feel after this slide. That confidence feeds the
                      live report.
                    </p>
                    <div className="confidence-row" style={{ marginTop: 14 }}>
                      {[0, 1, 2].map((level) => (
                        <button
                          className={`action-btn ${
                            sectionConfidence[currentSection.id] === level ? "active" : ""
                          }`}
                          key={level}
                          onClick={() =>
                            setSectionConfidence((previous) => ({
                              ...previous,
                              [currentSection.id]: level as ConfidenceLevel,
                            }))
                          }
                          type="button"
                        >
                          {confidenceLabel(level)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="side-card">
                    <h3>Key Takeaways</h3>
                    <div className="chip-row">
                      {extractChips(currentSection).map((chip) => (
                        <span className="chip" key={chip}>
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="side-card">
                    <h3>Current Objective</h3>
                    <div className="mini-list">
                      {objectiveRows
                        .filter((row) => row.id === sectionObjectiveMap[currentSection.id])
                        .map((row) => (
                          <div className="mini-item" key={row.id}>
                            <strong>{row.title}</strong>
                            {row.goal}
                          </div>
                        ))}
                    </div>
                  </div>
                </aside>
              </div>
            ) : null}

            {hasAssignment && view === "navigation" ? (
              <div className="nav-shell">
                <div className="stats-row">
                  <div className="stat-card">
                    <strong>{sections.length}</strong>
                    <span>Slides in path</span>
                  </div>
                  <div className="stat-card">
                    <strong>{sections.filter((section) => completedSections[section.id]).length}</strong>
                    <span>Slides completed</span>
                  </div>
                  <div className="stat-card">
                    <strong>{reportSummary.masteredCount}</strong>
                    <span>Objectives mastered</span>
                  </div>
                </div>

                <div className="nav-grid">
                  {sections.map((section, index) => (
                    <div className="nav-card" key={section.id}>
                      <strong>
                        {index + 1}. {section.title}
                      </strong>
                      <p>{section.summary || mediaLabel(section.kind)}</p>
                      <p>
                        Status:{" "}
                        {completedSections[section.id]
                          ? "Completed"
                          : visitedSections[section.id]
                            ? "Visited"
                            : "Not started"}
                      </p>
                      <button className="action-btn primary" onClick={() => openSection(index)} type="button">
                        Open slide
                      </button>
                    </div>
                  ))}

                  {objectiveRows.map((row) => (
                    <div className="nav-card" key={row.id}>
                      <strong>{row.title}</strong>
                      <p>{row.goal}</p>
                      <div className="progress-bar">
                        <span style={{ width: `${row.score}%` }} />
                      </div>
                      <p>
                        {row.completedCount}/{row.totalCount} related slides completed
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {hasAssignment && view === "report" ? (
              <div className="report-shell">
                <div className="stats-row">
                  <div className="stat-card">
                    <strong>{reportSummary.averageScore}%</strong>
                    <span>Average readiness</span>
                  </div>
                  <div className="stat-card">
                    <strong>{reportSummary.masteredCount}</strong>
                    <span>Objectives mastered</span>
                  </div>
                  <div className="stat-card">
                    <strong>{overallProgress}%</strong>
                    <span>Path completion</span>
                  </div>
                </div>

                <div className="report-card">
                  <strong>Live Objective Report</strong>
                  <p>
                    This report now uses the student&apos;s actual slide completion and
                    confidence selections from this session instead of hardcoded demo
                    percentages.
                  </p>

                  <div className="report-grid" style={{ marginTop: 12 }}>
                    {objectiveRows.map((row) => (
                      <div className="objective-row" key={row.id}>
                        <div>
                          <div className="objective-title">{row.title}</div>
                          <div className="objective-goal">{row.goal}</div>
                        </div>
                        <div>{row.score}%</div>
                        <div>{row.confidenceLabel}</div>
                        <div>
                          <span
                            className={`report-pill ${
                              row.mastered ? "mastered" : "progress"
                            }`}
                          >
                            {row.mastered ? "Mastered" : "In progress"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
