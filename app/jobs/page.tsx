"use client";

import { useEffect, useState } from "react";

type Tile = {
  id: number;
  Title: string;
  SubTitle: string;
  Description: string;
  ButtonLabel: string;
  Link: string;
};

export default function JobsPage() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [original, setOriginal] = useState<Tile[]>([]);
  const [editMode, setEditMode] = useState(false);

  const PASSWORD = "ncst-admin";

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

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#cbd5f5,#94a3b8)"
    }}>

      {/* HEADER BAR */}
      <div style={{
        background: "#0f172a",
        color: "white",
        padding: 30,
        textAlign: "center"
      }}>
        <div style={{
          fontSize: 14,
          letterSpacing: 1,
          color: "#cbd5f5",
          marginBottom: 6
        }}>
          New Castle School of Trades
        </div>

        <h1 style={{ margin: 0 }}>
          Student Job Placement Resources
        </h1>

        <p style={{ marginTop: 8 }}>
          Local employers and job opportunities for students
        </p>
      </div>

      {/* ADMIN TOOLBAR */}
      {editMode && (
        <div style={{
          textAlign: "center",
          padding: 20
        }}>
          <button onClick={addTile}>Add Job</button>{" "}
          <button onClick={saveChanges}>Save Changes</button>{" "}
          <button onClick={cancelChanges}>Cancel</button>
        </div>
      )}

      {/* JOB GRID */}
      <div style={{
        maxWidth: 1200,
        margin: "40px auto",
        padding: "0 20px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
        gap: 28
      }}>
        {tiles.map(t => (

          <div key={t.id} style={{
            background: "white",
            borderRadius: 18,
            padding: 26,
            boxShadow: "0 12px 28px rgba(0,0,0,.18)",
            minHeight: 360,           // TALL CARD
            display: "flex",
            flexDirection: "column"
          }}>

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
                  placeholder="Title"
                />

                <input
                  value={t.SubTitle || ""}
                  onChange={e =>
                    setTiles(prev =>
                      prev.map(x =>
                        x.id === t.id ? { ...x, SubTitle: e.target.value } : x
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
                  style={{ minHeight: 120 }}
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
                  placeholder="Button text"
                />

                <input
                  value={t.Link || ""}
                  onChange={e =>
                    setTiles(prev =>
                      prev.map(x =>
                        x.id === t.id ? { ...x, Link: e.target.value } : x
                      )
                    )
                  }
                  placeholder="Link"
                />

                <button onClick={() => deleteTile(t.id)}>
                  Delete Job
                </button>
              </>
            ) : (
              <>
                {/* TITLE */}
                <div style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#1e3a8a",
                  marginBottom: 6
                }}>
                  {t.Title}
                </div>

                {/* SUBTITLE */}
                <div style={{
                  color: "#555",
                  marginBottom: 14
                }}>
                  {t.SubTitle}
                </div>

                {/* DESCRIPTION */}
                <div style={{
                  color: "#333",
                  lineHeight: 1.6,
                  marginBottom: 20
                }}>
                  {t.Description}
                </div>

                {/* BUTTON */}
                {t.Link && (
                  <a
                    href={t.Link}
                    target="_blank"
                    style={{
                      marginTop: "auto",
                      alignSelf: "flex-end",
                      background: "#1e3a8a",
                      color: "white",
                      padding: "10px 18px",
                      borderRadius: 8,
                      textDecoration: "none",
                      fontWeight: 600
                    }}
                  >
                    {t.ButtonLabel || "View Job"}
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
            bottom: 20,
            right: 20,
            width: 46,
            height: 46,
            borderRadius: "50%",
            background: "#0f172a",
            color: "white",
            border: "none",
            opacity: 0.4,
            cursor: "pointer"
          }}
        >
          ⚙
        </button>
      )}

    </div>
  );
}