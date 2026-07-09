'use client';

import { useState } from 'react';
import SiteNav from './components/SiteNav';

const serif = 'Georgia,"Times New Roman",serif';
const display = '"Trebuchet MS",Arial,sans-serif';
const pageBg = '#e9ecef';
const paper = '#f8f8f5';
const text = '#595c60';
const heading = '#26315f';
const blue = '#244f98';
const green = '#2f7c3a';
const rule = '#d2d2cc';

const SCRIPT_URL = 'https://career-toolkit-ruby.vercel.app/content-studio.user.js';
const TAMPERMONKEY_URL = 'https://www.tampermonkey.net/';

const heroImages = [
  { src: '/screenshots/01_before_after.png',    alt: 'Turn plain Canvas pages into professional lessons with AI' },
  { src: '/screenshots/07_feature_overview.png', alt: 'Canvas Content Studio feature overview — every tool at a glance' },
];

const freeForever = [
  ['No monthly fee', 'The toolbar never charges you to use it.'],
  ['No contract', 'Nothing to sign, nothing to cancel.'],
  ['No obligation', 'Buy AI credits only if and when you want to.'],
  ['Credits never expire', 'Buy once, use whenever it’s worth it.'],
];

const articles = [
  {
    title: 'Build Canvas pages with less HTML work',
    body: 'Content Studio adds a design toolbar right inside the Canvas rich content editor — themed banners, callouts, cards, columns, checklists, buttons, and a full library of icons. Drop them in with one click.',
  },
  {
    title: 'A quiz builder, right on the toolbar',
    body: 'Give it a topic and question-type counts and it drafts multiple choice, true/false, short answer, and essay questions, then creates the quiz directly in Canvas — no separate app to open.',
  },
  {
    title: 'Use AI only when it helps',
    body: 'The toolbar, components, icons, and quiz builder are free forever. AI-assisted page and quiz drafting is optional — buy prepaid credits and use them only when the task is worth it.',
  },
];

const steps = [
  ['Install Tampermonkey', 'Get the free browser add-on from tampermonkey.net — one-time, takes under a minute.'],
  ['Install Canvas Content Studio', 'Click the install button above — Tampermonkey recognizes the script and shows its own install screen. Confirm it.'],
  ['Open any Canvas course page', 'The toolbar appears above the rich content editor automatically — no login, no setup.'],
  ['Design freely, add AI when you want it', 'Insert components and build quizzes for free. Buy a credit pack from the AI Credits panel only if you want AI to draft content for you.'],
];

const packs = [
  ['Starter', '$10', '1,000 credits'],
  ['Teacher', '$20', '2,000 credits'],
  ['Power User', '$50', '5,000 credits'],
  ['School', '$250', '25,000 credits'],
];

const faq = [
  {
    q: 'Do I have to pay anything to use it?',
    a: 'No. The toolbar, page components, layouts, icons, and quiz-builder interface are free to use for as long as you want — no trial period, no expiration, no credit card required to install.',
  },
  {
    q: 'What actually costs money?',
    a: 'Only the AI features — having AI draft page content or quiz questions for you. Those draw from a prepaid credit balance you buy only if and when you want that boost.',
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
    q: 'Do I need to sign up or create an account?',
    a: 'No. The script recognizes you automatically from your existing Canvas login — there is no separate password or account to manage. If you buy credits, they are tied to your Canvas identity, not to a specific device or browser.',
  },
  {
    q: 'How do I turn it off or uninstall it?',
    a: 'Open Settings in the toolbar and click "Disable Content Studio" to stop it instantly on every Canvas page — turn it back on any time from the Tampermonkey icon’s menu. To remove it completely, open the Tampermonkey dashboard and delete Canvas Content Studio from the list.',
  },
];

