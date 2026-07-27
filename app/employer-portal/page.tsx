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
    <article className={`${styles.serviceCard} ${compact ? styles.compactCard : ''}`}>
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
  const featured = SERVICES.filter(service => service.featured);
  const directory = SERVICES.filter(service => !service.featured);

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

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}><span />Your connection to NCST talent</div>
            <h1 className={archivo.className}>Build your team.<br /><em>Strengthen our region.</em></h1>
            <p>Find skilled applicants, share opportunities, connect with students, and manage your NCST partnership—all in one place.</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#services">Explore employer services <ArrowIcon /></a>
              <a className={styles.textLink} href={emailLink('NCST Employer Portal — Message Career Services')}>Ask a question</a>
            </div>
          </div>

        </div>
      </section>

      <section className={styles.servicesSection} id="services">
        <div className={styles.sectionHeading}>
          <div><span className={styles.kicker}>Most requested</span><h2 className={archivo.className}>What can we help you do?</h2></div>
          <p>Explore the ways NCST Career Services can help your organization hire, connect, and grow.</p>
        </div>
        <div className={styles.featuredGrid}>{featured.map(service => <ServiceCard key={service.title} service={service} />)}</div>

        <div className={styles.directoryHeading}>
          <div><span className={styles.kicker}>All employer services</span><h2 className={archivo.className}>Employer resource directory</h2></div>
          <span className={styles.serviceCount}>{SERVICES.length} services</span>
        </div>
        <div className={styles.directoryGrid}>{directory.map(service => <ServiceCard compact key={service.title} service={service} />)}</div>
      </section>

      <section className={styles.eventsSection} id="upcoming-events">
        <div><span className={styles.eventsKicker}>Upcoming events</span><h2 className={archivo.className}>Stay connected to NCST.</h2><p>Career Fairs, PAC meetings, recruiting opportunities, and employer events will appear here.</p></div>
        <a className={styles.eventsButton} href={emailLink('NCST Employer Portal — Upcoming Events')}>Ask about upcoming dates <ArrowIcon /></a>
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
