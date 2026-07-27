import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { archivo, publicSans } from '../lga-room/shared';
import styles from './employer-portal.module.css';

const CAREER_SERVICES_EMAIL = 'careerservices@ncstrades.edu';

type IconName =
  | 'people' | 'briefcase' | 'committee' | 'calendar' | 'building'
  | 'clipboard' | 'training' | 'visit' | 'hire' | 'feedback'
  | 'contact' | 'tour' | 'message' | 'events';

type Service = {
  title: string;
  description: string;
  category: 'Hire' | 'Connect' | 'Partner' | 'Manage';
  icon: IconName;
  featured?: boolean;
};

function emailLink(subject: string) {
  return `mailto:${CAREER_SERVICES_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

function serviceId(title: string) {
  return `service-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
}

const SERVICES: Service[] = [
  { title: 'Request Applicants', description: 'Request qualified students or graduates for your open positions.', category: 'Hire', icon: 'people', featured: true },
  { title: 'Submit a Job Opening', description: 'Send Career Services a job posting to share with our talent network.', category: 'Hire', icon: 'briefcase', featured: true },
  { title: 'PAC Meeting Registration', description: 'Register for an upcoming Program Advisory Committee meeting.', category: 'Partner', icon: 'committee', featured: true },
  { title: 'Career Fair Registration', description: 'Register your company and representatives for the Career Fair.', category: 'Connect', icon: 'calendar', featured: true },
  { title: 'LGA Room Reservation', description: 'Check availability and request the LGA meeting room.', category: 'Connect', icon: 'building' },
  { title: 'Submit Student Work Log', description: 'Submit a required work log for a student participating in work release.', category: 'Manage', icon: 'clipboard' },
  { title: 'Request Custom Training', description: 'Ask about workforce or employee training tailored to your organization.', category: 'Partner', icon: 'training' },
  { title: 'Schedule a Recruiting Visit', description: 'Visit campus, speak with students, conduct interviews, or recruit.', category: 'Hire', icon: 'visit' },
  { title: 'Report a Hire', description: 'Tell Career Services when an NCST student or graduate is hired.', category: 'Hire', icon: 'hire' },
  { title: 'Employer Feedback', description: 'Share feedback about student skills, graduates, or program needs.', category: 'Partner', icon: 'feedback' },
  { title: 'Update Contact Information', description: 'Keep your company and employer contact information current.', category: 'Manage', icon: 'contact' },
  { title: 'Request a School Tour', description: 'Arrange a guided tour of NCST programs and facilities.', category: 'Connect', icon: 'tour' },
  { title: 'Message Career Services', description: 'Send a general question or request to the Career Services team.', category: 'Connect', icon: 'message' },
  { title: 'Upcoming Events', description: 'View Career Fairs, PAC meetings, recruiting events, and key dates.', category: 'Connect', icon: 'events' },
];

function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h13M11 5l5 5-5 5" /></svg>;
}

