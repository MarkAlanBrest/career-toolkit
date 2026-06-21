export default function HomePage() {
  const teachingMonthly = process.env.NEXT_PUBLIC_LEMONSQUEEZY_TEACHING_MONTHLY_URL || '#';
  const teachingAnnual  = process.env.NEXT_PUBLIC_LEMONSQUEEZY_TEACHING_ANNUAL_URL  || '#';
  const creationMonthly = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CREATION_MONTHLY_URL || '#';
  const creationAnnual  = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CREATION_ANNUAL_URL  || '#';
  const extensionUrl    = process.env.NEXT_PUBLIC_EXTENSION_URL || '#';

  const navy  = '#2d3b45';
  const blue  = '#0770a3';
  const light = '#f4f6f8';

  const featureList = (items: string[]) => (
    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', fontSize: 14, lineHeight: 1 }}>
      {items.map(item => (
        <li key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '7px 0', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ color: blue, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
          <span style={{ color: '#2d3b45', lineHeight: 1.5 }}>{item}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <main style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', color: navy }}>

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav style={{ background: navy, padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, position: 'sticky', top: 0, zIndex: 100 }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>Canvas Enhancer</span>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a href="#teaching"  style={{ color: '#a8bac4', fontSize: 14, textDecoration: 'none' }}>Teaching Tools</a>
          <a href="#creation"  style={{ color: '#a8bac4', fontSize: 14, textDecoration: 'none' }}>Creation Tools</a>
          <a href="#free"      style={{ color: '#a8bac4', fontSize: 14, textDecoration: 'none' }}>Free AI Button</a>
          <a href={extensionUrl} style={{ background: blue, color: '#fff', padding: '7px 16px', borderRadius: 4, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Install Free
          </a>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section style={{ background: `linear-gradient(135deg, #1a2a35 0%, ${navy} 60%, ${blue} 100%)`, color: '#fff', padding: '72px 32px 80px', textAlign: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '5px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 22 }}>
            Canvas Enhancer Pricing
          </div>
          <h1 style={{ fontSize: 'clamp(26px,5vw,44px)', fontWeight: 800, lineHeight: 1.15, margin: '0 0 18px' }}>
            Powerful tools built specifically<br />for Canvas teachers.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: '#c8d8e4', margin: 0 }}>
            Spend less time managing courses and more time teaching.
          </p>
        </div>
      </section>

      {/* ── Packages ────────────────────────────────────────────────────────── */}
      <section style={{ padding: '64px 32px', background: light }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 28, alignItems: 'start' }}>

          {/* Teaching Tools */}
          <div id="teaching" style={{ background: '#fff', border: `2px solid ${blue}`, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: blue, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 20, whiteSpace: 'nowrap' }}>
              Most Popular
            </div>
            <div style={{ background: blue, color: '#fff', padding: '28px 28px 22px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', opacity: 0.8, marginBottom: 6 }}>Teaching Tools</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, lineHeight: 1.4 }}>Save hours of repetitive work every week</div>
              <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.5 }}>
                Communicate with students, organize assignments, monitor course activity, and grade faster — all directly inside Canvas.
              </div>
            </div>
            <div style={{ padding: '28px 28px 24px' }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>
                  $14.99<span style={{ fontSize: 15, fontWeight: 400, color: '#6b7780' }}>/month</span>
                </div>
                <div style={{ fontSize: 13, color: '#6b7780', marginTop: 6 }}>
                  $149.99/year — <span style={{ color: '#2e7d32', fontWeight: 600 }}>save approximately $30</span>
                </div>
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7780', marginBottom: 12 }}>Includes</div>
              {featureList([
                'AI-assisted grading inside SpeedGrader',
                '500 AI gradings every month',
                'Drafted rubric scores and student feedback',
                'Grade Audit tools',
                'Bulk student messaging',
                'Reusable message templates',
                'Announcement Composer',
                'Assignment Scheduler',
                'Automatic availability and closing dates',
                'Course Vitals and activity reports',
                'Needs Graded report',
                'At Risk student identification',
                'Shared Canvas API settings across every tool',
              ])}

              <div style={{ background: '#f0f7ff', border: `1px solid #c3dff5`, borderRadius: 8, padding: '14px 16px', marginBottom: 22 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: navy, marginBottom: 4 }}>Need more grading capacity?</div>
                <div style={{ fontSize: 13, color: '#444', lineHeight: 1.5 }}>
                  Add <strong>100 AI gradings for $4.99</strong><br />
                  <span style={{ color: '#6b7780', fontSize: 12 }}>Purchased credits do not normally expire and are used after the monthly allowance.</span>
                </div>
              </div>

              <a href={teachingMonthly} style={{ display: 'block', background: blue, color: '#fff', padding: '13px 0', borderRadius: 7, fontWeight: 700, fontSize: 15, textDecoration: 'none', textAlign: 'center', marginBottom: 10 }}>
                Get Teaching Tools
              </a>
              <a href={teachingAnnual} style={{ display: 'block', color: blue, fontSize: 13, fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>
                Annual billing — $149.99 (save ~$30)
              </a>
            </div>
          </div>

          {/* Creation Tools */}
          <div id="creation" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: navy, color: '#fff', padding: '28px 28px 22px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', opacity: 0.8, marginBottom: 6 }}>Creation Tools</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, lineHeight: 1.4 }}>Build exceptional Canvas courses in a fraction of the time</div>
              <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.5 }}>
                Create professional pages, assignments, discussions, announcements, and quizzes without starting from a blank screen.
              </div>
            </div>
            <div style={{ padding: '28px 28px 24px' }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>
                  $29<span style={{ fontSize: 15, fontWeight: 400, color: '#6b7780' }}>/month</span>
                </div>
                <div style={{ fontSize: 13, color: '#6b7780', marginTop: 6 }}>
                  $289.99/year — <span style={{ color: '#2e7d32', fontWeight: 600 }}>save approximately $58</span>
                </div>
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7780', marginBottom: 12 }}>Includes</div>
              {featureList([
                'Rich Content Toolbar inside the Canvas editor',
                'Professionally designed content components',
                'Accessible layouts, callouts, cards, tabs, and buttons',
                'AI-assisted Canvas page creation',
                'Complete AI-generated quizzes',
                'Questions, answers, feedback, and point values',
                'Editing and review before publishing',
                '100 AI generations every month',
                'Direct integration with Canvas',
              ])}

              <div style={{ background: '#f8f9fa', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 16px', marginBottom: 22 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: navy, marginBottom: 4 }}>Need more creation capacity?</div>
                <div style={{ fontSize: 13, color: '#444', lineHeight: 1.5 }}>
                  Add <strong>50 AI generations for $9</strong><br />
                  <span style={{ color: '#6b7780', fontSize: 12 }}>Purchased credits do not normally expire and are used after the monthly allowance.</span>
                </div>
              </div>

              <a href={creationMonthly} style={{ display: 'block', background: navy, color: '#fff', padding: '13px 0', borderRadius: 7, fontWeight: 700, fontSize: 15, textDecoration: 'none', textAlign: 'center', marginBottom: 10 }}>
                Get Creation Tools
              </a>
              <a href={creationAnnual} style={{ display: 'block', color: navy, fontSize: 13, fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>
                Annual billing — $289.99 (save ~$58)
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* ── Free AI Button ───────────────────────────────────────────────────── */}
      <section id="free" style={{ padding: '56px 32px', background: '#fff' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: '#f0f7ff', border: `1px solid #c3dff5`, borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 700, color: blue, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 16 }}>
            Free AI Button
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 10 }}>Your preferred AI assistant, one click away</h2>
          <p style={{ fontSize: 15, color: '#6b7780', lineHeight: 1.6, marginBottom: 32 }}>
            Open your preferred AI service from anywhere inside Canvas.
          </p>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#f0f7ff', border: `1px solid #c3dff5`, borderRadius: 8, padding: '8px 20px', marginBottom: 28 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: blue }}>Free</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            {['Claude', 'ChatGPT', 'Gemini', 'Microsoft Copilot', 'Perplexity'].map(tool => (
              <span key={tool} style={{ background: light, border: '1px solid #e5e7eb', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 600, color: navy }}>
                {tool}
              </span>
            ))}
          </div>

          <p style={{ fontSize: 14, color: '#6b7780', lineHeight: 1.6, maxWidth: 460, margin: '0 auto 28px' }}>
            No Canvas Enhancer AI credits are required. The button opens the teacher's own AI account — you bring your own key and pay only for what you use.
          </p>

          <a href={extensionUrl} style={{ display: 'inline-block', background: blue, color: '#fff', padding: '12px 28px', borderRadius: 7, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
            Install Free
          </a>
        </div>
      </section>

      {/* ── Choose One or Both ───────────────────────────────────────────────── */}
      <section style={{ padding: '56px 32px', background: light }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 14 }}>Choose One Package — or Use Both</h2>
          <p style={{ fontSize: 15, color: '#6b7780', lineHeight: 1.7, marginBottom: 36 }}>
            Each package can be purchased separately, and both work together through one shared Canvas Enhancer settings system.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20, textAlign: 'left' }}>
            <div style={{ background: '#fff', border: `1px solid ${blue}`, borderRadius: 10, padding: '22px 24px' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: blue, marginBottom: 8 }}>Teaching Tools</div>
              <p style={{ fontSize: 14, color: '#444', lineHeight: 1.6, margin: 0 }}>
                Helps you manage students, assignments, communication, reporting, and grading.
              </p>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '22px 24px' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: navy, marginBottom: 8 }}>Creation Tools</div>
              <p style={{ fontSize: 14, color: '#444', lineHeight: 1.6, margin: 0 }}>
                Helps you build polished course content and quizzes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Install CTA ─────────────────────────────────────────────────────── */}
      <section style={{ background: navy, color: '#fff', padding: '64px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 14 }}>Ready to get started?</h2>
          <p style={{ fontSize: 15, color: '#c8d8e4', lineHeight: 1.6, marginBottom: 36 }}>
            Install the extension free. Add a license key anytime to unlock Teaching Tools, Creation Tools, or both.
          </p>
          <a href={extensionUrl} style={{ display: 'inline-block', background: blue, color: '#fff', padding: '14px 32px', borderRadius: 7, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            Install Canvas Enhancer Free
          </a>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#1a2a35', color: '#6b8090', padding: '24px 32px', textAlign: 'center', fontSize: 13 }}>
        © {new Date().getFullYear()} Canvas Enhancer. Not affiliated with Instructure, Inc. or Canvas LMS.
      </footer>

    </main>
  );
}
