'use client';

import { useState } from 'react';
import SiteNav from './components/SiteNav';

const font  = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
const ink   = '#111827';
const muted = '#6B7280';
const blue  = '#0770B8';
const rule  = '#E5E7EB';

const tools = [
  { name: 'Content Studio',        desc: '42 design components built into every Canvas page editor. Headers, callouts, cards, columns, and checklists — one click, already styled.' },
  { name: 'Assignment Scheduler',  desc: 'Set a start date and spacing rules once. Every assignment in the course fills in automatically — due dates, availability windows, and lock dates.' },
  { name: 'Message Pulse',         desc: 'Bulk message your class filtered by grade or assignment status. Save reusable templates and set automations that run on a schedule.' },
  { name: 'Announcement Composer', desc: 'Save announcements as templates. Post in seconds rather than writing from scratch each time.' },
  { name: 'Quiz Pulse',            desc: 'A streamlined quiz workflow inside SpeedGrader. Everything in one place, fewer clicks.' },
  { name: 'Date Autofill',         desc: 'When you open an assignment to edit dates, Canvas Enhancer pre-fills them from your last settings.' },
  { name: 'AI Button',             desc: 'Open Claude, ChatGPT, Gemini, or Copilot in a side panel without leaving Canvas.' },
  { name: 'At-Risk Identification', desc: 'Surfaces students with missing work, low grades, or declining engagement before the situation becomes harder to address.' },
];

const aiFeatures = [
  { name: 'Grading assistance',   price: 'from $0.01', desc: 'Reads your rubric and drafts individual feedback for every submission. Thirty students in about 25 minutes.' },
  { name: 'Canvas page builder',  price: 'from $0.03', desc: 'Describe what you need. A complete, formatted page is generated and ready to publish directly in Canvas.' },
  { name: 'Quiz creation',        price: 'from $0.03', desc: 'Questions, answer choices, answer keys, and feedback — generated and placed directly inside your Canvas quiz.' },
];

const faqs: [string, string][] = [
  ['Is Canvas Enhancer free?', 'Yes. All eight tools listed above are free — no account, no credit card, no subscription, no trial period. Use them every day with no limits.'],
  ['What are AI credits?', 'Three tools use AI: grading assistance, page building, and quiz creation. Those consume credits. You buy a prepaid pack inside the app when you want them. You never have to.'],
  ['Do credits expire?', 'No. Credits stay in your account until you use them. Buy a pack when you need one and use it at your own pace.'],
  ['What AI models are used?', 'You choose between Claude Haiku (faster, lower cost) and Claude Sonnet (higher quality). The cost per action is shown before you confirm.'],
  ['Can schools purchase credits for their teachers?', 'A shared school account with per-teacher allocations and usage controls is in development. Individual packs are available now.'],
];

