import Link from 'next/link';
import type { ReactNode } from 'react';
import { archivo, publicSans, ROOM_LOCATION, ROOM_NAME } from './shared';
import styles from './landing.module.css';

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

function DisplayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="4" width="19" height="13" rx="2" />
      <path d="M8 21h8M12 17v4M7 12l3-3 3 3 4-4" />
    </svg>
  );
}

function ScreensIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="5" width="13" height="10" rx="1.5" />
      <rect x="9" y="9" width="13" height="10" rx="1.5" />
      <path d="M5 19h6M13 22h6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
    </svg>
  );
}

function WorkshopIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21l4-4 4 4M7 12l3-3 2 2 4-4" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 14.2c2.6.5 4.5 2.6 4.5 5.8" />
    </svg>
  );
}

const AMENITIES = [
  {
    title: 'Central smart board',
    body: 'Connect a laptop and present slides, documents, demonstrations, or video on the room’s central display.',
    icon: <DisplayIcon />,
  },
  {
    title: 'Dual room monitors',
    body: 'Two mirrored displays keep your content visible throughout the room, wherever your guests are seated.',
    icon: <ScreensIcon />,
  },
  {
    title: 'Flexible scheduling',
    body: 'Request the room for the time your event needs, with availability from 7:00 AM to 9:00 PM.',
    icon: <ClockIcon />,
  },
];

const USE_CASES = [
  {
    eyebrow: 'Meet',
    title: 'Business meetings & training',
    body: 'A focused setting for leadership meetings, staff training, client presentations, and team planning.',
    icon: <BriefcaseIcon />,
  },
  {
    eyebrow: 'Teach',
    title: 'Seminars & workshops',
    body: 'A presentation-ready room for professional development, certification courses, and hands-on instruction.',
    icon: <WorkshopIcon />,
  },
  {
    eyebrow: 'Connect',
    title: 'Community gatherings',
    body: 'A dependable, professionally maintained venue for associations, organizations, and local groups.',
    icon: <PeopleIcon />,
  },
];

function AmenityCard({ title, body, icon }: { title: string; body: string; icon: ReactNode }) {
  return (
    <article className={styles.amenityCard}>
      <div className={styles.iconBox}>{icon}</div>
      <h3 className={archivo.className}>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

export default function LgaRoomLandingPage() {
  return (
    <main className={`${publicSans.className} ${styles.page}`}>
      <header className={styles.siteHeader}>
        <Link className={styles.brand} href="/lga-room" aria-label="LGA Room home">
          <span className={styles.brandMark}>LGA</span>
          <span>
            <strong>{ROOM_NAME}</strong>
            <small>New Castle School of Trades</small>
          </span>
        </Link>
        <Link className={styles.headerLink} href="/lga-room/calendar">
          View availability
          <ArrowIcon />
        </Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroContent}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <span />
              {ROOM_LOCATION}
            </div>
            <h1 className={archivo.className}>
              A professional space,
              <br />
              <em>ready when you are.</em>
            </h1>
            <p>
              Bring your next meeting, training, seminar, or community event to a polished, presentation-ready room at our main campus.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/lga-room/calendar">
                Reserve the room
                <ArrowIcon />
              </Link>
              <a className={styles.textLink} href="#space">
                Explore the space
              </a>
            </div>
            <div className={styles.heroDetails}>
              <div>
                <span className={styles.detailDot} />
                Presentation ready
              </div>
              <div>Open 7:00 AM–9:00 PM</div>
            </div>
          </div>

          <div className={styles.heroVisual} aria-label="Room reservation preview">
            <div className={styles.visualBackdrop} />
            <div className={styles.calendarCard}>
              <div className={styles.calendarTop}>
                <div className={styles.calendarIcon}>
                  <CalendarIcon />
                </div>
                <div>
                  <span>Reserve the LGA Room</span>
                  <strong>Choose a date that works</strong>
                </div>
              </div>
              <div className={styles.calendarRule} />
              <div className={styles.monthRow}>
                <strong>July</strong>
                <span>‹ &nbsp;&nbsp; ›</span>
              </div>
              <div className={styles.weekdays}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
              </div>
              <div className={styles.days}>
                {[19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 1].map(day => (
                  <span className={day === 23 ? styles.selectedDay : undefined} key={day}>{day}</span>
                ))}
              </div>
              <div className={styles.availability}>
                <span><i /> Selected date</span>
                <strong>View times <ArrowIcon /></strong>
              </div>
            </div>
            <div className={styles.floatingNote}>
              <span>01</span>
              <div>
                <strong>Simple online request</strong>
                <small>Pick a date, add your details, and submit.</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.intro} id="space">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>The space</span>
            <h2 className={archivo.className}>Everything you need to lead the room.</h2>
          </div>
          <p>
            Purposeful technology and a comfortable, professional environment let you focus on the people and ideas in front of you.
          </p>
        </div>
        <div className={styles.amenityGrid}>
          {AMENITIES.map(item => <AmenityCard key={item.title} {...item} />)}
        </div>
      </section>

      <section className={styles.useCases}>
        <div className={styles.useCasesInner}>
          <div className={styles.sectionHeadingLight}>
            <span className={styles.kicker}>Made for more</span>
            <h2 className={archivo.className}>One room. Plenty of possibilities.</h2>
          </div>
          <div className={styles.useCaseGrid}>
            {USE_CASES.map(item => (
              <article className={styles.useCaseCard} key={item.title}>
                <div className={styles.useCaseTop}>
                  <span>{item.eyebrow}</span>
                  <div>{item.icon}</div>
                </div>
                <h3 className={archivo.className}>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <div>
            <span className={styles.kicker}>Plan your event</span>
            <h2 className={archivo.className}>Your next great meeting starts here.</h2>
            <p>Check the calendar, choose an available time, and send your reservation request in just a few steps.</p>
          </div>
          <Link className={styles.primaryButton} href="/lga-room/calendar">
            Check availability
            <ArrowIcon />
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div>
          <strong>{ROOM_NAME}</strong>
          <span>{ROOM_LOCATION}</span>
        </div>
        <Link href="/lga-room/calendar">Reservations</Link>
      </footer>
    </main>
  );
}
