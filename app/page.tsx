'use client';
import { useState } from 'react';

export default function HomePage() {
  const [costPopup, setCostPopup] = useState<'teaching' | 'creation' | null>(null);
  const teachingMonthly  = process.env.NEXT_PUBLIC_LEMONSQUEEZY_TEACHING_MONTHLY_URL   || '#';
  const teachingSixMonth = process.env.NEXT_PUBLIC_LEMONSQUEEZY_TEACHING_SIXMONTH_URL  || '#';
  const teachingAnnual   = process.env.NEXT_PUBLIC_LEMONSQUEEZY_TEACHING_ANNUAL_URL    || '#';
  const creationMonthly  = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CREATION_MONTHLY_URL   || '#';
  const creationSixMonth = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CREATION_SIXMONTH_URL  || '#';
  const creationAnnual   = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CREATION_ANNUAL_URL    || '#';
  const extensionUrl     = process.env.NEXT_PUBLIC_EXTENSION_URL || '#';

  const navy = '#2d3b45';
  const blue = '#0770a3';
  const light = '#f4f6f8';

  const featureList = (items: string[]) => (
    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', fontSize: 14 }}>
      {items.map(item => (
        <li key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '7px 0', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ color: blue, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
          <span style={{ color: navy, lineHeight: 1.5 }}>{item}</span>
        </li>
      ))}
    </ul>
  );

  const pricingRow = (monthly: string, sixMonth: string, annual: string, accentColor: string) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: navy }}>$4.95</div>
          <div style={{ fontSize: 11, color: '#6b7780', marginTop: 2 }}>per month</div>
          <a href={monthly} style={{ display: 'block', marginTop: 8, background: accentColor, color: '#fff', padding: '6px 0', borderRadius: 5, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            Monthly
          </a>
        </div>
        <div style={{ border: `2px solid ${accentColor}`, borderRadius: 8, padding: '12px 10px', textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: accentColor, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>Popular</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: navy }}>$18.95</div>
          <div style={{ fontSize: 11, color: '#6b7780', marginTop: 2 }}>6 months</div>
          <a href={sixMonth} style={{ display: 'block', marginTop: 8, background: accentColor, color: '#fff', padding: '6px 0', borderRadius: 5, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            6 Months
          </a>
        </div>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: navy }}>$34.95</div>
          <div style={{ fontSize: 11, color: '#6b7780', marginTop: 2 }}>per year</div>
          <a href={annual} style={{ display: 'block', marginTop: 8, background: accentColor, color: '#fff', padding: '6px 0', borderRadius: 5, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            Annual
          </a>
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#6b7780', textAlign: 'center' }}>
        Annual saves ~$24 vs monthly · 6 months saves ~$11
      </div>
    </div>
  );

  return (
    <main style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', color: navy }}>

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav style={{ background: navy, padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, position: 'sticky', top: 0, zIndex: 100 }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>Canvas Enhancer</span>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a href="#teaching" style={{ color: '#a8bac4', fontSize: 14, textDecoration: 'none' }}>Teaching Tools</a>
          <a href="#creation" style={{ color: '#a8bac4', fontSize: 14, textDecoration: 'none' }}>Creation Tools</a>
          <a href="#free"     style={{ color: '#a8bac4', fontSize: 14, textDecoration: 'none' }}>Free AI Button</a>
          <a href={extensionUrl} style={{ background: blue, color: '#fff', padding: '7px 16px', borderRadius: 4, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Install Free
          </a>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section style={{ background: `linear-gradient(135deg,#1a2a35 0%,${navy} 60%,${blue} 100%)`, color: '#fff', padding: '72px 32px 80px', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '5px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 22 }}>
            Canvas Enhancer Pricing
          </div>
          <h1 style={{ fontSize: 'clamp(26px,5vw,44px)', fontWeight: 800, lineHeight: 1.15, margin: '0 0 18px' }}>
            Powerful tools built specifically<br />for Canvas teachers.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: '#c8d8e4', margin: '0 0 28px' }}>
            Spend less time managing courses and more time teaching.
          </p>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '14px 24px', fontSize: 14, lineHeight: 1.6, color: '#e8f0f5', maxWidth: 520, textAlign: 'left' }}>
            <strong style={{ display: 'block', marginBottom: 6 }}>About AI features</strong>
            Most tools work entirely without AI — messaging, scheduling, the content toolbar, grade audit reports, and more.
            A small number of features use AI for grading assistance and content generation. Those features require a free Claude account from Anthropic. You pay Anthropic directly for what you use — Canvas Enhancer never marks up AI costs.
          </div>
        </div>
      </section>

      {/* ── AI Cost Popup ────────────────────────────────────────────────────── */}
      {costPopup && (
        <div onClick={() => setCostPopup(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: '32px 28px', maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>
                {costPopup === 'teaching' ? 'Teaching Tools' : 'Creation Tools'} — Estimated Claude Costs
              </h3>
              <button onClick={() => setCostPopup(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7780', lineHeight: 1, padding: '0 4px' }}>×</button>
            </div>
            <p style={{ fontSize: 13, color: '#6b7780', marginBottom: 20, lineHeight: 1.5 }}>
              Based on Claude Haiku, which Canvas Enhancer uses by default. You pay Anthropic directly — we never mark up AI costs.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {(costPopup === 'teaching' ? [
                { label: 'One graded assignment',      est: '~$0.003', note: 'Rubric scoring and written feedback. Less than half a cent.' },
                { label: 'Grading 30 students',        est: '~$0.09',  note: 'A typical class set for one assignment.' },
                { label: 'Grading 100 assignments',    est: '~$0.30',  note: 'A heavy grading session across multiple assignments.' },
                { label: 'Busy month of AI grading',   est: '~$1–2',   note: 'Grading 200+ assignments across all your courses.' },
              ] : [
                { label: 'One AI-generated page',  est: '~$0.02', note: 'Full Canvas page with content, headers, and callouts.' },
                { label: 'One AI-generated quiz',  est: '~$0.05', note: 'Complete quiz with questions, answers, and feedback.' },
                { label: '10 pages + 5 quizzes',   est: '~$0.45', note: 'A week of heavy content creation.' },
                { label: 'Busy month of creation', est: '~$1–3',  note: 'Building out a full course unit with AI.' },
              ]).map(item => (
                <div key={item.label} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: light, borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: blue, minWidth: 58, flexShrink: 0 }}>{item.est}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: navy, marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: '#6b7780', lineHeight: 1.5 }}>{item.note}</div>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 20px', lineHeight: 1.5 }}>
              Costs vary slightly with content length. <a href="https://www.anthropic.com/pricing" target="_blank" rel="noopener noreferrer" style={{ color: blue }}>See current Claude pricing →</a>
            </p>
            <button onClick={() => setCostPopup(null)} style={{ width: '100%', background: blue, color: '#fff', border: 'none', padding: '11px 0', borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Got it
            </button>
          </div>
        </div>
      )}

      {/* ── Packages ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: '64px 32px', background: light }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 28, alignItems: 'start' }}>

          {/* Teaching Tools */}
          <div id="teaching" style={{ background: '#fff', border: `2px solid ${blue}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: blue, color: '#fff', padding: '28px 28px 22px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', opacity: 0.8, marginBottom: 6 }}>Teaching Tools</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, lineHeight: 1.4 }}>Save hours of repetitive work every week</div>
              <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.5 }}>
                Communicate with students, organize assignments, monitor course activity, and grade faster — all directly inside Canvas.
              </div>
            </div>
            <div style={{ padding: '28px 28px 24px' }}>

              {pricingRow(teachingMonthly, teachingSixMonth, teachingAnnual, blue)}

              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7780', marginBottom: 12 }}>Includes</div>
              {featureList([
                'Bulk student messaging',
                'Reusable message templates',
                'Announcement Composer',
                'Assignment Scheduler',
                'Automatic availability and closing dates',
                'Course Vitals and activity reports',
                'Needs Graded report',
                'At Risk student identification',
                'Grade Audit tools',
                'Shared Canvas API settings across every tool',
              ])}

              <div style={{ background: '#f0f7ff', border: `1px solid #c3dff5`, borderRadius: 8, padding: '14px 16px', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: navy, marginBottom: 4 }}>✦ AI features — requires Claude account</div>
                <div style={{ fontSize: 13, color: '#444', lineHeight: 1.6, marginBottom: 8 }}>
                  AI-assisted grading inside SpeedGrader with drafted rubric scores and student feedback. You pay Anthropic directly.
                </div>
                <button onClick={() => setCostPopup('teaching')} style={{ background: 'none', border: 'none', padding: 0, color: blue, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                  See estimated costs →
                </button>
              </div>

            </div>
          </div>

          {/* Creation Tools */}
          <div id="creation" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: navy, color: '#fff', padding: '28px 28px 22px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', opacity: 0.8, marginBottom: 6 }}>Creation Tools</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, lineHeight: 1.4 }}>Build exceptional Canvas courses in a fraction of the time</div>
              <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.5 }}>
                Create professional pages, assignments, discussions, announcements, and quizzes without starting from a blank screen.
              </div>
            </div>
            <div style={{ padding: '28px 28px 24px' }}>

              {pricingRow(creationMonthly, creationSixMonth, creationAnnual, navy)}

              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7780', marginBottom: 12 }}>Includes</div>
              {featureList([
                'Rich Content Toolbar inside the Canvas editor',
                'Professionally designed content components',
                'Accessible layouts, callouts, cards, tabs, and buttons',
                'Editing and review before publishing',
                'Direct integration with Canvas',
              ])}

              <div style={{ background: '#f8f9fa', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 16px', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: navy, marginBottom: 4 }}>✦ AI features — requires Claude account</div>
                <div style={{ fontSize: 13, color: '#444', lineHeight: 1.6, marginBottom: 8 }}>
                  AI-assisted Canvas page creation and complete AI-generated quizzes with questions, answers, feedback, and point values. You pay Anthropic directly.
                </div>
                <button onClick={() => setCostPopup('creation')} style={{ background: 'none', border: 'none', padding: 0, color: navy, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                  See estimated costs →
                </button>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ── Free AI Button ───────────────────────────────────────────────────── */}
      <section id="free" style={{ padding: '56px 32px', background: '#fff' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: '#f0f7ff', border: `1px solid #c3dff5`, borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 700, color: blue, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 16 }}>
            Free AI Button
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>Your preferred AI assistant, one click away</h2>
          <p style={{ fontSize: 15, color: '#6b7780', lineHeight: 1.6, marginBottom: 28 }}>
            Open your preferred AI service from anywhere inside Canvas.
          </p>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f0f9f0', border: '1px solid #86efac', borderRadius: 8, padding: '8px 20px', marginBottom: 24 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#15803d' }}>Free — no account needed</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            {['Claude', 'ChatGPT', 'Gemini', 'Microsoft Copilot', 'Perplexity'].map(tool => (
              <span key={tool} style={{ background: light, border: '1px solid #e5e7eb', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 600, color: navy }}>
                {tool}
              </span>
            ))}
          </div>

          <p style={{ fontSize: 14, color: '#6b7780', lineHeight: 1.6, maxWidth: 460, margin: '0 auto 28px' }}>
            No Canvas Enhancer subscription required. The button opens your own AI account in a side window — you pay only for what you use, directly with the provider.
          </p>

          <a href={extensionUrl} style={{ display: 'inline-block', background: blue, color: '#fff', padding: '12px 28px', borderRadius: 7, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
            Install Free
          </a>
        </div>
      </section>

      {/* ── Choose One or Both ───────────────────────────────────────────────── */}
      <section style={{ padding: '56px 32px', background: light }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 14 }}>Choose One Package — or Use Both</h2>
          <p style={{ fontSize: 15, color: '#6b7780', lineHeight: 1.7, marginBottom: 32 }}>
            Each package can be purchased separately, and both work together through one shared Canvas Enhancer settings system.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20, textAlign: 'left', marginBottom: 32 }}>
            <div style={{ background: '#fff', border: `1px solid ${blue}`, borderRadius: 10, padding: '22px 24px' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: blue, marginBottom: 8 }}>Teaching Tools</div>
              <p style={{ fontSize: 14, color: '#444', lineHeight: 1.6, margin: 0 }}>
                Manage students, assignments, communication, reporting, and grading.
              </p>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '22px 24px' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: navy, marginBottom: 8 }}>Creation Tools</div>
              <p style={{ fontSize: 14, color: '#444', lineHeight: 1.6, margin: 0 }}>
                Build polished course content and quizzes with a professional design toolbar.
              </p>
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', fontSize: 14, color: '#6b7780', lineHeight: 1.6 }}>
            <strong style={{ color: navy }}>Setting up Claude</strong> — Creating a Claude account takes about 5 minutes. Once you have an API key, paste it into Canvas Enhancer settings and every AI feature is ready to use. Most teachers spend less than $2 per month on AI usage.
          </div>
        </div>
      </section>

      {/* ── Install CTA ──────────────────────────────────────────────────────── */}
      <section style={{ background: navy, color: '#fff', padding: '64px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 14 }}>Ready to get started?</h2>
          <p style={{ fontSize: 15, color: '#c8d8e4', lineHeight: 1.6, marginBottom: 36 }}>
            Install free. Add a license key to unlock Teaching Tools, Creation Tools, or both. Most features work the moment you install.
          </p>
          <a href={extensionUrl} style={{ display: 'inline-block', background: blue, color: '#fff', padding: '14px 32px', borderRadius: 7, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            Install Canvas Enhancer Free
          </a>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#1a2a35', color: '#6b8090', padding: '24px 32px', textAlign: 'center', fontSize: 13 }}>
        © {new Date().getFullYear()} Canvas Enhancer. Not affiliated with Instructure, Inc. or Canvas LMS.
      </footer>

    </main>
  );
}
