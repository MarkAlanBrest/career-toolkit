'use client';
import { useState } from 'react';
import SiteNav from '../components/SiteNav';

export default function PricingPage() {
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

  const pricingOptions = (monthly: string, sixMonth: string, annual: string, accent: string) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        {[
          { label: 'Monthly',  price: '$4.95',  sub: 'per month',   href: monthly,  popular: false },
          { label: '6 Months', price: '$18.95', sub: 'billed once', href: sixMonth, popular: true  },
          { label: 'Annual',   price: '$34.95', sub: 'billed once', href: annual,   popular: false },
        ].map(opt => (
          <div key={opt.label} style={{ border: opt.popular ? `2px solid ${accent}` : '1px solid #e5e7eb', borderRadius: 10, padding: '14px 10px', textAlign: 'center', position: 'relative', background: opt.popular ? '#fff' : light }}>
            {opt.popular && <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: accent, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 10, whiteSpace: 'nowrap' }}>Most Popular</div>}
            <div style={{ fontSize: 22, fontWeight: 900, color: navy, lineHeight: 1 }}>{opt.price}</div>
            <div style={{ fontSize: 11, color: '#6b7780', marginTop: 3, marginBottom: 10 }}>{opt.sub}</div>
            <a href={opt.href} style={{ display: 'block', background: accent, color: '#fff', padding: '8px 0', borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>{opt.label}</a>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>$59.40/yr if monthly</div>
        <div style={{ fontSize: 11, color: '#15803d', textAlign: 'center', fontWeight: 600 }}>Save ~$11 vs monthly</div>
        <div style={{ fontSize: 11, color: '#15803d', textAlign: 'center', fontWeight: 600 }}>Save ~$25 vs monthly</div>
      </div>
    </div>
  );

  const faqs = [
    { q: 'Do I need AI to use Canvas Enhancer?', a: 'No. The majority of features work without any AI at all — the content toolbar, bulk messaging, assignment scheduler, date auto-fill, grade audit reports, and more all work immediately after installing. AI features are optional and require a Claude account from Anthropic.' },
    { q: 'How much will I spend on Claude API each month?', a: 'Very little. Grading one student submission costs under half a cent (~$0.003). A typical month of active AI grading — 200 assignments — costs around $0.50–$1.50. Content and quiz generation costs $0.02–$0.05 per item. Most teachers spend under $2 per month with Anthropic.' },
    { q: 'Why do I need my own Claude account instead of it being included?', a: 'Using your own Claude account means you pay Anthropic directly at their standard rates — no markup from us. You own your usage, control your spend, and there are no monthly AI limits imposed by Canvas Enhancer. We think this is the most honest model for educators.' },
    { q: 'Does it work with my school\'s Canvas?', a: 'Yes, if your school uses cloud-hosted Canvas (any *.instructure.com address). It works with Classic Quizzes, New Quizzes, SpeedGrader, the Rich Content Editor, and the Canvas Inbox.' },
    { q: 'Can I use Teaching Tools and Creation Tools together?', a: 'Yes. Both packages share a single settings panel inside Canvas. Buy one or both — they work together seamlessly with one license key per package.' },
    { q: 'Is my student data safe?', a: 'Canvas Enhancer does not store student data. When you use AI grading, content goes directly from your browser to your own Claude account — the same as if you pasted it into Claude.ai yourself.' },
    { q: 'What billing period should I choose?', a: '6 months is the most popular option — it saves roughly $11 per year compared to monthly billing while giving you a lower upfront cost than annual. Annual billing saves the most (~$25/year) and is ideal if you use Canvas year-round.' },
    { q: 'What happens if I cancel?', a: 'Your tools remain active until the end of your paid period. You will not be charged again unless you renew.' },
    { q: 'Can I get a refund?', a: 'If you have an issue with Canvas Enhancer, reach out and we will work to resolve it. Refund requests within 7 days of purchase are considered on a case-by-case basis.' },
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
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 20px' }}>
              <a href="https://www.anthropic.com/pricing" target="_blank" rel="noopener noreferrer" style={{ color: blue }}>See current Claude pricing →</a>
            </p>
            <button onClick={() => setCostPopup(null)} style={{ width: '100%', background: blue, color: '#fff', border: 'none', padding: '11px 0', borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Got it</button>
          </div>
        </div>
      )}

      <SiteNav active="pricing" />

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <section style={{ background: `linear-gradient(135deg,#1a2a35,${navy})`, color: '#fff', padding: '56px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 900, margin: '0 0 14px', letterSpacing: '-0.4px' }}>Simple, honest pricing</h1>
          <p style={{ fontSize: 17, color: '#c8d8e4', lineHeight: 1.65, margin: 0 }}>
            The content toolbar is free forever. Unlock AI-powered packages when you&apos;re ready.<br />
            You bring your own Claude API key — we never mark up AI costs.
          </p>
        </div>
      </section>

      {/* ── BYOK callout ─────────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '28px 32px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20 }}>
          {[
            { icon: '🔑', title: 'Bring your own Claude key', desc: 'Connect your Anthropic API key in settings. AI features work instantly.' },
            { icon: '💳', title: 'Pay Anthropic directly', desc: 'No AI markup. No credit limits. You control your own usage and spend.' },
            { icon: '💰', title: 'Typical AI cost under $2/month', desc: 'Grading and content generation costs pennies. Most teachers spend less than $2.' },
            { icon: '🚀', title: 'Most tools need no AI at all', desc: 'Toolbar, messaging, scheduling, and reports work the moment you install.' },
          ].map(item => (
            <div key={item.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: navy, marginBottom: 3 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: '#6b7780', lineHeight: 1.55 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Packages ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: '64px 32px', background: light }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(310px,1fr))', gap: 28, alignItems: 'start' }}>

          {/* Teaching Tools */}
          <div style={{ background: '#fff', border: `2px solid ${blue}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ background: blue, color: '#fff', padding: '24px 28px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', opacity: 0.8, marginBottom: 6 }}>Teaching Tools</div>
              <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.3, marginBottom: 8 }}>Grading, messaging, scheduling &amp; reporting</div>
              <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>Save hours of repetitive work every week — all directly inside Canvas.</div>
            </div>
            <div style={{ padding: '28px' }}>
              {pricingOptions(teachingMonthly, teachingSixMonth, teachingAnnual, blue)}
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7780', marginBottom: 12 }}>What&apos;s included</div>
              {featureList([
                'AI-assisted grading inside SpeedGrader',
                'Drafted rubric scores and student feedback',
                'Grade Audit and Needs Graded reports',
                'Bulk student messaging',
                'Reusable message templates',
                'Announcement Composer',
                'Assignment Scheduler',
                'Automatic availability and due dates',
                'Course Vitals and activity reports',
                'At Risk student identification',
                'Shared Canvas API settings across all tools',
              ])}
              <div style={{ background: '#e8f3fb', border: `1px solid #c3dff5`, borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: navy, marginBottom: 4 }}>✦ AI grading requires Claude account</div>
                <div style={{ fontSize: 13, color: '#444', lineHeight: 1.55, marginBottom: 8 }}>All other tools work without AI. For grading, you connect your own key and pay Anthropic directly.</div>
                <button onClick={() => setCostPopup('teaching')} style={{ background: 'none', border: 'none', padding: 0, color: blue, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>See estimated Claude costs →</button>
              </div>
            </div>
          </div>

          {/* Creation Tools */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ background: navy, color: '#fff', padding: '24px 28px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', opacity: 0.8, marginBottom: 6 }}>Creation Tools</div>
              <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.3, marginBottom: 8 }}>Content toolbar, AI pages &amp; quiz builder</div>
              <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>Build exceptional Canvas courses in a fraction of the time.</div>
            </div>
            <div style={{ padding: '28px' }}>
              {pricingOptions(creationMonthly, creationSixMonth, creationAnnual, navy)}
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7780', marginBottom: 12 }}>What&apos;s included</div>
              {featureList([
                'Rich Content Toolbar inside the Canvas editor',
                '42 professionally designed content components',
                'Accessible layouts, callouts, cards, and buttons',
                'AI-assisted Canvas page creation',
                'Complete AI-generated quizzes',
                'Questions, answers, feedback, and point values',
                'Editing and review before publishing',
                'Direct integration with Canvas',
              ])}
              <div style={{ background: '#f4f6f8', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: navy, marginBottom: 4 }}>✦ AI features require Claude account</div>
                <div style={{ fontSize: 13, color: '#444', lineHeight: 1.55, marginBottom: 8 }}>The toolbar and all 42 components are always free. AI page and quiz generation requires your own Claude key.</div>
                <button onClick={() => setCostPopup('creation')} style={{ background: 'none', border: 'none', padding: 0, color: navy, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>See estimated Claude costs →</button>
              </div>
            </div>
          </div>

        </div>

        {/* Both packages note */}
        <div style={{ maxWidth: 1000, margin: '24px auto 0', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 28px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: navy, flexShrink: 0 }}>Using both packages?</div>
          <div style={{ fontSize: 14, color: '#6b7780', lineHeight: 1.6, flex: 1, minWidth: 240 }}>Teaching Tools and Creation Tools work together through one shared settings panel. Purchase each separately — one license key per package.</div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <a href={teachingAnnual} style={{ background: blue, color: '#fff', padding: '9px 16px', borderRadius: 7, fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>Get Teaching</a>
            <a href={creationAnnual} style={{ background: navy, color: '#fff', padding: '9px 16px', borderRadius: 7, fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>Get Creation</a>
          </div>
        </div>
      </section>

      {/* ── Free tier ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: '56px 32px', background: '#fff' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 12 }}>What&apos;s always free</h2>
          <p style={{ fontSize: 15, color: '#6b7780', lineHeight: 1.65, marginBottom: 36 }}>No license key needed. Works the moment you install.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 32 }}>
            {[
              { icon: '🛠️', title: '42 content components', desc: 'The full Rich Content Toolbar with every component.' },
              { icon: '🤖', title: 'Free AI Button',        desc: 'Open Claude, ChatGPT, Gemini, Copilot, or Perplexity from inside Canvas.' },
              { icon: '♾️', title: 'Free forever',          desc: 'No expiry. No trial. No credit card required to install.' },
            ].map(item => (
              <div key={item.title} style={{ background: light, borderRadius: 10, padding: '22px 18px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 30, marginBottom: 10 }}>{item.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: navy, marginBottom: 6 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: '#6b7780', lineHeight: 1.55 }}>{item.desc}</div>
              </div>
            ))}
          </div>
          <a href={extensionUrl} style={{ display: 'inline-block', background: blue, color: '#fff', padding: '13px 28px', borderRadius: 7, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>Install Free — Chrome &amp; Edge</a>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section style={{ padding: '72px 32px', background: light }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, textAlign: 'center', marginBottom: 8, letterSpacing: '-0.3px' }}>Pricing questions</h2>
          <p style={{ fontSize: 15, color: '#6b7780', textAlign: 'center', marginBottom: 40 }}>Everything you need to know before you buy.</p>
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

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section style={{ background: `linear-gradient(135deg,#1a2a35,${navy})`, color: '#fff', padding: '72px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px,4vw,34px)', fontWeight: 900, marginBottom: 14, letterSpacing: '-0.3px' }}>Start saving time this week.</h2>
          <p style={{ fontSize: 16, color: '#c8d8e4', lineHeight: 1.65, marginBottom: 32 }}>
            Install free, use the toolbar immediately. Add a package when you&apos;re ready.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={extensionUrl} style={{ background: blue, color: '#fff', padding: '14px 28px', borderRadius: 7, fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 18px rgba(7,112,163,.4)' }}>Install Canvas Enhancer Free</a>
            <a href="/features" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.28)', color: '#fff', padding: '14px 28px', borderRadius: 7, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>Explore Features</a>
          </div>
        </div>
      </section>

      <footer style={{ background: '#1a2a35', color: '#6b8090', padding: '24px 32px', textAlign: 'center', fontSize: 13, fontFamily: font }}>
        © {new Date().getFullYear()} Canvas Enhancer. Not affiliated with Instructure, Inc. or Canvas LMS.
      </footer>

    </main>
  );
}
