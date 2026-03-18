"use client";

import Link from "next/link";

export default function Page() {
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

        .school{
          font-size:16px;
          letter-spacing:1px;
          text-transform:uppercase;
          color:#cbd5f5;
          margin-bottom:6px;
        }

        .header h1{
          margin:0;
          font-size:32px;
        }

        .header p{
          margin-top:8px;
          font-size:18px;
        }

        .container{
          max-width:1100px;
          margin:auto;
          padding:40px 20px;
        }

        .grid{
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
          gap:25px;
        }

        .card{
          display:block;
          background:white;
          border-radius:14px;
          padding:30px;
          text-align:center;
          text-decoration:none;
          box-shadow:0 6px 18px rgba(0,0,0,.12);
          transition:all .25s ease;
          min-height:200px;
          color:inherit;
        }

        .icon{
          font-size:40px;
          margin-bottom:10px;
        }

        .card h2{
          margin:10px 0;
          color:#1e3a8a;
        }

        .card p{
          font-size:15px;
          color:#444;
        }

        .card:hover{
          transform:translateY(-6px);
          background:#eff6ff;
          box-shadow:
            0 10px 25px rgba(0,0,0,.18),
            0 0 0 2px #3b82f6,
            0 0 15px rgba(59,130,246,.5);
        }

        .footer{
          text-align:center;
          margin-top:40px;
          color:#333;
          font-size:14px;
        }
      `}</style>

      <div className="header">
        <div className="school">
          New Castle School of Trades
        </div>

        <h1>Student Career Toolkit</h1>

        <p>Professional tools to help you find and secure a job</p>
      </div>

      <div className="container">

        <div className="grid">

          {/* Jobs Board — FIXED to use Link */}
          <Link className="card" href="/jobs">
            <div className="icon">🔎</div>
            <h2>Find a Job</h2>
            <p>Search job boards, trade sites, and government job listings.</p>
          </Link>

          {/* Resume Builder */}
          <a
            className="card"
            href="https://resume-builder-one-gules-56.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="icon">📄</div>
            <h2>Resume Builder</h2>
            <p>Create a professional resume using our guided builder.</p>
          </a>

          {/* Cover Letter Creator */}
          <a
            className="card"
            href="https://cover-letter-ai-cyan.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="icon">✉️</div>
            <h2>Cover Letter Creator</h2>
            <p>Generate a customized cover letter for the job you want.</p>
          </a>

          {/* Practice Interview */}
          <a
            className="card"
            href="https://interview-ob8v.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="icon">🎤</div>
            <h2>Practice Interview</h2>
            <p>Practice answering interview questions and improve your confidence.</p>
          </a>

          {/* Follow-Up Letters */}
          <Link className="card" href="/followup">
            <div className="icon">📬</div>
            <h2>Follow-Up & Thank-You Letters</h2>
            <p>Create professional follow-up emails and thank-you letters.</p>
          </Link>

          {/* Job Tips */}
          <Link className="card" href="/jobtips">
            <div className="icon">💡</div>
            <h2>Job Search Tips</h2>
            <p>Learn strategies that help job seekers stand out and get hired.</p>
          </Link>

          {/* Certifications */}
          <a
            className="card"
            href="https://safety-training-platform-eta.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="icon">🏆</div>
            <h2>Earn Certifications</h2>
            <p>Complete short career certifications offered by the school.</p>
          </a>

          {/* Career Services */}
          <Link className="card" href="/careerservices">
            <div className="icon">👩‍💼</div>
            <h2>Contact Career Services</h2>
            <p>Need help? Connect with our career advisors.</p>
          </Link>

        </div>

        <div className="footer">
          New Castle School of Trades | Career Development Tools
        </div>

      </div>
    </>
  );
}