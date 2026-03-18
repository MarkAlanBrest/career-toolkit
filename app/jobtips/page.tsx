"use client";

import Link from "next/link";

export default function JobSearchTipsPage() {
  return (
    <>
      <div className="header">
        <h1>New Castle School of Trades</h1>
        <p>Job Search and Interview Tips</p>
      </div>

      <div className="back">
        <Link href="/">← Back to Dashboard</Link>
      </div>

      <div className="container">
        <div className="card">
          <p>
            <strong>
              Finding a job takes preparation, persistence, and professionalism.
            </strong>
            <br />
            The tips below will help you search for employment, prepare for
            interviews, and present yourself as a strong candidate to employers.
          </p>
        </div>

        {/* Preparing for Job Search */}
        <div className="section">
          <h2>Preparing for Your Job Search</h2>

          <div className="card">
            <ul>
              <li>Create a professional resume highlighting your training and skills.</li>
              <li>Prepare a short explanation of your experience and career goals.</li>
              <li>Research companies you are interested in working for.</li>
              <li>Make a list of employers you plan to apply to.</li>
              <li>Let friends, family, and instructors know you are looking for work.</li>
            </ul>

            <div className="tip">
              Tip: Many jobs are filled through networking. The more people who
              know you are looking for work, the better your chances of hearing
              about opportunities.
            </div>
          </div>
        </div>

        {/* Applying for Jobs */}
        <div className="section">
          <h2>Applying for Jobs</h2>

          <div className="card">
            <ul>
              <li>Read the job description carefully before applying.</li>
              <li>Follow all instructions provided in the job posting.</li>
              <li>Submit a resume and cover letter when requested.</li>
              <li>Check spelling and grammar before submitting your application.</li>
              <li>Keep track of the jobs you apply for so you can follow up.</li>
            </ul>

            <div className="tip">
              Tip: Employers notice attention to detail. Applications with errors
              may be rejected immediately.
            </div>
          </div>
        </div>

        {/* Preparing for Interviews */}
        <div className="section">
          <h2>Preparing for an Interview</h2>

          <div className="card">
            <ul>
              <li>Research the company and understand what they do.</li>
              <li>Review the job description and the skills required.</li>
              <li>Practice answering common interview questions.</li>
              <li>Prepare examples of your experience, training, or projects.</li>
              <li>Plan your route and arrive 10–15 minutes early.</li>
            </ul>

            <div className="tip">
              Tip: Practice answering interview questions out loud. Confidence
              improves with preparation.
            </div>
          </div>
        </div>

        {/* Common Interview Questions */}
        <div className="section">
          <h2>Common Interview Questions</h2>

          <div className="card">
            <ul>
              <li>Tell me about yourself.</li>
              <li>Why do you want to work for this company?</li>
              <li>What experience do you have in this trade?</li>
              <li>What are your strengths and weaknesses?</li>
              <li>Describe a time you solved a problem.</li>
            </ul>

            <div className="tip">
              Tip: Use examples from school projects, training, or previous jobs
              to demonstrate your skills.
            </div>
          </div>
        </div>

        {/* How to Dress */}
        <div className="section">
          <h2>How to Dress for an Interview</h2>

          <div className="card">
            <p>
              First impressions matter. Employers expect applicants to appear
              professional and prepared.
            </p>

            <ul>
              <li>Wear clean and neat clothing.</li>
              <li>Collared shirt or polo shirt is recommended.</li>
              <li>Khakis or clean work pants are appropriate.</li>
              <li>Clean boots or shoes.</li>
            </ul>

            <p>
              <strong>Avoid:</strong>
            </p>

            <ul>
              <li>Hats or sunglasses</li>
              <li>Wrinkled or dirty clothing</li>
              <li>Strong cologne or perfume</li>
              <li>Graphic or offensive clothing</li>
            </ul>

            <div className="tip">
              Tip: It is always better to be slightly overdressed than
              underdressed.
            </div>
          </div>
        </div>

        {/* What to Bring */}
        <div className="section">
          <h2>What to Bring to an Interview</h2>

          <div className="card">
            <ul>
              <li>Several copies of your resume</li>
              <li>A notebook and pen</li>
              <li>List of references</li>
              <li>Certifications or training records</li>
              <li>Portfolio or photos of your work (if applicable)</li>
            </ul>

            <div className="tip">
              Tip: Being organized and prepared demonstrates professionalism.
            </div>
          </div>
        </div>

        {/* During the Interview */}
        <div className="section">
          <h2>During the Interview</h2>

          <div className="card">
            <ul>
              <li>Offer a firm handshake and maintain eye contact.</li>
              <li>Listen carefully to questions before answering.</li>
              <li>Speak clearly and confidently.</li>
              <li>Be honest about your experience.</li>
              <li>Show enthusiasm and willingness to learn.</li>
            </ul>

            <div className="tip">
              Tip: Employers often hire people who demonstrate reliability, work
              ethic, and a positive attitude.
            </div>
          </div>
        </div>

        {/* After Interview */}
        <div className="section">
          <h2>After the Interview</h2>

          <div className="card">
            <ul>
              <li>Send a thank-you email or letter within 24 hours.</li>
              <li>Follow up if you do not hear back within a week.</li>
              <li>Reflect on what went well and what you could improve.</li>
            </ul>

            <div className="tip">
              Tip: Following up shows professionalism and continued interest in
              the position.
            </div>
          </div>
        </div>

        {/* Common Mistakes */}
        <div className="section">
          <h2>Mistakes That Cost People Jobs</h2>

          <div className="card">
            <ul>
              <li>Arriving late to an interview</li>
              <li>Being unprepared or unable to answer questions</li>
              <li>Using inappropriate language</li>
              <li>Speaking negatively about previous employers</li>
              <li>Failing to follow up after the interview</li>
            </ul>

            <div className="tip">
              Tip: Professional behavior during every step of the process greatly
              increases your chances of being hired.
            </div>
          </div>
        </div>
      </div>

      <div className="footer">
        New Castle School of Trades | Career Services
      </div>

      <style>{`
        body{
          margin:0;
          font-family:Arial, Helvetica, sans-serif;
          background:#f1f5f9;
        }

        .header{
          background:#0f172a;
          color:white;
          padding:25px;
          text-align:center;
        }

        .container{
          max-width:1100px;
          margin:auto;
          padding:30px 20px;
        }

        .back{
          max-width:1100px;
          margin:20px auto;
        }

        .back a{
          text-decoration:none;
          font-weight:bold;
          color:#1e3a8a;
        }

        .section{
          margin-bottom:40px;
        }

        .section h2{
          border-bottom:3px solid #1e3a8a;
          padding-bottom:8px;
        }

        .card{
          background:white;
          padding:20px;
          margin-top:15px;
          border-radius:8px;
          box-shadow:0 4px 10px rgba(0,0,0,.08);
        }

        .tip{
          margin-top:10px;
          font-size:14px;
          color:#555;
        }

        ul{
          margin-top:10px;
        }

        .footer{
          text-align:center;
          padding:25px;
          margin-top:40px;
          background:#0f172a;
          color:white;
        }

        @media (max-width:768px){
          .container{
            padding:15px;
          }

          .header h1{
            font-size:24px;
          }

          .section h2{
            font-size:20px;
          }
        }
      `}</style>
    </>
  );
}
