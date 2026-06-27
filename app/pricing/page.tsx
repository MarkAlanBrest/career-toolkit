'use client';

import SiteNav from '../components/SiteNav';

const serif = 'Georgia,"Times New Roman",serif';
const display = '"Trebuchet MS",Arial,sans-serif';
const pageBg = '#e9ecef';
const paper = '#f8f8f5';
const text = '#595c60';
const heading = '#26315f';
const blue = '#244f98';
const rule = '#d2d2cc';

const packs = [
  ['Starter',    '$10',  '1,000 credits',  'Good for trying AI grading and page creation.'],
  ['Teacher',    '$20',  '2,000 credits',  'Most popular. Covers a full semester of regular use.'],
  ['Power User', '$50',  '5,000 credits',  'For teachers who use AI tools heavily across many classes.'],
  ['School',     '$250', '25,000 credits', 'Best for departments and schools. Credits can be distributed to any teacher on staff.'],
];

const usage = [
  ['AI-assisted grading', '1 credit+', 'Drafts feedback and rubric-score suggestions for teacher review.'],
  ['AI page creation', '10 credits+', 'Drafts a structured Canvas page from teacher instructions.'],
  ['AI quiz creation', '10 credits+', 'Drafts quiz questions, choices, answer keys, and feedback.'],
];

export default function PricingPage() {
  return (
    <main style={{ minHeight: '100vh', background: pageBg, color: text, fontFamily: serif }}>
      <SiteNav active="pricing" />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px 48px' }}>
        <section style={{ background: paper, border: '1px solid #d9d9d2', padding: '38px 38px 34px' }}>
          <h1 style={{ margin: 0, color: heading, fontFamily: serif, fontSize: 'clamp(30px,5vw,42px)', lineHeight: 1.12 }}>
            AI credits
          </h1>
          <p style={{ margin: '20px 0 0', maxWidth: 760, fontSize: 15, lineHeight: 1.8, textAlign: 'justify' }}>
            The standard Canvas Enhancer tools are free. AI credits are separate and are used only for AI-assisted grading, AI page creation, and AI quiz creation. Credits are prepaid, so teachers are not placed into a subscription just to try the tools.
          </p>
        </section>

        <section style={{ marginTop: 26, background: paper, border: '1px solid #d9d9d2', padding: '30px 34px' }}>
          <h2 style={{ margin: '0 0 18px', color: blue, fontFamily: serif, fontSize: 23 }}>
            Credit packs
          </h2>
          <div style={{ borderTop: `1px solid ${rule}` }}>
            {packs.map(([name, price, credits, description]) => (
              <div
                key={name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,160px),1fr))',
                  gap: 12,
                  borderBottom: `1px solid ${rule}`,
                  padding: '14px 0',
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                <strong style={{ color: heading, fontFamily: serif }}>{name}</strong>
                <span>{price}</span>
                <span>{credits}</span>
                <span style={{ fontSize: 13, color: '#666', lineHeight: 1.7 }}>{description}</span>
              </div>
            ))}
          </div>
          <p style={{ margin: '18px 0 0', fontSize: 13, lineHeight: 1.8, textAlign: 'justify' }}>
            Credits never expire. The School pack is designed for department chairs or school leads who want to buy in bulk and distribute credits to individual teachers. See <a href="/departments" style={{ color: blue }}>how department distribution works</a>.
          </p>
        </section>

        <section style={{ marginTop: 26, background: paper, border: '1px solid #d9d9d2', padding: '30px 34px' }}>
          <h2 style={{ margin: '0 0 18px', color: blue, fontFamily: serif, fontSize: 23 }}>
            Credit usage
          </h2>
          <div style={{ display: 'grid', gap: 18 }}>
            {usage.map(([name, cost, description]) => (
              <article key={name} style={{ borderTop: `1px solid ${rule}`, paddingTop: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,170px),1fr))', gap: 12 }}>
                  <h3 style={{ margin: 0, color: heading, fontFamily: serif, fontSize: 17 }}>{name}</h3>
                  <div style={{ fontFamily: display, fontSize: 13, color: '#333' }}>{cost}</div>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.8, textAlign: 'justify' }}>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
