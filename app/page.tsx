'use client';
import { useState } from 'react';
import SiteNav from './components/SiteNav';

export default function HomePage() {
  const teachingMonthly  = process.env.NEXT_PUBLIC_LEMONSQUEEZY_TEACHING_MONTHLY_URL  || '#';
  const teachingSixMonth = process.env.NEXT_PUBLIC_LEMONSQUEEZY_TEACHING_SIXMONTH_URL || '#';
  const teachingAnnual   = process.env.NEXT_PUBLIC_LEMONSQUEEZY_TEACHING_ANNUAL_URL   || '#';
  const creationMonthly  = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CREATION_MONTHLY_URL  || '#';
  const creationSixMonth = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CREATION_SIXMONTH_URL || '#';
  const creationAnnual   = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CREATION_ANNUAL_URL   || '#';
  const extensionUrl     = process.env.NEXT_PUBLIC_EXTENSION_URL || '#';

  const [costPopup, setCostPopup] = useState<'teaching' | 'creation' | null>(null);
  const [faqOpen,   setFaqOpen]   = useState<number | null>(null);

  const navy  = '#2d3b45';
  const blue  = '#0770a3';
  const light = '#f4f6f8';
  const font  = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

  const pricingRow = (monthly: string, sixMonth: string, annual: string, accent: string) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
        {[
          { label: 'Monthly',  price: '$4.95',  sub: 'per month', href: monthly,  popular: false },
          { label: '6 Months', price: '$18.95', sub: '6 months',  href: sixMonth, popular: true  },
          { label: 'Annual',   price: '$34.95', sub: 'per year',  href: annual,   popular: false },
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

  const faqs = [
    { q: 'Do I need AI to use Canvas Enhancer?', a: 'No. The majority of features work without any AI at all — the content toolbar, bulk messaging, assignment scheduler, date auto-fill, grade audit reports, and more all work immediately after installing. AI features are optional and require a Claude account.' },
    { q: 'How much will I spend on Claude API each month?', a: 'Very little. Grading one student submission costs under half a cent. A typical month of active AI grading — 200 assignments — costs around $0.50–$1.50. Content and quiz generation costs roughly $0.02–$0.05 per item. Most teachers spend under $2 per month total.' },
    { q: 'Why do I need my own Claude account?', a: 'Using your own Claude account means you pay Anthropic directly at their standard rates — no markup from us. You own your usage, control your spend, and there are no monthly limits imposed by Canvas Enhancer.' },
    { q: 'Does Canvas Enhancer work with my school\'s Canvas?', a: 'Yes, if your school uses cloud-hosted Canvas (any *.instructure.com address). It works with Classic Quizzes, New Quizzes, SpeedGrader, the Rich Content Editor, and the Canvas Inbox.' },
    { q: 'Can I use both packages at the same time?', a: 'Yes. Teaching Tools and Creation Tools share a single settings panel inside Canvas. Buy one or both — everything works together with one license key per package.' },
    { q: 'Is my student data safe?', a: 'Canvas Enhancer does not store student data. When you use AI grading, content is sent directly from your browser to your own Claude account — the same as if you pasted it into Claude.ai yourself.' },
    { q: 'What happens if I cancel?', a: 'Your tools remain active until the end of your paid period. You will not be charged again unless you renew.' },
  ];

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
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 20px', lineHeight: 1.5 }}>
              <a href="https://www.anthropic.com/pricing" target="_blank" rel="noopener noreferrer" style={{ color: blue }}>See current Claude pricing →</a>
            </p>
            <button onClick={() => setCostPopup(null)} style={{ width: '100%', background: blue, color: '#fff', border: 'none', padding: '11px 0', borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Got it</button>
          </div>
        </div>
      )}

      <SiteNav active="home" />

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
            <a href="/features" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.28)', color: '#fff', padding: '14px 30px', borderRadius: 7, fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>
              See All Features
            </a>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Free to install. No account required. From $4.95/month to unlock AI-powered tools.</p>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '36px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 24, textAlign: 'center' }}>
          {[
            { number: '5+',  label: 'hours saved per week',  sub: 'typical teacher estimate' },
            { number: '42',  label: 'content components',    sub: 'free, no key needed' },
            { number: '<½¢', label: 'per AI-graded paper',   sub: 'you pay Claude directly' },
            { number: '2',   label: 'powerful packages',     sub: 'use one or both' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 40, fontWeight: 900, color: blue, lineHeight: 1 }}>{s.number}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: navy, marginTop: 6 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Package previews ─────────────────────────────────────────────────── */}
      <section style={{ padding: '72px 32px', background: light }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px,4vw,34px)', fontWeight: 900, textAlign: 'center', marginBottom: 12, letterSpacing: '-0.3px' }}>Two packages. One shared settings panel.</h2>
          <p style={{ fontSize: 16, color: '#6b7780', textAlign: 'center', marginBottom: 48, lineHeight: 1.65 }}>Buy one or both. Most tools work without AI the moment you install.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 24 }}>

            {/* Teaching Tools preview */}
            <div style={{ background: '#fff', border: `2px solid ${blue}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ background: blue, color: '#fff', padding: '24px 28px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', opacity: 0.8, marginBottom: 6 }}>Teaching Tools</div>
                <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.3 }}>Save hours of repetitive work every week</div>
              </div>
              <div style={{ padding: '28px' }}>
                {[
                  { icon: '🎓', text: 'Grade a full class set in 30 minutes with AI-assisted feedback' },
                  { icon: '📢', text: 'Message every student — or just the ones who need it — in one click' },
                  { icon: '📅', text: 'Set your semester schedule once, dates fill automatically' },
                  { icon: '⚠️', text: 'Identify at-risk students before the deadline passes' },
                  { icon: '📋', text: 'Grade audit and Needs Graded reports at a glance' },
                ].map(item => (
                  <div key={item.text} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
                    <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                    <span style={{ fontSize: 14, color: '#444', lineHeight: 1.55 }}>{item.text}</span>
                  </div>
                ))}
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <a href="/features#teaching" style={{ color: blue, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>See all Teaching Tools features →</a>
                  <a href="#pricing" style={{ background: blue, color: '#fff', padding: '9px 18px', borderRadius: 7, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Get Started</a>
                </div>
              </div>
            </div>

            {/* Creation Tools preview */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ background: navy, color: '#fff', padding: '24px 28px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', opacity: 0.8, marginBottom: 6 }}>Creation Tools</div>
                <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.3 }}>Build exceptional Canvas courses faster</div>
              </div>
              <div style={{ padding: '28px' }}>
                {[
                  { icon: '🛠️', text: '42 professional content components, inserted with one click' },
                  { icon: '✨', text: 'AI builds a complete, formatted Canvas page in under 60 seconds' },
                  { icon: '📝', text: 'Generate a 15-question quiz with feedback in 90 seconds' },
                  { icon: '🎨', text: 'Headers, callouts, cards, columns, and more — all accessible' },
                  { icon: '🔗', text: 'Inserts directly into Canvas — no copy-pasting required' },
                ].map(item => (
                  <div key={item.text} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
                    <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                    <span style={{ fontSize: 14, color: '#444', lineHeight: 1.55 }}>{item.text}</span>
                  </div>
                ))}
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <a href="/features#creation" style={{ color: navy, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>See all Creation Tools features →</a>
                  <a href="#pricing" style={{ background: navy, color: '#fff', padding: '9px 18px', borderRadius: 7, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Get Started</a>
                </div>
              </div>
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
              The content toolbar is free forever. Unlock packages when you&apos;re ready.<br />
              You bring your own Claude API key — we never mark up AI costs.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 28, alignItems: 'start' }}>

            <div style={{ background: light, border: `2px solid ${blue}`, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: blue, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 20, whiteSpace: 'nowrap' }}>Most Popular</div>
              <div style={{ background: blue, color: '#fff', padding: '24px 28px 20px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', opacity: 0.8, marginBottom: 4 }}>Teaching Tools</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Grading, messaging, scheduling &amp; reporting</div>
              </div>
              <div style={{ padding: '24px 28px' }}>
                {pricingRow(teachingMonthly, teachingSixMonth, teachingAnnual, blue)}
                {featureList(['AI-assisted grading inside SpeedGrader', 'Drafted rubric scores and student feedback', 'Grade Audit and Needs Graded reports', 'Bulk student messaging and templates', 'Announcement Composer', 'Assignment Scheduler and date auto-fill', 'Course Vitals and At Risk identification', 'Shared Canvas API settings'])}
                <div style={{ background: '#e8f3fb', border: `1px solid #c3dff5`, borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: navy, marginBottom: 4 }}>✦ AI features require Claude account</div>
                  <div style={{ fontSize: 13, color: '#444', lineHeight: 1.55, marginBottom: 8 }}>AI grading and feedback. You pay Anthropic directly.</div>
                  <button onClick={() => setCostPopup('teaching')} style={{ background: 'none', border: 'none', padding: 0, color: blue, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>See estimated costs →</button>
                </div>
              </div>
            </div>

            <div style={{ background: light, border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ background: navy, color: '#fff', padding: '24px 28px 20px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', opacity: 0.8, marginBottom: 4 }}>Creation Tools</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Content toolbar, AI pages &amp; quiz builder</div>
              </div>
              <div style={{ padding: '24px 28px' }}>
                {pricingRow(creationMonthly, creationSixMonth, creationAnnual, navy)}
                {featureList(['Rich Content Toolbar with 42 components', 'Professionally designed layouts and callouts', 'AI-assisted Canvas page creation', 'Complete AI-generated quizzes', 'Questions, answers, feedback, and point values', 'Editing and review before publishing', 'Direct integration with Canvas'])}
                <div style={{ background: '#f4f6f8', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: navy, marginBottom: 4 }}>✦ AI features require Claude account</div>
                  <div style={{ fontSize: 13, color: '#444', lineHeight: 1.55, marginBottom: 8 }}>AI page and quiz generation. You pay Anthropic directly.</div>
                  <button onClick={() => setCostPopup('creation')} style={{ background: 'none', border: 'none', padding: 0, color: navy, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>See estimated costs →</button>
                </div>
              </div>
            </div>

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
                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)} style={{ width: '100%', background: 'none', border: 'none', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left', gap: 16 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: navy, lineHeight: 1.4 }}>{faq.q}</span>
                  <span style={{ fontSize: 20, color: '#9ca3af', flexShrink: 0, display: 'inline-block', transform: faqOpen === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.15s' }}>+</span>
                </button>
                {faqOpen === i && <div style={{ padding: '0 20px 18px', fontSize: 14, color: '#444', lineHeight: 1.7 }}>{faq.a}</div>}
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
            <a href="/features" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.28)', color: '#fff', padding: '14px 30px', borderRadius: 7, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
              Explore Features
            </a>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Compatible with cloud-hosted Canvas (*.instructure.com). Not affiliated with Instructure, Inc.</p>
        </div>
      </section>

      <footer style={{ background: '#1a2a35', color: '#6b8090', padding: '24px 32px', textAlign: 'center', fontSize: 13, fontFamily: font }}>
        © {new Date().getFullYear()} Canvas Enhancer. Not affiliated with Instructure, Inc. or Canvas LMS.
      </footer>

    </main>
  );
}
