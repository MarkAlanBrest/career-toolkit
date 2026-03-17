"use client";

import { useEffect, useState } from "react";

type Job = {
  id: number;
  Title: string;
  Description: string;
  Link: string;
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/jobboard")
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setJobs(data);
      })
      .catch(() => setError("Failed to load job listings."));
  }, []);

  return (
    <div style={{ padding: 30, background: "#f1f5f9", minHeight: "100vh" }}>
      <h1 style={{ textAlign: "center" }}>
        Student Job Placement Resources
      </h1>

      {error && (
        <div style={{ textAlign: "center", color: "red" }}>
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 20,
          maxWidth: 1100,
          margin: "30px auto",
        }}
      >
        {jobs.map(job => (
          <div
            key={job.id}
            style={{
              background: "white",
              padding: 20,
              borderRadius: 12,
              boxShadow: "0 6px 18px rgba(0,0,0,.1)"
            }}
          >
            <h3>{job.Title}</h3>
            <p>{job.Description}</p>

            <a
              href={job.Link}
              target="_blank"
              style={{
                display: "inline-block",
                marginTop: 10,
                padding: "8px 14px",
                background: "#1e3a8a",
                color: "white",
                borderRadius: 8,
                textDecoration: "none"
              }}
            >
              Open
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}