'use client';
import SiteNav from '../components/SiteNav';

const ink  = '#243746';
const blue = '#0770B8';
const teal = '#0F8F8C';
const line = '#D8E1E8';
const soft = '#F4F8FB';
const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

const freeFeatures = [
  {
    icon: '🛠️',
    title: 'Content Studio',
    tag: '42 design components',
    desc: 'A full design toolbar sits inside every Canvas page editor. One click inserts headers, callouts, cards, columns, checklists, instructor bios, office hours cards, grading breakdowns, and more — already styled and accessible.',
    quote: '"My pages actually look like a real course now. Students read them."',
  },
  {
    icon: '📅',
    title: 'Assignment Scheduler',
    tag: 'Set a semester in 10 minutes',
    desc: 'Set your start date and spacing rules once. Canvas Enhancer fills every assignment\'s availability, due date, and lock date across the entire course — no more editing each one individually.',
    quote: '"Setting up a 16-week course used to take an afternoon. Now it\'s done before my coffee gets cold."',
  },
  {
    icon: '📨',
    title: 'Message Pulse',
    tag: 'Bulk outreach + automations',
    desc: 'Write once, send to everyone. Filter by grade, assignment status, or activity. Save reusable templates for missing work, upcoming deadlines, check-ins, and positive notes. Set automations to run automatically on a schedule.',
    quote: '"I used to copy-paste the same reminder to 30 students one at a time. Now it\'s one click, or it just sends itself."',
  },
  {
    icon: '📣',
    title: 'Announcement Composer',
    tag: 'Quick Post templates',
    desc: 'Save your best Canvas announcements as reusable templates. Pick one, fill in any blanks, and post in seconds. Covers office hours reminders, assignment heads-ups, weekly check-ins, and anything you send more than once.',
    quote: '"My announcements actually look consistent now. I stopped starting from scratch every week."',
  },
  {
    icon: '📝',
    title: 'Quiz Pulse',
    tag: 'Quiz workflow inside SpeedGrader',
    desc: 'A dedicated quiz toolbar gives you quick access to quiz creation and management tools without leaving the SpeedGrader workflow. Fewer page loads, less clicking around.',
    quote: '"Everything I need for a quiz day is now in one place."',
  },
  {
    icon: '📋',
    title: 'Date Autofill',
    tag: 'Smart date prefills on every assignment',
    desc: 'When you open an assignment to edit dates, Canvas Enhancer pre-fills the due date, available from, and until fields based on your last settings. Stop typing the same dates over and over.',
    quote: '"It remembered my preferences. I didn\'t have to."',
  },
  {
    icon: '🌐',
    title: 'AI Button',
    tag: 'Open any AI assistant inside Canvas',
    desc: 'Launch Claude, ChatGPT, Gemini, Copilot, or Perplexity in a side panel without leaving Canvas. No account needed — it opens your existing AI account in a split view. No Canvas Enhancer credits used.',
    quote: '"I can draft a response to a student question with AI without switching tabs."',
  },
  {
    icon: '⚠️',
    title: 'At-Risk Identification',
    tag: 'Catch problems before they escalate',
    desc: 'Course Vitals surfaces students who are falling behind — missing submissions, low engagement, declining grades — so you can reach out before it\'s too late.',
    quote: '"I found out a student was struggling two weeks before I would have noticed on my own."',
  },
];

