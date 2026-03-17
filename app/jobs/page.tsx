"use client";

import { useEffect, useState } from "react";

type Tile = {
  id: number;
  Title: string;
  SubTitle: string;
  Description: string;
  ButtonLabel: string;
  Link: string;
  Position: number;
};

export default function JobsPage() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [original, setOriginal] = useState<Tile[]>([]);
  const [editMode, setEditMode] = useState(false);

  const PASSWORD = "ncst-admin";

  // LOAD FROM API
  useEffect(() => {
    fetch("/api/jobboard")
      .then(r => r.json())
      .then(data => {
        setTiles(data);
        setOriginal(data);
      });
  }, []);

  function unlock() {
    const p = prompt("Admin password:");
    if (p === PASSWORD) setEditMode(true);
  }

  async function addTile() {
    await fetch("/api/jobboard", {
      method: "POST",
      body: JSON.stringify({ Title: "New Job", Description: "" })
    });
    location.reload();
  }

  async function saveChanges() {
    await fetch("/api/jobboard", {
      method: "PATCH",
      body: JSON.stringify(tiles)
    });
    setEditMode(false);
    location.reload();
  }

  function cancelChanges() {
    setTiles(original);
    setEditMode(false);
  }

  async function deleteTile(id: number) {
    if (!confirm("Delete this job?")) return;

    await fetch(`/api/jobboard?id=${id}`, { method: "DELETE" });
    setTiles(tiles.filter(t => t.id !== id));
  }

  function onDragStart(e: any, i: number) {
    e.dataTransfer.setData("i", i);
  }

  function onDrop(e: any, i: number) {
    const from = Number(e.dataTransfer.getData("i"));
    const copy = [...tiles];
    const [moved] = copy.splice(from, 1);
    copy.splice(i, 0, moved);
    setTiles(copy);
  }

  return (
    <div style={{ background: "#f1f5f9", minHeight: "100vh", padding: 30 }}>
      <h1 style={{ textAlign: "center", marginBottom: 30 }}>
        Student Job Placement Resources
      </h1>

      {/* ADMIN TOOLBAR */}
      {editMode && (
        <div style={{ textAlign: "center", marginBottom: 25 }}>
          <button onClick={addTile}>Add New Job</button>{" "}
          <button onClick={saveChanges}>Save Changes</button>{" "}
          <button onClick={cancelChanges}>Cancel</button>
        </div>
      )}

      {/* JOB GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 25,
          maxWidth: 1200,
          margin: "auto"
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
              padding: 22,
              borderRadius: 14,
              boxShadow: "0 8px 20px rgba(0,0,0,.12)",
              display: "flex",
              flexDirection: "column",
              minHeight: 220,
              position: "relative"
            }}
          >
            {editMode ? (
              <>
                <input
                  value={t.Title}
                  onChange={e =>
                    setTiles(prev =>
                      prev.map(x =>
                        x.id === t.id
                          ? { ...x, Title: e.target.value }
                          : x
                      )
                    )
                  }
                  placeholder="Job Title"
                />

                <input
                  value={t.SubTitle || ""}
                  onChange={e =>
                    setTiles(prev =>
                      prev.map(x =>
                        x.id === t.id
                          ? { ...x, SubTitle: e.target.value }
                          : x
                      )
                    )
                  }
                  placeholder="Company / Location"
                />

                <textarea
                  value={t.Description || ""}
                  onChange={e =>
                    setTiles(prev =>
                      prev.map(x =>
                        x.id === t.id
                          ? { ...x, Description: e.target.value }
                          : x
                      )
                    )
                  }
                  placeholder="Description"
                />

                <input
                  value={t.ButtonLabel || ""}
                  onChange={e =>
                    setTiles(prev =>
                      prev.map(x =>
                        x.id === t.id
                          ? { ...x, ButtonLabel: e.target.value }
                          : x
                      )
                    )
                  }
                  placeholder="Button Label"
                />

                <input
                  value={t.Link || ""}
                  onChange={e =>
                    setTiles(prev =>
                      prev.map(x =>
                        x.id === t.id
                          ? { ...x, Link: e.target.value }
                          : x
                      )
                    )
                  }
                  placeholder="Link URL"
                />

                <button onClick={() => deleteTile(t.id)}>
                  Delete
                </button>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#1e3a8a",
                      marginBottom: 6
                    }}
                  >
                    {t.Title}
                  </div>

                  {t.SubTitle && (
                    <div style={{ color: "#555", marginBottom: 8 }}>
                      {t.SubTitle}
                    </div>
                  )}

                  <div style={{ color: "#333" }}>
                    {t.Description}
                  </div>
                </div>

                {t.Link && (
                  <a
                    href={t.Link}
                    target="_blank"
                    style={{
                      marginTop: "auto",
                      alignSelf: "flex-end",
                      background: "#1e3a8a",
                      color: "white",
                      padding: "8px 16px",
                      borderRadius: 6,
                      textDecoration: "none",
                      fontWeight: 600
                    }}
                  >
                    {t.ButtonLabel || "View"}
                  </a>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* SMALL EDIT BUTTON */}
      {!editMode && (
        <button
          onClick={unlock}
          style={{
            position: "fixed",
            bottom: 18,
            right: 18,
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "#0f172a",
            color: "white",
            border: "none",
            opacity: 0.35,
            fontSize: 18,
            cursor: "pointer"
          }}
        >
          ⚙
        </button>
      )}
    </div>
  );
}