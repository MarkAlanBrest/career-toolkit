"use client";

import { useEffect, useState } from "react";

export default function JobsPage() {
  const [tiles, setTiles] = useState([]);

  useEffect(() => {
    fetch("/api/jobboard")
      .then(r => r.json())
      .then(setTiles)
      .catch(() => alert("Failed to load job listings."));
  }, []);

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
          max-width:1100px;
          margin:auto;
          padding:40px 20px;
        }

        .grid{
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
          gap:25px;
        }

        .card{
          background:white;
          border-radius:14px;
          padding:24px;
          box-shadow:0 6px 18px rgba(0,0,0,.12);
          display:flex;
          flex-direction:column;
          justify-content:space-between;
          transition:.25s;
        }

        .card:hover{
          transform:translateY(-5px);
          background:#eff6ff;
        }

        .title{
          font-size:20px;
          color:#1e3a8a;
          font-weight:bold;
          margin-bottom:6px;
        }

        .subtitle{
          color:#666;
          margin-bottom:10px;
          font-size:14px;
        }

        .desc{
          font-size:15px;
          color:#444;
          margin-bottom:18px;
        }

        .btn{
          align-self:flex-start;
          background:#1e3a8a;
          color:white;
          padding:10px 18px;
          border-radius:6px;
          text-decoration:none;
          font-weight:600;
        }

        .btn:hover{
          background:#1e40af;
        }

        .footer{
          text-align:center;
          margin-top:40px;
          color:#333;
          font-size:14px;
        }
      `}</style>

      <div className="header">
        <h1>Student Job Placement Resources</h1>
        <p>Opportunities and job search tools</p>
      </div>

      <div className="container">

        <div className="grid">
          {tiles.map(t => (
            <div key={t.id} className="card">

              <div>
                <div className="title">{t.Title}</div>
                {t.SubTitle && (
                  <div className="subtitle">{t.SubTitle}</div>
                )}
                <div className="desc">{t.Description}</div>
              </div>

              <a
                href={t.Link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
              >
                {t.ButtonLabel || "Open"}
              </a>

            </div>
          ))}
        </div>

        <div className="footer">
          New Castle School of Trades | Career Services
        </div>

      </div>
    </>
  );
}