const aiFeatures = [
  {
    icon: '🎓',
    title: 'AI-Assisted Grading',
    cost: '1 credit per submission',
    desc: 'In SpeedGrader, AI reads your rubric and the student\'s submission, pre-fills rubric scores, and drafts written feedback. You review, adjust if needed, and submit. A class set of 30 goes from 2 hours to 25 minutes.',
    quote: '"The feedback is more consistent than what I write at 11pm anyway."',
  },
  {
    icon: '✨',
    title: 'AI Page Builder',
    cost: '5 credits per page',
    desc: 'Type a description — "Introduction to photosynthesis for 9th grade, with a key terms section and a Did You Know callout" — and Canvas Enhancer builds the full formatted Canvas page, ready to publish.',
    quote: '"I built an entire unit\'s worth of pages in one afternoon. It would have taken two weeks before."',
  },
  {
    icon: '📝',
    title: 'AI Quiz Maker',
    cost: '5 credits per quiz',
    desc: 'Describe your topic and question style. Canvas Enhancer generates questions, answer choices, correct keys, point values, and per-question feedback — and builds the quiz directly in Canvas.',
    quote: '"The AI wrote better distractor choices than I do."',
  },
];

const componentGroups = [
  { cat: 'Dividers',  items: ['Simple line', 'Dashed', 'Gradient bar', 'Double line'] },
  { cat: 'Headers',   items: ['Section banner', 'Solid banner', 'Underline header', 'Warning banner'] },
  { cat: 'Callouts',  items: ['Tip', 'Warning', 'Important', 'Note', 'Did You Know', 'Success', 'Do Not', 'Custom'] },
  { cat: 'Lists',     items: ['Checklist', 'Steps', 'Icon list ✅', 'Icon list ▶', 'Badge labels', 'Progress tracker'] },
  { cat: 'Layouts',   items: ['Two columns', 'Three columns', 'Custom columns', 'Collapsible', 'Image + text'] },
  { cat: 'Cards',     items: ['Card grid', 'Instructor Bio', 'Office Hours', 'Due Dates', 'Course Policies', 'Welcome', 'Grading Breakdown', 'Tips for Success', 'Submit Checklist', 'Pull quote', 'Button link'] },
];

