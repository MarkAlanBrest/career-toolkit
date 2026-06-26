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

const sections = [
  {
    title: 'Course content',
    summary: 'Tools for creating structured Canvas pages without requiring teachers to write HTML.',
    items: [
      ['Content Studio', 'Reusable blocks for headings, callouts, cards, columns, checklists, buttons, and common instructional page sections.'],
      ['Component library', 'A consistent set of page patterns that can be reused across courses and modules.'],
      ['AI page creation', 'Optional credit-based drafting for full Canvas page structures.'],
    ],
  },
  {
    title: 'Assessment and grading',
    summary: 'Tools for reviewing student work, checking the gradebook, and drafting assessment materials.',
    items: [
      ['AI-assisted grading', 'Drafts rubric-aligned feedback and score suggestions for teacher review in SpeedGrader.'],
      ['AI quiz creation', 'Drafts quiz questions, choices, answer keys, and feedback.'],
      ['Grade Audit', 'Surfaces ungraded work, missing scores, and possible gradebook inconsistencies.'],
    ],
  },
  {
    title: 'Course operations',
    summary: 'Tools for repetitive setup and maintenance tasks inside Canvas.',
    items: [
      ['Assignment Scheduler', 'Applies timing rules across assignments, including due dates and availability windows.'],
      ['Date Autofill', 'Reuses date preferences while editing Canvas assignments.'],
      ['Course Vitals', 'Shows course-level signals related to missing work, low activity, and possible student risk.'],
    ],
  },
  {
    title: 'Communication',
    summary: 'Tools for routine messages and recurring course communication.',
    items: [
      ['Message Pulse', 'Supports targeted course messaging and reusable message templates.'],
      ['Announcement Composer', 'Provides reusable announcement templates for recurring course updates.'],
      ['AI launcher', 'Opens external AI assistants in a side window. This does not use Canvas Enhancer credits.'],
    ],
  },
];

export default function FeaturesPage() {
  const extensionUrl = process.env.NEXT_PUBLIC_EXTENSION_URL || '#';

  return (
    <main style={{ minHeight: '100vh', background: pageBg, color: text, fontFamily: serif }}>
      <SiteNav active="features" />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px 48px' }}>
        <section style={{ background: paper, border: '1px solid #d9d9d2', padding: '38px 38px 34px' }}>
          <h1 style={{ margin: 0, color: heading, fontFamily: serif, fontSize: 'clamp(30px,5vw,42px)', lineHeight: 1.12 }}>
            Feature overview
          </h1>
          <p style={{ margin: '20px 0 0', maxWidth: 760, fontSize: 15, lineHeight: 1.8, textAlign: 'justify' }}>
            Canvas Enhancer is organized around teacher workflow areas. Most features are non-AI tools and are available for free. AI-assisted grading, AI page creation, and AI quiz creation use prepaid credits because they create ongoing AI cost.
          </p>
          <p style={{ margin: '18px 0 0', fontSize: 14, lineHeight: 1.8 }}>
            <a href={extensionUrl} style={{ color: blue, fontFamily: display, fontSize: 14 }}>Install extension</a>
          </p>
        </section>

        <section style={{ marginTop: 26, background: paper, border: '1px solid #d9d9d2', padding: '12px 34px' }}>
          {sections.map(section => (
            <section key={section.title} style={{ borderTop: `1px solid ${rule}`, padding: '26px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,250px),1fr))', gap: 30 }}>
                <div>
                  <h2 style={{ margin: 0, color: blue, fontFamily: serif, fontSize: 22, lineHeight: 1.25 }}>
                    {section.title}
                  </h2>
                  <p style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.8, textAlign: 'justify' }}>
                    {section.summary}
                  </p>
                </div>

                <div style={{ display: 'grid', gap: 15 }}>
                  {section.items.map(([name, description]) => (
                    <article key={name}>
                      <h3 style={{ margin: 0, color: heading, fontFamily: serif, fontSize: 17, lineHeight: 1.25 }}>
                        {name}
                      </h3>
                      <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.8, textAlign: 'justify' }}>
                        {description}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </section>
      </div>
    </main>
  );
}
