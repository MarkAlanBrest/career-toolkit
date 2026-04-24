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
        headers: {
          "Content-Type": "application/json",
        },
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
          align-items:center;
          justify-content:space-between;
          gap:16px;
          padding:16px 20px;
          background:#fbfdff;
          border-bottom:1px solid #d8e2eb;
        }

        .brand h1{
          margin:0;
          font-size:22px;
        }

        .brand p{
          margin:6px 0 0;
          color:#607286;
          font-size:13px;
          line-height:1.5;
        }

        .toolbar,
        .actions{
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
          gap:14px;
          box-sizing:border-box;
        }

        .card{
          border:1px solid #d8e2eb;
          border-radius:8px;
          background:#fff;
          padding:16px;
          display:grid;
          grid-template-columns:minmax(0,1fr) auto;
          gap:16px;
          align-items:center;
        }

        .card h2{
          margin:0;
          color:#173a63;
          font-size:18px;
        }

        .meta{
          margin-top:8px;
          display:flex;
          flex-wrap:wrap;
          gap:8px;
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

        .chip.published{
          background:#e4f7ec;
          color:#12643f;
        }

        .chip.draft{
          background:#fff4d8;
          color:#7a520d;
        }

        .notice{
          border-radius:8px;
          padding:14px;
          background:#fff;
          border:1px solid #d8e2eb;
          color:#5f7084;
          line-height:1.6;
        }

        .error{
          border-color:#f1c5c5;
          background:#fdecec;
          color:#9c2a2a;
        }

        @media (max-width:760px){
          .topbar,
          .card{
            align-items:flex-start;
            grid-template-columns:1fr;
            flex-direction:column;
          }

          .shell{
            padding:12px;
          }
        }
      `}</style>

      <div className="page">
        <header className="topbar">
          <div className="brand">
            <h1>MasteryPath Assignments</h1>
            <p>Create, view, and publish activity assignments for students.</p>
          </div>
          <div className="toolbar">
            <Link className="btn primary" href="/masterypath/builder">
              New Assignment
            </Link>
            <Link className="btn" href="/">
              Dashboard
            </Link>
          </div>
        </header>

        <main className="shell">
          {loading ? <div className="notice">Loading assignments...</div> : null}
          {error ? <div className="notice error">{error}</div> : null}
          {!loading && !assignments.length ? (
            <div className="notice">
              No assignments yet. Create your first MasteryPath assignment from the builder.
            </div>
          ) : null}

          {assignments.map((assignment) => (
            <article className="card" key={assignment.courseId}>
              <div>
                <h2>{assignment.title}</h2>
                <div className="meta">
                  <span className="chip">{assignment.course || "Untitled course"}</span>
                  <span className="chip">{assignment.activityCount} activities</span>
                  <span className={`chip ${assignment.publishState}`}>
                    {assignment.publishState}
                  </span>
                </div>
              </div>

              <div className="actions">
                <Link className="btn" href={`/masterypath?courseId=${assignment.courseId}`}>
                  Preview
                </Link>
                <button
                  className="btn primary"
                  disabled={updatingId === assignment.courseId}
                  onClick={() =>
                    updatePublishState(
                      assignment.courseId,
                      assignment.publishState === "published" ? "draft" : "published"
                    )
                  }
                  type="button"
                >
                  {assignment.publishState === "published" ? "Unpublish" : "Publish"}
                </button>
              </div>
            </article>
          ))}
        </main>
      </div>
    </>
  );
}