export default function FeaturesPage() {
  const extensionUrl = process.env.NEXT_PUBLIC_EXTENSION_URL || '#';

  return (
    <main style={{ fontFamily: font, color: ink, background: '#fff' }}>
      <SiteNav active="features" />

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section style={{ background: '#EAF2F7', borderBottom: `1px solid ${line}`, padding: '72px 32px 64px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', border: `1px solid ${line}`, background: '#fff', color: blue, borderRadius: 999, fontSize: 12, fontWeight: 900, marginBottom: 22 }}>
            Install free. No credit card. No subscription.
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(36px,6vw,64px)', lineHeight: 1, letterSpacing: '-0.5px', color: ink }}>
            A full Canvas toolkit,<br />completely free.
          </h1>
          <p style={{ margin: '22px auto 0', fontSize: 18, lineHeight: 1.65, color: '#526A79', maxWidth: 620 }}>
            Eight tools that save teachers hours every week — included at no cost. When you want AI for grading or content creation, you buy credits inside the app. No commitment. Spend only what you want.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 28 }}>
            <a href={extensionUrl} style={{ background: blue, color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 900, padding: '13px 22px', borderRadius: 8, boxShadow: '0 12px 28px rgba(7,112,184,.22)' }}>Install Free</a>
            <a href="#ai-tools" style={{ background: '#fff', color: ink, border: `1px solid ${line}`, textDecoration: 'none', fontSize: 15, fontWeight: 900, padding: '13px 22px', borderRadius: 8 }}>See AI tools</a>
          </div>
        </div>
      </section>

      {/* ── Free tools ────────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 32px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ maxWidth: 680, marginBottom: 48 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E8F5E9', border: '1px solid #A5D6A7', color: '#2E7D32', borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 900, marginBottom: 16 }}>
              ✓ Free — no subscription, no credit card
            </div>
            <h2 style={{ margin: 0, fontSize: 'clamp(28px,4vw,44px)', lineHeight: 1.05, color: ink }}>Eight tools included for free.</h2>
            <p style={{ margin: '14px 0 0', fontSize: 16, lineHeight: 1.7, color: '#607684' }}>Every tool below is included in the extension with no cost, no account required, and no usage limits. Use them all day, every day.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
            {freeFeatures.map(f => (
              <div key={f.title} style={{ border: `1px solid ${line}`, borderRadius: 12, padding: '26px 24px', background: soft, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ fontSize: 30 }}>{f.icon}</span>
                  <span style={{ background: '#E8F5E9', color: '#2E7D32', border: '1px solid #A5D6A7', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 900 }}>Free</span>
                </div>
                <div style={{ fontWeight: 900, fontSize: 17, color: ink, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: blue, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 12 }}>{f.tag}</div>
                <p style={{ fontSize: 14, color: '#526A79', lineHeight: 1.65, margin: '0 0 16px', flexGrow: 1 }}>{f.desc}</p>
                <blockquote style={{ margin: 0, padding: '12px 14px', background: '#fff', borderLeft: `3px solid ${line}`, borderRadius: '0 6px 6px 0', fontSize: 13, color: '#607684', fontStyle: 'italic', lineHeight: 1.55 }}>
                  {f.quote}
                </blockquote>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Component list ────────────────────────────────────────────────────── */}
      <section style={{ padding: '0 32px 80px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ border: `1px solid ${line}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: ink, color: '#fff', padding: '16px 24px', fontWeight: 900, fontSize: 15 }}>
              42 ready-to-use components — all free, no limits
            </div>
            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 20 }}>
              {componentGroups.map(group => (
                <div key={group.cat}>
                  <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: blue, marginBottom: 10 }}>{group.cat}</div>
                  {group.items.map(item => (
                    <div key={item} style={{ fontSize: 13, color: '#526A79', padding: '3px 0', display: 'flex', gap: 6 }}>
                      <span style={{ color: '#A8BBC8', fontSize: 11, marginTop: 2 }}>◆</span> {item}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── AI tools ──────────────────────────────────────────────────────────── */}
      <section id="ai-tools" style={{ padding: '80px 32px', background: '#102533', color: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ maxWidth: 680, marginBottom: 48 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.18)', color: '#8BE0DC', borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 900, marginBottom: 16 }}>
              Optional — uses AI credits
            </div>
            <h2 style={{ margin: 0, fontSize: 'clamp(28px,4vw,44px)', lineHeight: 1.05 }}>Three AI tools, when you want them.</h2>
            <p style={{ margin: '14px 0 0', fontSize: 16, lineHeight: 1.7, color: '#BCD0DA' }}>
              Buy a credit pack in the app. No subscription, no monthly charge. Credits don't expire. Spend exactly as much as you want.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20, marginBottom: 36 }}>
            {aiFeatures.map(f => (
              <div key={f.title} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, padding: '26px 24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ fontSize: 30 }}>{f.icon}</span>
                  <span style={{ background: 'rgba(11,143,140,.25)', color: '#8BE0DC', border: '1px solid rgba(11,143,140,.4)', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 900 }}>{f.cost}</span>
                </div>
                <div style={{ fontWeight: 900, fontSize: 17, color: '#fff', marginBottom: 12 }}>{f.title}</div>
                <p style={{ fontSize: 14, color: '#BCD0DA', lineHeight: 1.65, margin: '0 0 16px', flexGrow: 1 }}>{f.desc}</p>
                <blockquote style={{ margin: 0, padding: '12px 14px', background: 'rgba(255,255,255,.06)', borderLeft: '3px solid rgba(255,255,255,.18)', borderRadius: '0 6px 6px 0', fontSize: 13, color: '#8BA5B5', fontStyle: 'italic', lineHeight: 1.55 }}>
                  {f.quote}
                </blockquote>
              </div>
            ))}
          </div>

          <div style={{ background: blue, borderRadius: 10, padding: '24px 28px', display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 950, lineHeight: 1 }}>$10 = 100 credits &nbsp;·&nbsp; $20 = 250 credits &nbsp;·&nbsp; $50 = 650 credits</div>
              <div style={{ color: '#D7ECF8', fontSize: 14, marginTop: 8 }}>Prepaid. No expiry. No subscription. Buy from the toolbar in the app.</div>
            </div>
            <a href="/pricing" style={{ background: '#fff', color: blue, textDecoration: 'none', borderRadius: 8, padding: '11px 18px', fontWeight: 950, fontSize: 14, flexShrink: 0 }}>View pricing</a>
          </div>
        </div>
      </section>

      {/* ── Before/after ──────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 32px', background: soft }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ margin: '0 0 36px', fontSize: 'clamp(26px,4vw,40px)', lineHeight: 1.08, color: ink }}>What the difference looks like day-to-day</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,460px),1fr))', gap: 20 }}>
            {[
              {
                title: 'Grading one assignment (30 students)',
                before: ['Open each submission one at a time', 'Read through the full response', 'Write feedback from scratch', 'Look up the rubric to assign scores', 'Enter score in gradebook', 'Repeat 29 more times', '⏱ 2–3 hours'],
                after:  ['AI reads rubric + submission instantly', 'Rubric scores pre-filled', 'Feedback drafted for you', 'Review, adjust if needed, click Submit', 'Move to next — already pre-filled', '✓ Uses 1 AI credit per student', '⏱ 20–30 minutes'],
                ai: true,
              },
              {
                title: 'Setting up a 16-week course',
                before: ['Open each assignment individually', 'Type in the due date by hand', 'Set available from and until dates', 'Check you didn\'t make a typo', 'Repeat for every assignment', 'Come back next semester and do it again', '⏱ 1–2 hours per course'],
                after:  ['Set start date and spacing rules once', 'Assignment Scheduler fills every date', 'All assignments updated instantly', 'Done. That\'s it.', '', '', '⏱ Under 10 minutes — free tool'],
                ai: false,
              },
            ].map(scenario => (
              <div key={scenario.title} style={{ border: `1px solid ${line}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ background: ink, color: '#fff', padding: '14px 22px', fontWeight: 900, fontSize: 14 }}>{scenario.title}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  <div style={{ padding: '20px', borderRight: `1px solid ${line}` }}>
                    <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#DC2626', marginBottom: 12 }}>Without CE</div>
                    {scenario.before.map((s, i) => s && (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13, color: i === scenario.before.length - 1 ? '#DC2626' : '#526A79', fontWeight: i === scenario.before.length - 1 ? 700 : 400 }}>
                        {i < scenario.before.length - 1 && <span style={{ color: '#DC2626', flexShrink: 0 }}>✗</span>}
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '20px', background: '#F0F9F4' }}>
                    <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#15803D', marginBottom: 12 }}>With CE</div>
                    {scenario.after.map((s, i) => s && (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13, color: i === scenario.after.length - 1 ? '#15803D' : i === scenario.after.length - 2 && scenario.ai ? teal : '#526A79', fontWeight: (i >= scenario.after.length - 2) ? 700 : 400 }}>
                        {i < scenario.after.length - 2 && <span style={{ color: '#15803D', flexShrink: 0 }}>✓</span>}
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <section style={{ background: ink, color: '#fff', padding: '72px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(28px,4vw,44px)', lineHeight: 1.05 }}>Start with the free tools. Add AI if you want it.</h2>
          <p style={{ color: '#BFD0DA', fontSize: 16, lineHeight: 1.7, margin: '16px 0 28px' }}>
            Install takes about 60 seconds. No account, no card, no subscription. Everything free is immediately available.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={extensionUrl} style={{ display: 'inline-block', background: blue, color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 950, padding: '13px 22px', borderRadius: 8, boxShadow: '0 12px 28px rgba(7,112,184,.25)' }}>Install Free</a>
            <a href="/pricing" style={{ display: 'inline-block', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.18)', color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 900, padding: '13px 22px', borderRadius: 8 }}>See AI credit packs</a>
          </div>
        </div>
      </section>
    </main>
  );
}
