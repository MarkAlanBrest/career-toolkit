'use client';
import { useState } from 'react';

export default function HomePage() {
  const teachingMonthly  = process.env.NEXT_PUBLIC_LEMONSQUEEZY_TEACHING_MONTHLY_URL  || '#';
  const teachingSixMonth = process.env.NEXT_PUBLIC_LEMONSQUEEZY_TEACHING_SIXMONTH_URL || '#';
  const teachingAnnual   = process.env.NEXT_PUBLIC_LEMONSQUEEZY_TEACHING_ANNUAL_URL   || '#';
  const creationMonthly  = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CREATION_MONTHLY_URL  || '#';
  const creationSixMonth = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CREATION_SIXMONTH_URL || '#';
  const creationAnnual   = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CREATION_ANNUAL_URL   || '#';
  const extensionUrl     = process.env.NEXT_PUBLIC_EXTENSION_URL || '#';

  const [costPopup, setCostPopup] = useState<'teaching' | 'creation' | null>(null);
  const [faqOpen, setFaqOpen]     = useState<number | null>(null);

  const navy  = '#2d3b45';
  const blue  = '#0770a3';
  const light = '#f4f6f8';
  const font  = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

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

  const pricingRow = (monthly: string, sixMonth: string, annual: string, accent: string) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
        {[
          { label: 'Monthly', price: '$4.95', sub: 'per month', href: monthly, popular: false },
          { label: '6 Months', price: '$18.95', sub: '6 months', href: sixMonth, popular: true },
          { label: 'Annual', price: '$34.95', sub: 'per year', href: annual, popular: false },
        ].map(opt => (
          <div key={opt.label} style={{ border: opt.popular ? `2px solid ${accent}` : '1px solid #e5e7eb', borderRadius: 8, padding: '12px 10px', textAlign: 'center', position: 'relative' }}>
            {opt.popular && <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: accent, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>Popular</div>}
            <div style={{ fontSize: 20, fontWeight: 800, color: navy }}>{opt.price}</div>
            <div style={{ fontSize: 11, color: '#6b7780', marginTop: 2 }}>{opt.sub}</div>
            <a href={opt.href} style={{ display: 'block', marginTop: 8, background: accent, color: '#fff', padding: '6px 0', borderRadius: 5, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>{opt.label}</a>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: '#6b7780', textAlign: 'center' }}>Annual saves ~$24 · 6 months saves ~$11 vs monthly</div>
    </div>
  );

  const faqs = [
    { q: 'Do I need AI to use Canvas Enhancer?', a: 'No. The majority of features work without any AI at all — the content toolbar, bulk messaging, assignment scheduler, date auto-fill, grade audit reports, and more all work immediately after installing. AI features are optional add-ons that require a Claude account.' },
    { q: 'How much will I spend on Claude API each month?', a: 'Very little. Grading one student submission costs under half a cent. A typical month of active AI grading — processing 200 assignments — costs around $0.50 to $1.50. Content and quiz generation costs roughly $0.02 to $0.05 per item. Most teachers spend under $2 per month total on Claude API.' },
    { q: 'Why do I need my own Claude account?', a: 'Using your own Claude account means you pay Anthropic directly at their standard rates — no markup from us. You own your API usage, you control your spend, and there are no monthly generation limits imposed by Canvas Enhancer. We think this is the most honest model for educators.' },
    { q: 'Does Canvas Enhancer work with my school\'s Canvas?', a: 'Yes, if your school uses cloud-hosted Canvas (any *.instructure.com address). It works with both Classic Quizzes and New Quizzes, SpeedGrader, the Rich Content Editor, and the Canvas Inbox.' },
    { q: 'Can I use both packages at the same time?', a: 'Yes. Teaching Tools and Creation Tools share a single settings panel inside Canvas. Buy one, or both — everything works together with one license key per package.' },
    { q: 'Is my student data safe?', a: 'Canvas Enhancer does not store student data. When you use AI grading, assignment content is sent to your own Claude account via your personal API key — it goes directly from your browser to Anthropic, the same way it would if you pasted it into Claude.ai yourself.' },
    { q: 'What happens if I cancel?', a: 'Your tools remain active until the end of your paid period. You will not be charged again unless you renew.' },
  ];

  return (
    <main style={{ fontFamily: font, color: navy }}>

      {/* ── AI Cost Popup ────────────────────────────────────────────────────── */}
      {costPopup && (
        <div onClick={() => setCostPopup(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: '32px 28px', maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>{costPopup === 'teaching' ? 'Teaching Tools' : 'Creation Tools'} — Estimated Claude Costs</h3>
              <button onClick={() => setCostPopup(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7780', lineHeight: 1, padding: '0 4px' }}>×</button>
            </div>
            <p style={{ fontSize: 13, color: '#6b7780', marginBottom: 20, lineHeight: 1.5 }}>Based on Claude Haiku, the model Canvas Enhancer uses by default. You pay Anthropic directly — we never mark up AI costs.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {(costPopup === 'teaching' ? [
                { label: 'One graded assignment',    est: '~$0.003', note: 'Rubric scoring and written feedback. Less than half a cent.' },
                { label: 'Grading 30 students',      est: '~$0.09',  note: 'A typical class set for one assignment.' },
                { label: 'Grading 100 assignments',  est: '~$0.30',  note: 'A heavy grading session across multiple assignments.' },
                { label: 'Busy month of AI grading', est: '~$1–2',   note: 'Grading 200+ assignments across all your courses.' },
              ] : [
                { label: 'One AI-generated page',   est: '~$0.02', note: 'Full Canvas page with content, headers, and callouts.' },
                { label: 'One AI-generated quiz',   est: '~$0.05', note: 'Complete quiz with questions, answers, and feedback.' },
                { label: '10 pages + 5 quizzes',    est: '~$0.45', note: 'A productive week of content creation.' },
                { label: 'Busy month of creation',  est: '~$1–3',  note: 'Building out a full course unit with AI assistance.' },
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
            <button onClick={() => setCostPopup(null)} style={{ width: '100%', background: blue, color: '#fff', border: 'none', padding: '11px 0', borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Got it</button>
          </div>
        </div>
      )}

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav style={{ background: navy, padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, position: 'sticky', top: 0, zIndex: 100 }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>Canvas Enhancer</span>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a href="#teaching" style={{ color: '#a8bac4', fontSize: 14, textDecoration: 'none' }}>Teaching Tools</a>
          <a href="#creation" style={{ color: '#a8bac4', fontSize: 14, textDecoration: 'none' }}>Creation Tools</a>
          <a href="#pricing"  style={{ color: '#a8bac4', fontSize: 14, textDecoration: 'none' }}>Pricing</a>
          <a href={extensionUrl} style={{ background: blue, color: '#fff', padding: '7px 16px', borderRadius: 4, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Install Free</a>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section style={{ background: `linear-gradient(135deg,#1a2a35 0%,${navy} 55%,${blue} 100%)`, color: '#fff', padding: '80px 32px 88px', textAlign: 'center' }}>
        <div style={{ maxWidth: 740, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 20, padding: '5px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.7px', textTransform: 'uppercase', marginBottom: 24, color: '#c8e8f8' }}>
            Built for Canvas educators
          </div>
          <h1 style={{ fontSize: 'clamp(28px,5vw,52px)', fontWeight: 900, lineHeight: 1.1, margin: '0 0 22px', letterSpacing: '-0.5px' }}>
            Stop grading at midnight.<br />
            <span style={{ color: '#5ec3f0' }}>Start teaching again.</span>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.7, color: '#c8d8e4', margin: '0 0 36px', maxWidth: 580, marginLeft: 'auto', marginRight: 'auto' }}>
            Canvas Enhancer adds the tools Instructure never built — AI grading, bulk messaging, a professional content toolbar, automated scheduling, and more. All directly inside Canvas.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
            <a href={extensionUrl} style={{ background: blue, color: '#fff', padding: '14px 30px', borderRadius: 7, fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 18px rgba(7,112,163,.45)' }}>
              Install Free — Chrome &amp; Edge
            </a>
            <a href="#pricing" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.28)', color: '#fff', padding: '14px 30px', borderRadius: 7, fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>
              See Pricing
            </a>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Free to install. No account required. From $4.95/month to unlock AI-powered tools.</p>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '36px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 24, textAlign: 'center' }}>
          {[
            { number: '5+', label: 'hours saved per week', sub: 'typical teacher estimate' },
            { number: '42',  label: 'content components',    sub: 'free, no key needed' },
            { number: '<½¢', label: 'per AI-graded paper',    sub: 'you pay Claude directly' },
            { number: '2',   label: 'powerful packages',      sub: 'use one or both' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 40, fontWeight: 900, color: blue, lineHeight: 1 }}>{s.number}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: navy, marginTop: 6 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Teaching Tools ──────────────────────────────────────────────────── */}
      <section id="teaching" style={{ padding: '80px 32px', background: light }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', background: '#e8f3fb', border: `1px solid #c3dff5`, borderRadius: 20, padding: '4px 16px', fontSize: 11, fontWeight: 700, color: blue, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 16 }}>Teaching Tools</div>
            <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, margin: '0 0 14px', letterSpacing: '-0.3px' }}>Everything you do every week,<br />done in a fraction of the time.</h2>
            <p style={{ fontSize: 16, color: '#6b7780', maxWidth: 540, margin: '0 auto', lineHeight: 1.65 }}>
              Teaching Tools lives inside Canvas and handles the repetitive administrative work that consumes your evenings.
            </p>
          </div>

          {/* Feature cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 22, marginBottom: 48 }}>
            {[
              {
                icon: '🎓',
                title: 'AI-Assisted Grading',
                time: 'Save 2–3 hours per assignment',
                desc: 'Grade a full class set in under 30 minutes. Canvas Enhancer reads your rubric, evaluates each submission, and drafts written feedback — you review, adjust if needed, and publish.',
                example: '"Instead of spending a Sunday grading 28 essays, I spend 25 minutes reviewing what the AI drafted. The feedback is better than what I\'d write at 11pm anyway."',
              },
              {
                icon: '📢',
                title: 'Bulk Student Messaging',
                time: 'Save 30–60 minutes every week',
                desc: 'Write once, send to everyone — or filter by grade, activity, or assignment status. Message templates let you reuse your best communications every semester.',
                example: '"I used to copy-paste the same reminder to 30 students one at a time. Now it\'s one click."',
              },
              {
                icon: '📅',
                title: 'Assignment Scheduler',
                time: 'Save 1–2 hours per course setup',
                desc: 'Set your semester dates once. Canvas Enhancer automatically fills availability dates and due dates across all your assignments — no more editing each one individually.',
                example: '"Setting up a 16-week course used to take an afternoon. Now it takes 10 minutes."',
              },
              {
                icon: '⚠️',
                title: 'At Risk Identification',
                time: 'Catch problems before they escalate',
                desc: 'Course Vitals surfaces students who are falling behind — missing submissions, low engagement, or declining grades — so you can reach out before the deadline passes.',
                example: '"I found out a student was struggling two weeks before I would have noticed on my own."',
              },
              {
                icon: '📋',
                title: 'Grade Audit & Reports',
                time: 'Instant visibility into your gradebook',
                desc: 'The Needs Graded report shows exactly what is waiting for you. Grade Audit catches missing scores, outliers, and inconsistencies before students notice.',
                example: '"I stopped dreading the question \'did you grade my assignment yet?\'"',
              },
              {
                icon: '📣',
                title: 'Announcement Composer',
                time: 'Professional announcements in seconds',
                desc: 'Write and send polished Canvas announcements without leaving your workflow. Supports templates so your weekly check-in takes 90 seconds, not 10 minutes.',
                example: '"My announcements actually look professional now. Students actually read them."',
              },
            ].map(f => (
              <div key={f.title} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '26px 24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: navy, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: blue, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>{f.time}</div>
                <p style={{ fontSize: 14, color: '#444', lineHeight: 1.65, margin: '0 0 16px', flexGrow: 1 }}>{f.desc}</p>
                <blockquote style={{ margin: 0, padding: '12px 14px', background: '#f0f7ff', borderLeft: `3px solid ${blue}`, borderRadius: '0 6px 6px 0', fontSize: 13, color: '#555', fontStyle: 'italic', lineHeight: 1.55 }}>
                  {f.example}
                </blockquote>
              </div>
            ))}
          </div>

          {/* Before / After — Teaching */}
          <div style={{ background: '#fff', border: `1px solid ${blue}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ background: blue, color: '#fff', padding: '16px 24px', fontWeight: 700, fontSize: 15 }}>
              Grading one assignment — before and after
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: '24px', borderRight: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#dc2626', marginBottom: 14 }}>Without Canvas Enhancer</div>
                {['Open each submission one at a time', 'Read through the full response', 'Write feedback from scratch', 'Look up the rubric to assign scores', 'Switch back to the gradebook, enter the score', 'Repeat for every student', 'Total time for 30 students: 2–3 hours'].map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14, color: i === 6 ? '#dc2626' : '#444', fontWeight: i === 6 ? 700 : 400 }}>
                    <span style={{ color: '#dc2626', flexShrink: 0 }}>{i === 6 ? '⏱' : '✗'}</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '24px', background: '#f0f9f4' }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#15803d', marginBottom: 14 }}>With Canvas Enhancer</div>
                {['Open SpeedGrader as normal', 'AI reads the rubric and the submission', 'Rubric scores are pre-filled', 'Written feedback is drafted for you', 'Review, adjust if needed, and click Submit', 'Move to the next student — already pre-filled', 'Total time for 30 students: 20–30 minutes'].map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14, color: i === 6 ? '#15803d' : '#444', fontWeight: i === 6 ? 700 : 400 }}>
                    <span style={{ color: '#15803d', flexShrink: 0 }}>{i === 6 ? '⏱' : '✓'}</span>
                    <span>{s}</span>
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
            <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, margin: '0 0 14px', letterSpacing: '-0.3px' }}>Beautiful Canvas pages.<br />No coding. No design skills. No blank screen.</h2>
            <p style={{ fontSize: 16, color: '#6b7780', maxWidth: 560, margin: '0 auto', lineHeight: 1.65 }}>
              Creation Tools gives you a professional design toolbar directly inside the Canvas editor — plus AI that builds complete pages and quizzes from a single sentence.
            </p>
          </div>

          {/* Feature cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 22, marginBottom: 48 }}>
            {[
              {
                icon: '🛠️',
                title: 'Rich Content Toolbar',
                time: '42 components, inserted in one click',
                desc: 'A full design toolbar appears below the Canvas editor. Choose from headers, callouts, cards, columns, tabs, checklists, progress trackers, instructor bios, office hours cards, grading breakdowns, and more.',
                example: '"My module pages actually look like a real course now. Students can find what they need. I\'ve gotten more compliments on course design this semester than in the last five years combined."',
              },
              {
                icon: '✨',
                title: 'AI Canvas Page Builder',
                time: 'A complete page in under 60 seconds',
                desc: 'Type a description — "Introduction to photosynthesis for 9th grade, with a key terms section and a Did You Know callout" — and Canvas Enhancer builds the full page, formatted and ready to publish.',
                example: '"I built an entire unit\'s worth of pages in one afternoon. It would have taken me two weeks before."',
              },
              {
                icon: '📝',
                title: 'AI Quiz Maker',
                time: '15-question quiz in under 90 seconds',
                desc: 'Describe your topic and question types. Canvas Enhancer generates questions, multiple-choice answers, correct answer keys, point values, and per-question feedback — and builds the quiz directly in Canvas.',
                example: '"The AI wrote better distractor choices than I do. Students said the quizzes felt fair, which was a surprise."',
              },
            ].map(f => (
              <div key={f.title} style={{ background: light, border: '1px solid #e5e7eb', borderRadius: 12, padding: '26px 24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: navy, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: navy, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>{f.time}</div>
                <p style={{ fontSize: 14, color: '#444', lineHeight: 1.65, margin: '0 0 16px', flexGrow: 1 }}>{f.desc}</p>
                <blockquote style={{ margin: 0, padding: '12px 14px', background: '#fff', borderLeft: `3px solid ${navy}`, borderRadius: '0 6px 6px 0', fontSize: 13, color: '#555', fontStyle: 'italic', lineHeight: 1.55 }}>
                  {f.example}
                </blockquote>
              </div>
            ))}
          </div>

          {/* Component grid showcase */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', marginBottom: 48 }}>
            <div style={{ background: navy, color: '#fff', padding: '16px 24px', fontWeight: 700, fontSize: 15 }}>
              42 ready-to-use components — included free, no license key required
            </div>
            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16 }}>
              {[
                { cat: 'Dividers', items: ['Simple line', 'Dashed', 'Gradient bar', 'Double line'] },
                { cat: 'Headers', items: ['Section banner', 'Solid banner', 'Underline header', 'Warning banner'] },
                { cat: 'Callouts', items: ['Tip', 'Warning', 'Important', 'Note', 'Did You Know', 'Success'] },
                { cat: 'Lists', items: ['Checklist', 'Steps', 'Icon list', 'Progress tracker'] },
                { cat: 'Layouts', items: ['Two columns', 'Three columns', 'Collapsible', 'Image + text'] },
                { cat: 'Cards', items: ['Instructor Bio', 'Office Hours', 'Due Dates', 'Course Policies', 'Welcome', 'Grading Breakdown'] },
              ].map(group => (
                <div key={group.cat}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: blue, marginBottom: 8 }}>{group.cat}</div>
                  {group.items.map(item => (
                    <div key={item} style={{ fontSize: 13, color: '#444', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#9ca3af', fontSize: 11 }}>◆</span> {item}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Before / After — Creation */}
          <div style={{ border: `1px solid ${navy}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ background: navy, color: '#fff', padding: '16px 24px', fontWeight: 700, fontSize: 15 }}>
              Building a Canvas module page — before and after
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: '24px', borderRight: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#dc2626', marginBottom: 14 }}>Without Canvas Enhancer</div>
                {[
                  'Start from a blank white text box',
                  'Add formatting manually — no design tools',
                  'Search the internet for design inspiration',
                  'Try to write HTML tables by hand (or give up)',
                  'Page looks like a Word document from 2003',
                  'Students scroll past it without reading',
                  'Total time: 45–90 minutes, mediocre result',
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14, color: i === 6 ? '#dc2626' : '#444', fontWeight: i === 6 ? 700 : 400 }}>
                    <span style={{ color: '#dc2626', flexShrink: 0 }}>{i === 6 ? '⏱' : '✗'}</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '24px', background: '#f0f9f4' }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#15803d', marginBottom: 14 }}>With Canvas Enhancer</div>
                {[
                  'Open any Canvas page editor',
                  'Type your topic into AI Page Builder',
                  'Complete formatted page generated in seconds',
                  'Or pick components from the toolbar: headers, callouts, cards',
                  'Click to insert — styled and accessible instantly',
                  'Professional look students actually engage with',
                  'Total time: 5–15 minutes, polished result',
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14, color: i === 6 ? '#15803d' : '#444', fontWeight: i === 6 ? 700 : 400 }}>
                    <span style={{ color: '#15803d', flexShrink: 0 }}>{i === 6 ? '⏱' : '✓'}</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Free AI Button ───────────────────────────────────────────────────── */}
      <section id="free" style={{ padding: '64px 32px', background: light, borderTop: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 36, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-block', background: '#f0f9f0', border: '1px solid #86efac', borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 700, color: '#15803d', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 14 }}>Free — no account needed</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Free AI Button</h2>
            <p style={{ fontSize: 15, color: '#6b7780', lineHeight: 1.65, marginBottom: 20 }}>
              Open your preferred AI assistant from anywhere inside Canvas — without leaving the page. Works with Claude, ChatGPT, Gemini, Microsoft Copilot, and Perplexity.
            </p>
            <p style={{ fontSize: 14, color: '#6b7780', lineHeight: 1.6, marginBottom: 24 }}>
              No Canvas Enhancer subscription required. The button opens your own AI account in a side window — you pay only for what you use, directly with the provider.
            </p>
            <a href={extensionUrl} style={{ display: 'inline-block', background: blue, color: '#fff', padding: '12px 24px', borderRadius: 7, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              Install Free
            </a>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '24px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#6b7780', marginBottom: 14 }}>Works with</div>
            {['Claude', 'ChatGPT', 'Gemini', 'Microsoft Copilot', 'Perplexity'].map(tool => (
              <div key={tool} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f0f0f0', fontSize: 14, fontWeight: 600, color: navy }}>
                <span style={{ color: '#15803d', fontWeight: 700 }}>✓</span> {tool}
              </div>
            ))}
            <div style={{ marginTop: 14, fontSize: 13, color: '#6b7780', lineHeight: 1.5 }}>
              No AI credits used. Opens your own account.
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '80px 32px', background: '#fff' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 900, margin: '0 0 14px', letterSpacing: '-0.3px' }}>Simple, honest pricing</h2>
            <p style={{ fontSize: 16, color: '#6b7780', margin: 0, lineHeight: 1.65 }}>
              The content toolbar is free forever. Unlock packages when you're ready.<br />
              You bring your own Claude API key — we never mark up AI costs.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 28, alignItems: 'start' }}>

            {/* Teaching Tools */}
            <div style={{ background: light, border: `2px solid ${blue}`, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: blue, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 20, whiteSpace: 'nowrap' }}>Most Popular</div>
              <div style={{ background: blue, color: '#fff', padding: '24px 28px 20px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', opacity: 0.8, marginBottom: 4 }}>Teaching Tools</div>
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4 }}>Save hours of repetitive work every week</div>
              </div>
              <div style={{ padding: '24px 28px' }}>
                {pricingRow(teachingMonthly, teachingSixMonth, teachingAnnual, blue)}
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7780', marginBottom: 12 }}>Includes</div>
                {featureList(['AI-assisted grading inside SpeedGrader', 'Drafted rubric scores and student feedback', 'Grade Audit tools and reports', 'Bulk student messaging', 'Reusable message templates', 'Announcement Composer', 'Assignment Scheduler', 'Automatic availability and due dates', 'Course Vitals and activity reports', 'Needs Graded report', 'At Risk student identification', 'Shared Canvas API settings'])}
                <div style={{ background: '#e8f3fb', border: `1px solid #c3dff5`, borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: navy, marginBottom: 4 }}>✦ AI features require Claude account</div>
                  <div style={{ fontSize: 13, color: '#444', lineHeight: 1.55, marginBottom: 8 }}>AI grading and feedback. You pay Anthropic directly.</div>
                  <button onClick={() => setCostPopup('teaching')} style={{ background: 'none', border: 'none', padding: 0, color: blue, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>See estimated costs →</button>
                </div>
              </div>
            </div>

            {/* Creation Tools */}
            <div style={{ background: light, border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ background: navy, color: '#fff', padding: '24px 28px 20px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', opacity: 0.8, marginBottom: 4 }}>Creation Tools</div>
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4 }}>Build exceptional Canvas courses faster</div>
              </div>
              <div style={{ padding: '24px 28px' }}>
                {pricingRow(creationMonthly, creationSixMonth, creationAnnual, navy)}
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7780', marginBottom: 12 }}>Includes</div>
                {featureList(['Rich Content Toolbar inside the Canvas editor', '42 professionally designed components', 'Accessible layouts, callouts, cards, and buttons', 'AI-assisted Canvas page creation', 'Complete AI-generated quizzes', 'Questions, answers, feedback, and point values', 'Editing and review before publishing', 'Direct integration with Canvas'])}
                <div style={{ background: '#f4f6f8', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: navy, marginBottom: 4 }}>✦ AI features require Claude account</div>
                  <div style={{ fontSize: 13, color: '#444', lineHeight: 1.55, marginBottom: 8 }}>AI page and quiz generation. You pay Anthropic directly.</div>
                  <button onClick={() => setCostPopup('creation')} style={{ background: 'none', border: 'none', padding: 0, color: navy, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>See estimated costs →</button>
                </div>
              </div>
            </div>

          </div>

          {/* Package explainer */}
          <div style={{ marginTop: 32, background: light, border: '1px solid #e5e7eb', borderRadius: 12, padding: '24px 28px', textAlign: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Choose one package — or use both</h3>
            <p style={{ fontSize: 14, color: '#6b7780', lineHeight: 1.65, margin: 0, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
              Teaching Tools and Creation Tools work independently and together through one shared settings panel. Most tools work without AI the moment you install. Add a Claude API key any time to unlock AI features.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section style={{ padding: '72px 32px', background: light }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, textAlign: 'center', marginBottom: 8, letterSpacing: '-0.3px' }}>Common questions</h2>
          <p style={{ fontSize: 15, color: '#6b7780', textAlign: 'center', marginBottom: 40 }}>Everything you need to know before you install.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  style={{ width: '100%', background: 'none', border: 'none', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left', gap: 16 }}
                >
                  <span style={{ fontSize: 15, fontWeight: 700, color: navy, lineHeight: 1.4 }}>{faq.q}</span>
                  <span style={{ fontSize: 20, color: '#9ca3af', flexShrink: 0, transform: faqOpen === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.15s' }}>+</span>
                </button>
                {faqOpen === i && (
                  <div style={{ padding: '0 20px 18px', fontSize: 14, color: '#444', lineHeight: 1.7 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────────── */}
      <section style={{ background: `linear-gradient(135deg,#1a2a35,${navy})`, color: '#fff', padding: '80px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 900, marginBottom: 16, letterSpacing: '-0.3px' }}>
            Thousands of hours of teacher time,<br />waiting to be reclaimed.
          </h2>
          <p style={{ fontSize: 16, color: '#c8d8e4', lineHeight: 1.65, marginBottom: 36 }}>
            Install in under a minute. Most tools work immediately. Add a Claude API key any time to unlock AI features.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
            <a href={extensionUrl} style={{ background: blue, color: '#fff', padding: '14px 30px', borderRadius: 7, fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 18px rgba(7,112,163,.45)' }}>
              Install Canvas Enhancer Free
            </a>
            <a href="#pricing" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.28)', color: '#fff', padding: '14px 30px', borderRadius: 7, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
              View Pricing
            </a>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            Compatible with cloud-hosted Canvas (*.instructure.com). Not affiliated with Instructure, Inc.
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#1a2a35', color: '#6b8090', padding: '24px 32px', textAlign: 'center', fontSize: 13 }}>
        © {new Date().getFullYear()} Canvas Enhancer. Not affiliated with Instructure, Inc. or Canvas LMS.
      </footer>

    </main>
  );
}
