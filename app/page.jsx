export default function Page() {
  return (
    <main>

      <div className="header">
        <div className="school">
          New Castle School of Trades
        </div>

        <h1>Student Career Toolkit</h1>
        <p>Professional tools to help you find and secure a job</p>
      </div>

      <div className="container">

        <div className="grid">

          <a className="card" href="/jobs">
            <div className="icon">🔎</div>
            <h2>Find a Job</h2>
            <p>Search job boards, trade sites, and government job listings.</p>
          </a>

          <a className="card" href="https://resume-builder-one-gules-56.vercel.app/" target="_blank">
            <div className="icon">📄</div>
            <h2>Resume Builder</h2>
            <p>Create a professional resume using our guided builder.</p>
          </a>

        </div>

        <div className="footer">
          New Castle School of Trades | Career Development Tools
        </div>

      </div>

    </main>
  );
}