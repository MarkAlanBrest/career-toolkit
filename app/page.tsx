'use client';

import { useState } from 'react';
import SiteNav from './components/SiteNav';

const ink  = '#1B303D';
const blue = '#0770B8';
const line = '#D8E1E8';
const soft = '#F4F8FB';
const muted = '#526A79';
const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

const freeTools = [
  { title: 'Content Studio',       desc: '42 design components — headers, callouts, cards, columns, checklists. One click inserts, already styled for Canvas.' },
  { title: 'Assignment Scheduler', desc: 'Set one date. Every assignment in the course fills in automatically — due dates, availability windows, lock dates.' },
  { title: 'Message Pulse',        desc: 'Message your class in bulk. Filter by grade or missing work. Save templates. Set automations that run on their own.' },
  { title: 'Announcement Composer',desc: 'Save your best announcements as reusable templates. Post in seconds.' },
  { title: 'Quiz Pulse',           desc: 'A streamlined quiz workflow inside SpeedGrader. Everything in one place, fewer page loads.' },
  { title: 'Date Autofill',        desc: 'Opens an assignment to edit dates? Canvas Enhancer pre-fills them from your last settings automatically.' },
  { title: 'AI Button',            desc: 'Open Claude, ChatGPT, Gemini, or Copilot in a side panel without leaving Canvas.' },
  { title: 'At-Risk Identification',desc: 'Surfaces students with missing work, low grades, or declining engagement before it becomes a problem.' },
];

const aiTools = [
  { name: 'Grading assistance',  cost: 'from 1 credit', desc: 'Reads your rubric and drafts individual feedback for each submission. Thirty students in about 25 minutes.' },
  { name: 'Canvas page builder', cost: 'from 3 credits', desc: 'Describe what you need. A complete, formatted Canvas page is generated and ready to publish.' },
  { name: 'Quiz creation',       cost: 'from 3 credits', desc: 'Questions, answer choices, keys, and feedback — built directly inside Canvas.' },
];

const packs = [
  { label: 'Starter',    price: '$10', credits: '1,000 credits' },
  { label: 'Teacher',    price: '$20', credits: '2,000 credits' },
  { label: 'Department', price: '$50', credits: '5,000 credits' },
];

const faqs = [
  ['Is Canvas Enhancer really free?', 'Yes. Install it and every tool listed above is available immediately — no account, no card, no subscription. The free tools have no usage limits.'],
  ['What are AI credits?', 'Three tools use AI: grading assistance, Canvas page generation, and quiz creation. Those cost credits. You buy a prepaid pack inside the app when you want them. You never have to.'],
  ['Do credits expire?', 'No. Prepaid credits stay in your account. Buy a pack when you need one, use it at your own pace.'],
  ['Can I use the free tools without buying anything?', 'Yes. All eight free tools are fully functional with no limits and no cost.'],
  ['Can schools buy credits for multiple teachers?', 'A shared school credit pool with per-teacher caps is coming. Individual packs are available now.'],
];

