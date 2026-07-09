'use client';

import { useState } from 'react';

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
const navy = '#172A36';
const blue = '#0770B8';
const border = '#E2E8F0';
const muted = '#526A79';
const green = '#15803D';

const SCRIPT_URL = 'https://career-toolkit-ruby.vercel.app/content-studio.user.js';
const TAMPERMONKEY_URL = 'https://www.tampermonkey.net/';

const FEATURES = [
  {
    icon: '✨',
    title: 'AI Assist page builder',
    body: 'Describe what you need — a lesson page, assignment, discussion prompt, syllabus — and get a themed, ready-to-paste Canvas page in seconds.',
  },
  {
    icon: '✦',
    title: 'AI Quiz Maker',
    body: 'Give it a topic and question-type counts. It drafts multiple choice, true/false, short answer, and essay questions, then creates the quiz directly in Canvas.',
  },
  {
    icon: '⊞',
    title: 'Insert & Layouts',
    body: 'Banners, callouts, checklists, cards, columns, tables — a full library of styled Canvas components, one click to drop into your editor.',
  },
  {
    icon: '🔍',
    title: '300+ icons',
    body: 'Education, status, arrows, math symbols, and more — sized and dropped into the page with one click.',
  },
];

const PACKS = [
  { key: 'starter', label: 'Starter',    price: '$10',  credits: '1,000 cr' },
  { key: 'teacher', label: 'Teacher',    price: '$20',  credits: '2,000 cr', popular: true },
  { key: 'power',   label: 'Power User', price: '$50',  credits: '5,000 cr' },
  { key: 'school',  label: 'School',     price: '$250', credits: '25,000 cr' },
];

const FAQ = [
  {
    q: 'Do I have to pay anything to use it?',
    a: 'No. The toolbar, page components, layouts, icons, and quiz-builder interface are free to use for as long as you want — no trial period, no expiration, no credit card required to install.',
  },
  {
    q: 'What actually costs money?',
    a: 'Only the AI features — having Claude draft page content or quiz questions for you. Those draw from a prepaid credit balance you buy only if and when you want that boost.',
  },
  {
    q: 'Is it a subscription?',
    a: 'No. There is no monthly fee, no recurring charge, and no contract. You buy a credit pack once, use the credits whenever you like, and they never expire. Buy more only when you run out.',
  },
  {
    q: 'What is Tampermonkey?',
    a: 'Tampermonkey is a free, well-established browser extension (available for Chrome, Edge, Firefox, and Safari) that runs small scripts on specific pages you choose. Canvas Content Studio is one such script — installing it adds the toolbar to your Canvas course pages. Tampermonkey itself is a one-time install and is not made by us.',
  },
  {
    q: 'How do I turn it off or uninstall it?',
    a: 'Open Settings (⚙) in the toolbar and click "Disable Content Studio" to stop it instantly on every Canvas page — you can turn it back on any time from the Tampermonkey icon’s menu. To remove it completely, open the Tampermonkey dashboard (click the Tampermonkey icon → Dashboard) and delete Canvas Content Studio from the list — same as removing any other userscript.',
  },
  {
    q: 'Do I need to sign up or create an account?',
    a: 'No. The script recognizes you automatically from your existing Canvas login — there is no separate password or account to manage. If you buy credits, they are tied to your Canvas identity, not to a specific device or browser.',
  },
  {
    q: 'Where does my data go?',
    a: 'The toolbar itself runs entirely in your browser. On load it checks our server for the latest component library (anonymous) and, once per install, records that the script is active (tied to the same Canvas identity used for credits, so we know roughly how many teachers are using it). AI requests are sent to our server only when you click Generate, to call the AI model. Nothing about the Canvas pages, courses, or content you work with is otherwise transmitted.',
  },
];

function Step({ n, title, body }: { n: number; title: string; body: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 14 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', background: blue, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 13, flexShrink: 0,
      }}>
        {n}
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: navy, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 13, color: muted, lineHeight: 1.65 }}>{body}</div>
      </div>
    </div>
  );
}

