'use client';

import { useState } from 'react';
import SiteNav from './components/SiteNav';

const ink = '#243746';
const blue = '#0770B8';
const teal = '#0F8F8C';
const line = '#D8E1E8';
const soft = '#F4F8FB';
const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

const freeTools = [
  'Content Studio toolbar',
  'Message templates',
  'Assignment scheduler',
  'Course vitals',
  'Grade audit',
  'Announcement composer',
];

const aiUses = [
  { name: 'Grade a submission', cost: '1 credit', note: 'Rubric scoring and feedback draft' },
  { name: 'Create a Canvas page', cost: '5 credits', note: 'Formatted page draft with sections' },
  { name: 'Build a quiz', cost: '5 credits', note: 'Questions, answers, and feedback' },
];

function ProductScene() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', right: '6vw', top: 96, width: 'min(560px,44vw)', minWidth: 420, transform: 'rotate(-2deg)', opacity: 0.95 }}>
        <div style={{ background: '#fff', border: `1px solid ${line}`, boxShadow: '0 24px 80px rgba(36,55,70,.18)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ height: 44, background: blue, display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', color: '#fff', fontSize: 12, fontWeight: 800 }}>
            <span style={{ width: 20, height: 20, borderRadius: 6, background: '#fff', color: blue, display: 'grid', placeItems: 'center', fontSize: 11 }}>CE</span>
            <span>Content Studio</span>
            <span style={{ marginLeft: 8, background: '#fff', color: blue, borderRadius: 999, padding: '6px 12px' }}>AI Assist</span>
            <span style={{ background: '#055f9e', borderRadius: 6, padding: '6px 10px' }}>Layouts</span>
            <span style={{ background: '#055f9e', borderRadius: 6, padding: '6px 10px' }}>Icons</span>
          </div>
          <div style={{ padding: 22, display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 14 }}>
              <div style={{ background: soft, border: `1px solid ${line}`, borderRadius: 8, padding: 16 }}>
                <div style={{ height: 12, width: '72%', background: ink, borderRadius: 999, marginBottom: 12 }} />
                <div style={{ height: 8, width: '94%', background: '#A8BBC8', borderRadius: 999, marginBottom: 8 }} />
                <div style={{ height: 8, width: '76%', background: '#A8BBC8', borderRadius: 999 }} />
              </div>
              <div style={{ background: '#E9F7F6', border: '1px solid #BDE7E4', borderRadius: 8, padding: 16 }}>
                <div style={{ color: teal, fontSize: 11, fontWeight: 800, marginBottom: 10 }}>AI CREDITS</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: ink, lineHeight: 1 }}>250</div>
                <div style={{ fontSize: 12, color: '#55707F', marginTop: 5 }}>$20 credit pack</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {['Grade', 'Page', 'Quiz'].map((label, i) => (
                <div key={label} style={{ border: `1px solid ${line}`, borderRadius: 8, padding: 14, background: '#fff' }}>
                  <div style={{ fontSize: 11, color: '#6A7D8A', fontWeight: 800 }}>{label}</div>
                  <div style={{ height: 8, width: i === 0 ? '45%' : '70%', background: blue, borderRadius: 999, marginTop: 12 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', right: '22vw', bottom: 46, width: 280, background: '#fff', border: `1px solid ${line}`, borderRadius: 10, boxShadow: '0 16px 50px rgba(36,55,70,.14)', padding: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: ink, marginBottom: 12 }}>Grading Pulse</div>
        {['Rubric score drafted', 'Feedback ready to review', 'Teacher stays in control'].map(text => (
          <div key={text} style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 9, fontSize: 12, color: '#526A79' }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: teal }} />
            {text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const extensionUrl = process.env.NEXT_PUBLIC_EXTENSION_URL || '#';
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    ['Is Canvas Enhancer free?', 'Yes. The core teaching tools are free to install and use. AI features use prepaid AI credits.'],
    ['Do teachers need a subscription?', 'No. The new model is simple: free tools, then optional AI credit packs when a teacher wants AI.'],
    ['What do AI credits do?', 'AI credits can be used for grading, Canvas page creation, and quiz creation. Different AI actions use different credit amounts.'],
    ['Can schools buy credits?', 'That is the plan. Individual teachers can buy credits first, and school credit pools can come next.'],
  ];

  return (
    <main style={{ fontFamily: font, color: ink, background: '#fff' }}>
      <SiteNav active="home" />

      <section style={{ position: 'relative', minHeight: 620, background: '#EAF2F7', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        <ProductScene />
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 1160, margin: '0 auto', padding: '72px 32px 96px' }}>
          <div style={{ maxWidth: 560 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 12px', border: `1px solid ${line}`, background: '#fff', color: blue, borderRadius: 999, fontSize: 12, fontWeight: 900, marginBottom: 22 }}>
              Canvas Enhancer is free. AI is optional.
            </div>
            <h1 style={{ margin: 0, fontSize: 'clamp(42px,7vw,76px)', lineHeight: 0.96, letterSpacing: 0, color: ink, fontWeight: 950 }}>
              Canvas tools teachers can actually use.
            </h1>
            <p style={{ margin: '24px 0 0', fontSize: 19, lineHeight: 1.6, color: '#526A79', maxWidth: 520 }}>
              Give every teacher the full Canvas toolkit for free. When they need AI for grading, pages, or quizzes, they buy credits inside the app.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 32 }}>
              <a href={extensionUrl} style={{ background: blue, color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 900, padding: '13px 20px', borderRadius: 8, boxShadow: '0 12px 28px rgba(7,112,184,.22)' }}>Install Free</a>
              <a href="/pricing" style={{ background: '#fff', color: ink, border: `1px solid ${line}`, textDecoration: 'none', fontSize: 15, fontWeight: 900, padding: '13px 20px', borderRadius: 8 }}>See AI Credits</a>
            </div>
          </div>
        </div>
      </section>

      <section style={{ borderTop: `1px solid ${line}`, borderBottom: `1px solid ${line}`, background: '#fff' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '28px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 18 }}>
          {[
            ['Free install', 'No monthly charge for the toolkit'],
            ['$20 packs', 'Simple prepaid AI credits'],
            ['1 credit', 'Grade one submission'],
            ['5 credits', 'Create a page or quiz'],
          ].map(([big, small]) => (
            <div key={big}>
              <div style={{ color: blue, fontSize: 26, fontWeight: 950, lineHeight: 1 }}>{big}</div>
              <div style={{ color: '#607684', fontSize: 13, marginTop: 6 }}>{small}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: '#fff', padding: '78px 32px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div style={{ maxWidth: 720, marginBottom: 34 }}>
            <h2 style={{ margin: 0, fontSize: 'clamp(28px,4vw,44px)', lineHeight: 1.05, color: ink }}>Free tools first. AI only when it helps.</h2>
            <p style={{ margin: '14px 0 0', fontSize: 16, lineHeight: 1.7, color: '#607684' }}>This keeps the product easy to understand and easy to trust. Teachers can use the toolkit all day without paying unless they choose an AI action.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
            {freeTools.map(tool => (
              <div key={tool} style={{ border: `1px solid ${line}`, borderRadius: 8, padding: 18, background: soft }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fff', border: `1px solid ${line}`, display: 'grid', placeItems: 'center', color: blue, fontWeight: 950, marginBottom: 14 }}>CE</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: ink }}>{tool}</div>
                <div style={{ fontSize: 13, color: '#607684', lineHeight: 1.55, marginTop: 8 }}>Included in the free toolkit. No subscription required.</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: '#102533', color: '#fff', padding: '78px 32px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 32, alignItems: 'start' }}>
          <div>
            <div style={{ color: '#8BE0DC', fontSize: 12, fontWeight: 950, textTransform: 'uppercase', letterSpacing: 0, marginBottom: 12 }}>AI credits</div>
            <h2 style={{ margin: 0, fontSize: 'clamp(30px,4vw,48px)', lineHeight: 1.05 }}>Buy credits. Use them anywhere AI appears.</h2>
            <p style={{ color: '#BCD0DA', fontSize: 16, lineHeight: 1.7, marginTop: 16 }}>One credit bucket for grading, page creation, and quiz creation. No package maze. No monthly commitment.</p>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {aiUses.map(item => (
              <div key={item.name} style={{ background: '#fff', color: ink, borderRadius: 8, padding: 18, display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900 }}>{item.name}</div>
                  <div style={{ fontSize: 13, color: '#607684', marginTop: 5 }}>{item.note}</div>
                </div>
                <div style={{ background: '#E9F7F6', color: teal, border: '1px solid #BDE7E4', borderRadius: 999, padding: '8px 12px', fontWeight: 950, fontSize: 13 }}>{item.cost}</div>
              </div>
            ))}
            <div style={{ background: blue, color: '#fff', borderRadius: 8, padding: 20, display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 950, lineHeight: 1 }}>$20 = 250 AI credits</div>
                <div style={{ color: '#D7ECF8', fontSize: 13, marginTop: 7 }}>Prepaid, non-transferable, used only for AI actions.</div>
              </div>
              <a href="/pricing" style={{ background: '#fff', color: blue, textDecoration: 'none', borderRadius: 8, padding: '11px 16px', fontWeight: 950, fontSize: 14 }}>View pricing</a>
            </div>
          </div>
        </div>
      </section>

      <section style={{ background: soft, padding: '78px 32px' }}>
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
          <h2 style={{ margin: '0 0 28px', fontSize: 'clamp(28px,4vw,42px)', lineHeight: 1.1 }}>Built for the way teachers decide.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
            {[
              ['Try first', 'Teachers get value before they ever see a checkout screen.'],
              ['Pay only for AI', 'The paid moment happens exactly where the AI value appears.'],
              ['Scale later', 'Schools can later buy shared pools for multiple teachers.'],
            ].map(([title, text], idx) => (
              <div key={title} style={{ background: '#fff', border: `1px solid ${line}`, borderRadius: 8, padding: 22 }}>
                <div style={{ color: blue, fontSize: 13, fontWeight: 950, marginBottom: 14 }}>0{idx + 1}</div>
                <div style={{ fontSize: 18, fontWeight: 950, color: ink }}>{title}</div>
                <div style={{ fontSize: 14, color: '#607684', lineHeight: 1.65, marginTop: 10 }}>{text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: '#fff', padding: '72px 32px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <h2 style={{ margin: '0 0 24px', fontSize: 32, lineHeight: 1.1 }}>Questions teachers will ask</h2>
          {faqs.map(([q, a], idx) => (
            <div key={q} style={{ borderTop: `1px solid ${line}` }}>
              <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} style={{ width: '100%', padding: '18px 0', background: 'transparent', border: 0, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 16, textAlign: 'left', color: ink }}>
                <span style={{ fontSize: 16, fontWeight: 900 }}>{q}</span>
                <span style={{ color: blue, fontWeight: 950 }}>{openFaq === idx ? '-' : '+'}</span>
              </button>
              {openFaq === idx && <div style={{ color: '#607684', lineHeight: 1.7, fontSize: 15, padding: '0 0 20px' }}>{a}</div>}
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: ink, color: '#fff', padding: '66px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(28px,4vw,44px)', lineHeight: 1.05 }}>Give it away. Let the AI pay for itself.</h2>
          <p style={{ color: '#BFD0DA', fontSize: 16, lineHeight: 1.7, margin: '16px 0 28px' }}>The free toolkit grows the audience. AI credits create the revenue path without making the product feel complicated.</p>
          <a href={extensionUrl} style={{ display: 'inline-block', background: blue, color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 950, padding: '13px 20px', borderRadius: 8 }}>Install Free</a>
        </div>
      </section>
    </main>
  );
}
