"use client";

import { useEffect, useState } from "react";

type Job = {
  id: number;
  Title: string;
  SubTitle: string;
  Description: string;
  Link: string;
};

const ADMIN_PASSWORD = "ncst-admin";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [original, setOriginal] = useState<Job[]>([]);
  const [edit, setEdit] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const r = await fetch("/api/jobboard");
    const data = await r.json();
    setJobs(data);
    setOriginal(data);
  }

  function updateField(id: number, field: keyof Job, value: string) {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, [field]: value } : j))
    );
  }

  async function save() {
    await fetch("/api/jobboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jobs),
    });
    setEdit(false);
    load();
  }

  function cancel() {
    setJobs(original);
    setEdit(false);
  }

  function addJob() {
    setJobs([
      {
        id: 0,
        Title: "New Company",
        SubTitle: "Position",
        Description: "Job description",
        Link: "#",
      },
      ...jobs,
    ]);
  }

  async function deleteJob(id: number) {
    await fetch(`/api/jobboard?id=${id}`, { method: "DELETE" });
    load();
  }

  function unlockAdmin() {
    const p = prompt("Admin password:");
    if (p === ADMIN_PASSWORD) setEdit(true);
  }

  function moveJob(index: number, direction: number) {
    const newJobs = [...jobs];
    const target = index + direction;

    if (target < 0 || target >= newJobs.length) return;

    const temp = newJobs[index];
    newJobs[index] = newJobs[target];
    newJobs[target] = temp;

    setJobs(newJobs);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#cbd5f5,#94a3b8)",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          background: "#0f172a",
          color: "white",
          padding: 30,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 14,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: "#cbd5f5",
          }}
        >
          New Castle School of Trades
        </div>

        <h1 style={{ margin: 0, fontSize: 32 }}>
          Student Job Placement Resources
        </h1>

        <p style={{ marginTop: 8, fontSize: 18 }}>
          Opportunities from employers and career sites
        </p>

        {edit && (
          <div style={{ marginTop: 18, display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={save}
              style={{
                background: "#2563eb",
                color: "white",
                border: "none",
                padding: "10px 18px",
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Save
            </button>

            <button
              onClick={cancel}
              style={{
                background: "#6b7280",
                color: "white",
                border: "none",
                padding: "10px 18px",
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              onClick={addJob}
              style={{
                background: "#10b981",
                color: "white",
                border: "none",
                padding: "10px 18px",
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Add Job
            </button>
          </div>
        )}
      </div>

      {/* GRID */}
      <div
        style={{
          maxWidth: 1100,
          margin: "auto",
          padding: "40px 20px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: 28,
        }}
      >
        {jobs.map((t, i) => (
          <div key={i}>
            {!edit ? (
              <a
                href={t.Link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                {/* NEWSPAPER-STYLE TILE */}
                <div
                  style={{
                    background: "white",
                    borderRadius: 8,
                    padding: "22px 24px",
                    border: "1px solid #d1d5db",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    minHeight: 340,   // ← NEW LINE
                    transition: "transform .15s ease, box-shadow .15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 14px rgba(0,0,0,0.10)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 2px 8px rgba(0,0,0,0.06)";
                  }}
                >
                  {/* ICON + TITLE */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22, color: "#1e3a8a" }}>💼</span>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: "#111827",
                        lineHeight: 1.2,
                      }}
                    >
                      {t.Title}
                    </div>
                  </div>

                  {/* SUBTITLE */}
                  <div
                    style={{
                      fontSize: 15,
                      fontStyle: "italic",
                      color: "#374151",
                    }}
                  >
                    {t.SubTitle}
                  </div>

                  {/* DIVIDER */}
                  <div
                    style={{
                      height: 1,
                      background: "#e5e7eb",
                      margin: "4px 0",
                    }}
                  />

                  {/* DESCRIPTION */}
                  <div
                    style={{
                        fontSize: 15,
                        lineHeight: 1.55,
                        color: "#4b5563",
                        whiteSpace: "pre-wrap",   // ← THIS IS THE FIX
                    }}
                    >
                    {t.Description}
                    </div>




                  {/* APPLY LINK */}
                  <div
                    style={{
                      marginTop: "auto",
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#2563eb",
                        textDecoration: "underline",
                      }}
                    >
                      View / Apply →
                    </span>
                  </div>
                </div>
              </a>
            ) : (
              <div
                style={{
                  background: "white",
                  borderRadius: 12,
                  padding: 20,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                }}
              >
                {/* MOVE BUTTONS */}
                <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
                  <button
                    onClick={() => moveJob(i, -1)}
                    style={{
                      background: "#e5e7eb",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    Move Up
                  </button>

                  <button
                    onClick={() => moveJob(i, 1)}
                    style={{
                      background: "#e5e7eb",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    Move Down
                  </button>
                </div>

                <input
                  value={t.Title}
                  onChange={(e) =>
                    updateField(t.id, "Title", e.target.value)
                  }
                  style={{ width: "100%", marginBottom: 6 }}
                />

                <input
                  value={t.SubTitle}
                  onChange={(e) =>
                    updateField(t.id, "SubTitle", e.target.value)
                  }
                  style={{ width: "100%", marginBottom: 6 }}
                />

                <textarea
                  value={t.Description}
                  onChange={(e) =>
                    updateField(t.id, "Description", e.target.value)
                  }
                  style={{ width: "100%", marginBottom: 6 }}
                />

                <input
                  value={t.Link}
                  onChange={(e) =>
                    updateField(t.id, "Link", e.target.value)
                  }
                  style={{ width: "100%", marginBottom: 10 }}
                />

                <button
                  onClick={() => deleteJob(t.id)}
                  style={{
                    background: "#dc2626",
                    color: "white",
                    border: "none",
                    padding: "8px 14px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ADMIN GEAR */}
      {!edit && (
        <button
          onClick={unlockAdmin}
          style={{
            position: "fixed",
            bottom: 18,
            right: 18,
            fontSize: 20,
            opacity: 0.35,
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
          title="Admin"
        >
          ⚙
        </button>
      )}
    </main>
  );
}
