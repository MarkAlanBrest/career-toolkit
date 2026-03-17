"use client";

import { useEffect, useState } from "react";

type Tile = {
  id: number;
  Title: string;
  SubTitle: string;
  Description: string;
  Link: string;
};

export default function JobsPage() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [original, setOriginal] = useState<Tile[]>([]);
  const [editMode, setEditMode] = useState(false);

  const PASSWORD = "ncst-admin";

  // LOAD DATA
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

  // ADD TILE
  async function addTile() {
    await fetch("/api/jobboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Title: "New Job Listing",
        SubTitle: "",
        Description: "",
        Link: "#"
      }),
    });

    location.reload();
  }

  // SAVE
  async function saveChanges() {
    await fetch("/api/jobboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tiles),
    });

    setEditMode(false);
    location.reload();
  }

  // CANCEL
  function cancelChanges() {
    setTiles(original);
    setEditMode(false);
  }

  // DELETE
  async function deleteTile(id: number) {
    if (!confirm("Delete this listing?")) return;

    await fetch(`/api/jobboard?id=${id}`, {
      method: "DELETE"
    });

    setTiles(tiles.filter(t => t.id !== id));
  }

  return (
    <div style={{ background: "linear-gradient(135deg,#cbd5f5,#94a3b8)", minHeight: "100vh" }}>

      {/* HEADER */}
      <div style={{
        background: "#0f172a",
        color: "white",
        padding: 30,
        textAlign: "center"
      }}>
        <div style={{ fontSize: 16, letterSpacing: 1, textTransform: "uppercase", color: "#cbd5f5" }}>
          New Castle School of Trades
        </div>

        <h1 style={{ margin: 0 }}>Student Job Placement Resources</h1>
        <p>Opportunities for students and graduates</p>
      </div>

      {/* TOOLBAR */}
      {editMode && (
        <div style={{ textAlign: "center", padding: 20 }}>
          <button onClick={addTile}>Add New Job</button>{" "}
          <button onClick={saveChanges}>Save Changes</button>{" "}
          <button onClick={cancelChanges}>Cancel</button>
        </div>
      )}

      {/* GRID */}
      <div style={{
        maxWidth: 1100,
        margin: "auto",
        padding: 30,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
        gap: 25
      }}>

        {tiles.map(t => (

          <div key={t.id}
            style={{
              background: "white",
              borderRadius: 14,
              padding: 26,
              minHeight: 260,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 6px 18px rgba(0,0,0,.12)",
              transition: "all .25s ease"
            }}

            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-6px)";
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                "0 10px 25px rgba(0,0,0,.18), 0 0 0 2px #3b82f6, 0 0 15px rgba(59,130,246,.5)";
            }}

            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.transform = "none";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 18px rgba(0,0,0,.12)";
            }}
          >

            {editMode ? (
              <>
                <input
                  value={t.Title}
                  placeholder="Company Name"
                  onChange={e =>
                    setTiles(prev =>
                      prev.map(x =>
                        x.id === t.id ? { ...x, Title: e.target.value } : x
                      )
                    )
                  }
                />

                <input
                  value={t.SubTitle || ""}
                  placeholder="Location / Position"
                  onChange={e =>
                    setTiles(prev =>
                      prev.map(x =>
                        x.id === t.id ? { ...x, SubTitle: e.target.value } : x
                      )
                    )
                  }
                />

                <textarea
                  value={t.Description || ""}
                  placeholder="Description"
                  onChange={e =>
                    setTiles(prev =>
                      prev.map(x =>
                        x.id === t.id ? { ...x, Description: e.target.value } : x
                      )
                    )
                  }
                />

                <input
                  value={t.Link || ""}
                  placeholder="Apply Link"
                  onChange={e =>
                    setTiles(prev =>
                      prev.map(x =>
                        x.id === t.id ? { ...x, Link: e.target.value } : x
                      )
                    )
                  }
                />

                <button onClick={() => deleteTile(t.id)}>
                  Delete
                </button>
              </>
            ) : (
              <a
                href={t.Link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div>
                  <h2 style={{ color: "#1e3a8a", marginBottom: 8 }}>
                    {t.Title}
                  </h2>

                  <div style={{ fontSize: 14, color: "#555", marginBottom: 12 }}>
                    {t.SubTitle}
                  </div>

                  <p style={{ fontSize: 15, color: "#333" }}>
                    {t.Description}
                  </p>
                </div>
              </a>
            )}

          </div>
        ))}
      </div>

      {/* ADMIN BUTTON */}
      {!editMode && (
        <button
          onClick={unlock}
          style={{
            position: "fixed",
            bottom: 15,
            right: 15,
            opacity: 0.3
          }}
        >
          ⚙
        </button>
      )}
    </div>
  );
}