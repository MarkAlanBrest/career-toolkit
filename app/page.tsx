'use client';

import { useState } from 'react';
import SiteNav from './components/SiteNav';

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
const ink = '#243746';
const muted = '#5F7280';
const blue = '#0770B8';
const rule = '#DDE7EE';
const wash = '#F6F9FB';

const tools = [
  ['Content Studio', 'Reusable Canvas page components for headings, callouts, cards, columns, checklists, and structured course content.'],
  ['Assignment Scheduler', 'Course planning tools for due dates, availability windows, and consistent assignment timing.'],
  ['Message Pulse', 'Student messaging tools for targeted outreach, reusable templates, and routine communication.'],
  ['Grade Audit', 'A review layer for missing scores, ungraded work, and gradebook issues.'],
  ['Course Vitals', 'At-a-glance course signals for missing work, activity concerns, and students who may need support.'],
  ['Announcement Composer', 'Reusable announcement templates for weekly communication and course updates.'],
];

const aiActions = [
  ['AI-assisted grading', 'Draft rubric-aligned feedback for teacher review.'],
  ['AI page creation', 'Generate a structured Canvas page draft from teacher-provided instructions.'],
  ['AI quiz creation', 'Draft questions, answer choices, answer keys, and feedback.'],
];

function InterfacePreview() {
  return (
    <div style={{ border: `1px solid ${rule}`, borderRadius: 10, background: '#fff', overflow: 'hidden', boxShadow: '0 16px 45px rgba(36,55,70,.10)' }}>
      <div style={{ height: 46, background: blue, color: '#fff', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', fontSize: 12, fontWeight: 800 }}>
        <span style={{ width: 24, height: 24, borderRadius: 7, background: '#fff', color: blue, display: 'grid', placeItems: 'center', fontSize: 11 }}>CE</span>
        Content Studio
        <span style={{ marginLeft: 'auto', background: '#fff', color: blue, borderRadius: 999, padding: '6px 10px' }}>AI Assist</span>
      </div>
      <div style={{ padding: 22 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr .75fr', gap: 14, marginBottom: 14 }}>
          <div style={{ border: `1px solid ${rule}`, borderRadius: 8, background: wash, padding: 16 }}>
            <div style={{ height: 12, width: '70%', borderRadius: 99, background: ink, marginBottom: 12 }} />
            <div style={{ height: 8, width: '94%', borderRadius: 99, background: '#AFC0CA', marginBottom: 8 }} />
            <div style={{ height: 8, width: '76%', borderRadius: 99, background: '#AFC0CA' }} />
          </div>
          <div style={{ border: `1px solid ${rule}`, borderRadius: 8, background: '#fff', padding: 16 }}>
            <div style={{ fontSize: 11, color: muted, fontWeight: 800, textTransform: 'uppercase' }}>AI credits</div>
            <div style={{ fontSize: 32, lineHeight: 1, fontWeight: 900, color: ink, marginTop: 8 }}>2,000</div>
            <div style={{ fontSize: 12, color: muted, marginTop: 5 }}>Current balance</div>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 9 }}>
          {['Grading draft ready for review', 'Page structure inserted into Canvas', 'Quiz questions prepared'].map(text => (
            <div key={text} style={{ border: `1px solid ${rule}`, borderRadius: 8, padding: '11px 13px', fontSize: 13, color: muted }}>
              {text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const extensionUrl = process.env.NEXT_PUBLIC_EXTENSION_URL || '#';
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs: [string, string][] = [
    ['Is Canvas Enhancer free?', 'Yes. The core Canvas tools are free to install and use. AI features are optional and use prepaid credits.'],
    ['Is this a replacement for Canvas?', 'No. Canvas Enhancer adds workflow tools inside Canvas. Teachers continue using Canvas normally.'],
    ['How are AI credits used?', 'AI credits are used only for AI-assisted grading, page creation, and quiz creation. Non-AI tools do not use credits.'],
    ['Can this support schools later?', 'Yes. The credit model can support individual teacher balances first and school-level credit pools later.'],
  ];

  return (
    <main style={{ fontFamily: font, color: ink, background: '#fff' }}>
      <SiteNav active="home" />

      <section style={{ background: wash, borderBottom: `1px solid ${rule}` }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '76px 28px 72px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,380px),1fr))', gap: 42, alignItems: 'center' }}>
          <div>
            <div style={{ color: blue, fontSize: 13, fontWeight: 800, marginBottom: 16 }}>Canvas Enhancer</div>
            <h1 style={{ margin: 0, fontSize: 'clamp(38px,5vw,62px)', lineHeight: 1.04, letterSpacing: 0, fontWeight: 850 }}>
              Practical Canvas tools for teachers and course teams.
            </h1>
            <p style={{ margin: '22px 0 0', color: muted, fontSize: 18, lineHeight: 1.7, maxWidth: 580 }}>
              Canvas Enhancer adds course-building, communication, scheduling, grading review, and optional AI workflows directly inside Canvas.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 30 }}>
              <a href={extensionUrl} style={{ background: blue, color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 800, padding: '12px 18px', borderRadius: 7 }}>Install Free</a>
              <a href="/features" style={{ background: '#fff', color: ink, border: `1px solid ${rule}`, textDecoration: 'none', fontSize: 15, fontWeight: 800, padding: '12px 18px', borderRadius: 7 }}>Review Features</a>
            </div>
          </div>
          <InterfacePreview />
        </div>
      </section>

      <section style={{ background: '#fff', borderBottom: `1px solid ${rule}` }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '26px 28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 18 }}>
          {[
            ['Free core tools', 'No subscription for non-AI workflows'],
            ['Optional AI credits', 'Used only when teachers choose AI'],
            ['Canvas-native workflow', 'Built to appear where teachers work'],
            ['School-ready direction', 'Can grow into shared credit pools'],
          ].map(([title, text]) => (
            <div key={title}>
              <div style={{ fontSize: 14, fontWeight: 850, color: ink }}>{title}</div>
              <div style={{ fontSize: 13, color: muted, lineHeight: 1.5, marginTop: 5 }}>{text}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: '#fff', padding: '72px 28px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div style={{ maxWidth: 700, marginBottom: 34 }}>
            <h2 style={{ margin: 0, fontSize: 'clamp(28px,4vw,42px)', lineHeight: 1.1, fontWeight: 850 }}>Core tools remain free.</h2>
            <p style={{ color: muted, fontSize: 16, lineHeight: 1.7, margin: '14px 0 0' }}>
              The free toolkit provides day-to-day value without asking teachers to make a purchase decision first.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
            {tools.map(([name, desc]) => (
              <div key={name} style={{ border: `1px solid ${rule}`, borderRadius: 8, padding: 20, background: '#fff' }}>
                <div style={{ color: ink, fontSize: 16, fontWeight: 850 }}>{name}</div>
                <div style={{ color: muted, fontSize: 14, lineHeight: 1.65, marginTop: 9 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: '#102533', color: '#fff', padding: '72px 28px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,330px),1fr))', gap: 30, alignItems: 'start' }}>
          <div>
            <div style={{ color: '#9DD9E9', fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Optional AI</div>
            <h2 style={{ margin: 0, fontSize: 'clamp(28px,4vw,42px)', lineHeight: 1.1, fontWeight: 850 }}>AI is available through prepaid credits.</h2>
            <p style={{ color: '#C4D2DA', fontSize: 16, lineHeight: 1.75, marginTop: 15 }}>
              Credits keep grading, page creation, and quiz creation in one understandable system. Teachers only use credits when they choose an AI action.
            </p>
            <div style={{ marginTop: 22, color: '#C4D2DA', fontSize: 14 }}>Typical first pack: <strong style={{ color: '#fff' }}>$20 for 2,000 credits</strong></div>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {aiActions.map(([name, desc]) => (
              <div key={name} style={{ background: '#fff', color: ink, borderRadius: 8, padding: 18 }}>
                <div style={{ fontSize: 16, fontWeight: 850 }}>{name}</div>
                <div style={{ color: muted, fontSize: 14, lineHeight: 1.6, marginTop: 7 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: wash, padding: '70px 28px' }}>
        <div style={{ maxWidth: 940, margin: '0 auto' }}>
          <h2 style={{ margin: '0 0 24px', fontSize: 30, lineHeight: 1.15, fontWeight: 850 }}>Questions</h2>
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
