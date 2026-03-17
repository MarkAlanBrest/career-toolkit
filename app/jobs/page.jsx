"use client";

import { useEffect, useState } from "react";

export default function JobsPage() {
  const [tiles, setTiles] = useState([]);
  const [original, setOriginal] = useState([]);
  const [editMode, setEditMode] = useState(false);

  const PASSWORD = "ncst-admin";

  useEffect(() => {
    loadTiles();
  }, []);

  async function loadTiles() {
    const data = await fetch("/api/jobboard").then(r => r.json());
    setTiles(data);
    setOriginal(data);
  }

  function unlock() {
    const p = prompt("Admin password:");
    if (p === PASSWORD) setEditMode(true);
  }

  async function addTile() {
    await fetch("/api/jobboard", {
      method: "POST",
      body: JSON.stringify({}),
    });
    loadTiles();
  }

  async function saveChanges() {
    await fetch("/api/jobboard", {
      method: "PATCH",
      body: JSON.stringify(tiles),
    });
    setEditMode(false);
    loadTiles();
  }

  function cancelChanges() {
    setTiles(original);
    setEditMode(false);
  }

  async function deleteTile(id) {
    if (!confirm("Delete this tile?")) return;

    await fetch(`/api/jobboard?id=${id}`, { method: "DELETE" });
    loadTiles();
  }

  function onDragStart(e, i) {
    e.dataTransfer.setData("i", i);
  }

  function onDrop(e, i) {
    const from = Number(e.dataTransfer.getData("i"));
    const copy = [...tiles];
    const [moved] = copy.splice(from, 1);
    copy.splice(i, 0, moved);
    setTiles(copy);
  }

  return (
    <main style={{ padding: 20, background: "#f1f5f9", minHeight: "100vh" }}>
      <h1 style={{ textAlign: "center", marginBottom: 20 }}>
        Student Job Placement Resources
      </h1>

      {editMode && (
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <button onClick={addTile}>➕ Add</button>{" "}
          <button onClick={saveChanges}>💾 Save</button>{" "}
          <button onClick={cancelChanges}>❌ Cancel</button>
        </div>
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
        {tiles.map((t, i) => (
          <div
            key={t.id}
            draggable={editMode}
            onDragStart={e => onDragStart(e, i)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => onDrop(e, i)}
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
            {editMode ? (
              <>
                <input
                  value={t.Title}
                  onChange={e =>
                    setTiles(prev =>
                      prev.map(x =>
                        x.id === t.id ? { ...x, Title: e.target.value } : x
                      )
                    )
                  }
                />

                <textarea
                  value={t.Description}
                  onChange={e =>
                    setTiles(prev =>
                      prev.map(x =>
                        x.id === t.id
                          ? { ...x, Description: e.target.value }
                          : x
                      )
                    )
                  }
                />

                <input
                  value={t.Link}
                  onChange={e =>
                    setTiles(prev =>
                      prev.map(x =>
                        x.id === t.id ? { ...x, Link: e.target.value } : x
                      )
                    )
                  }
                />

                <button onClick={() => deleteTile(t.id)}>🗑 Delete</button>
              </>
            ) : (
              <>
                <div>
                  <strong>{t.Title}</strong>
                  <div style={{ color: "#555" }}>{t.SubTitle}</div>
                  <p>{t.Description}</p>
                </div>

                <a
                  href={t.Link}
                  target="_blank"
                  style={{
                    background: "#1e3a8a",
                    color: "white",
                    textAlign: "center",
                    padding: 10,
                    borderRadius: 6,
                    textDecoration: "none",
                  }}
                >
                  {t.ButtonLabel || "Open"}
                </a>
              </>
            )}
          </div>
        ))}
      </div>

      {!editMode && (
        <button
          onClick={unlock}
          style={{
            position: "fixed",
            bottom: 15,
            right: 15,
            opacity: 0.35,
          }}
        >
          ⚙
        </button>
      )}
    </main>
  );
}