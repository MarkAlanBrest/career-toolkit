'use client';

import SiteNav from '../components/SiteNav';

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
const text = '#1f2933';
const muted = '#5f6b76';
const rule = '#d7dde2';
const page = '#fbfcfd';

const sections = [
  {
    title: 'Course content',
    summary: 'Tools for creating structured Canvas pages without writing HTML.',
    items: [
      ['Content Studio', 'Provides reusable blocks for headings, callouts, cards, columns, checklists, buttons, and common instructional page sections.'],
      ['Component library', 'Keeps page design consistent across modules and courses.'],
      ['AI page creation', 'Optional credit-based drafting for full Canvas page structures.'],
    ],
  },
  {
    title: 'Assessment and grading',
    summary: 'Tools for reviewing submissions, building quizzes, and checking gradebook status.',
    items: [
      ['AI-assisted grading', 'Drafts rubric-aligned feedback and score suggestions for teacher review in SpeedGrader.'],
      ['AI quiz creation', 'Drafts quiz questions, choices, answer keys, and feedback.'],
      ['Grade Audit', 'Surfaces ungraded work, missing scores, and gradebook inconsistencies.'],
    ],
  },
  {
    title: 'Course operations',
    summary: 'Tools for repetitive setup and course maintenance work.',
    items: [
      ['Assignment Scheduler', 'Applies timing rules across assignments, including due dates and availability windows.'],
      ['Date Autofill', 'Reuses date preferences while editing Canvas assignments.'],
      ['Course Vitals', 'Shows course-level signals related to missing work, low activity, and possible student risk.'],
    ],
  },
  {
    title: 'Communication',
    summary: 'Tools for routine communication with students.',
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
    <main style={{ fontFamily: font, color: text, background: page, minHeight: '100vh' }}>
      <SiteNav active="features" />

      <section style={{ maxWidth: 920, margin: '0 auto', padding: '58px 32px 36px' }}>
        <p style={{ margin: '0 0 14px', color: muted, fontSize: 15, lineHeight: 1.7 }}>
          Feature overview
        </p>
        <h1 style={{ margin: 0, fontSize: 'clamp(30px,5vw,44px)', lineHeight: 1.15, fontWeight: 650 }}>
          Canvas Enhancer is organized around teacher workflow areas.
        </h1>
        <p style={{ margin: '20px 0 0', color: muted, fontSize: 16, lineHeight: 1.75, maxWidth: 720 }}>
          Most features are non-AI tools and are available for free. AI-assisted grading, AI page creation, and AI quiz creation use prepaid credits because they create ongoing AI cost.
        </p>
        <div style={{ marginTop: 26 }}>
          <a href={extensionUrl} style={{ color: text, fontSize: 15, fontWeight: 650, textDecoration: 'underline', textUnderlineOffset: 4 }}>Install extension</a>
        </div>
      </section>

      <section style={{ maxWidth: 920, margin: '0 auto', padding: '16px 32px 64px' }}>
        {sections.map(section => (
          <section key={section.title} style={{ borderTop: `1px solid ${rule}`, padding: '28px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))', gap: 32 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 650 }}>{section.title}</h2>
                <p style={{ margin: '10px 0 0', color: muted, fontSize: 14, lineHeight: 1.7 }}>{section.summary}</p>
              </div>
              <div style={{ display: 'grid', gap: 14 }}>
                {section.items.map(([name, description]) => (
                  <div key={name}>
                    <div style={{ fontSize: 15, fontWeight: 650 }}>{name}</div>
                    <div style={{ color: muted, fontSize: 14, lineHeight: 1.7, marginTop: 5 }}>{description}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}
