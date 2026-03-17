"use client";

import { useEffect, useState } from "react";

type Job = {
  id: number;
  Title: string;
  SubTitle: string;
  Description: string;
  Link: string;
};

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
        id: Date.now(),
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
          <div style={{ marginTop: 18 }}>
            <button onClick={save}>Save Changes</button>{" "}
            <button onClick={cancel}>Cancel</button>{" "}
            <button onClick={addJob}>Add Job</button>
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
          gridTemplateColumns:
            "repeat(auto-fit,minmax(260px,1fr))",
          gap: 28,
        }}
      >
        {jobs.map((t) => (
          <div key={t.id}>
            {!edit ? (
              /* NORMAL TILE */
              <a
                href={t.Link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    background: "white",
                    borderRadius: 16,
                    overflow: "hidden",
                    minHeight: 320,
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 8px 22px rgba(0,0,0,.12)",
                    transition: "all .25s",
                  }}
                >
                  <div
                    style={{
                      background:
                        "linear-gradient(135deg,#1e3a8a,#2563eb)",
                      color: "white",
                      padding: 16,
                      fontWeight: 700,
                      fontSize: 18,
                    }}
                  >
                    {t.Title}
                  </div>

                  <div style={{ padding: 20, flexGrow: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#2563eb",
                        marginBottom: 8,
                      }}
                    >
                      {t.SubTitle}
                    </div>

                    <div
                      style={{
                        fontSize: 15,
                        lineHeight: 1.5,
                        color: "#333",
                      }}
                    >
                      {t.Description}
                    </div>
                  </div>
                </div>
              </a>
            ) : (
              /* EDIT TILE */
              <div
                style={{
                  background: "white",
                  borderRadius: 16,
                  padding: 18,
                  boxShadow: "0 8px 22px rgba(0,0,0,.12)",
                }}
              >
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

                <button onClick={() => deleteJob(t.id)}>
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* EDIT MODE TOGGLE */}
      <button
        onClick={() => setEdit(!edit)}
        style={{
          position: "fixed",
          bottom: 25,
          right: 25,
          padding: "14px 20px",
          background: "#1e3a8a",
          color: "white",
          borderRadius: 30,
          border: "none",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {edit ? "Exit Edit" : "Admin"}
      </button>
    </main>
  );
}