export default function HomePage() {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <main style={{ minHeight: '100vh', background: pageBg, color: text, fontFamily: serif }}>
      <SiteNav active="home" />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px 44px' }}>
        <section
          style={{
            background: '#2b3442',
            border: '1px solid #1d2632',
            minHeight: 350,
            padding: '46px 42px',
            boxShadow: '0 1px 0 #fff',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))',
            gap: 42,
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.08)', color: '#9fd7a8', fontFamily: display, fontSize: 11.5, fontWeight: 700, padding: '5px 12px', borderRadius: 3, marginBottom: 16, letterSpacing: '.03em' }}>
              FREE BROWSER SCRIPT — NO CONTRACT, EVER
            </div>
            <h1 style={{ margin: 0, color: '#fff', fontFamily: serif, fontSize: 'clamp(34px,5vw,48px)', lineHeight: 1.08, fontWeight: 700 }}>
              Design better Canvas pages, free — bring in AI only when you want the boost.
            </h1>
            <p style={{ margin: '22px 0 0', color: '#e7e9ea', fontSize: 15, lineHeight: 1.75, textAlign: 'justify' }}>
              Canvas Content Studio adds a design toolbar right inside the Canvas rich content editor — themed banners, callouts, layouts, icons, and a full quiz builder. It runs as a free browser script (via Tampermonkey), so there is nothing to install from an app store and nothing to configure.
            </p>
            <p style={{ margin: '18px 0 0', color: '#e7e9ea', fontSize: 15, lineHeight: 1.75, textAlign: 'justify' }}>
              Use it free for as long as you like. If you ever want AI to draft a page or quiz for you, buy prepaid credits once — no subscription, no obligation, no monthly fee.
            </p>
            <div style={{ marginTop: 28, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <a href={SCRIPT_URL} style={buttonStyle}>Install Canvas Content Studio</a>
              <a href="#how-it-works" style={secondaryButtonStyle}>How it works</a>
            </div>
            <div style={{ marginTop: 14, fontSize: 12, color: '#8a9db5' }}>
              Requires the free <a href={TAMPERMONKEY_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#bcd2e6' }}>Tampermonkey</a> browser add-on — you&apos;ll be prompted to install that first if you don&apos;t already have it.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {heroImages.map(img => (
              <button
                key={img.src}
                type="button"
                onClick={() => setLightbox(img.src)}
                style={{ padding: 0, border: 'none', background: 'none', cursor: 'zoom-in', borderRadius: 6, overflow: 'hidden' }}
                title="Click to enlarge"
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  style={{ width: '100%', display: 'block', borderRadius: 6, transition: 'opacity .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                />
              </button>
            ))}
            <p style={{ margin: 0, textAlign: 'center', fontSize: 11, color: '#8a9db5', letterSpacing: '0.3px' }}>
              Click images to enlarge
            </p>
          </div>
        </section>

        {/* Free-forever strip */}
        <section style={{ marginTop: 20, background: paper, border: '1px solid #d9d9d2', padding: '20px 30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))', gap: 18 }}>
          {freeForever.map(([title, body]) => (
            <div key={title}>
              <div style={{ fontFamily: display, fontWeight: 700, fontSize: 13, color: green, marginBottom: 4 }}>✓ {title}</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>{body}</div>
            </div>
          ))}
        </section>

        <section style={{ marginTop: 18, background: paper, border: '1px solid #d9d9d2', padding: '30px 30px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,250px),1fr))', gap: 28 }}>
            {articles.map(article => (
              <article key={article.title}>
                <h2 style={{ margin: '0 0 13px', color: blue, fontFamily: serif, fontSize: 21, lineHeight: 1.25 }}>
                  {article.title}
                </h2>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.8, textAlign: 'justify' }}>
                  {article.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" style={{ marginTop: 28, background: paper, border: '1px solid #d9d9d2', padding: '30px 30px 24px' }}>
          <h2 style={{ margin: '0 0 6px', color: heading, fontFamily: serif, fontSize: 24 }}>How it works</h2>
          <p style={{ margin: '0 0 22px', fontSize: 13.5, lineHeight: 1.75, maxWidth: 700 }}>
            Canvas Content Studio isn&apos;t a hosted app of its own — it&apos;s a small script that runs through{' '}
            <a href={TAMPERMONKEY_URL} target="_blank" rel="noopener noreferrer" style={{ color: blue }}>Tampermonkey</a>,
            a free, widely-used browser add-on that lets a page add its own tools on sites you choose. Once installed, the toolbar just appears automatically whenever you open a Canvas course page.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))', gap: 22 }}>
            {steps.map(([title, body], i) => (
              <div key={title} style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: display, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontFamily: display, fontWeight: 700, fontSize: 13.5, color: heading, marginBottom: 4 }}>{title}</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* AI credits */}
        <section style={{ marginTop: 28, background: paper, border: '1px solid #d9d9d2', padding: '30px 30px 24px' }}>
          <h2 style={{ margin: '0 0 6px', color: heading, fontFamily: serif, fontSize: 24 }}>AI credits — only if you want the boost</h2>
          <p style={{ margin: '0 0 20px', fontSize: 13.5, lineHeight: 1.75, maxWidth: 700 }}>
            Prepaid, one-time purchases. No subscription is ever created. Use credits whenever a page or quiz is worth letting AI draft it for you — skip them entirely otherwise.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14 }}>
            {packs.map(([label, price, credits]) => (
              <div key={label} style={{ border: `1px solid ${rule}`, background: '#fff', padding: '14px 10px', textAlign: 'center' }}>
                <div style={{ fontFamily: display, fontSize: 11.5, color: text, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: heading }}>{price}</div>
                <div style={{ fontSize: 12, color: text, marginTop: 2 }}>{credits}</div>
              </div>
            ))}
          </div>
          <p style={{ margin: '18px 0 0', fontSize: 13 }}>
            <a href="/pricing" style={{ color: blue }}>See what credits are used for →</a>
          </p>
        </section>

        {/* FAQ */}
        <section style={{ marginTop: 28, background: paper, border: '1px solid #d9d9d2', padding: '30px 30px 24px' }}>
          <h2 style={{ margin: '0 0 18px', color: heading, fontFamily: serif, fontSize: 24 }}>Questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {faq.map((item, i) => {
              const open = openFaq === i;
              return (
                <div key={item.q} style={{ borderTop: i === 0 ? 'none' : `1px solid ${rule}`, padding: '14px 0' }}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    style={{
                      width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                      fontFamily: display, fontSize: 14.5, fontWeight: 700, color: heading,
                    }}
                  >
                    {item.q}
                    <span style={{ color: text, fontSize: 15, flexShrink: 0 }}>{open ? '−' : '+'}</span>
                  </button>
                  {open && (
                    <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.8, textAlign: 'justify' }}>{item.a}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom CTA */}
        <section style={{ marginTop: 28, background: '#2b3442', border: '1px solid #1d2632', padding: '34px 30px', textAlign: 'center' }}>
          <div style={{ color: '#fff', fontFamily: serif, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            Free to use, no strings attached.
          </div>
          <div style={{ color: '#c3cad2', fontSize: 13.5, marginBottom: 20, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.7 }}>
            Install it, use it for as long as you want. Buy AI credits only the day you actually want that extra boost.
          </div>
          <a href={SCRIPT_URL} style={{ ...buttonStyle, display: 'inline-block' }}>Install Canvas Content Studio</a>
          <div style={{ marginTop: 18, fontSize: 11.5 }}>
            <a href="/terms" style={{ color: '#8a9db5', marginRight: 14 }}>Terms of Purchase</a>
            <a href="/privacy" style={{ color: '#8a9db5' }}>Privacy Policy</a>
          </div>
        </section>
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, cursor: 'zoom-out',
          }}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 18, right: 22,
              background: 'none', border: 'none', color: '#fff',
              fontSize: 32, lineHeight: 1, cursor: 'pointer', opacity: 0.8,
            }}
            aria-label="Close"
          >
            ×
          </button>
          <img
            src={lightbox}
            alt=""
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 8, boxShadow: '0 24px 64px rgba(0,0,0,0.6)', cursor: 'default' }}
          />
        </div>
      )}
    </main>
  );
}

const buttonStyle = {
  display: 'inline-block',
  minWidth: 150,
  padding: '11px 18px',
  borderRadius: 3,
  background: '#2f7c3a',
  color: '#fff',
  fontFamily: display,
  fontSize: 15,
  textAlign: 'center' as const,
  textDecoration: 'none',
};

const secondaryButtonStyle = {
  ...buttonStyle,
  background: '#244f98',
};
