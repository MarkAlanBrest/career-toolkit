'use client';

import { useState } from 'react';
import SiteNav from '../components/SiteNav';

const ink = '#243746';
const blue = '#0770B8';
const teal = '#0F8F8C';
const line = '#D8E1E8';
const soft = '#F4F8FB';
const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

const packs = [
  { name: 'Starter', price: '$10', credits: 100, best: false, note: 'Good for trying AI grading or a small week of work.' },
  { name: 'Teacher Pack', price: '$20', credits: 250, best: true, note: 'Best first pack for an active teacher.' },
  { name: 'Department Pack', price: '$50', credits: 650, best: false, note: 'Better for heavy use or a small team.' },
];

const usage = [
  { action: 'Grade one assignment submission', credits: 1, examples: '100 credits grades about 100 submissions.' },
  { action: 'Create one Canvas page', credits: 5, examples: '100 credits creates about 20 pages.' },
  { action: 'Create one quiz', credits: 5, examples: '100 credits creates about 20 quizzes.' },
];

export default function PricingPage() {
  const extensionUrl = process.env.NEXT_PUBLIC_EXTENSION_URL || '#';
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    ['Is there a monthly subscription?', 'No. The Canvas tools are free. AI credits are prepaid and optional.'],
    ['Do credits expire?', 'The current plan is that teacher credits do not expire. We can add school rules later if needed.'],
    ['Can credits be transferred?', 'No. Credits are non-transferable. They stay with the teacher or account that bought them.'],
    ['Can a school buy credits for multiple teachers?', 'That is the next layer: a school credit pool, admin controls, and optional auto-refill.'],
    ['Can teachers set auto-refill?', 'Yes, later. Stripe can save a payment method and refill when the balance drops below a limit.'],
  ];

  return (
    <main style={{ fontFamily: font, color: ink, background: '#fff' }}>
      <SiteNav active="pricing" />

      <section style={{ background: '#EAF2F7', borderBottom: `1px solid ${line}`, padding: '74px 32px 64px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 36, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', padding: '7px 12px', border: `1px solid ${line}`, background: '#fff', color: blue, borderRadius: 999, fontSize: 12, fontWeight: 950, marginBottom: 20 }}>
              Free toolkit. Paid AI only.
            </div>
            <h1 style={{ margin: 0, fontSize: 'clamp(40px,6vw,68px)', lineHeight: 0.98, letterSpacing: 0 }}>AI credits, without a subscription maze.</h1>
            <p style={{ margin: '22px 0 0', color: '#526A79', fontSize: 18, lineHeight: 1.65 }}>
              Teachers use Canvas Enhancer for free. When they want AI grading, page creation, or quiz creation, they buy credits.
            </p>
            <div style={{ marginTop: 28, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href={extensionUrl} style={{ background: blue, color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 950, padding: '13px 20px', borderRadius: 8 }}>Install Free</a>
              <a href="#packs" style={{ background: '#fff', color: ink, border: `1px solid ${line}`, textDecoration: 'none', fontSize: 15, fontWeight: 950, padding: '13px 20px', borderRadius: 8 }}>See credit packs</a>
            </div>
          </div>

          <div style={{ background: '#fff', border: `1px solid ${line}`, borderRadius: 10, boxShadow: '0 22px 70px rgba(36,55,70,.14)', overflow: 'hidden' }}>
            <div style={{ background: blue, color: '#fff', padding: 18, fontWeight: 950 }}>AI Credit Balance</div>
            <div style={{ padding: 22 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center', borderBottom: `1px solid ${line}`, paddingBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#607684', fontWeight: 900, textTransform: 'uppercase' }}>Current balance</div>
                  <div style={{ fontSize: 52, fontWeight: 950, lineHeight: 1, marginTop: 6 }}>250</div>
                </div>
                <div style={{ background: '#E9F7F6', color: teal, border: '1px solid #BDE7E4', borderRadius: 999, padding: '8px 13px', fontWeight: 950, fontSize: 13 }}>Ready</div>
              </div>
              <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
                {usage.map(item => (
                  <div key={item.action} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', fontSize: 14 }}>
                    <span style={{ color: '#526A79' }}>{item.action}</span>
                    <span style={{ color: ink, fontWeight: 950 }}>{item.credits} credit{item.credits > 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="packs" style={{ padding: '74px 32px', background: '#fff' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ maxWidth: 680, marginBottom: 34 }}>
            <h2 style={{ margin: 0, fontSize: 'clamp(30px,4vw,46px)', lineHeight: 1.06 }}>Simple credit packs</h2>
            <p style={{ margin: '14px 0 0', color: '#607684', fontSize: 16, lineHeight: 1.7 }}>The exact credit amount can change after final AI cost testing. The structure stays simple.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
            {packs.map(pack => (
              <div key={pack.name} style={{ position: 'relative', border: pack.best ? `2px solid ${blue}` : `1px solid ${line}`, borderRadius: 10, padding: 24, background: pack.best ? '#F8FCFF' : soft }}>
                {pack.best && <div style={{ position: 'absolute', right: 18, top: 18, background: blue, color: '#fff', borderRadius: 999, padding: '5px 9px', fontSize: 11, fontWeight: 950 }}>Best first pack</div>}
                <div style={{ fontSize: 14, fontWeight: 950, color: ink }}>{pack.name}</div>
                <div style={{ marginTop: 18, display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <span style={{ fontSize: 48, fontWeight: 950, lineHeight: .9 }}>{pack.price}</span>
                  <span style={{ color: '#607684', fontSize: 14, marginBottom: 4 }}>one time</span>
                </div>
                <div style={{ marginTop: 14, color: blue, fontSize: 20, fontWeight: 950 }}>{pack.credits} AI credits</div>
                <p style={{ margin: '12px 0 22px', color: '#607684', fontSize: 14, lineHeight: 1.6 }}>{pack.note}</p>
                <button type="button" style={{ width: '100%', background: pack.best ? blue : '#fff', color: pack.best ? '#fff' : ink, border: pack.best ? `1px solid ${blue}` : `1px solid ${line}`, borderRadius: 8, padding: '12px 14px', fontSize: 14, fontWeight: 950, cursor: 'pointer' }}>
                  Buy in the app
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: soft, padding: '74px 32px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 28 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 'clamp(28px,4vw,42px)', lineHeight: 1.08 }}>What credits buy</h2>
            <p style={{ color: '#607684', fontSize: 16, lineHeight: 1.7, marginTop: 14 }}>Credits make unlike AI actions feel understandable. A quick grading pass costs less than a full page or quiz build.</p>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {usage.map(item => (
              <div key={item.action} style={{ background: '#fff', border: `1px solid ${line}`, borderRadius: 8, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 950 }}>{item.action}</div>
                  <div style={{ background: '#E9F7F6', color: teal, border: '1px solid #BDE7E4', borderRadius: 999, padding: '7px 11px', fontWeight: 950, fontSize: 13 }}>{item.credits}</div>
                </div>
                <div style={{ color: '#607684', fontSize: 13, marginTop: 9 }}>{item.examples}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: '#102533', color: '#fff', padding: '74px 32px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 18 }}>
          {[
            ['Teacher purchases', 'Buy credits from the AI dropdown in the toolbar. Credits land on that teacher account.'],
            ['School purchases', 'Later, schools can buy a shared pool and assign credits to multiple teachers.'],
            ['Auto-refill', 'Later, a teacher or school can set a low-balance refill using Stripe.'],
          ].map(([title, text]) => (
            <div key={title} style={{ border: '1px solid rgba(255,255,255,.16)', borderRadius: 8, padding: 22, background: 'rgba(255,255,255,.04)' }}>
              <div style={{ fontSize: 18, fontWeight: 950 }}>{title}</div>
              <div style={{ color: '#BCD0DA', fontSize: 14, lineHeight: 1.7, marginTop: 10 }}>{text}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: '#fff', padding: '70px 32px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <h2 style={{ margin: '0 0 22px', fontSize: 32, lineHeight: 1.1 }}>Pricing questions</h2>
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
    </main>
  );
}
