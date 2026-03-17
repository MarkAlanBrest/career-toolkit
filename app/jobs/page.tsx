"use client";

import { useEffect, useState } from "react";

export default function JobsPage() {
  const [tiles, setTiles] = useState<any[]>([]);
  const [original, setOriginal] = useState<any[]>([]);
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
        Title: "New Job Listing",
        SubTitle: "",
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

  async function deleteTile(id: number) {
    if (!confirm("Delete this listing?")) return;

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
    <>
      <style>{`
        body{
          margin:0;
          font-family: Arial, Helvetica, sans-serif;
          background: linear-gradient(135deg,#cbd5f5,#94a3b8);
        }

        .header{
          background:#0f172a;
          color:white;
          padding:30px;
          text-align:center;
        }

        .container{
          max-width:1200px;
          margin:auto;
          padding:40px 20px;
        }

        .grid{
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
          gap:25px;
        }

        .card{
          display:block;
          background:white;
          border-radius:14px;
          padding:24px;
          text-decoration:none;
          box-shadow:0 6px 18px rgba(0,0,0,.12);
          transition:all .25s ease;
          min-height:260px;
          color:inherit;
          position:relative;
          display:flex;
          flex-direction:column;
          justify-content:space-between;
        }

        .card:hover{
          transform:translateY(-6px);
          background:#eff6ff;
          box-shadow:
            0 10px 25px rgba(0,0,0,.18),
            0 0 0 2px #3b82f6,
            0 0 15px rgba(59,130,246,.5);
        }

        .company{
          font-size:20px;
          font-weight:bold;
          color:#1e3a8a;
        }

        .subtitle{
          font-size:14px;
          color:#555;
          margin-top:4px;
        }

        .desc{
          font-size:15px;
          margin-top:16px;
          line-height:1.4;
          color:#333;
        }

        .editBtn{
          position:fixed;
          bottom:15px;
          right:15px;
          opacity:.35;
        }

        .toolbar{
          text-align:center;
          margin-bottom:20px;
        }
      `}</style>

      <div className="header">
        <h1>Student Job Placement Resources</h1>
        <p>Local employers, job boards, and career opportunities</p>
      </div>

      <div className="container">

        {editMode && (
          <div className="toolbar">
            <button onClick={addTile}>Add New Job</button>{" "}
            <button onClick={saveChanges}>Save Changes</button>{" "}
            <button onClick={cancelChanges}>Cancel</button>
          </div>
        )}

        <div className="grid">

          {tiles.map((t, i) => (

            editMode ? (

              <div
                key={t.id}
                draggable
                onDragStart={e => onDragStart(e, i)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => onDrop(e, i)}
                className="card"
              >
                <input
                  value={t.Title}
                  onChange={e =>
                    setTiles(prev =>
                      prev.map(x =>
                        x.id === t.id ? { ...x, Title: e.target.value } : x
                      )
                    )
                  }
                  placeholder="Company Name"
                />

                <input
                  value={t.SubTitle}
                  onChange={e =>
                    setTiles(prev =>
                      prev.map(x =>
                        x.id === t.id ? { ...x, SubTitle: e.target.value } : x
                      )
                    )
                  }
                  placeholder="Sub Title"
                />

                <textarea
                  value={t.Description}
                  onChange={e =>
                    setTiles(prev =>
                      prev.map(x =>
                        x.id === t.id ? { ...x, Description: e.target.value } : x
                      )
                    )
                  }
                  placeholder="Description"
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
                  placeholder="Link"
                />

                <button onClick={() => deleteTile(t.id)}>
                  Delete
                </button>
              </div>

            ) : (

              <a
                key={t.id}
                href={t.Link}
                target="_blank"
                className="card"
              >
                <div>
                  <div className="company">{t.Title}</div>
                  <div className="subtitle">{t.SubTitle}</div>
                  <div className="desc">{t.Description}</div>
                </div>
              </a>

            )
          ))}

        </div>

      </div>

      {!editMode && (
        <button className="editBtn" onClick={unlock}>
          ⚙
        </button>
      )}
    </>
  );
}