export default function ContentStudioPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: font, color: navy }}>
      {/* Header */}
      <div style={{ background: navy, color: '#fff' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>◆</span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Canvas Content Studio</span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '48px 20px 8px' }}>
        <div style={{ display: 'inline-block', background: '#EDF5FF', color: blue, fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20, marginBottom: 16, letterSpacing: '.02em' }}>
          FREE BROWSER SCRIPT — NO CONTRACT, EVER
        </div>
        <h1 style={{ margin: 0, fontSize: 'clamp(30px,5vw,42px)', lineHeight: 1.12, fontWeight: 800 }}>
          Design better Canvas pages, free — bring in AI only when you want the boost.
        </h1>
        <p style={{ margin: '18px 0 0', fontSize: 16, lineHeight: 1.7, color: muted, maxWidth: 620 }}>
          Canvas Content Studio adds a design toolbar right inside the Canvas rich content editor — themed banners,
          callouts, layouts, icons, and a full quiz builder. It runs as a free Tampermonkey userscript in your browser.
          Use it free for as long as you like. If you ever want AI to draft a page or quiz for you, buy credits once —
          no subscription, no obligation, no monthly fee.
        </p>
        <div style={{ marginTop: 26, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href={SCRIPT_URL} style={primaryButton}>Install Canvas Content Studio</a>
          <a href="#how-it-works" style={secondaryButton}>How it works</a>
        </div>
        <div style={{ marginTop: 12, fontSize: 12.5, color: '#8BA5B5' }}>
          Requires the free{' '}
          <a href={TAMPERMONKEY_URL} target="_blank" rel="noopener noreferrer" style={{ color: blue }}>Tampermonkey</a>{' '}
          browser extension — you&apos;ll be prompted to install that first if you don&apos;t have it.
        </div>
      </div>

      {/* Free-forever banner */}
      <div style={{ maxWidth: 880, margin: '36px auto 0', padding: '0 20px' }}>
        <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 12, padding: '22px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 18 }}>
          {[
            ['No monthly fee', 'The toolbar never charges you to use it.'],
            ['No contract', 'Nothing to sign, nothing to cancel.'],
            ['No obligation', 'Buy AI credits only if and when you want to.'],
            ['Credits never expire', 'Buy once, use whenever it’s worth it.'],
          ].map(([title, body]) => (
            <div key={title}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: green, marginBottom: 4 }}>✓ {title}</div>
              <div style={{ fontSize: 12.5, color: muted, lineHeight: 1.5 }}>{body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth: 880, margin: '48px auto 0', padding: '0 20px' }}>
        <h2 style={sectionTitle}>What it does</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16, marginTop: 16 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: muted, lineHeight: 1.6 }}>{f.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works / install steps */}
      <div id="how-it-works" style={{ maxWidth: 880, margin: '48px auto 0', padding: '0 20px' }}>
        <h2 style={sectionTitle}>How it works</h2>
        <p style={{ fontSize: 13.5, color: muted, lineHeight: 1.7, margin: '10px 0 22px', maxWidth: 640 }}>
          Canvas Content Studio isn&apos;t a hosted app or a Chrome extension of its own — it&apos;s a small script that
          runs through <a href={TAMPERMONKEY_URL} target="_blank" rel="noopener noreferrer" style={{ color: blue }}>Tampermonkey</a>,
          a free, widely-used browser add-on that lets a page add its own tools on sites you choose. Once installed, the
          toolbar just appears automatically whenever you open a Canvas course page — nothing to open, log into, or configure.
        </p>
        <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 12, padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Step n={1} title="Install Tampermonkey" body={<>Get the free extension for your browser from <a href={TAMPERMONKEY_URL} target="_blank" rel="noopener noreferrer" style={{ color: blue }}>tampermonkey.net</a> — one-time, takes under a minute.</>} />
          <Step n={2} title="Install Canvas Content Studio" body={<>Click <a href={SCRIPT_URL} style={{ color: blue }}>Install Canvas Content Studio</a> above — Tampermonkey will recognize the script and show its own install screen. Confirm it.</>} />
          <Step n={3} title="Open any Canvas course page" body="The toolbar appears above the rich content editor automatically — no login, no setup." />
          <Step n={4} title="Design freely, add AI when you want it" body="Insert components and build quizzes for free. If you want AI to draft content for you, buy a credit pack from the AI Credits panel — entirely optional." />
        </div>
      </div>

      {/* Credits */}
      <div style={{ maxWidth: 880, margin: '48px auto 0', padding: '0 20px' }}>
        <h2 style={sectionTitle}>AI credits — only if you want the boost</h2>
        <p style={{ fontSize: 13.5, color: muted, lineHeight: 1.7, margin: '10px 0 18px', maxWidth: 640 }}>
          Prepaid, one-time purchases. No subscription is ever created. Use credits whenever a page or quiz is worth
          letting AI draft it for you — skip them entirely otherwise.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
          {PACKS.map(p => (
            <div key={p.key} style={{
              background: '#fff', border: `2px solid ${p.popular ? blue : border}`, borderRadius: 10,
              padding: '16px 12px', textAlign: 'center', position: 'relative',
            }}>
              {p.popular && (
                <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: blue, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                  MOST POPULAR
                </div>
              )}
              <div style={{ fontSize: 12.5, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>{p.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: navy }}>{p.price}</div>
              <div style={{ fontSize: 12.5, color: muted, marginTop: 2 }}>{p.credits}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 880, margin: '48px auto 0', padding: '0 20px' }}>
        <h2 style={sectionTitle}>Questions</h2>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FAQ.map((item, i) => {
            const open = openFaq === i;
            return (
              <div key={item.q} style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : i)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '14px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontFamily: font, fontSize: 14, fontWeight: 700, color: navy,
                  }}
                >
                  {item.q}
                  <span style={{ color: muted, fontSize: 13, marginLeft: 12, flexShrink: 0 }}>{open ? '−' : '+'}</span>
                </button>
                {open && (
                  <div style={{ padding: '0 16px 16px', fontSize: 13, color: muted, lineHeight: 1.7 }}>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ maxWidth: 880, margin: '48px auto 0', padding: '0 20px 56px' }}>
        <div style={{ background: navy, borderRadius: 14, padding: '32px 28px', textAlign: 'center' }}>
          <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
            Free to use, no strings attached.
          </div>
          <div style={{ color: '#B8C7D1', fontSize: 13.5, marginBottom: 20, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Install it, use it for as long as you want. Buy AI credits only the day you actually want that extra boost.
          </div>
          <a href={SCRIPT_URL} style={{ ...primaryButton, display: 'inline-block' }}>Install Canvas Content Studio</a>
        </div>
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#94A3B8' }}>
          <a href="/terms" style={{ color: '#94A3B8', marginRight: 14 }}>Terms of Purchase</a>
          <a href="/privacy" style={{ color: '#94A3B8' }}>Privacy Policy</a>
        </div>
      </div>
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 800,
  color: navy,
};

const primaryButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '13px 22px',
  borderRadius: 8,
  background: blue,
  color: '#fff',
  fontWeight: 700,
  fontSize: 14.5,
  textDecoration: 'none',
  boxShadow: '0 4px 14px rgba(7,112,184,.3)',
};

const secondaryButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '13px 22px',
  borderRadius: 8,
  background: '#fff',
  color: navy,
  fontWeight: 700,
  fontSize: 14.5,
  textDecoration: 'none',
  border: `1px solid ${border}`,
};
