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

const steps = [
  ['One person buys credits', 'A department chair, coordinator, instructional coach, or school lead can purchase AI credits with a card.'],
  ['Teachers are added by email', 'The buyer keeps a simple list of teachers who may receive credits. There is no shared password or school contract.'],
  ['Credits are sent in chosen amounts', 'The buyer decides how many credits each teacher receives. Credits can be sent again later as needs change.'],
  ['Received credits belong to that teacher', 'Once credits are sent, they are added to the receiving teacher account and can be used for grading, pages, or quizzes.'],
];

const examples = [
  ['Small department', 'A department chair buys the School Pack (25,000 credits, $250) and sends 5,000 credits to each of five teachers - enough for a full semester each.'],
  ['Shared support', 'A teacher with extra credits can send any amount to a colleague who needs more for grading or page creation. No admin approval needed.'],
  ['No contract required', 'The school can support a team without subscriptions, purchase orders, or a formal service agreement. Buy when needed, distribute as needed.'],
];

export default function DepartmentsPage() {
  return (
    <main style={{ minHeight: '100vh', background: pageBg, color: text, fontFamily: serif }}>
      <SiteNav active="departments" />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px 48px' }}>
        <section style={{ background: paper, border: '1px solid #d9d9d2', padding: '38px 38px 34px' }}>
          <h1 style={{ margin: 0, color: heading, fontFamily: serif, fontSize: 'clamp(30px,5vw,42px)', lineHeight: 1.12 }}>
            AI credits can be purchased for a department or school.
          </h1>
          <p style={{ margin: '20px 0 0', maxWidth: 780, fontSize: 15, lineHeight: 1.8, textAlign: 'justify' }}>
            Canvas Enhancer does not require a school contract or subscription. One person can buy the School Pack ($250 for 25,000 credits), add teachers by email, and distribute credits to team members in the amounts they choose. Credits never expire and can be sent at any time.
          </p>
        </section>

        <section style={{ marginTop: 26, background: paper, border: '1px solid #d9d9d2', padding: '30px 34px' }}>
          <h2 style={{ margin: '0 0 18px', color: blue, fontFamily: serif, fontSize: 23 }}>
            How department credit distribution works
          </h2>
          <div style={{ borderTop: `1px solid ${rule}` }}>
            {steps.map(([title, body]) => (
              <div key={title} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 18, borderBottom: `1px solid ${rule}`, padding: '16px 0' }}>
                <h3 style={{ margin: 0, color: heading, fontFamily: serif, fontSize: 17 }}>{title}</h3>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.8, textAlign: 'justify' }}>{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 26, background: paper, border: '1px solid #d9d9d2', padding: '30px 34px' }}>
          <h2 style={{ margin: '0 0 18px', color: blue, fontFamily: serif, fontSize: 23 }}>
            Example uses
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: 26 }}>
            {examples.map(([title, body]) => (
              <article key={title}>
                <h3 style={{ margin: '0 0 10px', color: heading, fontFamily: serif, fontSize: 18 }}>{title}</h3>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.8, textAlign: 'justify' }}>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 26, padding: '4px 2px 0' }}>
          <h2 style={{ margin: '0 0 12px', color: heading, fontFamily: serif, fontSize: 22 }}>
            Simple by design
          </h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, textAlign: 'justify', maxWidth: 780 }}>
            The model is intentionally straightforward: buy credits, send credits, use credits. Teachers can still buy their own credits, and credits can be sent from teacher to teacher when a team needs flexibility.
          </p>
          <p style={{ margin: '18px 0 0', fontFamily: display, fontSize: 13 }}>
            <a href="/pricing" style={{ color: blue }}>View AI credit packs</a>
          </p>
        </section>
      </div>
    </main>
  );
}
