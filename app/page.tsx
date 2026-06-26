'use client';

import { useState } from 'react';
import SiteNav from './components/SiteNav';

const ink  = '#243746';
const blue = '#0770B8';
const teal = '#0F8F8C';
const line = '#D8E1E8';
const soft = '#F4F8FB';
const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

const freeTools = [
  { icon: '🛠️', title: 'Content Studio',       desc: '42 design components — headers, callouts, cards, columns, checklists. One click inserts, already styled.' },
  { icon: '📅', title: 'Assignment Scheduler',  desc: 'Set one date. Every assignment in the course fills automatically — due dates, availability, lock dates.' },
  { icon: '📨', title: 'Message Pulse',          desc: 'Bulk message your class. Filter by grade or status. Save templates. Set automations that run themselves.' },
  { icon: '📣', title: 'Announcement Composer', desc: 'Save your best announcements as reusable templates. Post in seconds, not minutes.' },
  { icon: '📝', title: 'Quiz Pulse',             desc: 'A quiz workflow toolbar inside SpeedGrader. Everything in one place, fewer page loads.' },
  { icon: '📋', title: 'Date Autofill',          desc: 'Opens an assignment to edit dates? Canvas Enhancer pre-fills them from your last settings.' },
  { icon: '🌐', title: 'AI Button',              desc: 'Open Claude, ChatGPT, Gemini, or Copilot in a side panel without leaving Canvas. No credits used.' },
  { icon: '⚠️', title: 'At-Risk Identification', desc: 'Surfaces students with missing work, low grades, or declining engagement before it\'s too late.' },
];

const aiUses = [
  { icon: '🎓', name: 'Grade a submission',   cost: '1 credit', note: 'AI reads your rubric and drafts feedback. 30 students in 25 minutes.' },
  { icon: '✨', name: 'Build a Canvas page',   cost: '5 credits', note: 'Type a description. A complete formatted page is generated instantly.' },
  { icon: '📝', name: 'Create a quiz',         cost: '5 credits', note: 'Questions, answers, keys, and feedback — built directly in Canvas.' },
];

const packs = [
  { label: 'Starter',    price: '$10', credits: 100 },
  { label: 'Teacher',    price: '$20', credits: 250, best: true },
  { label: 'Department', price: '$50', credits: 650 },
];

