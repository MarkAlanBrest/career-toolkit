"use client";

import React, { useEffect, useState } from "react";

export default function JobsPage() {
  const [tiles, setTiles] = useState([]);
  const [original, setOriginal] = useState([]);
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
      body: JSON.stringify({
        Title: "New Listing",
        Description: "",
        Link: "#"
      }),
    });

    location.reload();
  }

  async function saveChanges() {
    await fetch("/api/jobboard", {
      method: "PATCH",
      body: JSON.stringify(tiles),
    });

    setEditMode(false);
    location.reload();
  }

  function cancelChanges() {
    setTiles(original);
    setEditMode(false);
  }

  async function deleteTile(id) {
    if (!confirm("Delete this tile?")) return;

    await fetch(`/api/jobboard?id=${id}`, { method: "DELETE" });

    setTiles(tiles.filter(t => t.id !== id));
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
    <div style={{ padding: 20, background: "#f1f5f9" }}>
      <h1 style={{ textAlign: "center" }}>
        Student Job Placement Resources
      </h1>

      {editMode && (
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <button onClick={addTile}>Add New Tile</button>
          <button onClick={saveChanges}>Save Changes</button>
          <button onClick={cancelChanges}>Cancel</button>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(260px, 1fr))",
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
                        x.id === t.id
                          ? { ...x, Link: e.target.value }
                          : x
                      )
                    )
                  }
                />

                <button onClick={() => deleteTile(t.id)}>
                  Delete
                </button>
              </>
            ) : (
              <>
                <h3>{t.Title}</h3>
                <p>{t.Description}</p>

                <a href={t.Link} target="_blank">
                  Open
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
            opacity: 0.4,
          }}
        >
          ⚙
        </button>
      )}
    </div>
  );
}