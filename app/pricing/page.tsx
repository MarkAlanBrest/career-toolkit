'use client';

import { useState } from 'react';
import SiteNav from '../components/SiteNav';

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
const ink = '#243746';
const muted = '#5F7280';
const blue = '#0770B8';
const rule = '#DDE7EE';
const wash = '#F6F9FB';

const packs = [
  ['Starter', '$10', '1,000 credits', 'For occasional AI use.'],
  ['Teacher', '$20', '2,000 credits', 'A reasonable starting balance for an active teacher.'],
  ['Department', '$50', '5,000 credits', 'For heavier use or a small instructional team.'],
];

const usage = [
  ['AI-assisted grading', '1 credit+', 'Draft feedback and rubric support for teacher review.'],
  ['AI page creation', '10 credits+', 'Generate a structured Canvas page draft.'],
  ['AI quiz creation', '10 credits+', 'Draft questions, answers, keys, and feedback.'],
];

export default function PricingPage() {
  const extensionUrl = process.env.NEXT_PUBLIC_EXTENSION_URL || '#';
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs: [string, string][] = [
    ['Is there a subscription?', 'No. The core tools are free. AI credits are optional prepaid purchases.'],
    ['Why use credits?', 'Credits give teachers a simple way to understand AI usage without asking them to think about tokens.'],
    ['Do credits expire?', 'The intended teacher model is that credits do not expire.'],
    ['Can organizations buy credits?', 'That is the planned next step: shared school or department balances with administrative controls.'],
  ];

  return (
    <main style={{ fontFamily: font, color: ink, background: '#fff' }}>
      <SiteNav active="pricing" />

      <section style={{ background: wash, borderBottom: `1px solid ${rule}` }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', padding: '72px 28px' }}>
          <div style={{ maxWidth: 700 }}>
            <div style={{ color: blue, fontSize: 13, fontWeight: 800, marginBottom: 14 }}>AI Credits</div>
            <h1 style={{ margin: 0, fontSize: 'clamp(36px,5vw,58px)', lineHeight: 1.06, fontWeight: 850 }}>
              Optional AI usage, priced separately from the free toolkit.
            </h1>
            <p style={{ color: muted, fontSize: 18, lineHeight: 1.7, margin: '20px 0 0' }}>
              Canvas Enhancer’s core tools remain free. AI credits are used only for AI-assisted grading, page creation, and quiz creation.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
              <a href={extensionUrl} style={{ background: blue, color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 800, padding: '12px 18px', borderRadius: 7 }}>Install Free</a>
              <a href="#packs" style={{ background: '#fff', color: ink, border: `1px solid ${rule}`, textDecoration: 'none', fontSize: 15, fontWeight: 800, padding: '12px 18px', borderRadius: 7 }}>View Credit Packs</a>
            </div>
          </div>
        </div>
      </section>

      <section id="packs" style={{ background: '#fff', padding: '70px 28px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div style={{ maxWidth: 660, marginBottom: 30 }}>
            <h2 style={{ margin: 0, fontSize: 'clamp(28px,4vw,40px)', lineHeight: 1.12, fontWeight: 850 }}>Credit packs</h2>
            <p style={{ color: muted, fontSize: 16, lineHeight: 1.7, margin: '13px 0 0' }}>
              These are one-time purchases. Teachers buy them from the AI Credits screen inside Canvas Enhancer.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14 }}>
            {packs.map(([name, price, credits, note]) => (
              <div key={name} style={{ border: `1px solid ${rule}`, borderRadius: 8, background: name === 'Teacher' ? '#F8FCFF' : '#fff', padding: 22 }}>
                <div style={{ fontSize: 15, fontWeight: 850, color: ink }}>{name}</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 18 }}>
                  <span style={{ fontSize: 42, lineHeight: .95, fontWeight: 850 }}>{price}</span>
                  <span style={{ color: muted, fontSize: 14, marginBottom: 4 }}>one time</span>
                </div>
                <div style={{ color: blue, fontSize: 18, fontWeight: 850, marginTop: 13 }}>{credits}</div>
                <div style={{ color: muted, fontSize: 14, lineHeight: 1.6, marginTop: 10 }}>{note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: wash, padding: '70px 28px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 30 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 'clamp(28px,4vw,40px)', lineHeight: 1.12, fontWeight: 850 }}>How credits are used</h2>
            <p style={{ color: muted, fontSize: 16, lineHeight: 1.7, marginTop: 13 }}>
              Different AI tasks use different credit amounts because grading, page creation, and quiz creation do not have the same AI cost.
            </p>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {usage.map(([name, cost, desc]) => (
              <div key={name} style={{ border: `1px solid ${rule}`, borderRadius: 8, background: '#fff', padding: 18, display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 850 }}>{name}</div>
                  <div style={{ color: muted, fontSize: 14, lineHeight: 1.6, marginTop: 6 }}>{desc}</div>
                </div>
                <div style={{ color: blue, fontSize: 13, fontWeight: 850 }}>{cost}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: '#fff', padding: '70px 28px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <h2 style={{ margin: '0 0 22px', fontSize: 30, lineHeight: 1.15, fontWeight: 850 }}>Questions</h2>
          {faqs.map(([q, a], idx) => (
            <div key={q} style={{ borderTop: `1px solid ${rule}` }}>
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                style={{ width: '100%', padding: '18px 0', background: 'transparent', border: 0, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 16, textAlign: 'left', color: ink, fontFamily: font }}
              >
                <span style={{ fontSize: 16, fontWeight: 800 }}>{q}</span>
                <span style={{ color: blue, fontWeight: 800 }}>{openFaq === idx ? '-' : '+'}</span>
              </button>
              {openFaq === idx && <div style={{ color: muted, lineHeight: 1.75, fontSize: 15, padding: '0 0 20px' }}>{a}</div>}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
