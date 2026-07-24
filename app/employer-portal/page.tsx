import Image from 'next/image';
import type { ReactNode } from 'react';
import styles from './employer-portal.module.css';

const EMPLOYER_NAME = 'Acme Manufacturing';

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5 8l5 5 5-5" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v3a2 2 0 0 1-2 2C10.5 20 4 13.5 4 6a2 2 0 0 1 2-2Z" />
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

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
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

function GroupIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="9" r="2.5" />
      <circle cx="16" cy="9" r="2.5" />
      <path d="M3 20c0-2.8 2.2-5 5-5s5 2.2 5 5M11 20c0-2.8 2.2-5 5-5s5 2.2 5 5" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-4h4v4" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M12 10l1.2 2.4 2.6.4-1.9 1.8.45 2.6L12 15.9l-2.35 1.3.45-2.6-1.9-1.8 2.6-.4Z" />
    </svg>
  );
}

function GraduationCapIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 8l10-4 10 4-10 4-10-4Z" />
      <path d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5" />
      <path d="M22 8v6" />
    </svg>
  );
}

function EnvelopeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 6.5l9 6.5 9-6.5" />
    </svg>
  );
}

type Tile = {
  title: string;
  body: string;
  icon: ReactNode;
  iconBg: string;
};

const TILES: Tile[] = [
  {
    title: 'Request Applicants',
    body: "Let us know what kind of students you're looking for.",
    icon: <PeopleIcon />,
    iconBg: '#DCE7FA',
  },
  {
    title: 'Post a Job Opening',
    body: 'Submit a job opening to connect with qualified students.',
    icon: <BriefcaseIcon />,
    iconBg: '#DCEFE0',
  },
  {
    title: 'Career Day',
    body: 'Register your company for our upcoming Career Day.',
    icon: <CalendarIcon />,
    iconBg: '#E7E0F6',
  },
  {
    title: 'PAC Meetings',
    body: 'Register to attend PAC (Program Advisory Committee) meetings.',
    icon: <GroupIcon />,
    iconBg: '#FBEBC7',
  },
  {
    title: 'Reserve LGA Room',
    body: 'Reserve the LGA room for meetings or events.',
    icon: <BuildingIcon />,
    iconBg: '#D8EDEA',
  },
  {
    title: 'Student Evaluation',
    body: "Provide feedback on a student's work performance.",
    icon: <ClipboardIcon />,
    iconBg: '#F8DCD9',
  },
  {
    title: 'Custom Training',
    body: 'Request custom training for your employees.',
    icon: <GraduationCapIcon />,
    iconBg: '#DCE7FA',
  },
  {
    title: 'Contact Career Services',
    body: 'Send a message or ask a general question.',
    icon: <EnvelopeIcon />,
    iconBg: '#E4E6EA',
  },
];

export default function EmployerPortalPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <Image className={styles.brandLogo} src="/ncst-logo.png" width={140} height={36} alt="New Castle School of Trades" priority />
            <span className={styles.brandDivider} />
            <span className={styles.portalLabel}>Employer Portal</span>
          </div>
          <button className={styles.account} type="button">
            Welcome, {EMPLOYER_NAME}
            <ChevronDownIcon />
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>Welcome, {EMPLOYER_NAME}!</h1>
        <p className={styles.subtitle}>
          Partner with <strong>NCST</strong> to build your workforce of tomorrow.
        </p>

        <div className={styles.grid}>
          {TILES.map(tile => (
            <a className={styles.card} href="#" key={tile.title}>
              <div className={styles.iconCircle} style={{ background: tile.iconBg }}>
                {tile.icon}
              </div>
              <h2 className={styles.cardTitle}>{tile.title}</h2>
              <p className={styles.cardBody}>{tile.body}</p>
              <span className={styles.cardArrow}>
                <ArrowIcon />
              </span>
            </a>
          ))}
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerContact}>
            <PhoneIcon />
            <span>
              Need help? Contact NCST Career Services &nbsp;(724) 654-8590 &nbsp;|&nbsp;{' '}
              <a href="mailto:careerservices@ncstrades.edu">careerservices@ncstrades.edu</a>
            </span>
          </div>

          <div className={styles.footerBrand}>
            <Image src="/ncst-logo.png" width={90} height={23} alt="New Castle School of Trades" />
            <span className={styles.footerTagline}>
              Building Futures. <strong>Together.</strong>
            </span>
          </div>

          <div className={styles.footerCopyright}>
            © 2026 New Castle School of Trades
            <br />
            All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