export default function HomePage() {
  const extensionUrl = process.env.NEXT_PUBLIC_EXTENSION_URL || '#';
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main style={{ fontFamily: font, color: ink, background: '#fff' }}>
      <SiteNav active="home" />

      {/* Hero */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: '96px 32px 88px' }}>
        <h1 style={{ margin: '0 0 20px', fontSize: 'clamp(36px,5vw,52px)', fontWeight: 600, lineHeight: 1.15, letterSpacing: '-0.5px', color: ink }}>
          Canvas, the way<br />it should work.
        </h1>
        <p style={{ margin: '0 0 36px', fontSize: 17, lineHeight: 1.75, color: muted, maxWidth: 520 }}>
          Canvas Enhancer adds eight free productivity tools directly to your Canvas LMS.
          AI grading, page building, and quiz creation are available as optional paid features when you need them.
        </p>
        <a href={extensionUrl} style={{
          display: 'inline-block',
          background: blue,
          color: '#fff',
          textDecoration: 'none',
          fontSize: 15,
          fontWeight: 600,
          padding: '12px 24px',
          borderRadius: 7,
        }}>
          Install for Edge and Chrome — Free
        </a>
        <p style={{ margin: '14px 0 0', fontSize: 13, color: '#9CA3AF' }}>
          No account required. No credit card.
        </p>
      </section>

      {/* Free tools */}
      <section style={{ borderTop: `1px solid ${rule}`, background: '#F9FAFB', padding: '72px 32px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: blue, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Free — no limits</p>
          <h2 style={{ margin: '0 0 48px', fontSize: 'clamp(22px,3vw,30px)', fontWeight: 600, color: ink, lineHeight: 1.2 }}>
            Eight tools included at no cost
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {tools.map((tool, i) => (
              <div key={tool.name} style={{
                display: 'grid',
                gridTemplateColumns: '220px 1fr',
                gap: '0 32px',
                padding: '20px 0',
                borderTop: i === 0 ? `1px solid ${rule}` : undefined,
                borderBottom: `1px solid ${rule}`,
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: ink, paddingTop: 1 }}>{tool.name}</div>
                <div style={{ fontSize: 14, color: muted, lineHeight: 1.7 }}>{tool.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI features */}
      <section style={{ borderTop: `1px solid ${rule}`, padding: '72px 32px', background: '#fff' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: blue, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Optional</p>
          <h2 style={{ margin: '0 0 12px', fontSize: 'clamp(22px,3vw,30px)', fontWeight: 600, color: ink, lineHeight: 1.2 }}>
            AI features, when you want them
          </h2>
          <p style={{ margin: '0 0 40px', fontSize: 15, lineHeight: 1.7, color: muted, maxWidth: 520 }}>
            Prepaid credits. No subscription. Buy a pack inside the app and use it at your own pace. Credits do not expire.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {aiFeatures.map((f, i) => (
              <div key={f.name} style={{
                display: 'grid',
                gridTemplateColumns: '220px 1fr 100px',
                gap: '0 32px',
                padding: '20px 0',
                borderTop: i === 0 ? `1px solid ${rule}` : undefined,
                borderBottom: `1px solid ${rule}`,
                alignItems: 'start',
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: ink, paddingTop: 1 }}>{f.name}</div>
                <div style={{ fontSize: 14, color: muted, lineHeight: 1.7 }}>{f.desc}</div>
                <div style={{ fontSize: 13, color: blue, fontWeight: 600, textAlign: 'right', paddingTop: 1 }}>{f.price}</div>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div style={{ marginTop: 40, paddingTop: 32, borderTop: `1px solid ${rule}` }}>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: muted }}>Credit packs — one-time purchase, no expiry</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'Starter',    price: '$10', credits: '1,000 credits' },
                { label: 'Teacher',    price: '$20', credits: '2,000 credits' },
                { label: 'Department', price: '$50', credits: '5,000 credits' },
              ].map(pack => (
                <div key={pack.label} style={{
                  border: `1px solid ${rule}`,
                  borderRadius: 8,
                  padding: '16px 20px',
                  minWidth: 140,
                }}>
                  <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>{pack.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: ink, lineHeight: 1, marginBottom: 4 }}>{pack.price}</div>
                  <div style={{ fontSize: 12, color: muted }}>{pack.credits}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ borderTop: `1px solid ${rule}`, background: '#F9FAFB', padding: '72px 32px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <h2 style={{ margin: '0 0 32px', fontSize: 'clamp(22px,3vw,30px)', fontWeight: 600, color: ink }}>Questions</h2>
          {faqs.map(([q, a], idx) => (
            <div key={q} style={{ borderBottom: `1px solid ${rule}` }}>
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                style={{
                  width: '100%',
                  padding: '18px 0',
                  background: 'transparent',
                  border: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                  textAlign: 'left',
                  color: ink,
                  fontFamily: font,
                  fontWeight: 500,
                  fontSize: 15,
                }}
              >
                {q}
                <span style={{ color: muted, fontSize: 20, fontWeight: 300, flexShrink: 0, lineHeight: 1 }}>
                  {openFaq === idx ? '−' : '+'}
                </span>
              </button>
              {openFaq === idx && (
                <div style={{ fontSize: 14, color: muted, lineHeight: 1.75, paddingBottom: 20 }}>{a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section style={{ borderTop: `1px solid ${rule}`, padding: '80px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 'clamp(20px,3vw,28px)', fontWeight: 600, color: ink }}>
            Install Canvas Enhancer
          </h2>
          <p style={{ margin: '0 0 28px', fontSize: 15, color: muted, lineHeight: 1.7 }}>
            Free to install. Works in Edge and Chrome. No account required.
          </p>
          <a href={extensionUrl} style={{
            display: 'inline-block',
            background: blue,
            color: '#fff',
            textDecoration: 'none',
            fontSize: 15,
            fontWeight: 600,
            padding: '12px 24px',
            borderRadius: 7,
          }}>
            Install Free
          </a>
        </div>
      </section>

    </main>
  );
}
