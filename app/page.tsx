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
const rule = '#d2d2cc';

const articles = [
  {
    title: 'Build Canvas pages with less HTML work',
    body: 'Content Studio provides reusable page parts for headings, callouts, columns, buttons, checklists, and other common course materials. It is meant to help teachers produce cleaner Canvas pages without turning page design into a technical task.',
  },
  {
    title: 'Reduce repetitive course setup',
    body: 'Scheduling, date autofill, course checks, and communication tools are included for everyday Canvas maintenance. These tools are free to use and do not require AI credits.',
  },
  {
    title: 'Use AI only when it helps',
    body: 'AI-assisted grading, page creation, and quiz creation are optional. Teachers can buy prepaid credits and use them when the task is worth it. The normal Canvas tools remain available without payment.',
  },
];

const heroImages = [
  { src: '/screenshots/01_before_after.png',    alt: 'Turn plain Canvas pages into professional lessons with AI' },
  { src: '/screenshots/07_feature_overview.png', alt: 'Canvas Enhancer feature overview — every tool at a glance' },
];

export default function HomePage() {
  const extensionUrl = process.env.NEXT_PUBLIC_EXTENSION_URL || '#';
  const [lightbox, setLightbox] = useState<string | null>(null);

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
            <h1 style={{ margin: 0, color: '#fff', fontFamily: serif, fontSize: 'clamp(34px,5vw,48px)', lineHeight: 1.08, fontWeight: 700 }}>
              Practical tools for teachers working in Canvas.
            </h1>
            <p style={{ margin: '22px 0 0', color: '#e7e9ea', fontSize: 15, lineHeight: 1.75, textAlign: 'justify' }}>
              Canvas Enhancer is a browser extension for teachers and course teams using Canvas LMS. It adds course-building, scheduling, communication, grading review, and optional AI tools inside the Canvas workflow.
            </p>
            <p style={{ margin: '18px 0 0', color: '#e7e9ea', fontSize: 15, lineHeight: 1.75, textAlign: 'justify' }}>
              The standard tools are free. AI credits are separate and are used only for AI-assisted grading, page creation, and quiz creation.
            </p>
            <div style={{ marginTop: 28, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <a href={extensionUrl} style={buttonStyle}>Install Extension</a>
              <a href="/features" style={secondaryButtonStyle}>Read Features</a>
            </div>
          </div>

          {/* Stacked clickable images */}
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

        <section style={{ marginTop: 34, background: paper, border: '1px solid #d9d9d2', padding: '30px 30px 24px' }}>
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

        <section style={{ marginTop: 28, padding: '8px 2px 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))', gap: 24 }}>
          <div>
            <h2 style={{ margin: '0 0 12px', color: heading, fontFamily: serif, fontSize: 22 }}>A quieter model</h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, textAlign: 'justify' }}>
              The extension can be used without subscriptions. Teachers can use the non-AI tools freely, then purchase AI credits only if they want AI help.
            </p>
          </div>
          <div>
            <h2 style={{ margin: '0 0 12px', color: heading, fontFamily: serif, fontSize: 22 }}>For schools</h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, textAlign: 'justify' }}>
              A department chair or school lead can buy AI credits and send chosen amounts to teachers. Individual teachers can also buy or send credits themselves.
            </p>
            <p style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.6 }}>
              <a href="/departments" style={{ color: blue }}>Read about department credit distribution</a>
            </p>
          </div>
        </section>
      </div>

      {/* Lightbox */}
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
