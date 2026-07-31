'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { EmployerAdminLoginModal, EmployerAdminSettingsModal } from './admin-modals';
import { EmployerLoginModal } from './employer-auth-modals';
import { EmployerDashboard, EmployerRecentActivity } from './employer-dashboard';
import { EmployerEventsAnnouncements } from './employer-events-announcements';
import { SERVICE_FORMS, SERVICE_PANEL_BY_TITLE, ServiceFormPanel, type ServicePanelId } from './service-forms';
import type { EmployerDashboard as EmployerDashboardData, EmployerProfile } from '@/lib/employerPortalUsers';
import { useDashboardEmbed } from '@/lib/useDashboardEmbed';
import { LgaRoomCalendar } from '../lga-room/calendar/lga-room-calendar';
import { archivo, lgaRoomStyles, publicSans } from '../lga-room/shared';
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

function serviceLink(service: Service) {
  const panelId = SERVICE_PANEL_BY_TITLE[service.title];
  return panelId ? `#${panelId}` : emailLink(`NCST Employer Portal — ${service.title}`);
}

type ActivePanel = 'overview' | ServicePanelId;

const GRADUATE_STRENGTHS = [
  {
    title: 'Hands-on training',
    description: 'Students learn by doing in shop and lab environments built around real trade work.',
    icon: 'training' as const,
  },
  {
    title: 'Industry-ready skills',
    description: 'Programs emphasize the tools, safety practices, and workplace expectations employers need.',
    icon: 'briefcase' as const,
  },
  {
    title: 'Employer-informed programs',
    description: 'Industry partners help keep curriculum, equipment, and training aligned with workforce needs.',
    icon: 'committee' as const,
  },
];

