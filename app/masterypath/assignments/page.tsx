"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AssignmentListItem = {
  id: string;
  courseId: string;
  title: string;
  course: string;
  publishState: "draft" | "published";
  activityCount: number;
  updatedAt?: string;
};

const COURSE_COLORS = [
  { header: "#5B45E0", bg: "#EDEAFC", text: "#3D29B8" },
  { header: "#0F9B6B", bg: "#E6FAF4", text: "#0A7050" },
  { header: "#1585C0", bg: "#E0F2FC", text: "#0A5A8A" },
  { header: "#C0185C", bg: "#FEE8ED", text: "#8A0A3D" },
  { header: "#7B35C0", bg: "#F0E8FC", text: "#4D1A8A" },
  { header: "#E0780F", bg: "#FEF5E0", text: "#8A4A00" },
];

function courseColor(index: number) {
  return COURSE_COLORS[index % COURSE_COLORS.length];
}

function initials(title: string) {
  return title
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export default function MasteryPathAssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  async function loadAssignments() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/masterypath");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load assignments.");
      }

      setAssignments(Array.isArray(payload.assignments) ? payload.assignments : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load assignments.");
    } finally {
      setLoading(false);
    }
  }

  async function updatePublishState(
    courseId: string,
    publishState: "draft" | "published"
  ) {
    setUpdatingId(courseId);
    setError("");

    try {
      const response = await fetch("/api/masterypath", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, publishState }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to update assignment.");
      }

      setAssignments((previous) =>
        previous.map((assignment) =>
          assignment.courseId === courseId
            ? { ...assignment, publishState }
            : assignment
        )
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update assignment.");
    } finally {
      setUpdatingId("");
    }
  }

  useEffect(() => {
    loadAssignments();
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'DM Sans', 'Segoe UI', Arial, sans-serif;
          background: #F0EDF8;
          color: #1A1528;
          min-height: 100vh;
        }

        .ma-page {
          min-height: 100vh;
          display: grid;
          grid-template-rows: auto 1fr;
        }

        .ma-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 24px;
          background: #fff;
          border-bottom: 1px solid #E8E2F5;
        }

        .ma-brand-title {
          font-size: 18px;
          font-weight: 500;
          color: #1A1528;
        }

        .ma-brand-sub {
          font-size: 13px;
          color: #7068A0;
          margin-top: 3px;
          line-height: 1.5;
        }

        .ma-toolbar,
        .ma-card-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .ma-btn {
          min-height: 36px;
          padding: 0 16px;
          border-radius: 8px;
          border: 1px solid #E2DCF0;
          background: #fff;
          color: #7068A0;
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .ma-btn:hover { border-color: #B8AEDE; color: #1A1528; }
        .ma-btn.primary {
          background: #5B45E0;
          border-color: #5B45E0;
          color: #fff;
        }
        .ma-btn.primary:hover { background: #4A36C8; border-color: #4A36C8; }
        .ma-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .ma-shell {
          width: min(960px, 100%);
          margin: 0 auto;
          padding: 28px 24px 60px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ma-stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .ma-stat {
          background: #fff;
          border: 1px solid #E8E2F5;
          border-radius: 8px;
          padding: 16px 18px;
        }
        .ma-stat strong {
          display: block;
          font-size: 26px;
          font-weight: 500;
          color: #1A1528;
          line-height: 1.1;
        }
        .ma-stat span {
          display: block;
          margin-top: 6px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #7068A0;
          font-weight: 500;
        }

        .ma-section-label {
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #7068A0;
          margin-bottom: 4px;
        }

        .ma-card {
          background: #fff;
          border: 1px solid #E8E2F5;
          border-radius: 8px;
          overflow: hidden;
          transition: box-shadow 0.15s;
        }
        .ma-card:hover { box-shadow: 0 4px 20px rgba(91,69,224,0.08); }

        .ma-card-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 18px;
        }

        .ma-card-left {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .ma-avatar {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 500;
          flex-shrink: 0;
          letter-spacing: 0.02em;
        }

        .ma-card-title {
          font-size: 15px;
          font-weight: 500;
          color: #1A1528;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ma-card-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 5px;
          align-items: center;
        }

        .ma-chip {
          font-size: 11px;
          font-weight: 500;
          padding: 2px 9px;
          border-radius: 999px;
          background: #F4F1FB;
          color: #5B45E0;
          border: 1px solid #E2DCF0;
        }
        .ma-chip.published {
          background: #E6FAF4;
          color: #0A7050;
          border-color: #6DDCB4;
        }
        .ma-chip.draft {
          background: #FEF5E0;
          color: #8A5200;
          border-color: #F5CF7A;
        }

        .ma-card-actions {
          flex-shrink: 0;
        }

        .ma-notice {
          border-radius: 8px;
          padding: 14px 16px;
          background: #fff;
          border: 1px solid #E8E2F5;
          color: #7068A0;
          font-size: 14px;
          line-height: 1.6;
        }
        .ma-notice.error {
          border-color: #F8A8BB;
          background: #FEE8ED;
          color: #B01F3D;
        }

        @media (max-width: 640px) {
          .ma-topbar {
            flex-direction: column;
            align-items: flex-start;
          }
          .ma-stats-row { grid-template-columns: 1fr 1fr; }
          .ma-card-inner { flex-direction: column; align-items: flex-start; }
          .ma-card-actions { width: 100%; justify-content: flex-end; }
        }
      `}</style>

      <div className="ma-page">
        <header className="ma-topbar">
          <div>
            <div className="ma-brand-title">MasteryPath</div>
            <div className="ma-brand-sub">Create, manage and publish activity assignments.</div>
          </div>
          <div className="ma-toolbar">
            <Link className="ma-btn primary" href="/masterypath/builder">+ New assignment</Link>
            <Link className="ma-btn" href="/">Dashboard</Link>
          </div>
        </header>

        <main className="ma-shell">
          {!loading && !error && assignments.length > 0 ? (
            <div className="ma-stats-row">
              <div className="ma-stat">
                <strong>{assignments.length}</strong>
                <span>Assignments</span>
              </div>
              <div className="ma-stat">
                <strong>{assignments.filter((assignment) => assignment.publishState === "published").length}</strong>
                <span>Published</span>
              </div>
              <div className="ma-stat">
                <strong>{assignments.reduce((sum, assignment) => sum + (assignment.activityCount || 0), 0)}</strong>
                <span>Total activities</span>
              </div>
            </div>
          ) : null}

          {loading ? <div className="ma-notice">Loading assignments...</div> : null}
          {error ? <div className="ma-notice error">{error}</div> : null}

          {!loading && !assignments.length && !error ? (
            <div className="ma-notice">
              No assignments yet. Create your first MasteryPath assignment from the builder.
            </div>
          ) : null}

          {assignments.length > 0 ? (
            <>
              <div className="ma-section-label">All assignments</div>
              {assignments.map((assignment, index) => {
                const color = courseColor(index);

                return (
                  <article className="ma-card" key={assignment.courseId}>
                    <div className="ma-card-inner">
                      <div className="ma-card-left">
                        <div
                          className="ma-avatar"
                          style={{ background: color.bg, color: color.text }}
                        >
                          {initials(assignment.title)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="ma-card-title">{assignment.title}</div>
                          <div className="ma-card-meta">
                            <span className="ma-chip">{assignment.course || "Untitled course"}</span>
                            <span className="ma-chip">{assignment.activityCount} activities</span>
                            <span className={`ma-chip ${assignment.publishState}`}>
                              {assignment.publishState}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="ma-card-actions">
                        <Link
                          className="ma-btn"
                          href={`/masterypath?courseId=${assignment.courseId}`}
                        >
                          Preview
                        </Link>
                        <button
                          className="ma-btn primary"
                          disabled={updatingId === assignment.courseId}
                          onClick={() =>
                            updatePublishState(
                              assignment.courseId,
                              assignment.publishState === "published" ? "draft" : "published"
                            )
                          }
                          style={{ background: color.header, borderColor: color.header }}
                          type="button"
                        >
                          {assignment.publishState === "published" ? "Unpublish" : "Publish"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </>
          ) : null}
        </main>
      </div>
    </>
  );
}
