import Link from "next/link";

const scripts = [
  {
    name: "Canvas Tool Dashboard",
    description:
      "Collapsible bottom toolbar with compact UI, AI popups, and per-script Backup/Restore.",
    href: "https://raw.githubusercontent.com/MarkAlanBrest/scripts/main/canvas-tool-dashboard-compact-premium-ui-ai-popups-backup-restore-4.3.1.user.js",
  },
  {
    name: "AIgrader - Claude Edition",
    description: "Grades Canvas submissions using Claude AI directly in SpeedGrader.",
    href: "https://raw.githubusercontent.com/MarkAlanBrest/scripts/main/aigrader-claude-edition-5.2.user.js",
  },
  {
    name: "Canvas AI Module Builder",
    description:
      "Builds and inserts Canvas modules, pages, assignments, and quizzes directly through Canvas API.",
    href: "https://raw.githubusercontent.com/MarkAlanBrest/scripts/main/canvas-ai-module-builder-direct-api-insert-4.0.0-3-.user.js",
  },
  {
    name: "Canvas Content Builder",
    description: "AI-powered Canvas page and assignment HTML generator.",
    href: "https://raw.githubusercontent.com/MarkAlanBrest/scripts/main/canvas-content-builder-1.0.user.js",
  },
  {
    name: "Canvas Math Question Builder",
    description: "AI-powered math question builder for Canvas Classic Quizzes.",
    href: "https://raw.githubusercontent.com/MarkAlanBrest/scripts/main/canvas-math-question-builder-7.1.0.user.js",
  },
  {
    name: "Canvas QTI Test Generator",
    description: "AI-powered QTI quiz generator for Canvas LMS.",
    href: "https://raw.githubusercontent.com/MarkAlanBrest/scripts/main/canvas-qti-test-generator-1.1-2-.user.js",
  },
  {
    name: "Canvas Email System",
    description:
      "Pulls student data from Canvas and generates personalized emails or announcements.",
    href: "https://raw.githubusercontent.com/MarkAlanBrest/scripts/main/canvas-email-system-1.0.0-2-.user.js",
  },
  {
    name: "Canvas Email Storage Center",
    description: "Quick-send pre-written emails in Canvas Conversations.",
    href: "https://raw.githubusercontent.com/MarkAlanBrest/scripts/main/canvas-email-storage-center-4.0-2-.user.js",
  },
  {
    name: "Canvas Reports",
    description:
      "Creates at-risk reports, printable class reports, and student support guides.",
    href: "https://raw.githubusercontent.com/MarkAlanBrest/scripts/main/canvas-reports-6.0.2-1-.user.js",
  },
  {
    name: "Canvas Scheduler",
    description:
      "Drag Canvas assignments, discussions, and quizzes onto weekday due dates and publish the schedule back to Canvas.",
    href: "https://raw.githubusercontent.com/MarkAlanBrest/scripts/main/canvas-scheduler-1.0.0.user.js",
  },
  {
    name: "Canvas Teacher Evaluation Tool",
    description:
      "Data-driven teacher/course evaluation dashboard for Canvas LMS admins.",
    href: "https://raw.githubusercontent.com/MarkAlanBrest/scripts/main/canvas-teacher-evaluation-tool-1.1.0.user.js",
  },
];

export const metadata = {
  title: "Canvas Script Install Links",
};

export default function ScriptsPage() {
  return (
    <main className="scripts-page">
      <section className="hero">
        <div className="hero-inner">
          <Link className="back-link" href="/">
            Back to Dashboard
          </Link>
          <p className="eyebrow">Canvas Tools</p>
          <h1>Canvas Script Install Links</h1>
          <p className="intro">
            Install the <strong>Tampermonkey</strong> browser extension, then
            click any script link below. Tampermonkey should open an install
            screen.
          </p>
        </div>
      </section>

      <section className="content" aria-labelledby="install-links-heading">
        <div className="section-heading">
          <h2 id="install-links-heading">Install Links</h2>
          <p>{scripts.length} Canvas tools ready to install.</p>
        </div>

        <div className="script-list">
          {scripts.map((script, index) => (
            <article className="script-card" key={script.href}>
              <div className="script-number">{index + 1}</div>
              <div className="script-copy">
                <h3>{script.name}</h3>
                <p>{script.description}</p>
              </div>
              <a
                className="install-link"
                href={script.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                Install
              </a>
            </article>
          ))}
        </div>
      </section>

      <style>{`
        .scripts-page{
          min-height:100vh;
          background:#f4f7fb;
          color:#111827;
        }

        .hero{
          background:#0f172a;
          color:white;
          padding:28px 20px 42px;
        }

        .hero-inner{
          max-width:1040px;
          margin:0 auto;
        }

        .back-link{
          display:inline-flex;
          align-items:center;
          color:#bfdbfe;
          font-size:14px;
          font-weight:700;
          text-decoration:none;
          margin-bottom:24px;
        }

        .back-link:hover{
          color:white;
          text-decoration:underline;
        }

        .eyebrow{
          margin:0 0 8px;
          color:#93c5fd;
          font-size:13px;
          font-weight:800;
          letter-spacing:.08em;
          text-transform:uppercase;
        }

        .hero h1{
          margin:0;
          font-size:42px;
          line-height:1.08;
        }

        .intro{
          max-width:780px;
          margin:16px 0 0;
          color:#e5eefc;
          font-size:18px;
          line-height:1.65;
        }

        .content{
          max-width:1040px;
          margin:0 auto;
          padding:34px 20px 56px;
        }

        .section-heading{
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap:20px;
          margin-bottom:18px;
        }

        .section-heading h2{
          margin:0;
          font-size:26px;
          color:#0f172a;
        }

        .section-heading p{
          margin:0;
          color:#526174;
          font-size:14px;
          font-weight:700;
        }

        .script-list{
          display:grid;
          gap:14px;
        }

        .script-card{
          display:grid;
          grid-template-columns:48px minmax(0,1fr) auto;
          gap:18px;
          align-items:center;
          background:white;
          border:1px solid #dbe3ee;
          border-radius:8px;
          padding:18px;
          box-shadow:0 4px 14px rgba(15,23,42,.06);
        }

        .script-number{
          width:42px;
          height:42px;
          display:grid;
          place-items:center;
          border-radius:8px;
          background:#e0f2fe;
          color:#075985;
          font-size:16px;
          font-weight:900;
        }

        .script-copy h3{
          margin:0 0 6px;
          color:#0f172a;
          font-size:18px;
          line-height:1.25;
        }

        .script-copy p{
          margin:0;
          color:#4b5563;
          font-size:15px;
          line-height:1.55;
        }

        .install-link{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-width:104px;
          min-height:42px;
          padding:10px 18px;
          border-radius:6px;
          background:#1d4ed8;
          color:white;
          font-size:14px;
          font-weight:800;
          text-decoration:none;
          transition:background .15s ease, transform .15s ease;
        }

        .install-link:hover{
          background:#1e40af;
          transform:translateY(-1px);
        }

        @media(max-width:700px){
          .hero{
            padding:22px 16px 34px;
          }

          .hero h1{
            font-size:32px;
          }

          .intro{
            font-size:16px;
          }

          .content{
            padding:26px 16px 42px;
          }

          .section-heading{
            display:block;
          }

          .section-heading p{
            margin-top:6px;
          }

          .script-card{
            grid-template-columns:42px minmax(0,1fr);
            align-items:start;
            gap:14px;
          }

          .install-link{
            grid-column:1 / -1;
            width:100%;
          }
        }
      `}</style>
    </main>
  );
}