const SERVICES: Service[] = [
  { title: 'Register as an Employer', description: 'Share your company and contact information to join the NCST employer network.', category: 'Connect', icon: 'contact', featured: true },
  { title: 'Request Applicants', description: 'Request qualified students or graduates for your open positions.', category: 'Hire', icon: 'people', featured: true },
  { title: 'Submit a Job Opening', description: 'Send Career Services a job posting to share with our talent network.', category: 'Hire', icon: 'briefcase', featured: true },
  { title: 'PAC Meeting Registration', description: 'Register for an upcoming Program Advisory Committee meeting.', category: 'Partner', icon: 'committee', featured: true },
  { title: 'Career Fair Registration', description: 'Register your company and representatives for the Career Fair.', category: 'Connect', icon: 'calendar', featured: true },
  { title: 'LG Room Reservation', description: 'Check availability and request the LG meeting room.', category: 'Connect', icon: 'building' },
  { title: 'Submit Student Work Log', description: 'Submit a required work log for a student participating in work release.', category: 'Manage', icon: 'clipboard' },
  { title: 'Request Custom Training', description: 'Ask about workforce or employee training tailored to your organization.', category: 'Partner', icon: 'training' },
  { title: 'Report a Hire', description: 'Tell Career Services when an NCST student or graduate is hired.', category: 'Hire', icon: 'hire' },
  { title: 'Update Contact Information', description: 'Keep your company and employer contact information current.', category: 'Manage', icon: 'contact' },
  { title: 'Message Career Services', description: 'Send a general question or request to the Career Services team.', category: 'Connect', icon: 'message' },
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

export default function EmployerPortalPage() {
  const embedded = useDashboardEmbed();
  const [activePanel, setActivePanel] = useState<ActivePanel>('overview');
  const [adminMode, setAdminMode] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [employerSession, setEmployerSession] = useState<{
    email: string;
    profile: EmployerProfile;
    dashboard: EmployerDashboardData;
  } | null>(null);
  const [showEmployerLogin, setShowEmployerLogin] = useState(false);
  const [eventAnnouncements, setEventAnnouncements] = useState<{
    sectionKicker: string;
    sectionTitle: string;
    items: Array<{
      id: string;
      title: string;
      message: string;
      eventDate: string;
      linkUrl: string;
      linkLabel: string;
    }>;
  } | null>(null);

  async function loadEventAnnouncements() {
    try {
      const response = await fetch('/api/employer-portal/announcements', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      setEventAnnouncements(data);
    } catch {
      setEventAnnouncements(null);
    }
  }

  async function loadEmployerSession() {
    const response = await fetch('/api/employer-portal/auth', { cache: 'no-store' });
    if (!response.ok) {
      setEmployerSession(null);
      return;
    }
    const data = await response.json();
    setEmployerSession({
      email: data.email,
      profile: data.profile,
      dashboard: data.dashboard,
    });
  }

  useEffect(() => {
    fetch('/api/employer-portal/admin', { cache: 'no-store' })
      .then(async response => {
        if (response.ok) {
          const data = await response.json();
          setAdminEmail(data.email || '');
          setAdminMode(true);
        }
      })
      .catch(() => null);
    void loadEmployerSession();
    void loadEventAnnouncements();
  }, []);

  async function logout() {
    await fetch('/api/employer-portal/admin', { method: 'DELETE' }).catch(() => null);
    setAdminEmail('');
    setAdminPassword('');
    setAdminMode(false);
  }

  async function employerLogout() {
    await fetch('/api/employer-portal/auth', { method: 'DELETE' }).catch(() => null);
    setEmployerSession(null);
  }

  const activeService = SERVICES.find(service => SERVICE_PANEL_BY_TITLE[service.title] === activePanel);
  const activeServiceForm = activePanel !== 'overview' && activePanel !== 'lga-room' ? SERVICE_FORMS[activePanel] : null;

  return (
    <main className={`${publicSans.className} ${styles.page} ${embedded ? styles.embedded : ''}`}>
      <style>{lgaRoomStyles}</style>
      <section className={styles.dashboard} id="services">
        <aside className={styles.sideNav}>
          <div className={styles.sidebarBrand}>
            <Image src="/ncst-logo.png" width={154} height={40} alt="New Castle School of Trades" priority />
            <span>Employer Portal</span>
          </div>
          <nav aria-label="Employer portal sections">
            <a
              className={activePanel === 'overview' ? styles.activeNav : undefined}
              href="#overview"
              onClick={event => {
                event.preventDefault();
                setActivePanel('overview');
              }}
            >
              <ServiceIcon name="building" />Overview
            </a>
            <span className={styles.navSectionLabel}>Employer services</span>
            {SERVICES.map(service => {
              const panelId = SERVICE_PANEL_BY_TITLE[service.title];

              return (
              <a
                aria-current={activePanel === panelId ? 'page' : undefined}
                className={`${styles.serviceNavLink} ${activePanel === panelId ? styles.activeNav : ''}`}
                href={serviceLink(service)}
                key={service.title}
                onClick={event => {
                  event.preventDefault();
                  setActivePanel(panelId);
                }}
              >
                <ServiceIcon name={service.icon} />
                {service.title}
              </a>
              );
            })}
          </nav>
          <div className={styles.sideHelp}>
            <span>Career Services</span>
            <strong>Questions? We’re here.</strong>
            <a href={emailLink('NCST Employer Portal — General Question')}>Send us a message <ArrowIcon /></a>
          </div>
        </aside>

        <div className={styles.workspace}>
          {!embedded && (
          <div className={styles.toolbar}>
            <div className={styles.toolbarWelcome}>
              <span>New Castle School of Trades</span>
              <strong>
                {employerSession?.profile.employerName
                  ? `Welcome, ${employerSession.profile.employerName}`
                  : 'Welcome to the Employer Portal'}
              </strong>
            </div>
            <div className={styles.toolbarActions}>
              {employerSession ? (
                <>
                  <span className={styles.toolbarSignedIn}>Signed in as {employerSession.profile.contactName}</span>
                  <button type="button" onClick={employerLogout}>Sign out</button>
                </>
              ) : (
                <button type="button" onClick={() => setShowEmployerLogin(true)}>Employer sign in</button>
              )}
            </div>
          </div>
          )}

          {embedded && (
            <div className={styles.embeddedAuth}>
              {employerSession ? (
                <>
                  <span>Signed in as {employerSession.profile.contactName}</span>
                  <button type="button" onClick={employerLogout}>Sign out</button>
                </>
              ) : (
                <button type="button" onClick={() => setShowEmployerLogin(true)}>Employer sign in</button>
              )}
            </div>
          )}

          <div className={`${styles.dashboardContent} ${activePanel === 'lga-room' ? styles.dashboardContentWide : ''}`}>
          <div className={styles.centerColumn}>
            <div aria-live="polite">
              {activePanel === 'overview' ? (
                <>
                {eventAnnouncements && eventAnnouncements.items.length > 0 && (
                  <EmployerEventsAnnouncements
                    sectionKicker={eventAnnouncements.sectionKicker}
                    sectionTitle={eventAnnouncements.sectionTitle}
                    items={eventAnnouncements.items}
                  />
                )}
                <section className={styles.welcomePanel} id="overview">
                  <div>
                    <span className={styles.kicker}>NCST employer network</span>
                    <h1 className={archivo.className}>
                      {employerSession ? <>Good to see you again.</> : <>Welcome, community partners.</>}
                    </h1>
                    <p>
                      {employerSession
                        ? 'Your forms are ready with your saved contact information. Explore services or review your recent activity.'
                        : 'Discover ways to hire skilled talent, shape technical education, and connect your organization with NCST.'}
                    </p>
                  </div>
                  <div className={styles.welcomeMark} aria-hidden="true">
                    <ServiceIcon name="people" />
                    <span>Employer<br />Partnerships</span>
                  </div>
                </section>
                {employerSession && (
                  <EmployerDashboard
                    employerName={employerSession.profile.employerName}
                    contactName={employerSession.profile.contactName}
                    totalSubmissions={employerSession.dashboard.totalSubmissions}
                    insights={employerSession.dashboard.insights}
                    onOpenForm={formId => setActivePanel(formId as ServicePanelId)}
                  />
                )}
                </>
              ) : activePanel === 'lga-room' ? (
                <section className={styles.lgaRoomPanel} id="lga-room">
                  <div className={styles.requestHeading}>
                    <div>
                      <span className={styles.kicker}>Employer service</span>
                      <h1 className={archivo.className}>LG Room reservation</h1>
                      <p>Check availability and request the LG meeting room without leaving the employer portal.</p>
                    </div>
                    <span className={styles.requestIcon}><ServiceIcon name="building" /></span>
                  </div>
                  <LgaRoomCalendar embedded />
                </section>
              ) : activeServiceForm ? (
                <ServiceFormPanel
                  config={activeServiceForm}
                  icon={<ServiceIcon name={activeService?.icon ?? 'message'} />}
                  profile={employerSession?.profile}
                  onCancel={() => setActivePanel('overview')}
                  onSubmitted={() => void loadEmployerSession()}
                />
              ) : null}
            </div>

            {activePanel !== 'lga-room' && (
            <section className={styles.partnershipSection} id="partnerships">
              <div className={styles.panelHeading}>
                <div><span className={styles.kicker}>Get involved</span><h2 className={archivo.className}>Partnership opportunities</h2></div>
                <p>Three meaningful ways to connect with our students and campus.</p>
              </div>

              <div className={styles.spotlightGrid}>
                <Link className={styles.spotlightCard} href="/pac-membership" id="pac-membership">
                  <span className={styles.spotlightNumber}>01</span>
                  <span className={styles.spotlightIcon}><ServiceIcon name="committee" /></span>
                  <h3 className={archivo.className}>Become a PAC member</h3>
                  <p>Help keep NCST programs aligned with industry needs by sharing your experience on a Program Advisory Committee.</p>
                  <span className={styles.infoTag}>Explore PAC membership <ArrowIcon /></span>
                </Link>
                <Link className={`${styles.spotlightCard} ${styles.goldCard}`} href="/dashboard?tool=lga-room" id="lga-room-landing">
                  <span className={styles.spotlightNumber}>02</span>
                  <span className={styles.spotlightIcon}><ServiceIcon name="building" /></span>
                  <h3 className={archivo.className}>Meet in the LG Room</h3>
                  <p>Host a meeting, training, seminar, or community event in NCST’s polished, presentation-ready space.</p>
                  <span className={styles.infoTag}>Reserve the LG Room <ArrowIcon /></span>
                </Link>
                <Link className={styles.spotlightCard} href="/hire-ncst" id="hiring">
                  <span className={styles.spotlightNumber}>03</span>
                  <span className={styles.spotlightIcon}><ServiceIcon name="hire" /></span>
                  <h3 className={archivo.className}>Build your talent pipeline</h3>
                  <p>Meet students, share job openings, visit campus, and connect with graduates prepared for skilled careers.</p>
                  <span className={styles.infoTag}>Explore employer recruiting <ArrowIcon /></span>
                </Link>
              </div>
            </section>
            )}

          </div>

          {activePanel !== 'lga-room' && (
          <aside className={styles.dateColumn} id="employer-insights">
            {employerSession && activePanel === 'overview' && (
              <EmployerRecentActivity items={employerSession.dashboard.recentSubmissions} />
            )}
            <section className={styles.valuePanel}>
              <span className={styles.kicker}>Why hire from NCST</span>
              <h2 className={archivo.className}>What our graduates bring</h2>
              <div className={styles.valueList}>
                {GRADUATE_STRENGTHS.map(item => (
                  <div key={item.title}>
                    <span className={styles.valueBadge}><ServiceIcon name={item.icon} /></span>
                    <p><strong>{item.title}</strong><small>{item.description}</small></p>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.sponsorshipPanel}>
              <span className={styles.kicker}>Community partnerships</span>
              <h2 className={archivo.className}>Corporate sponsorship</h2>
              <p>
                NCST corporate sponsors build stronger relationships with our school, support industry-specific
                tools and equipment, and help students connect with employers who hire our graduates.
              </p>
              <a href="https://www.ncstrades.edu/corporate-sponsors/" target="_blank" rel="noreferrer">
                Explore corporate sponsorship <ArrowIcon />
              </a>
            </section>

            <section className={styles.contactPanel}>
              <span>Have a date in mind?</span>
              <h2 className={archivo.className}>Plan a campus visit.</h2>
              <p>Career Services can help coordinate recruiting, tours, interviews, and employer meetings.</p>
              <a href={emailLink('NCST Employer Portal — Plan a Campus Visit')}>Contact Career Services <ArrowIcon /></a>
            </section>
          </aside>
          )}
          </div>

          <div className={styles.workspaceFooter}>
            <span>NCST Employer Portal</span>
            <div className={styles.footerAdmin}>
              <Link href="/dashboard">Dashboard</Link>
              <span aria-hidden="true">·</span>
              <Link href="/career-reports">Career reports</Link>
              <span aria-hidden="true">·</span>
              {adminMode ? (
                <>
                  <Link href="/employer-portal/admin/announcements">Event messages</Link>
                  <span aria-hidden="true">·</span>
                  <button type="button" onClick={() => setShowAdminSettings(true)}>Email settings</button>
                  <span aria-hidden="true">·</span>
                  <button type="button" onClick={logout}>Log out</button>
                </>
              ) : (
                <button type="button" onClick={() => setShowAdminLogin(true)}>Admin</button>
              )}
            </div>
            <span>© 2026 New Castle School of Trades</span>
          </div>
        </div>
      </section>

      {showEmployerLogin && (
        <EmployerLoginModal
          onClose={() => setShowEmployerLogin(false)}
          onSuccess={() => {
            setShowEmployerLogin(false);
            void loadEmployerSession();
          }}
          onCreateAccount={() => {
            setShowEmployerLogin(false);
            setActivePanel('employer-registration');
          }}
        />
      )}

      {showAdminLogin && (
        <EmployerAdminLoginModal
          onClose={() => setShowAdminLogin(false)}
          onSuccess={email => {
            setAdminEmail(email);
            setAdminPassword('');
            setAdminMode(true);
            setShowAdminLogin(false);
          }}
        />
      )}

      {showAdminSettings && (
        <EmployerAdminSettingsModal
          adminEmail={adminEmail}
          adminPassword={adminPassword}
          onClose={() => setShowAdminSettings(false)}
        />
      )}
    </main>
  );
}
