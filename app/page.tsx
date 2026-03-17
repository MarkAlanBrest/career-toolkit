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

  useEffect(() => {
    fetch("/api/jobboard")
      .then((r) => r.json())
      .then(setJobs)
      .catch(() => {});
  }, []);

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
          padding: "30px",
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
      </div>

      {/* CONTENT */}
      <div
        style={{
          maxWidth: 1100,
          margin: "auto",
          padding: "40px 20px",
        }}
      >
        {/* GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(260px,1fr))",
            gap: 28,
          }}
        >
          {jobs.map((t) => (
            <a
              key={t.id}
              href={t.Link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: "none",
                color: "inherit",
              }}
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
                  transition: "all .25s ease",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.transform = "translateY(-6px)";
                  el.style.boxShadow =
                    "0 12px 30px rgba(0,0,0,.18), 0 0 0 2px #3b82f6, 0 0 18px rgba(59,130,246,.5)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.transform = "none";
                  el.style.boxShadow =
                    "0 8px 22px rgba(0,0,0,.12)";
                }}
              >
                {/* HEADER BAR */}
                <div
                  style={{
                    background:
                      "linear-gradient(135deg,#1e3a8a,#2563eb)",
                    color: "white",
                    padding: "14px 18px",
                    fontWeight: 700,
                    fontSize: 18,
                    letterSpacing: 0.3,
                  }}
                >
                  {t.Title}
                </div>

                {/* BODY */}
                <div
                  style={{
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    flexGrow: 1,
                  }}
                >
                  {/* SUBTITLE */}
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#2563eb",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    {t.SubTitle}
                  </div>

                  {/* DESCRIPTION */}
                  <div
                    style={{
                      fontSize: 15,
                      lineHeight: 1.5,
                      color: "#333",
                      flexGrow: 1,
                    }}
                  >
                    {t.Description}
                  </div>

                  {/* FOOTER */}
                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#555",
                    }}
                  >
                    Click to view details →
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}