'use client';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import type { StudentProfile } from '@/lib/studentPortal';
import { useDashboardEmbed } from '@/lib/useDashboardEmbed';
import { archivo, publicSans } from '../lga-room/shared';
import styles from './student-portal.module.css';

type PanelId = 'overview' | 'career-services' | 'financial-aid';

type PortalSection = {
  id: PanelId;
  label: string;
  icon: 'home' | 'briefcase' | 'aid';
  ready: boolean;
  description: string;
};

const SECTIONS: PortalSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'home',
    ready: true,
    description: 'Your starting point for student services at NCST.',
  },
  {
    id: 'career-services',
    label: 'Career Services',
    icon: 'briefcase',
    ready: false,
    description: 'Resume help, job search support, employer connections, and career events.',
  },
  {
    id: 'financial-aid',
    label: 'Financial Aid',
    icon: 'aid',
    ready: false,
    description: 'Scholarships, aid information, and financial support resources.',
  },
];

const CAREER_SERVICES_EMAIL = 'careerservices@ncstrades.edu';
const FINANCIAL_AID_EMAIL = 'financialaid@ncstrades.edu';

function SectionIcon({ name }: { name: PortalSection['icon'] }) {
  const icons: Record<PortalSection['icon'], ReactNode> = {
    home: <><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" /></>,
    aid: <><path d="M12 3v18M7.5 8.5C9 6.5 11 6 12 6s3 .5 4.5 2.5M7.5 15.5C9 17.5 11 18 12 18s3-.5 4.5-2.5" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>;
}

function authNoticeMessage(auth: string | null, reason: string | null): string | null {
  if (auth === 'not-configured') return 'Microsoft sign-in is not configured yet. Your IT team can add the student portal Azure settings.';
  if (auth === 'denied') return 'Microsoft sign-in was cancelled.';
  if (auth === 'invalid') return 'That sign-in link was invalid or expired. Please try again.';
  if (auth === 'failed') return reason || 'Microsoft sign-in failed. Please try again.';
  return null;
}

function StudentPortalContent() {
  const embedded = useDashboardEmbed();
  const searchParams = useSearchParams();
  const [activePanel, setActivePanel] = useState<PanelId>('overview');
  const [session, setSession] = useState<StudentProfile | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const activeSection = SECTIONS.find(section => section.id === activePanel) || SECTIONS[0];

  async function loadSession() {
    const response = await fetch('/api/student-portal/auth', { cache: 'no-store' });
    if (!response.ok) {
      setSession(null);
      return;
    }
    const data = await response.json();
    setSession(data.profile);
  }

  useEffect(() => {
    void loadSession();
  }, []);

  useEffect(() => {
    const auth = searchParams.get('auth');
    const reason = searchParams.get('reason');
    const message = authNoticeMessage(auth, reason);
    if (message) setAuthNotice(message);
  }, [searchParams]);

  async function signOut() {
    await fetch('/api/student-portal/auth', { method: 'DELETE' }).catch(() => null);
    setSession(null);
  }

  return (
    <main className={`${publicSans.className} ${styles.page} ${embedded ? styles.embedded : ''}`}>
      <section className={styles.dashboard}>
        <aside className={styles.sideNav}>
          <div className={styles.sidebarBrand}>
            <Image src="/ncst-logo.png" width={154} height={40} alt="New Castle School of Trades" priority />
            <span>Student Portal</span>
          </div>
          <nav aria-label="Student portal sections">
            <span className={styles.navSectionLabel}>Student resources</span>
            {SECTIONS.map(section => (
              <button
                key={section.id}
                type="button"
                className={activePanel === section.id ? styles.activeNav : undefined}
                onClick={() => setActivePanel(section.id)}
              >
                <SectionIcon name={section.icon} />
                {section.label}
                {!section.ready && <span className={styles.comingSoonBadge}>Soon</span>}
              </button>
            ))}
          </nav>
          <div className={styles.sideHelp}>
            <span>Need help now?</span>
            <strong>We are building this portal step by step.</strong>
            <a href={`mailto:${CAREER_SERVICES_EMAIL}`}>Email Career Services</a>
          </div>
        </aside>

        <div className={styles.workspace}>
          {!embedded && (
          <div className={styles.toolbar}>
            <div className={styles.toolbarWelcome}>
              <span>New Castle School of Trades</span>
              <strong>{session ? `Welcome, ${session.displayName}` : 'Student Portal'}</strong>
            </div>
            <div className={styles.toolbarActions}>
              {session ? (
                <>
                  <span className={styles.toolbarSignedIn}>{session.email}</span>
                  <button type="button" onClick={signOut}>Sign out</button>
                </>
              ) : (
                <a className={`${styles.signInButton} ${styles.signInButtonPrimary}`} href="/api/student-portal/auth/microsoft">
                  Sign in with Microsoft
                </a>
              )}
            </div>
          </div>
          )}

          {embedded && (
            <div className={styles.embeddedAuth}>
              {session ? (
                <>
                  <span>{session.email}</span>
                  <button type="button" onClick={signOut}>Sign out</button>
                </>
              ) : (
                <a className={`${styles.signInButton} ${styles.signInButtonPrimary}`} href="/api/student-portal/auth/microsoft">
                  Sign in with Microsoft
                </a>
              )}
            </div>
          )}

          <div className={styles.dashboardContent}>
            {authNotice && activePanel === 'overview' && (
              <div className={styles.authNotice}>{authNotice}</div>
            )}

            {activePanel === 'overview' ? (
              <>
                <section className={styles.welcomePanel}>
                  <div>
                    <span className={styles.kicker}>NCST student hub</span>
                    <h1 className={archivo.className}>
                      {session ? <>Good to see you, {session.displayName.split(' ')[0]}.</> : <>Your student portal is taking shape.</>}
                    </h1>
                    <p>
                      {session
                        ? 'You are signed in with your school Microsoft account. Career Services and Financial Aid sections are coming soon.'
                        : 'Sign in with your school Microsoft account to get ready for Career Services and Financial Aid resources in one place.'}
                    </p>
                  </div>
                  <div className={styles.welcomeMark} aria-hidden="true">
                    <SectionIcon name="home" />
                    <span>Student<br />Resources</span>
                  </div>
                </section>

                <div className={styles.overviewCards}>
                  <article className={styles.overviewCard}>
                    <strong>Career Services</strong>
                    <p>Future home for resumes, job search help, employer events, and placement support.</p>
                    <span>Coming soon</span>
                  </article>
                  <article className={styles.overviewCard}>
                    <strong>Financial Aid</strong>
                    <p>Future home for aid information, scholarship resources, and student support links.</p>
                    <span>Coming soon</span>
                  </article>
                </div>
              </>
            ) : (
              <section className={styles.placeholderPanel}>
                <span className={styles.kicker}>Student resource</span>
                <h2 className={archivo.className}>{activeSection.label}</h2>
                <p>{activeSection.description}</p>
                <p style={{ marginTop: 14 }}>
                  This section is not live yet. We are putting the menu in place first, then we will add the actual tools and resources.
                </p>
                {activeSection.id === 'career-services' && (
                  <p style={{ marginTop: 14 }}>
                    Questions now? Email <a href={`mailto:${CAREER_SERVICES_EMAIL}`}>{CAREER_SERVICES_EMAIL}</a>.
                  </p>
                )}
                {activeSection.id === 'financial-aid' && (
                  <p style={{ marginTop: 14 }}>
                    Questions now? Email <a href={`mailto:${FINANCIAL_AID_EMAIL}`}>{FINANCIAL_AID_EMAIL}</a>.
                  </p>
                )}
              </section>
            )}
          </div>

          <div className={styles.workspaceFooter}>
            <span>Student portal preview</span>
            <span>© 2026 New Castle School of Trades</span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function StudentPortalPage() {
  return (
    <Suspense fallback={<main className={`${publicSans.className} ${styles.page}`} />}>
      <StudentPortalContent />
    </Suspense>
  );
}
