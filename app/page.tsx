'use client';

import SiteNav from './components/SiteNav';

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
const text = '#1f2933';
const muted = '#5f6b76';
const rule = '#d7dde2';
const page = '#fbfcfd';

const groups = [
  {
    title: 'Course content',
    items: [
      ['Content Studio', 'Reusable Canvas page structures for headers, callouts, cards, columns, checklists, and common course materials.'],
      ['Component library', 'A consistent set of content patterns that can be inserted without editing HTML.'],
    ],
  },
  {
    title: 'Course management',
    items: [
      ['Assignment Scheduler', 'Course planning tools for due dates, availability windows, and lock dates.'],
      ['Date Autofill', 'Reusable date preferences when editing assignments.'],
      ['Course Vitals', 'Course-level signals for missing work, activity, and students who may need attention.'],
    ],
  },
  {
    title: 'Communication',
    items: [
      ['Message Pulse', 'Targeted student messaging with course-aware filters and reusable templates.'],
      ['Announcement Composer', 'Reusable announcement templates for routine course updates.'],
    ],
  },
  {
    title: 'Assessment',
    items: [
      ['Grade Audit', 'A review layer for ungraded work, missing scores, and gradebook inconsistencies.'],
      ['AI-assisted grading', 'Optional feedback and rubric-score drafting for teacher review.'],
      ['AI quiz creation', 'Optional question, answer, key, and feedback drafting.'],
    ],
  },
];

export default function HomePage() {
  const extensionUrl = process.env.NEXT_PUBLIC_EXTENSION_URL || '#';

  return (
    <main style={{ fontFamily: font, color: text, background: page, minHeight: '100vh' }}>
      <SiteNav active="home" />

      <section style={{ maxWidth: 920, margin: '0 auto', padding: '58px 32px 42px' }}>
        <p style={{ margin: '0 0 18px', color: muted, fontSize: 15, lineHeight: 1.7 }}>
          Canvas Enhancer is a browser extension for teachers and course teams using Canvas LMS.
        </p>
        <h1 style={{ margin: 0, fontSize: 'clamp(32px,5vw,48px)', lineHeight: 1.12, fontWeight: 650, letterSpacing: 0 }}>
          Practical tools for common Canvas workflows.
        </h1>
        <p style={{ margin: '22px 0 0', maxWidth: 720, color: muted, fontSize: 17, lineHeight: 1.75 }}>
          The extension adds course-building, scheduling, communication, grading review, and optional AI features directly inside Canvas. The non-AI tools are free. AI features use prepaid credits only when a teacher chooses to use them.
        </p>
        <div style={{ marginTop: 28, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <a href={extensionUrl} style={{ color: text, fontSize: 15, fontWeight: 650, textDecoration: 'underline', textUnderlineOffset: 4 }}>Install extension</a>
          <a href="/features" style={{ color: text, fontSize: 15, fontWeight: 650, textDecoration: 'underline', textUnderlineOffset: 4 }}>Read feature details</a>
          <a href="/pricing" style={{ color: text, fontSize: 15, fontWeight: 650, textDecoration: 'underline', textUnderlineOffset: 4 }}>AI credit information</a>
        </div>
      </section>

      <section style={{ borderTop: `1px solid ${rule}`, borderBottom: `1px solid ${rule}`, background: '#fff' }}>
        <div style={{ maxWidth: 920, margin: '0 auto', padding: '26px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 22 }}>
          {[
            ['Free core tools', 'The standard workflow tools do not require payment.'],
            ['Optional AI', 'AI grading, page creation, and quiz creation use credits.'],
            ['Teacher control', 'AI output is reviewed before being applied in Canvas.'],
            ['School path', 'The model can later support shared organizational credit pools.'],
          ].map(([title, body]) => (
            <div key={title}>
              <div style={{ fontSize: 14, fontWeight: 650 }}>{title}</div>
              <div style={{ fontSize: 13, lineHeight: 1.65, color: muted, marginTop: 6 }}>{body}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 920, margin: '0 auto', padding: '46px 32px 64px' }}>
        <h2 style={{ margin: '0 0 22px', fontSize: 24, lineHeight: 1.25, fontWeight: 650 }}>
          What it includes
        </h2>
        <div style={{ display: 'grid', gap: 34 }}>
          {groups.map(group => (
            <section key={group.title} style={{ borderTop: `1px solid ${rule}`, paddingTop: 22 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 650 }}>{group.title}</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                {group.items.map(([name, description]) => (
                  <div key={name} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,180px),1fr))', gap: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 650 }}>{name}</div>
                    <div style={{ fontSize: 14, color: muted, lineHeight: 1.7 }}>{description}</div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
