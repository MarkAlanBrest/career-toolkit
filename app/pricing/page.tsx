'use client';

import SiteNav from '../components/SiteNav';

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
const text = '#1f2933';
const muted = '#5f6b76';
const rule = '#d7dde2';
const page = '#fbfcfd';

const packs = [
  ['Starter', '$10', '1,000 credits'],
  ['Teacher', '$20', '2,000 credits'],
  ['Department', '$50', '5,000 credits'],
];

const usage = [
  ['AI-assisted grading', '1 credit+', 'Feedback and rubric-score drafting for teacher review.'],
  ['AI page creation', '10 credits+', 'Structured Canvas page draft from teacher instructions.'],
  ['AI quiz creation', '10 credits+', 'Question, answer, key, and feedback drafting.'],
];

export default function PricingPage() {
  return (
    <main style={{ fontFamily: font, color: text, background: page, minHeight: '100vh' }}>
      <SiteNav active="pricing" />

      <section style={{ maxWidth: 920, margin: '0 auto', padding: '58px 32px 38px' }}>
        <p style={{ margin: '0 0 14px', color: muted, fontSize: 15, lineHeight: 1.7 }}>
          AI Credits
        </p>
        <h1 style={{ margin: 0, fontSize: 'clamp(30px,5vw,44px)', lineHeight: 1.15, fontWeight: 650 }}>
          AI usage is separate from the free Canvas tools.
        </h1>
        <p style={{ margin: '20px 0 0', color: muted, fontSize: 16, lineHeight: 1.75, maxWidth: 720 }}>
          The standard Canvas Enhancer tools are free. AI credits are used only for AI-assisted grading, AI page creation, and AI quiz creation.
        </p>
      </section>

      <section style={{ borderTop: `1px solid ${rule}`, borderBottom: `1px solid ${rule}`, background: '#fff' }}>
        <div style={{ maxWidth: 920, margin: '0 auto', padding: '28px 32px' }}>
          <h2 style={{ margin: '0 0 18px', fontSize: 20, fontWeight: 650 }}>Credit packs</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {packs.map(([name, price, credits]) => (
              <div key={name} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,150px),1fr))', gap: 10, borderTop: `1px solid ${rule}`, paddingTop: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 650 }}>{name}</div>
                <div style={{ fontSize: 14 }}>{price}</div>
                <div style={{ fontSize: 14, color: muted }}>{credits}</div>
              </div>
            ))}
          </div>
          <p style={{ margin: '20px 0 0', color: muted, fontSize: 14, lineHeight: 1.7 }}>
            Credits are purchased inside the Canvas Enhancer AI Credits screen. The exact credit rate can be adjusted as AI costs are measured.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: 920, margin: '0 auto', padding: '42px 32px 64px' }}>
        <h2 style={{ margin: '0 0 18px', fontSize: 20, fontWeight: 650 }}>Credit usage</h2>
        <div style={{ display: 'grid', gap: 18 }}>
          {usage.map(([name, cost, description]) => (
            <div key={name} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,150px),1fr))', gap: 10, borderTop: `1px solid ${rule}`, paddingTop: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 650 }}>{name}</div>
              <div style={{ fontSize: 14 }}>{cost}</div>
              <div style={{ fontSize: 14, color: muted, lineHeight: 1.7 }}>{description}</div>
            </div>
          ))}
        </div>
        <p style={{ margin: '24px 0 0', color: muted, fontSize: 14, lineHeight: 1.7 }}>
          The purpose of credits is to keep the teacher-facing model understandable while still allowing different AI actions to use different amounts.
        </p>
      </section>
    </main>
  );
}