export default function HomePage() {
  const extensionUrl = process.env.NEXT_PUBLIC_EXTENSION_URL || '#';
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main style={{ fontFamily: font, color: ink, background: '#fff' }}>
      <SiteNav active="home" />

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section style={{ borderBottom: `1px solid ${line}`, padding: '72px 32px 80px', textAlign: 'center', background: soft }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h1 style={{ margin: '0 0 20px', fontSize: 'clamp(32px,6vw,58px)', lineHeight: 1.1, fontWeight: 700, color: ink, letterSpacing: '-0.5px' }}>
            The Canvas tools teachers<br />have been asking for
          </h1>
          <p style={{ margin: '0 0 32px', fontSize: 17, lineHeight: 1.7, color: muted, maxWidth: 540, marginLeft: 'auto', marginRight: 'auto' }}>
            Eight free productivity tools built directly into Canvas. Optional AI for grading, page building, and quiz creation when you need it.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href={extensionUrl} style={{ background: blue, color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 700, padding: '12px 22px', borderRadius: 7 }}>
              Install for Edge / Chrome — Free
            </a>
            <a href="/features" style={{ background: '#fff', color: ink, border: `1px solid ${line}`, textDecoration: 'none', fontSize: 15, fontWeight: 600, padding: '12px 22px', borderRadius: 7 }}>
              See all features
            </a>
          </div>
        </div>
      </section>

      {/* ── Free tools ────────────────────────────────────────────────────────── */}
      <section style={{ padding: '72px 32px', background: '#fff' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ maxWidth: 560, marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: blue, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Free tools</div>
            <h2 style={{ margin: '0 0 12px', fontSize: 'clamp(24px,3vw,36px)', fontWeight: 700, lineHeight: 1.15, color: ink }}>
              Eight tools, available the moment you install.
            </h2>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: muted }}>
              No account needed. No trial period. Use them every day with no limits.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 1, border: `1px solid ${line}`, borderRadius: 10, overflow: 'hidden' }}>
            {freeTools.map((tool, i) => (
              <div key={tool.title} style={{ padding: '22px 20px', background: i % 2 === 0 ? '#fff' : soft, borderRight: `1px solid ${line}`, borderBottom: `1px solid ${line}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: ink, marginBottom: 6 }}>{tool.title}</div>
                <div style={{ fontSize: 13, color: muted, lineHeight: 1.65 }}>{tool.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI tools ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: '72px 32px', background: soft, borderTop: `1px solid ${line}`, borderBottom: `1px solid ${line}` }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ maxWidth: 560, marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: blue, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Optional AI features</div>
            <h2 style={{ margin: '0 0 12px', fontSize: 'clamp(24px,3vw,36px)', fontWeight: 700, lineHeight: 1.15, color: ink }}>
              AI tools, when you want them.
            </h2>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: muted }}>
              Prepaid credits. No subscription. Buy a pack inside the app and use it at your own pace. Credits don&apos;t expire.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginBottom: 40 }}>
            {aiTools.map(tool => (
              <div key={tool.name} style={{ background: '#fff', border: `1px solid ${line}`, borderRadius: 10, padding: '24px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: ink }}>{tool.name}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: blue, background: '#EDF5FF', padding: '3px 9px', borderRadius: 5, whiteSpace: 'nowrap', marginLeft: 10 }}>{tool.cost}</div>
                </div>
                <div style={{ fontSize: 13, color: muted, lineHeight: 1.65 }}>{tool.desc}</div>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div style={{ maxWidth: 560 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: muted, marginBottom: 14 }}>Credit packs — one-time purchase, no expiry</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {packs.map(pack => (
                <div key={pack.label} style={{ border: `1px solid ${line}`, borderRadius: 8, padding: '16px 14px', background: '#fff' }}>
                  <div style={{ fontSize: 12, color: muted, fontWeight: 600, marginBottom: 6 }}>{pack.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: ink, lineHeight: 1, marginBottom: 4 }}>{pack.price}</div>
                  <div style={{ fontSize: 12, color: muted }}>{pack.credits}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────────── */}
      <section style={{ padding: '72px 32px', background: '#fff' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <h2 style={{ margin: '0 0 36px', fontSize: 'clamp(22px,3vw,32px)', fontWeight: 700, lineHeight: 1.15, color: ink }}>Getting started</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 24 }}>
            {[
              { n: '1', title: 'Install the extension', text: 'Takes about 60 seconds. Works in Edge and Chrome. No account or sign-in required.' },
              { n: '2', title: 'Use the free tools',    text: 'All eight tools are available immediately. Use them every day — no limits, no cost.' },
              { n: '3', title: 'Add AI when you want',  text: 'Buy a credit pack from the toolbar when you want AI grading or content generation.' },
            ].map(step => (
              <div key={step.n} style={{ display: 'flex', gap: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: blue, color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>{step.n}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: ink, marginBottom: 6 }}>{step.title}</div>
                  <div style={{ fontSize: 14, color: muted, lineHeight: 1.65 }}>{step.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────────── */}
      <section style={{ background: soft, padding: '72px 32px', borderTop: `1px solid ${line}` }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ margin: '0 0 28px', fontSize: 'clamp(22px,3vw,32px)', fontWeight: 700, color: ink }}>Questions</h2>
          {faqs.map(([q, a], idx) => (
            <div key={q} style={{ borderTop: `1px solid ${line}` }}>
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                style={{ width: '100%', padding: '18px 0', background: 'transparent', border: 0, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 16, textAlign: 'left', color: ink, fontFamily: font }}
              >
                <span style={{ fontSize: 15, fontWeight: 600 }}>{q}</span>
                <span style={{ color: blue, fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{openFaq === idx ? '−' : '+'}</span>
              </button>
              {openFaq === idx && <div style={{ color: muted, lineHeight: 1.7, fontSize: 14, paddingBottom: 20 }}>{a}</div>}
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${line}` }} />
        </div>
      </section>

      {/* ── Footer CTA ────────────────────────────────────────────────────────── */}
      <section style={{ padding: '64px 32px', textAlign: 'center', background: '#fff', borderTop: `1px solid ${line}` }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 'clamp(22px,3vw,30px)', fontWeight: 700, color: ink }}>
            Install Canvas Enhancer
          </h2>
          <p style={{ margin: '0 0 28px', fontSize: 15, lineHeight: 1.7, color: muted }}>
            Free to install. No account required. Works in Edge and Chrome.
          </p>
          <a href={extensionUrl} style={{ display: 'inline-block', background: blue, color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 700, padding: '12px 24px', borderRadius: 7 }}>
            Install Free
          </a>
        </div>
      </section>
    </main>
  );
}
