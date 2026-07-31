'use client';

import Link from 'next/link';
import { archivo } from '../lga-room/shared';
import styles from './employer-portal.module.css';

type AnnouncementItem = {
  id: string;
  title: string;
  message: string;
  eventDate: string;
  linkUrl: string;
  linkLabel: string;
};

type Props = {
  sectionKicker: string;
  sectionTitle: string;
  items: AnnouncementItem[];
};

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 10h13M11 5l5 5-5 5" />
    </svg>
  );
}

export function EmployerEventsAnnouncements({ sectionKicker, sectionTitle, items }: Props) {
  if (!items.length) return null;

  return (
    <section className={styles.eventsAnnouncements} aria-label="Upcoming events">
      <div className={styles.eventsAnnouncementsHead}>
        <span className={styles.eventsKicker}>{sectionKicker}</span>
        <h2 className={archivo.className}>{sectionTitle}</h2>
      </div>

      <div className={styles.eventsAnnouncementsList}>
        {items.map(item => (
          <article key={item.id} className={styles.eventMessageCard}>
            <div>
              {item.eventDate && <span className={styles.eventMessageDate}>{item.eventDate}</span>}
              {item.title && <h3 className={archivo.className}>{item.title}</h3>}
              {item.message && <p>{item.message}</p>}
            </div>
            {item.linkUrl && (
              item.linkUrl.startsWith('http') || item.linkUrl.startsWith('mailto:')
                ? (
                  <a className={styles.eventsButton} href={item.linkUrl} target={item.linkUrl.startsWith('http') ? '_blank' : undefined} rel={item.linkUrl.startsWith('http') ? 'noreferrer' : undefined}>
                    {item.linkLabel || 'Learn more'}
                    <ArrowIcon />
                  </a>
                )
                : (
                  <Link className={styles.eventsButton} href={item.linkUrl}>
                    {item.linkLabel || 'Learn more'}
                    <ArrowIcon />
                  </Link>
                )
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
