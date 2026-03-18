"use client";

import { useState } from "react";
import Link from "next/link";

export default function FollowUpLettersPage() {
  const [name, setName] = useState("");
  const [manager, setManager] = useState("");
  const [company, setCompany] = useState("");
  const [job, setJob] = useState("");
  const [letterOutput, setLetterOutput] = useState("");

  function clean(text: string) {
    return text.trim().replace(/\s+/g, " ");
  }

  function getData() {
    const cleanedName = clean(name);
    const cleanedManager = clean(manager);
    const cleanedCompany = clean(company);
    const cleanedJob = clean(job);

    if (!cleanedName || !cleanedManager || !cleanedCompany || !cleanedJob) {
      alert("Please complete all fields.");
      return null;
    }

    return {
      name: cleanedName,
      manager: cleanedManager,
      company: cleanedCompany,
      job: cleanedJob,
    };
  }

  function showLetter(text: string) {
    setLetterOutput(text);
  }

  function thankYou() {
    const d = getData();
    if (!d) return;

    showLetter(
      `Dear ${d.manager},

Thank you for taking the time to speak with me about the ${d.job} position at ${d.company}. I appreciated the opportunity to learn more about the role and the work your organization performs.

Our conversation reinforced my interest in the position. During my training at New Castle School of Trades, I developed strong technical skills, hands-on experience, and an understanding of professional work standards that I believe would allow me to contribute positively to your team.

I am eager to begin my career in this field and apply the training, work ethic, and problem-solving skills I developed during my education.

Thank you again for your time and consideration. I look forward to hearing from you.

Sincerely,

${d.name}`
    );
  }

  function followUp() {
    const d = getData();
    if (!d) return;

    showLetter(
      `Dear ${d.manager},

I recently submitted an application for the ${d.job} position at ${d.company} and wanted to follow up regarding my application.

I remain very interested in the opportunity. Through my training at New Castle School of Trades, I developed practical skills, hands-on experience, and a strong understanding of industry standards that I believe would allow me to contribute effectively to your organization.

I would welcome the opportunity to discuss how my training, work ethic, and commitment to quality work could support your team.

Thank you for your time and consideration. I look forward to the possibility of speaking with you.

Sincerely,

${d.name}`
    );
  }

  function stillInterested() {
    const d = getData();
    if (!d) return;

    showLetter(
      `Dear ${d.manager},

I wanted to follow up regarding the ${d.job} position at ${d.company} and express my continued interest in the opportunity.

Since applying, I remain enthusiastic about the possibility of joining your organization. My training at New Castle School of Trades provided hands-on experience and practical technical skills that prepared me to enter the workforce and contribute to a professional team.

I would welcome the opportunity to apply my training and work ethic within your organization and continue developing my skills in the field.

Thank you again for your time and consideration.

Sincerely,

${d.name}`
    );
  }

  async function copyLetter() {
    if (!letterOutput) {
      alert("Generate a letter first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(letterOutput);
      alert("Letter copied to clipboard.");
    } catch {
      alert("Unable to copy letter. Please copy it manually.");
    }
  }

  return (
    <>
      <div className="header">
        <h1>New Castle School of Trades</h1>
        <p>Professional Follow-Up &amp; Thank-You Letters</p>
      </div>

      <div className="container">
        <div className="back">
          <Link href="/">← Back to Dashboard</Link>
        </div>

        <div className="layout">
          <div className="panel">
            <h3>Your Information</h3>

            <label>Your Name</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <label>Hiring Manager Name</label>
            <input
              id="manager"
              value={manager}
              onChange={(e) => setManager(e.target.value)}
            />

            <label>Company Name</label>
            <input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />

            <label>Position You Applied For</label>
            <input
              id="job"
              value={job}
              onChange={(e) => setJob(e.target.value)}
            />

            <h3>Select Letter Type</h3>

            <div className="letter-buttons">
              <button onClick={thankYou}>Thank-You After Interview</button>
              <button onClick={followUp}>Follow-Up After Applying</button>
              <button onClick={stillInterested}>Still Interested Letter</button>
            </div>
          </div>

          <div>
            <div className="letter-preview">
              {letterOutput ||
                "Your letter will appear here after selecting a letter style."}
            </div>

            <div className="copy-box">
              <button onClick={copyLetter}>Copy Letter</button>
            </div>
          </div>
        </div>

        <div className="instructions">
          <strong>How to Use This Tool</strong>

          <ol>
            <li>
              Enter your information including the hiring manager, company name,
              and the position you applied for.
            </li>
            <li>
              Select one of the letter options to generate a professional
              follow-up message.
            </li>
            <li>
              Carefully review the letter to ensure all information is correct.
            </li>
            <li>
              Click the <strong>Copy Letter</strong> button.
            </li>
            <li>
              Paste the letter into a Word document or email message before
              sending it to the employer.
            </li>
            <li>
              Always proofread your letter before sending to ensure it
              accurately reflects your situation.
            </li>
          </ol>

          <p>
            Sending a professional follow-up letter demonstrates initiative,
            professionalism, and continued interest in the position.
          </p>
        </div>
      </div>

      <div className="footer">
        New Castle School of Trades | Career Services
      </div>

      <style>{`
        body{
          margin:0;
          font-family:Arial, Helvetica, sans-serif;
          background:#eef2f7;
          color:#222;
        }

        .header{
          background:#0f172a;
          color:white;
          padding:25px;
          text-align:center;
        }

        .header h1{
          margin:0;
          font-size:28px;
        }

        .header p{
          margin-top:6px;
          font-size:16px;
        }

        .container{
          max-width:1100px;
          margin:auto;
          padding:30px 20px;
        }

        .back{
          margin-bottom:20px;
        }

        .back a{
          text-decoration:none;
          color:#1e3a8a;
          font-weight:bold;
        }

        .layout{
          display:grid;
          grid-template-columns:360px 1fr;
          gap:30px;
        }

        .panel{
          background:white;
          padding:25px;
          border-radius:8px;
          box-shadow:0 4px 12px rgba(0,0,0,.08);
        }

        .panel h3{
          margin-top:0;
          border-bottom:1px solid #ddd;
          padding-bottom:8px;
        }

        label{
          font-weight:bold;
          font-size:14px;
        }

        input{
          width:100%;
          padding:9px;
          margin-top:6px;
          margin-bottom:14px;
          border:1px solid #ccc;
          border-radius:4px;
          font-size:14px;
        }

        .letter-buttons button{
          display:block;
          width:100%;
          margin-bottom:10px;
          padding:12px;
          background:#1e3a8a;
          color:white;
          border:none;
          border-radius:6px;
          font-weight:bold;
          cursor:pointer;
          font-size:14px;
        }

        .letter-buttons button:hover{
          background:#1d4ed8;
        }

        .letter-preview{
          background:white;
          padding:60px;
          border-radius:6px;
          box-shadow:0 4px 12px rgba(0,0,0,.08);
          min-height:500px;
          font-family:"Times New Roman", Times, serif;
          font-size:12pt;
          line-height:1.6;
          white-space:pre-wrap;
        }

        .copy-box{
          margin-top:15px;
          text-align:center;
        }

        .copy-box button{
          padding:12px 18px;
          background:#1e3a8a;
          color:white;
          border:none;
          border-radius:6px;
          font-weight:bold;
          cursor:pointer;
        }

        .copy-box button:hover{
          background:#1d4ed8;
        }

        .instructions{
          margin-top:30px;
          background:white;
          padding:20px;
          border-radius:8px;
          box-shadow:0 4px 12px rgba(0,0,0,.08);
          font-size:14px;
          line-height:1.7;
        }

        .footer{
          margin-top:40px;
          text-align:center;
          padding:20px;
          background:#0f172a;
          color:white;
        }

        .hiddenCopy{
          position:absolute;
          left:-9999px;
          top:-9999px;
        }

        @media(max-width:900px){
          .layout{
            grid-template-columns:1fr;
          }

          .letter-preview{
            padding:35px;
          }
        }
      `}</style>
    </>
  );
}
