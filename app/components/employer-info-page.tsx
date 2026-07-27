import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { archivo, publicSans } from '../lga-room/shared';
import styles from './employer-info-page.module.css';

const CAREER_SERVICES_EMAIL = 'careerservices@ncstrades.edu';

type Feature = {
  eyebrow: string;
  title: string;
  body: string;
  icon: 'insight' | 'people' | 'path' | 'briefcase' | 'visit' | 'message';
};

type Step = {
  title: string;
  body: string;
};

type EmployerInfoPageProps = {
  pageLabel: string;
  title: ReactNode;
  summary: string;
  subject: string;
  primaryLabel: string;
  heroNote: string;
  highlights: string[];
  sectionLabel: string;
  sectionTitle: string;
  sectionIntro: string;
  features: Feature[];
  detailLabel: string;
  detailTitle: string;
  detailBody: string;
  detailPoints: string[];
  stepsTitle: string;
  steps: Step[];
  closingTitle: string;
  closingBody: string;
};

function mailto(subject: string) {
  return `mailto:${CAREER_SERVICES_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h13M11 5l5 5-5 5" /></svg>;
}

function FeatureIcon({ name }: { name: Feature['icon'] }) {
  const icons: Record<Feature['icon'], ReactNode> = {
    insight: <><path d="M4 19V9M10 19V5M16 19V11M22 19H2" /><path d="m4 6 6-4 6 5 5-4" /></>,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 6.5a2.5 2.5 0 0 1 0 5M15.5 15c3 .3 5 2.2 5 5" /></>,
    path: <><circle cx="5" cy="18" r="2" /><circle cx="19" cy="6" r="2" /><path d="M7 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3h1" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" /></>,
    visit: <><path d="M4 21V5h10v16M14 9h6v12M2 21h20M8 9h2M8 13h2" /><circle cx="17" cy="14" r="1.5" /></>,
    message: <><path d="M4 4h16v12H9l-5 4V4Z" /><path d="M8 8h8M8 12h5" /></>,
  };

  return <svg viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>;
}

export default function EmployerInfoPage(props: EmployerInfoPageProps) {
  const contactLink = mailto(props.subject);

  return (
    <main className={`${publicSans.className} ${styles.page}`}>
      <div className={styles.topBar}>
        <span>Employer partnerships at New Castle School of Trades</span>
        <a href="https://www.ncstrades.edu/" target="_blank" rel="noreferrer">Visit the NCST main site</a>
      </div>

      <header className={styles.siteHeader}>
        <Link className={styles.brand} href="/employer-portal" aria-label="Return to the NCST Employer Portal">
          <Image src="/ncst-logo.png" width={160} height={41} alt="New Castle School of Trades" priority />
          <span>
            <strong>Employer Portal</strong>
            <small>{props.pageLabel}</small>
          </span>
        </Link>
        <Link className={styles.backLink} href="/employer-portal">
          Back to portal
          <ArrowIcon />
        </Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>{props.pageLabel}</span>
          <h1 className={archivo.className}>{props.title}</h1>
          <p>{props.summary}</p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href={contactLink}>{props.primaryLabel}<ArrowIcon /></a>
            <a className={styles.textLink} href="#details">Learn how it works</a>
          </div>
        </div>

        <aside className={styles.heroCard}>
          <span className={styles.heroCardNumber}>NCST</span>
          <div className={styles.heroCardIcon}><FeatureIcon name="people" /></div>
          <strong className={archivo.className}>{props.heroNote}</strong>
          <div className={styles.highlightList}>
            {props.highlights.map(item => <span key={item}><i />{item}</span>)}
          </div>
        </aside>
      </section>

      <section className={styles.content} id="details">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>{props.sectionLabel}</span>
            <h2 className={archivo.className}>{props.sectionTitle}</h2>
          </div>
          <p>{props.sectionIntro}</p>
        </div>

        <div className={styles.featureGrid}>
          {props.features.map((feature, index) => (
            <article className={styles.featureCard} key={feature.title}>
              <span className={styles.cardNumber}>0{index + 1}</span>
              <div className={styles.featureIcon}><FeatureIcon name={feature.icon} /></div>
              <span className={styles.kicker}>{feature.eyebrow}</span>
              <h3 className={archivo.className}>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>

        <section className={styles.detailPanel}>
          <div>
            <span className={styles.kicker}>{props.detailLabel}</span>
            <h2 className={archivo.className}>{props.detailTitle}</h2>
            <p>{props.detailBody}</p>
          </div>
          <ul>
            {props.detailPoints.map(point => <li key={point}><span>✓</span>{point}</li>)}
          </ul>
        </section>

        <section className={styles.stepsSection}>
          <span className={styles.kicker}>Getting started</span>
          <h2 className={archivo.className}>{props.stepsTitle}</h2>
          <div className={styles.stepsGrid}>
            {props.steps.map((step, index) => (
              <article key={step.title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className={archivo.className}>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.ctaPanel}>
          <div>
            <span className={styles.kicker}>Connect with Career Services</span>
            <h2 className={archivo.className}>{props.closingTitle}</h2>
            <p>{props.closingBody}</p>
          </div>
          <a href={contactLink}>{props.primaryLabel}<ArrowIcon /></a>
        </section>

        <footer className={styles.footer}>
          <span>NCST Employer Partnerships</span>
          <Link href="/employer-portal">Employer Portal</Link>
        </footer>
      </section>
    </main>
  );
}
