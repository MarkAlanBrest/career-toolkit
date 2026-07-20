import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ROOM_LOCATION,
  ROOM_NAME,
  accent,
  accentStrong,
  accentTint,
  archivo,
  bg,
  border,
  publicSans,
  surface,
  text,
  textMuted,
} from './shared';

function IconBoard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="13" rx="1.5" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M6 9l3 3 3-3 4 4" />
    </svg>
  );
}

function IconDualScreen() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="12" height="9" rx="1.2" />
      <rect x="10" y="9" width="12" height="9" rx="1.2" />
      <path d="M5 17h6" />
      <path d="M13 21h6" />
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </svg>
  );
}

function IconPresentation() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M8 20l4-4 4 4" />
      <path d="M7 9l3 3 2-2 3 3" />
    </svg>
  );
}

function IconCertificate() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="5" />
      <path d="M8.5 12.5L7 21l5-3 5 3-1.5-8.5" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 14.2c2.5.4 4.5 2.4 4.5 5.8" />
    </svg>
  );
}

const EQUIPMENT = [
  { title: 'Central smart board', body: 'Hook up a laptop and project straight to the board — ready for slides, demos, or shared documents.', icon: <IconBoard /> },
  { title: 'Two duplicating monitors', body: 'A pair of mirrored TVs extend the display across the room, so everyone has a clear view regardless of where they\'re seated.', icon: <IconDualScreen /> },
];

const USE_CASES = [
  { title: 'Business meetings & trainings', body: 'Board meetings, staff trainings, client presentations — a quiet, professional space away from a busy office.', icon: <IconBriefcase /> },
  { title: 'Seminars & workshops', body: 'Room to seat a group comfortably for a half-day or full-day session, with space to move between presentation and discussion.', icon: <IconPresentation /> },
  { title: 'Professional development', body: 'Certification courses, continuing education sessions, and skills workshops for local businesses and trades.', icon: <IconCertificate /> },
  { title: 'Community & organization meetings', body: 'A dependable, professionally maintained venue for local organizations, associations, and community groups.', icon: <IconUsers /> },
];

function IconBadge({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: accentTint,
        color: accent,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
      }}
    >
      <div style={{ width: 22, height: 22 }}>{children}</div>
    </div>
  );
}

function FeatureCard({ title, body, icon }: { title: string; body: string; icon: ReactNode }) {
  return (
    <div className="lga-landing-card" style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: 20 }}>
      <IconBadge>{icon}</IconBadge>
      <h3 className={archivo.className} style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>{title}</h3>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: textMuted, margin: 0 }}>{body}</p>
    </div>
  );
}

export default function LgaRoomLandingPage() {
  return (
    <main className={publicSans.className} style={{ minHeight: '100vh', background: bg, color: text }}>
      <style>{`
        .lga-landing-card { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .lga-landing-card:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(32,36,31,0.09); }
        @media (prefers-reduced-motion: reduce) {
          .lga-landing-card { transition: none; }
        }
      `}</style>

      <header style={{ background: accent, color: '#fff', padding: '64px 24px 56px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.75, marginBottom: 14 }}>
            {ROOM_LOCATION}
          </div>
          <h1 className={archivo.className} style={{ fontSize: 40, fontWeight: 800, margin: '0 0 16px', textWrap: 'balance', lineHeight: 1.1 }}>
            {ROOM_NAME}
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, opacity: 0.92, margin: '0 auto 32px', maxWidth: 560 }}>
            A professional room for business use — meetings, trainings, seminars, and community gatherings,
            hosted at New Castle School of Trades&apos; main campus.
          </p>
          <Link
            href="/lga-room/calendar"
            style={{
              display: 'inline-block',
              background: '#fff',
              color: accentStrong,
              fontWeight: 700,
              fontSize: 15,
              textDecoration: 'none',
              padding: '14px 28px',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            }}
          >
            Reserve This Room
          </Link>
        </div>
      </header>

      <section style={{ maxWidth: 780, margin: '0 auto', padding: '56px 24px 48px' }}>
        <h2 className={archivo.className} style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', margin: '0 0 8px' }}>
          In the room
        </h2>
        <p style={{ textAlign: 'center', color: textMuted, fontSize: 14.5, margin: '0 0 36px' }}>
          Equipped for clear, professional presentations.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
          {EQUIPMENT.map(item => (
            <FeatureCard key={item.title} title={item.title} body={item.body} icon={item.icon} />
          ))}
        </div>
      </section>

      <section style={{ background: accentTint, padding: '48px 24px 56px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 className={archivo.className} style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', margin: '0 0 8px' }}>
            What it&apos;s good for
          </h2>
          <p style={{ textAlign: 'center', color: textMuted, fontSize: 14.5, margin: '0 0 36px' }}>
            A flexible space suited to a range of professional and community events.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
            {USE_CASES.map(item => (
              <FeatureCard key={item.title} title={item.title} body={item.body} icon={item.icon} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
