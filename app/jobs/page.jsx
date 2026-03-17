"use client";

import { useEffect, useState } from "react";

export default function JobsPage() {
  const [tiles, setTiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/jobboard");

        if (!res.ok) throw new Error("API error");

        const data = await res.json();

        if (!Array.isArray(data)) throw new Error("Bad data");

        setTiles(data);

      } catch (e) {
        console.error(e);
        setError("Failed to load job listings.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <main style={{ padding: 20, background: "#f1f5f9", minHeight: "100vh" }}>
      <h1 style={{ textAlign: "center" }}>
        Student Job Placement Resources
      </h1>

      {loading && (
        <p style={{ textAlign: "center" }}>Loading jobs...</p>
      )}

      {error && (
        <p style={{ textAlign: "center", color: "red" }}>{error}</p>
      )}

      {!loading && !error && tiles.length === 0 && (
        <p style={{ textAlign: "center" }}>No jobs available.</p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 20,
          maxWidth: 1200,
          margin: "auto",
        }}
      >
        {tiles.map((t) => (
          <div
            key={t.id}
            style={{
              background: "white",
              padding: 18,
              borderRadius: 10,
              boxShadow: "0 6px 16px rgba(0,0,0,.08)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h3>{t.Title}</h3>
              {t.SubTitle && (
                <div style={{ color: "#555" }}>{t.SubTitle}</div>
              )}
              <p>{t.Description}</p>
            </div>

            <a
              href={t.Link}
              target="_blank"
              rel="noreferrer"
              style={{
                background: "#1e3a8a",
                color: "white",
                textAlign: "center",
                padding: 10,
                borderRadius: 6,
                textDecoration: "none",
                marginTop: 10,
              }}
            >
              {t.ButtonLabel || "Open"}
            </a>
          </div>
        ))}
      </div>
    </main>
  );
}