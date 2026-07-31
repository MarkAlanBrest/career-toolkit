'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { EmployerAdminLoginModal } from '../../admin-modals';
import type {
  EmployerPortalAnnouncement,
  EmployerPortalAnnouncementsContent,
} from '@/lib/employerPortalAnnouncements';
import { useDashboardEmbed } from '@/lib/useDashboardEmbed';
import { archivo, publicSans } from '../../../lga-room/shared';
import styles from './announcements-admin.module.css';

const EMPTY_ITEM = (): EmployerPortalAnnouncement => ({
  id: `new-${Date.now()}`,
  title: '',
  message: '',
  eventDate: '',
  linkUrl: '',
  linkLabel: '',
  enabled: true,
  updatedAt: new Date().toISOString(),
});

export default function EmployerPortalAnnouncementsAdminPage() {
  const embedded = useDashboardEmbed();
  const [adminMode, setAdminMode] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [content, setContent] = useState<EmployerPortalAnnouncementsContent | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadAdmin = useCallback(async () => {
    const session = await fetch('/api/employer-portal/admin', { cache: 'no-store' });
    if (session.ok) {
      const data = await session.json();
      setAdminEmail(data.email || '');
      setAdminMode(true);
      return true;
    }
    setAdminMode(false);
    return false;
  }, []);

  const loadContent = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/employer-portal/admin/announcements', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load announcements.');
      setContent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load announcements.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void loadAdmin().then(ok => {
      if (ok) void loadContent();
      else setShowLogin(true);
    });
  }, [loadAdmin, loadContent]);

  async function save() {
    if (!content) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/employer-portal/admin/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Save failed.');
      setContent(data.content);
      setNotice('Event messages saved. They are live on the employer portal overview.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  function updateItem(id: string, patch: Partial<EmployerPortalAnnouncement>) {
    setContent(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map(item => (item.id === id ? { ...item, ...patch } : item)),
      };
    });
  }

  function addItem() {
    setContent(prev => {
      if (!prev) return prev;
      return { ...prev, items: [...prev.items, EMPTY_ITEM()] };
    });
  }

  function removeItem(id: string) {
    setContent(prev => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.filter(item => item.id !== id) };
    });
  }

  if (!adminMode && showLogin) {
    return (
      <main className={`${publicSans.className} ${styles.page}`}>
        <EmployerAdminLoginModal
          onClose={() => {
            if (!adminMode) window.location.href = '/employer-portal';
          }}
          onSuccess={email => {
            setAdminEmail(email);
            setAdminMode(true);
            setShowLogin(false);
            void loadContent();
          }}
        />
      </main>
    );
  }

  return (
    <main className={`${publicSans.className} ${styles.page} ${embedded ? styles.embedded : ''}`}>
      {!embedded && (
        <header className={styles.topbar}>
          <div>
            <strong>Employer Portal Admin</strong>
            <span>Event messages & announcements</span>
          </div>
          <div className={styles.topbarActions}>
            <Link href="/employer-portal">View employer portal</Link>
            <Link href="/dashboard">Dashboard</Link>
          </div>
        </header>
      )}

      <div className={styles.shell}>
        <div className={styles.intro}>
          <div>
            <span className={styles.kicker}>Career Services</span>
            <h1 className={archivo.className}>Employer portal event messages</h1>
            <p>
              Post upcoming career fairs, PAC meetings, and employer events. Published messages
              appear on the employer portal overview for all visitors.
            </p>
          </div>
          {adminEmail && <span className={styles.signedIn}>Signed in as {adminEmail}</span>}
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {notice && <div className={styles.notice}>{notice}</div>}

        {content && (
          <>
            <section className={styles.card}>
              <h2>Section heading</h2>
              <p className={styles.hint}>Shown above the list of event messages on the portal overview.</p>
              <div className={styles.fieldGrid}>
                <label>
                  Kicker
                  <input
                    value={content.sectionKicker}
                    onChange={e => setContent({ ...content, sectionKicker: e.target.value })}
                    placeholder="Upcoming events"
                  />
                </label>
                <label>
                  Title
                  <input
                    value={content.sectionTitle}
                    onChange={e => setContent({ ...content, sectionTitle: e.target.value })}
                    placeholder="What's happening at NCST"
                  />
                </label>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>Event messages</h2>
                <button type="button" className={styles.secondaryBtn} onClick={addItem}>
                  + Add message
                </button>
              </div>

              {content.items.length === 0 && (
                <p className={styles.empty}>No messages yet. Add one to highlight an upcoming event.</p>
              )}

              {content.items.map((item, index) => (
                <article key={item.id} className={styles.itemCard}>
                  <div className={styles.itemHeader}>
                    <strong>Message {index + 1}</strong>
                    <div className={styles.itemActions}>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={e => updateItem(item.id, { enabled: e.target.checked })}
                        />
                        Published
                      </label>
                      <button type="button" className={styles.linkBtn} onClick={() => removeItem(item.id)}>
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className={styles.fieldGrid}>
                    <label>
                      Event title
                      <input
                        value={item.title}
                        onChange={e => updateItem(item.id, { title: e.target.value })}
                        placeholder="Spring Career Fair"
                      />
                    </label>
                    <label>
                      Date or timing (optional)
                      <input
                        value={item.eventDate}
                        onChange={e => updateItem(item.id, { eventDate: e.target.value })}
                        placeholder="March 15, 2026 · 9:00 AM"
                      />
                    </label>
                  </div>

                  <label>
                    Message
                    <textarea
                      rows={4}
                      value={item.message}
                      onChange={e => updateItem(item.id, { message: e.target.value })}
                      placeholder="Tell employers what is coming up and how to register."
                    />
                  </label>

                  <div className={styles.fieldGrid}>
                    <label>
                      Link URL (optional)
                      <input
                        value={item.linkUrl}
                        onChange={e => updateItem(item.id, { linkUrl: e.target.value })}
                        placeholder="https://… or /employer-portal#career-fair"
                      />
                    </label>
                    <label>
                      Link label
                      <input
                        value={item.linkLabel}
                        onChange={e => updateItem(item.id, { linkLabel: e.target.value })}
                        placeholder="Register now"
                      />
                    </label>
                  </div>
                </article>
              ))}
            </section>

            <div className={styles.actions}>
              <button type="button" className={styles.primaryBtn} onClick={() => void save()} disabled={busy}>
                {busy ? 'Saving…' : 'Save & publish'}
              </button>
              <Link className={styles.secondaryBtn} href="/employer-portal">Preview on employer portal</Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
