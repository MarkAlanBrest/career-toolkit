'use client';
import { useState } from 'react';
import SiteNav from '../components/SiteNav';

export default function FeaturesPage() {
  const extensionUrl = process.env.NEXT_PUBLIC_EXTENSION_URL || '#';
  const [costPopup, setCostPopup] = useState<'teaching' | 'creation' | null>(null);

  const navy  = '#2d3b45';
  const blue  = '#0770a3';
  const light = '#f4f6f8';
  const font  = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

  return (
    <main style={{ fontFamily: font, color: navy }}>

      {/* ── Cost Popup ───────────────────────────────────────────────────────── */}
      {costPopup && (
        <div onClick={() => setCostPopup(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: '32px 28px', maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>{costPopup === 'teaching' ? 'Teaching Tools' : 'Creation Tools'} — Estimated Claude Costs</h3>
              <button onClick={() => setCostPopup(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7780', lineHeight: 1, padding: '0 4px' }}>×</button>
            </div>
            <p style={{ fontSize: 13, color: '#6b7780', marginBottom: 20, lineHeight: 1.5 }}>Based on Claude Haiku. You pay Anthropic directly — we never mark up AI costs.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {(costPopup === 'teaching' ? [
                { label: 'One graded assignment',    est: '~$0.003', note: 'Rubric scoring and written feedback. Less than half a cent.' },
                { label: 'Grading 30 students',      est: '~$0.09',  note: 'A typical class set for one assignment.' },
                { label: 'Grading 100 assignments',  est: '~$0.30',  note: 'A heavy grading session.' },
                { label: 'Busy month of AI grading', est: '~$1–2',   note: 'Grading 200+ assignments across all your courses.' },
              ] : [
                { label: 'One AI-generated page',  est: '~$0.02', note: 'Full Canvas page with content, headers, and callouts.' },
                { label: 'One AI-generated quiz',  est: '~$0.05', note: 'Complete quiz with questions, answers, and feedback.' },
                { label: '10 pages + 5 quizzes',   est: '~$0.45', note: 'A productive week of content creation.' },
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
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 20px' }}>
              <a href="https://www.anthropic.com/pricing" target="_blank" rel="noopener noreferrer" style={{ color: blue }}>See current Claude pricing →</a>
            </p>
            <button onClick={() => setCostPopup(null)} style={{ width: '100%', background: blue, color: '#fff', border: 'none', padding: '11px 0', borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Got it</button>
          </div>
        </div>
      )}

      <SiteNav active="features" />

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <section style={{ background: `linear-gradient(135deg,#1a2a35,${navy})`, color: '#fff', padding: '56px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: 660, margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 900, margin: '0 0 16px', letterSpacing: '-0.4px' }}>Everything Canvas Enhancer does</h1>
          <p style={{ fontSize: 17, color: '#c8d8e4', lineHeight: 1.65, margin: '0 0 28px' }}>
            Two focused packages. Most tools work immediately without AI. Add a Claude API key any time to unlock AI features.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#teaching" style={{ background: blue, color: '#fff', padding: '10px 22px', borderRadius: 7, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Teaching Tools</a>
            <a href="#creation" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', padding: '10px 22px', borderRadius: 7, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Creation Tools</a>
            <a href="/pricing"  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', padding: '10px 22px', borderRadius: 7, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>See Pricing</a>
          </div>
        </div>
      </section>

      {/* ── Teaching Tools ──────────────────────────────────────────────────── */}
      <section id="teaching" style={{ padding: '80px 32px', background: light }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', background: '#e8f3fb', border: `1px solid #c3dff5`, borderRadius: 20, padding: '4px 16px', fontSize: 11, fontWeight: 700, color: blue, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 16 }}>Teaching Tools</div>
            <h2 style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 900, margin: '0 0 14px', letterSpacing: '-0.3px' }}>Everything you do every week,<br />done in a fraction of the time.</h2>
            <p style={{ fontSize: 16, color: '#6b7780', maxWidth: 540, margin: '0 auto', lineHeight: 1.65 }}>
              Teaching Tools lives inside Canvas and handles the administrative work that consumes your evenings.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 22, marginBottom: 48 }}>
            {[
              {
                icon: '🎓', title: 'AI-Assisted Grading', time: 'Save 2–3 hours per assignment', ai: true,
                desc: 'Grade a full class set in under 30 minutes. Canvas Enhancer reads your rubric, evaluates each submission, and drafts written feedback — you review, adjust if needed, and publish.',
                quote: '"Instead of spending a Sunday grading 28 essays, I spend 25 minutes reviewing what the AI drafted. The feedback is better than what I\'d write at 11pm anyway."',
              },
              {
                icon: '📢', title: 'Bulk Student Messaging', time: 'Save 30–60 minutes every week', ai: false,
                desc: 'Write once, send to everyone — or filter by grade, activity, or assignment status. Message templates let you reuse your best communications every semester.',
                quote: '"I used to copy-paste the same reminder to 30 students one at a time. Now it\'s one click."',
              },
              {
                icon: '📅', title: 'Assignment Scheduler', time: 'Save 1–2 hours per course setup', ai: false,
                desc: 'Set your semester dates once. Canvas Enhancer automatically fills availability dates and due dates across all your assignments — no more editing each one individually.',
                quote: '"Setting up a 16-week course used to take an afternoon. Now it takes 10 minutes."',
              },
              {
                icon: '⚠️', title: 'At Risk Identification', time: 'Catch problems before they escalate', ai: false,
                desc: 'Course Vitals surfaces students who are falling behind — missing submissions, low engagement, declining grades — so you can reach out before the deadline passes.',
                quote: '"I found out a student was struggling two weeks before I would have noticed on my own."',
              },
              {
                icon: '📋', title: 'Grade Audit & Reports', time: 'Instant visibility into your gradebook', ai: false,
                desc: 'The Needs Graded report shows exactly what is waiting for you. Grade Audit catches missing scores, outliers, and inconsistencies before students notice.',
                quote: '"I stopped dreading the question \'did you grade my assignment yet?\'"',
              },
              {
                icon: '📣', title: 'Announcement Composer', time: 'Professional announcements in seconds', ai: false,
                desc: 'Write and send polished Canvas announcements without leaving your workflow. Supports templates so your weekly check-in takes 90 seconds, not 10 minutes.',
                quote: '"My announcements actually look professional now. Students actually read them."',
              },
            ].map(f => (
              <div key={f.title} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '26px 24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <span style={{ fontSize: 32 }}>{f.icon}</span>
                  {f.ai && <span style={{ fontSize: 11, fontWeight: 700, background: '#e8f3fb', color: blue, padding: '3px 8px', borderRadius: 10, border: `1px solid #c3dff5` }}>Uses AI</span>}
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, color: navy, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: blue, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>{f.time}</div>
                <p style={{ fontSize: 14, color: '#444', lineHeight: 1.65, margin: '0 0 16px', flexGrow: 1 }}>{f.desc}</p>
                <blockquote style={{ margin: 0, padding: '12px 14px', background: '#f0f7ff', borderLeft: `3px solid ${blue}`, borderRadius: '0 6px 6px 0', fontSize: 13, color: '#555', fontStyle: 'italic', lineHeight: 1.55 }}>
                  {f.quote}
                </blockquote>
              </div>
            ))}
          </div>

          {/* AI note */}
          <div style={{ background: '#e8f3fb', border: `1px solid #c3dff5`, borderRadius: 10, padding: '18px 22px', marginBottom: 40, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>✦</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: navy, marginBottom: 4 }}>AI grading requires a Claude account</div>
              <div style={{ fontSize: 13, color: '#444', lineHeight: 1.6 }}>
                All other Teaching Tools features work without AI. For AI grading, you connect your own Claude API key in Canvas Enhancer settings — you pay Anthropic directly at their standard rates.{' '}
                <button onClick={() => setCostPopup('teaching')} style={{ background: 'none', border: 'none', padding: 0, color: blue, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>See estimated costs →</button>
              </div>
            </div>
          </div>

          {/* Before / After */}
          <div style={{ border: `1px solid ${blue}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ background: blue, color: '#fff', padding: '16px 24px', fontWeight: 700, fontSize: 15 }}>Grading one assignment — before and after</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: '24px', borderRight: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#dc2626', marginBottom: 14 }}>Without Canvas Enhancer</div>
                {['Open each submission one at a time', 'Read through the full response', 'Write feedback from scratch', 'Look up the rubric to assign scores', 'Switch to the gradebook, enter the score', 'Repeat for every student', '⏱ Total time for 30 students: 2–3 hours'].map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14, color: i === 6 ? '#dc2626' : '#444', fontWeight: i === 6 ? 700 : 400 }}>
                    <span style={{ color: '#dc2626', flexShrink: 0 }}>{i === 6 ? '' : '✗'}</span><span>{s}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '24px', background: '#f0f9f4' }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#15803d', marginBottom: 14 }}>With Canvas Enhancer</div>
                {['Open SpeedGrader as normal', 'AI reads the rubric and the submission', 'Rubric scores are pre-filled', 'Written feedback is drafted for you', 'Review, adjust if needed, and click Submit', 'Move to the next student — already pre-filled', '⏱ Total time for 30 students: 20–30 minutes'].map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14, color: i === 6 ? '#15803d' : '#444', fontWeight: i === 6 ? 700 : 400 }}>
                    <span style={{ color: '#15803d', flexShrink: 0 }}>{i === 6 ? '' : '✓'}</span><span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Creation Tools ──────────────────────────────────────────────────── */}
      <section id="creation" style={{ padding: '80px 32px', background: '#fff' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', background: '#f0f0f4', border: '1px solid #d1d5db', borderRadius: 20, padding: '4px 16px', fontSize: 11, fontWeight: 700, color: navy, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 16 }}>Creation Tools</div>
            <h2 style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 900, margin: '0 0 14px', letterSpacing: '-0.3px' }}>Beautiful Canvas pages.<br />No coding. No design skills. No blank screen.</h2>
            <p style={{ fontSize: 16, color: '#6b7780', maxWidth: 560, margin: '0 auto', lineHeight: 1.65 }}>
              A professional design toolbar directly inside the Canvas editor — plus AI that builds complete pages and quizzes from a single sentence.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 22, marginBottom: 48 }}>
            {[
              {
                icon: '🛠️', title: 'Rich Content Toolbar', time: '42 components, inserted in one click', ai: false,
                desc: 'A full design toolbar appears below the Canvas editor. Choose from headers, callouts, cards, columns, tabs, checklists, progress trackers, instructor bios, office hours cards, grading breakdowns, and more.',
                quote: '"My module pages actually look like a real course now. I\'ve gotten more compliments on course design this semester than in the last five years combined."',
              },
              {
                icon: '✨', title: 'AI Canvas Page Builder', time: 'A complete page in under 60 seconds', ai: true,
                desc: 'Type a description — "Introduction to photosynthesis for 9th grade, with a key terms section and a Did You Know callout" — and Canvas Enhancer builds the full page, formatted and ready to publish.',
                quote: '"I built an entire unit\'s worth of pages in one afternoon. It would have taken me two weeks before."',
              },
              {
                icon: '📝', title: 'AI Quiz Maker', time: '15-question quiz in under 90 seconds', ai: true,
                desc: 'Describe your topic and question types. Canvas Enhancer generates questions, multiple-choice answers, correct answer keys, point values, and per-question feedback — and builds the quiz directly in Canvas.',
                quote: '"The AI wrote better distractor choices than I do. Students said the quizzes felt fair."',
              },
            ].map(f => (
              <div key={f.title} style={{ background: light, border: '1px solid #e5e7eb', borderRadius: 12, padding: '26px 24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <span style={{ fontSize: 32 }}>{f.icon}</span>
                  {f.ai && <span style={{ fontSize: 11, fontWeight: 700, background: '#e8f3fb', color: blue, padding: '3px 8px', borderRadius: 10, border: `1px solid #c3dff5` }}>Uses AI</span>}
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, color: navy, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: navy, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>{f.time}</div>
                <p style={{ fontSize: 14, color: '#444', lineHeight: 1.65, margin: '0 0 16px', flexGrow: 1 }}>{f.desc}</p>
                <blockquote style={{ margin: 0, padding: '12px 14px', background: '#fff', borderLeft: `3px solid ${navy}`, borderRadius: '0 6px 6px 0', fontSize: 13, color: '#555', fontStyle: 'italic', lineHeight: 1.55 }}>
                  {f.quote}
                </blockquote>
              </div>
            ))}
          </div>

          {/* Component grid */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', marginBottom: 48 }}>
            <div style={{ background: navy, color: '#fff', padding: '16px 24px', fontWeight: 700, fontSize: 15 }}>
              42 ready-to-use components — included free, no license key required
            </div>
            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 20 }}>
              {[
                { cat: 'Dividers',  items: ['Simple line', 'Dashed', 'Gradient bar', 'Double line'] },
                { cat: 'Headers',   items: ['Section banner', 'Solid banner', 'Underline header', 'Warning banner'] },
                { cat: 'Callouts',  items: ['Tip', 'Warning', 'Important', 'Note', 'Did You Know', 'Success', 'Do Not', 'Custom'] },
                { cat: 'Lists',     items: ['Checklist', 'Steps', 'Icon list ✅', 'Icon list ▶', 'Badge labels', 'Progress tracker'] },
                { cat: 'Layouts',   items: ['Two columns', 'Three columns', 'Custom columns', 'Collapsible', 'Image + text'] },
                { cat: 'Cards',     items: ['Card grid', 'Instructor Bio', 'Office Hours', 'Due Dates', 'Course Policies', 'Welcome', 'Grading Breakdown', 'Tips for Success', 'Submit Checklist', 'Pull quote', 'Button link'] },
              ].map(group => (
                <div key={group.cat}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: blue, marginBottom: 10 }}>{group.cat}</div>
                  {group.items.map(item => (
                    <div key={item} style={{ fontSize: 13, color: '#444', padding: '3px 0', display: 'flex', gap: 6 }}>
                      <span style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>◆</span> {item}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* AI note */}
          <div style={{ background: '#f4f6f8', border: '1px solid #e5e7eb', borderRadius: 10, padding: '18px 22px', marginBottom: 40, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>✦</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: navy, marginBottom: 4 }}>AI page and quiz generation requires a Claude account</div>
              <div style={{ fontSize: 13, color: '#444', lineHeight: 1.6 }}>
                The Rich Content Toolbar and all 42 components work entirely without AI. For AI-generated pages and quizzes, connect your own Claude API key — you pay Anthropic directly.{' '}
                <button onClick={() => setCostPopup('creation')} style={{ background: 'none', border: 'none', padding: 0, color: navy, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>See estimated costs →</button>
              </div>
            </div>
          </div>

          {/* Before / After */}
          <div style={{ border: `1px solid ${navy}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ background: navy, color: '#fff', padding: '16px 24px', fontWeight: 700, fontSize: 15 }}>Building a Canvas module page — before and after</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: '24px', borderRight: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#dc2626', marginBottom: 14 }}>Without Canvas Enhancer</div>
                {['Start from a blank white text box', 'Add formatting manually — no design tools', 'Search the internet for inspiration', 'Try to write HTML tables by hand (or give up)', 'Page looks like a Word document from 2003', 'Students scroll past it without reading', '⏱ Total time: 45–90 minutes, mediocre result'].map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14, color: i === 6 ? '#dc2626' : '#444', fontWeight: i === 6 ? 700 : 400 }}>
                    <span style={{ color: '#dc2626', flexShrink: 0 }}>{i === 6 ? '' : '✗'}</span><span>{s}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '24px', background: '#f0f9f4' }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#15803d', marginBottom: 14 }}>With Canvas Enhancer</div>
                {['Open any Canvas page editor', 'Type your topic into AI Page Builder', 'Complete formatted page generated instantly', 'Or pick from 42 toolbar components', 'Click to insert — styled and accessible', 'Professional look students actually engage with', '⏱ Total time: 5–15 minutes, polished result'].map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14, color: i === 6 ? '#15803d' : '#444', fontWeight: i === 6 ? 700 : 400 }}>
                    <span style={{ color: '#15803d', flexShrink: 0 }}>{i === 6 ? '' : '✓'}</span><span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Free AI Button ───────────────────────────────────────────────────── */}
      <section style={{ padding: '64px 32px', background: light, borderTop: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 36, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-block', background: '#f0f9f0', border: '1px solid #86efac', borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 700, color: '#15803d', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 14 }}>Free — no account needed</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Free AI Button</h2>
            <p style={{ fontSize: 15, color: '#6b7780', lineHeight: 1.65, marginBottom: 16 }}>
              Open your preferred AI assistant from anywhere inside Canvas — without leaving the page.
            </p>
            <p style={{ fontSize: 14, color: '#6b7780', lineHeight: 1.6, marginBottom: 24 }}>
              No subscription required. Opens your own AI account in a side window — you pay only for what you use, directly with the provider.
            </p>
            <a href={extensionUrl} style={{ display: 'inline-block', background: blue, color: '#fff', padding: '12px 24px', borderRadius: 7, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Install Free</a>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '24px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#6b7780', marginBottom: 14 }}>Works with</div>
            {['Claude', 'ChatGPT', 'Gemini', 'Microsoft Copilot', 'Perplexity'].map(tool => (
              <div key={tool} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f0f0f0', fontSize: 14, fontWeight: 600, color: navy }}>
                <span style={{ color: '#15803d', fontWeight: 700 }}>✓</span> {tool}
              </div>
            ))}
            <div style={{ marginTop: 14, fontSize: 13, color: '#6b7780' }}>No AI credits used. Opens your own account.</div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section style={{ background: `linear-gradient(135deg,#1a2a35,${navy})`, color: '#fff', padding: '72px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px,4vw,34px)', fontWeight: 900, marginBottom: 14, letterSpacing: '-0.3px' }}>Ready to get started?</h2>
          <p style={{ fontSize: 16, color: '#c8d8e4', lineHeight: 1.65, marginBottom: 32 }}>
            Install free and use the toolbar immediately. Add a package when you&apos;re ready.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={extensionUrl} style={{ background: blue, color: '#fff', padding: '14px 28px', borderRadius: 7, fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 18px rgba(7,112,163,.4)' }}>Install Canvas Enhancer Free</a>
            <a href="/pricing" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.28)', color: '#fff', padding: '14px 28px', borderRadius: 7, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>See Pricing</a>
          </div>
        </div>
      </section>

      <footer style={{ background: '#1a2a35', color: '#6b8090', padding: '24px 32px', textAlign: 'center', fontSize: 13, fontFamily: font }}>
        © {new Date().getFullYear()} Canvas Enhancer. Not affiliated with Instructure, Inc. or Canvas LMS.
      </footer>

    </main>
  );
}
