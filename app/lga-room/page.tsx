import Link from 'next/link';
import {
  ROOM_LOCATION,
  ROOM_NAME,
  ROOM_OPEN_TIME,
  ROOM_CLOSE_TIME,
  accent,
  accentStrong,
  accentTint,
  archivo,
  bg,
  border,
  formatTimeLabel,
  publicSans,
  surface,
  text,
  textMuted,
} from './shared';

const USE_CASES = [
  { title: 'Business meetings & trainings', body: 'Board meetings, staff trainings, client presentations — a quiet, professional space away from a busy office.' },
  { title: 'Seminars & workshops', body: 'Room to seat a group comfortably for a half-day or full-day session, with space to move between presentation and discussion.' },
  { title: 'Professional development', body: 'Certification courses, continuing education sessions, and skills workshops for local businesses and trades.' },
  { title: 'Community & organization meetings', body: 'A dependable, professionally maintained venue for local organizations, associations, and community groups.' },
];

const STEPS = [
  { title: 'Submit a request', body: 'Pick a date and time on the calendar and share a few details about your event.' },
  { title: 'It’s reviewed', body: 'Your request is marked pending until an admin reviews it — usually within a day or two.' },
  { title: 'Get confirmed', body: 'Once approved, you’ll get an email confirmation with your reservation details.' },
];

export default function LgaRoomLandingPage() {
  return (
    <main className={publicSans.className} style={{ minHeight: '100vh', background: bg, color: text }}>
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

      <section style={{ maxWidth: 900, margin: '0 auto', padding: '56px 24px' }}>
        <h2 className={archivo.className} style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', margin: '0 0 8px' }}>
          What it&apos;s good for
        </h2>
        <p style={{ textAlign: 'center', color: textMuted, fontSize: 14.5, margin: '0 0 36px' }}>
          A flexible space suited to a range of professional and community events.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
          {USE_CASES.map(item => (
            <div key={item.title} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: 20 }}>
              <h3 className={archivo.className} style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>{item.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: textMuted, margin: 0 }}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: accentTint, padding: '48px 24px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <h2 className={archivo.className} style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', margin: '0 0 28px' }}>
            Room details
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: 24 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: textMuted, marginBottom: 6 }}>Location</div>
              <div style={{ fontSize: 14.5 }}>{ROOM_LOCATION}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: textMuted, marginBottom: 6 }}>Available Hours</div>
              <div style={{ fontSize: 14.5, fontVariantNumeric: 'tabular-nums' }}>{formatTimeLabel(ROOM_OPEN_TIME)} – {formatTimeLabel(ROOM_CLOSE_TIME)}, daily</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: textMuted, marginBottom: 6 }}>Seating</div>
              <div style={{ fontSize: 14.5 }}>Comfortable seating for meetings and small-to-mid-size gatherings</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: textMuted, marginBottom: 6 }}>Setup</div>
              <div style={{ fontSize: 14.5 }}>Tables, chairs, and basic meeting equipment — let us know your setup needs when you reserve</div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 780, margin: '0 auto', padding: '56px 24px' }}>
        <h2 className={archivo.className} style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', margin: '0 0 36px' }}>
          How reservations work
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
          {STEPS.map((step, i) => (
            <div key={step.title}>
              <div
                className={archivo.className}
                style={{
                  width: 32, height: 32, borderRadius: '50%', background: accent, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, marginBottom: 12,
                }}
              >
                {i + 1}
              </div>
              <h3 className={archivo.className} style={{ fontSize: 15.5, fontWeight: 700, margin: '0 0 6px' }}>{step.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: textMuted, margin: 0 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: accent, color: '#fff', padding: '48px 24px', textAlign: 'center' }}>
        <h2 className={archivo.className} style={{ fontSize: 22, fontWeight: 700, margin: '0 0 20px' }}>
          Ready to reserve {ROOM_NAME}?
        </h2>
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
          }}
        >
          View the calendar
        </Link>
      </section>
    </main>
  );
}