export default function HomePage() {
  const extensionUrl = process.env.NEXT_PUBLIC_EXTENSION_URL || '#';
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    ['Is Canvas Enhancer really free?', 'Yes. Install it and use every tool listed above with no account, no card, and no subscription — ever. The free tools have no usage limits.'],
    ['What does "AI credits" mean?', 'Three tools use AI: grading assistance, Canvas page generation, and quiz creation. Those cost credits. You buy a prepaid pack in the app when you want them. You never have to.'],
    ['Do credits expire?', 'No. Prepaid credits don\'t expire. Buy a pack when you need one, use it at your pace.'],
    ['Can I use the free tools without buying anything?', 'Yes. Assignment Scheduler, Message Pulse, Content Studio, Announcement Composer, Date Autofill, Quiz Pulse, the AI Button, and At-Risk Identification are all completely free with no limits.'],
    ['Can schools buy credits for multiple teachers?', 'That\'s the next layer: a shared school credit pool with admin controls. Individual packs come first.'],
  ];

  return (
    <main style={{ fontFamily: font, color: ink, background: '#fff' }}>
      <SiteNav active="home" />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section style={{ background: '#EAF2F7', borderBottom: `1px solid ${line}`, padding: '80px 32px 88px', textAlign: 'center' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', border: `1px solid ${line}`, background: '#fff', color: '#2E7D32', borderRadius: 999, fontSize: 12, fontWeight: 900, marginBottom: 26 }}>
            ✓ Free to install &nbsp;·&nbsp; ✓ Free to use &nbsp;·&nbsp; ✓ No subscription
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(44px,8vw,84px)', lineHeight: 0.95, letterSpacing: '-1px', color: ink, fontWeight: 950 }}>
            Install it.<br />
            <span style={{ color: blue }}>Use it.</span><br />
            Never pay a dime.
          </h1>
          <p style={{ margin: '28px auto 0', fontSize: 19, lineHeight: 1.65, color: '#526A79', maxWidth: 560 }}>
            Canvas Enhancer gives every teacher eight powerful tools at no cost. No gimmicks. If you ever want AI for grading, pages, or quizzes, you buy credits inside the app — no subscription, spend exactly what you want.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 32 }}>
            <a href={extensionUrl} style={{ background: blue, color: '#fff', textDecoration: 'none', fontSize: 16, fontWeight: 950, padding: '14px 24px', borderRadius: 8, boxShadow: '0 12px 28px rgba(7,112,184,.22)' }}>Install Free — Edge / Chrome</a>
            <a href="/features" style={{ background: '#fff', color: ink, border: `1px solid ${line}`, textDecoration: 'none', fontSize: 16, fontWeight: 900, padding: '14px 24px', borderRadius: 8 }}>See what&apos;s included</a>
          </div>
        </div>
      </section>

      {/* ── Free stat bar ─────────────────────────────────────────────────────── */}
      <section style={{ borderBottom: `1px solid ${line}`, background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '22px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 16 }}>
          {[
            ['8 free tools',     'No usage limits, no expiry'],
            ['42 components',    'Content Studio design library'],
            ['0 subscription',   'No monthly charge, ever'],
            ['AI is optional',   'Buy credits only if you want them'],
          ].map(([big, small]) => (
            <div key={big} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ color: blue, fontSize: 22, fontWeight: 950, lineHeight: 1 }}>{big}</div>
              <div style={{ color: '#607684', fontSize: 13 }}>{small}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Free tools ────────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 32px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ maxWidth: 680, marginBottom: 40 }}>
            <h2 style={{ margin: 0, fontSize: 'clamp(30px,4vw,46px)', lineHeight: 1.05, color: ink }}>Free. No catch.</h2>
            <p style={{ margin: '14px 0 0', fontSize: 16, lineHeight: 1.7, color: '#607684' }}>
              Install the extension and all eight tools below are available immediately. No account needed. No trial period. No locked features. Use them as much as you want.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
            {freeTools.map(tool => (
              <div key={tool.title} style={{ border: `1px solid ${line}`, borderRadius: 10, padding: '22px 20px', background: soft, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 28, flexShrink: 0, lineHeight: 1, marginTop: 2 }}>{tool.icon}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 900, color: ink }}>{tool.title}</span>
                    <span style={{ background: '#E8F5E9', color: '#2E7D32', border: '1px solid #A5D6A7', borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 900 }}>Free</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#607684', lineHeight: 1.6 }}>{tool.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 28, textAlign: 'center' }}>
            <a href="/features" style={{ color: blue, fontWeight: 900, fontSize: 15, textDecoration: 'none' }}>See full details for every tool →</a>
          </div>
        </div>
      </section>

      {/* ── AI section ────────────────────────────────────────────────────────── */}
      <section style={{ background: '#102533', color: '#fff', padding: '80px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ maxWidth: 680, marginBottom: 44 }}>
            <div style={{ color: '#8BE0DC', fontSize: 12, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Optional — only if you want it</div>
            <h2 style={{ margin: 0, fontSize: 'clamp(30px,4vw,46px)', lineHeight: 1.05 }}>Three AI tools. Prepaid credits. No commitment.</h2>
            <p style={{ color: '#BCD0DA', fontSize: 16, lineHeight: 1.7, marginTop: 16 }}>
              When you want AI help for grading, pages, or quizzes — buy a credit pack inside the app. No subscription. Credits don&apos;t expire. Spend exactly what you want, when you want it.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginBottom: 36 }}>
            {aiUses.map(item => (
              <div key={item.name} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, padding: '22px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <span style={{ fontSize: 28 }}>{item.icon}</span>
                  <span style={{ background: 'rgba(15,143,140,.3)', color: '#8BE0DC', border: '1px solid rgba(15,143,140,.5)', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 900 }}>{item.cost}</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 8 }}>{item.name}</div>
                <div style={{ fontSize: 14, color: '#BCD0DA', lineHeight: 1.6 }}>{item.note}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 28 }}>
            {packs.map(pack => (
              <div key={pack.label} style={{ position: 'relative', border: pack.best ? `2px solid ${blue}` : '1px solid rgba(255,255,255,.14)', borderRadius: 10, padding: '20px 18px', background: pack.best ? 'rgba(7,112,184,.18)' : 'rgba(255,255,255,.04)' }}>
                {pack.best && <div style={{ position: 'absolute', right: 12, top: 12, background: blue, color: '#fff', borderRadius: 999, padding: '3px 8px', fontSize: 10, fontWeight: 950 }}>Most popular</div>}
                <div style={{ fontSize: 13, color: '#8BA5B5', fontWeight: 700, marginBottom: 8 }}>{pack.label}</div>
                <div style={{ fontSize: 34, fontWeight: 950, lineHeight: 1, marginBottom: 4 }}>{pack.price}</div>
                <div style={{ fontSize: 14, color: '#8BE0DC', fontWeight: 900 }}>{pack.credits} AI credits</div>
                <div style={{ fontSize: 12, color: '#607684', marginTop: 6 }}>One-time. No expiry.</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href={extensionUrl} style={{ background: blue, color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 950, padding: '12px 20px', borderRadius: 8 }}>Install Free First</a>
            <a href="/pricing" style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.18)', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 900, padding: '12px 20px', borderRadius: 8 }}>Learn about AI credits</a>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────────── */}
      <section style={{ background: soft, padding: '80px 32px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <h2 style={{ margin: '0 0 36px', fontSize: 'clamp(28px,4vw,42px)', lineHeight: 1.1, color: ink }}>Simple from day one.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
            {[
              { n: '01', title: 'Install the extension',   text: 'Takes about 60 seconds. Works in Edge and Chrome. No account or sign-in needed.' },
              { n: '02', title: 'Use the free tools',       text: 'All eight free tools are available immediately. Use them every day, no limits, no cost.' },
              { n: '03', title: 'Add AI when you want it',  text: 'If you ever want AI grading or content generation, buy a credit pack from the toolbar. No subscription.' },
            ].map(step => (
              <div key={step.n} style={{ background: '#fff', border: `1px solid ${line}`, borderRadius: 10, padding: '24px 22px' }}>
                <div style={{ color: blue, fontSize: 14, fontWeight: 950, marginBottom: 12 }}>{step.n}</div>
                <div style={{ fontSize: 17, fontWeight: 950, color: ink, marginBottom: 10 }}>{step.title}</div>
                <div style={{ fontSize: 14, color: '#607684', lineHeight: 1.65 }}>{step.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: '72px 32px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <h2 style={{ margin: '0 0 26px', fontSize: 32, lineHeight: 1.1, color: ink }}>Common questions</h2>
          {faqs.map(([q, a], idx) => (
            <div key={q} style={{ borderTop: `1px solid ${line}` }}>
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                style={{ width: '100%', padding: '18px 0', background: 'transparent', border: 0, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 16, textAlign: 'left', color: ink, fontFamily: font }}
              >
                <span style={{ fontSize: 16, fontWeight: 900 }}>{q}</span>
                <span style={{ color: blue, fontWeight: 950, fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{openFaq === idx ? '−' : '+'}</span>
              </button>
              {openFaq === idx && <div style={{ color: '#607684', lineHeight: 1.7, fontSize: 15, padding: '0 0 20px' }}>{a}</div>}
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${line}` }} />
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <section style={{ background: ink, color: '#fff', padding: '72px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(28px,4vw,46px)', lineHeight: 1.05 }}>
            Install it today.<br />Use it for free, forever.
          </h2>
          <p style={{ color: '#BFD0DA', fontSize: 16, lineHeight: 1.7, margin: '18px 0 30px' }}>
            No account. No credit card. No subscription. Eight tools that save teachers hours every week, available the moment you install.
          </p>
          <a href={extensionUrl} style={{ display: 'inline-block', background: blue, color: '#fff', textDecoration: 'none', fontSize: 16, fontWeight: 950, padding: '14px 26px', borderRadius: 8, boxShadow: '0 12px 28px rgba(7,112,184,.28)' }}>
            Install Canvas Enhancer Free
          </a>
        </div>
      </section>
    </main>
  );
}