function ServiceIcon({ name }: { name: IconName }) {
  const icons: Record<IconName, ReactNode> = {
    people: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 6.5a2.5 2.5 0 0 1 0 5M15.5 15c3 .3 5 2.2 5 5" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
    committee: <><circle cx="8" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M2.5 20c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5M14 15c3.6 0 6 2 6 5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18M8 14h3M8 17h7" /></>,
    building: <><path d="M4 21V4h12v17M16 9h4v12M2 21h20M8 8h4M8 12h4M8 16h4" /></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h4" /></>,
    training: <><path d="M3 5h18v12H3zM8 21l4-4 4 4M7 12l3-3 3 2 4-4" /></>,
    visit: <><path d="M4 21V5h10v16M14 9h6v12M2 21h20M8 9h2M8 13h2" /><circle cx="17" cy="14" r="1.5" /></>,
    hire: <><path d="M4 13v8h16v-8M12 3v12M7 10l5 5 5-5M6 3h12" /></>,
    feedback: <><path d="M4 4h16v12H9l-5 4V4ZM8 8h8M8 12h5" /></>,
    contact: <><rect x="4" y="3" width="16" height="18" rx="2" /><circle cx="12" cy="9" r="3" /><path d="M7.5 18c.6-2.2 2.2-3.5 4.5-3.5s3.9 1.3 4.5 3.5" /></>,
    tour: <><path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6M8 11h8" /></>,
    message: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    events: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18m-9 6 2 2 4-5" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>;
}

function ServiceCard({ service, compact = false }: { service: Service; compact?: boolean }) {
  return (
    <article className={`${styles.serviceCard} ${compact ? styles.compactCard : ''}`} id={serviceId(service.title)}>
      <div className={styles.cardTop}>
        <span className={styles.iconBox}><ServiceIcon name={service.icon} /></span>
        <span className={styles.category}>{service.category}</span>
      </div>
      <h3 className={archivo.className}>{service.title}</h3>
      <p>{service.description}</p>
    </article>
  );
}

export default function EmployerPortalPage() {
  const calendarDays = [
    28, 29, 30, 1, 2, 3, 4,
    5, 6, 7, 8, 9, 10, 11,
    12, 13, 14, 15, 16, 17, 18,
    19, 20, 21, 22, 23, 24, 25,
    26, 27, 28, 29, 30, 31, 1,
  ];

  return (
    <main className={`${publicSans.className} ${styles.page}`}>
      <div className={styles.topBar}>
        <span>Employer & workforce partnerships</span>
        <a href="https://www.ncstrades.edu/" target="_blank" rel="noreferrer">Visit the NCST main site</a>
      </div>

      <header className={styles.siteHeader}>
        <Link className={styles.brand} href="/employer-portal" aria-label="NCST Employer Portal home">
          <Image src="/ncst-logo.png" width={160} height={41} alt="New Castle School of Trades" priority />
          <span className={styles.portalBrand}><strong>Employer Portal</strong><small>Career Services</small></span>
        </Link>
        <a className={styles.headerLink} href={emailLink('NCST Employer Portal — General Question')}>
          Contact Career Services <ArrowIcon />
        </a>
      </header>

      <section className={styles.dashboard} id="services">
        <aside className={styles.sideNav}>
          <div className={styles.sideNavTitle}>Employer dashboard</div>
          <nav aria-label="Employer portal sections">
            <a className={styles.activeNav} href="#overview"><ServiceIcon name="building" />Overview</a>
            <a href="#partnerships"><ServiceIcon name="committee" />Partnerships</a>
            <a href="#important-dates"><ServiceIcon name="events" />Important dates</a>
            <span className={styles.navSectionLabel}>Employer services</span>
            {SERVICES.map(service => (
              <a className={styles.serviceNavLink} href={`#${serviceId(service.title)}`} key={service.title}>
                <ServiceIcon name={service.icon} />
                {service.title}
              </a>
            ))}
          </nav>
          <div className={styles.sideHelp}>
            <span>Career Services</span>
            <strong>Questions? We’re here.</strong>
            <a href={emailLink('NCST Employer Portal — General Question')}>Send us a message <ArrowIcon /></a>
          </div>
        </aside>

        <div className={styles.dashboardContent}>
          <div className={styles.centerColumn}>
            <section className={styles.welcomePanel} id="overview">
              <div>
                <span className={styles.kicker}>NCST employer network</span>
                <h1 className={archivo.className}>Welcome, community partners.</h1>
                <p>Discover ways to hire skilled talent, shape technical education, and connect your organization with NCST.</p>
              </div>
              <div className={styles.welcomeMark} aria-hidden="true">
                <ServiceIcon name="people" />
                <span>Employer<br />Partnerships</span>
              </div>
            </section>

            <section className={styles.partnershipSection} id="partnerships">
              <div className={styles.panelHeading}>
                <div><span className={styles.kicker}>Get involved</span><h2 className={archivo.className}>Partnership opportunities</h2></div>
                <p>Three meaningful ways to connect with our students and campus.</p>
              </div>

              <div className={styles.spotlightGrid}>
                <article className={styles.spotlightCard}>
                  <span className={styles.spotlightNumber}>01</span>
                  <span className={styles.spotlightIcon}><ServiceIcon name="committee" /></span>
                  <h3 className={archivo.className}>Become a PAC member</h3>
                  <p>Help keep NCST programs aligned with industry needs by sharing your experience on a Program Advisory Committee.</p>
                  <span className={styles.infoTag}>Shape future talent</span>
                </article>
                <article className={`${styles.spotlightCard} ${styles.goldCard}`}>
                  <span className={styles.spotlightNumber}>02</span>
                  <span className={styles.spotlightIcon}><ServiceIcon name="building" /></span>
                  <h3 className={archivo.className}>Meet in the LGA Room</h3>
                  <p>Host a meeting, training, seminar, or community event in NCST’s polished, presentation-ready space.</p>
                  <span className={styles.infoTag}>Professional event space</span>
                </article>
                <article className={styles.spotlightCard}>
                  <span className={styles.spotlightNumber}>03</span>
                  <span className={styles.spotlightIcon}><ServiceIcon name="hire" /></span>
                  <h3 className={archivo.className}>Build your talent pipeline</h3>
                  <p>Meet students, share job openings, visit campus, and connect with graduates prepared for skilled careers.</p>
                  <span className={styles.infoTag}>Hire NCST graduates</span>
                </article>
              </div>
            </section>

            <section className={styles.serviceDirectory} id="service-directory">
              <div className={styles.panelHeading}>
                <div><span className={styles.kicker}>At a glance</span><h2 className={archivo.className}>Employer services</h2></div>
                <span className={styles.serviceCount}>{SERVICES.length} services</span>
              </div>
              <div className={styles.directoryGrid}>
                {SERVICES.map(service => <ServiceCard compact key={service.title} service={service} />)}
              </div>
            </section>
          </div>

          <aside className={styles.dateColumn} id="important-dates">
            <section className={styles.calendarPanel}>
              <div className={styles.calendarHeading}>
                <div><span>Planning calendar</span><strong>July 2026</strong></div>
                <div className={styles.calendarControls}><span>‹</span><span>›</span></div>
              </div>
              <div className={styles.weekdays}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => <span key={day}>{day}</span>)}</div>
              <div className={styles.calendarDays}>
                {calendarDays.map((day, index) => (
                  <span className={`${index < 3 || index > 33 ? styles.otherMonth : ''} ${day === 26 && index === 28 ? styles.today : ''}`} key={`${day}-${index}`}>{day}</span>
                ))}
              </div>
              <div className={styles.calendarNote}><span /><p>Important employer dates will be highlighted here as they are announced.</p></div>
            </section>

            <section className={styles.datesPanel}>
              <span className={styles.kicker}>Important dates</span>
              <h2 className={archivo.className}>Coming up at NCST</h2>
              <div className={styles.dateList}>
                <div><span className={styles.dateBadge}><ServiceIcon name="calendar" /></span><p><strong>Career Fair</strong><small>Date to be announced</small></p></div>
                <div><span className={styles.dateBadge}><ServiceIcon name="committee" /></span><p><strong>PAC Meetings</strong><small>Dates to be announced</small></p></div>
                <div><span className={styles.dateBadge}><ServiceIcon name="visit" /></span><p><strong>Recruiting Events</strong><small>Dates to be announced</small></p></div>
              </div>
            </section>

            <section className={styles.contactPanel}>
              <span>Have a date in mind?</span>
              <h2 className={archivo.className}>Plan a campus visit.</h2>
              <p>Career Services can help coordinate recruiting, tours, interviews, and employer meetings.</p>
              <a href={emailLink('NCST Employer Portal — Plan a Campus Visit')}>Contact Career Services <ArrowIcon /></a>
            </section>
          </aside>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}><Image src="/ncst-logo.png" width={132} height={34} alt="New Castle School of Trades" /><span>Building futures. Together.</span></div>
          <div className={styles.footerContact}><strong>Career Services</strong><a href="tel:+17246548590">(724) 654-8590</a><a href={`mailto:${CAREER_SERVICES_EMAIL}`}>{CAREER_SERVICES_EMAIL}</a></div>
          <div className={styles.footerMeta}><a href="https://www.ncstrades.edu/" target="_blank" rel="noreferrer">NCST main site</a><span>© 2026 New Castle School of Trades</span></div>
        </div>
      </footer>
    </main>
  );
}
