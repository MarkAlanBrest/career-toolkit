'use client';

import { useEffect, useMemo, useState } from 'react';
import { Archivo, Public_Sans } from 'next/font/google';

const archivo = Archivo({ subsets: ['latin'], weight: ['600', '700', '800'] });
const publicSans = Public_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

type ReservationStatus = 'pending' | 'approved' | 'denied';

type Reservation = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  name: string;
  email: string;
  purpose: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
};

const ROOM_NAME = 'LGA Room';
const ROOM_OPEN_TIME = '07:00';
const ROOM_CLOSE_TIME = '21:00';
const ADMIN_STORAGE_KEY = 'lga_room_admin_password';

// Warm paper ground with a deep teal-slate accent — kept deliberately apart from the
// pending/approved/denied semantic colors below so status is never confused with brand.
const bg = '#F6F5F1';
const surface = '#FFFFFF';
const text = '#20241F';
const textMuted = '#5C6560';
const border = '#E2DFD5';
const accent = '#2C4A52';
const accentStrong = '#1F373D';
const accentTint = '#E7EFEF';

const STATUS_STYLES: Record<ReservationStatus, { bg: string; fg: string; border: string }> = {
  pending: { bg: '#FCF3DE', fg: '#8A5A0B', border: '#EED9A6' },
  approved: { bg: '#E4F5EA', fg: '#1F7A4D', border: '#BEE1CC' },
  denied: { bg: '#F5E9EA', fg: '#8B3A42', border: '#E3CDD0' },
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toDateStr(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isSameDate(a: Date, b: Date) {
  return toDateStr(a) === toDateStr(b);
}

function buildCalendarWeeks(monthDate: Date): Date[][] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const gridStart = new Date(year, month, 1 - firstOfMonth.getDay());
  const gridEnd = new Date(year, month, lastOfMonth.getDate() + (6 - lastOfMonth.getDay()));

  const weeks: Date[][] = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function timeOptions(): string[] {
  const options: string[] = [];
  const [openH, openM] = ROOM_OPEN_TIME.split(':').map(Number);
  const [closeH, closeM] = ROOM_CLOSE_TIME.split(':').map(Number);
  let minutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  while (minutes <= closeMinutes) {
    options.push(`${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`);
    minutes += 30;
  }
  return options;
}

function formatTimeLabel(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${pad(m)} ${period}`;
}

const TIME_OPTIONS = timeOptions();

export default function LgaRoomPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [requestDate, setRequestDate] = useState<string | null>(null);
  const [viewingReservation, setViewingReservation] = useState<Reservation | null>(null);

  const [adminMode, setAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminSettings, setShowAdminSettings] = useState(false);

  const today = useMemo(() => new Date(), []);

  async function loadReservations() {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch('/api/lga-room/reservations');
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Could not load reservations.');
      setReservations(data.reservations || []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load reservations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReservations();
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!stored) return;
    fetch('/api/lga-room/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: stored }),
    }).then(response => {
      if (response.ok) {
        setAdminPassword(stored);
        setAdminMode(true);
      } else {
        window.localStorage.removeItem(ADMIN_STORAGE_KEY);
      }
    });
  }, []);

  function logout() {
    window.localStorage.removeItem(ADMIN_STORAGE_KEY);
    setAdminPassword('');
    setAdminMode(false);
  }

  const weeks = useMemo(() => buildCalendarWeeks(currentMonth), [currentMonth]);

  const reservationsByDate = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    reservations.forEach(r => {
      const list = map.get(r.date) || [];
      list.push(r);
      map.set(r.date, list);
    });
    map.forEach(list => list.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return map;
  }, [reservations]);

  function visibleReservationsFor(dateStr: string) {
    const list = reservationsByDate.get(dateStr) || [];
    return adminMode ? list : list.filter(r => r.status !== 'denied');
  }

  async function handleReservationAction(id: string, action: 'approve' | 'deny' | 'delete') {
    const headers = { 'Content-Type': 'application/json', 'x-admin-password': adminPassword };
    if (action === 'delete') {
      await fetch(`/api/lga-room/reservations/${id}`, { method: 'DELETE', headers });
    } else {
      await fetch(`/api/lga-room/reservations/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: action === 'approve' ? 'approved' : 'denied' }),
      });
    }
    setViewingReservation(null);
    loadReservations();
  }

  return (
    <main className={publicSans.className} style={{ minHeight: '100vh', background: bg, color: text, paddingBottom: 64 }}>
      <style>{lgaRoomStyles}</style>

      <header style={{ background: accent, color: '#fff', padding: '20px 24px' }}>
        <div style={{ maxWidth: 840, margin: '0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.72, marginBottom: 4 }}>
              Room booking
            </div>
            <h1 className={archivo.className} style={{ fontSize: 24, fontWeight: 700, margin: 0, textWrap: 'balance' }}>
              {ROOM_NAME}
            </h1>
          </div>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              background: 'rgba(255,255,255,0.14)',
              border: '1px solid rgba(255,255,255,0.22)',
              borderRadius: 999,
              padding: '6px 14px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            Open {formatTimeLabel(ROOM_OPEN_TIME)} – {formatTimeLabel(ROOM_CLOSE_TIME)} · requests are pending until approved
          </div>
        </div>
      </header>

      <section style={{ maxWidth: 840, margin: '0 auto', padding: '18px 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', border: `1px solid ${border}`, borderRadius: 8, overflow: 'hidden', background: surface }}>
              <button
                onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                className="lgaroom-navbtn"
                aria-label="Previous month"
                style={navButtonStyle}
              >
                ‹
              </button>
              <button
                onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                className="lgaroom-navbtn"
                aria-label="Next month"
                style={{ ...navButtonStyle, borderLeft: `1px solid ${border}` }}
              >
                ›
              </button>
            </div>
            <div className={archivo.className} style={{ fontSize: 17, fontWeight: 700, minWidth: 140, fontVariantNumeric: 'tabular-nums' }}>
              {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </div>
            <button
              onClick={() => setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
              className="lgaroom-btn-secondary"
              style={{ ...secondaryButtonStyle, padding: '6px 12px', fontSize: 12.5 }}
            >
              Today
            </button>
          </div>

          <div style={{ display: 'flex', gap: 14, fontSize: 12.5, color: textMuted }}>
            <Legend color={STATUS_STYLES.pending} label="Pending" />
            <Legend color={STATUS_STYLES.approved} label="Approved" />
            {adminMode && <Legend color={STATUS_STYLES.denied} label="Not approved" />}
          </div>
        </div>

        {loadError && <div style={{ color: '#9A2E36', fontSize: 13, marginBottom: 12 }}>{loadError}</div>}

        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 2px rgba(32,36,31,0.04), 0 10px 28px rgba(32,36,31,0.06)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: accentTint }}>
            {WEEKDAY_LABELS.map(label => (
              <div key={label} style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: accentStrong }}>
                {label}
              </div>
            ))}
          </div>

          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderTop: weekIndex === 0 ? 'none' : `1px solid ${border}` }}>
              {week.map(date => {
                const dateStr = toDateStr(date);
                const inMonth = date.getMonth() === currentMonth.getMonth();
                const isToday = isSameDate(date, today);
                const dayReservations = visibleReservationsFor(dateStr);

                return (
                  <div
                    key={dateStr}
                    className="lgaroom-daycell"
                    style={{
                      minHeight: 92,
                      borderRight: `1px solid ${border}`,
                      padding: 6,
                      opacity: inMonth ? 1 : 0.42,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: isToday ? 700 : 500,
                          color: isToday ? '#fff' : text,
                          background: isToday ? accent : 'transparent',
                          borderRadius: '50%',
                          width: 20,
                          height: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {date.getDate()}
                      </span>
                      <button
                        onClick={() => setRequestDate(dateStr)}
                        className="lgaroom-addbtn"
                        aria-label={`Request the room on ${dateStr}`}
                        title="Request this room"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: textMuted,
                          cursor: 'pointer',
                          fontSize: 14,
                          fontWeight: 700,
                          lineHeight: 1,
                          borderRadius: 4,
                          width: 18,
                          height: 18,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        +
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto', maxHeight: 58 }}>
                      {dayReservations.map(r => {
                        const colors = STATUS_STYLES[r.status];
                        return (
                          <button
                            key={r.id}
                            onClick={() => setViewingReservation(r)}
                            className="lgaroom-chip"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              textAlign: 'left',
                              fontSize: 10.5,
                              background: 'transparent',
                              border: 'none',
                              borderRadius: 5,
                              padding: '2px 4px',
                              cursor: 'pointer',
                              color: text,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.fg, flexShrink: 0 }} />
                            <span
                              style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                textDecoration: r.status === 'denied' ? 'line-through' : 'none',
                                color: r.status === 'denied' ? textMuted : text,
                              }}
                            >
                              {formatTimeLabel(r.startTime)} {r.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {loading && <div style={{ fontSize: 13, color: textMuted, marginTop: 12 }}>Loading reservations…</div>}
      </section>

      {requestDate && (
        <RequestModal
          date={requestDate}
          existing={reservationsByDate.get(requestDate) || []}
          onClose={() => setRequestDate(null)}
          onCreated={() => {
            setRequestDate(null);
            loadReservations();
          }}
        />
      )}

      {viewingReservation && (
        <ReservationDetailsModal
          reservation={viewingReservation}
          adminMode={adminMode}
          onClose={() => setViewingReservation(null)}
          onAction={handleReservationAction}
        />
      )}

      {showAdminLogin && (
        <AdminLoginModal
          onClose={() => setShowAdminLogin(false)}
          onSuccess={password => {
            window.localStorage.setItem(ADMIN_STORAGE_KEY, password);
            setAdminPassword(password);
            setAdminMode(true);
            setShowAdminLogin(false);
          }}
        />
      )}

      {showAdminSettings && (
        <AdminSettingsModal adminPassword={adminPassword} onClose={() => setShowAdminSettings(false)} />
      )}

      <div style={{ position: 'fixed', right: 20, bottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        {adminMode ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: surface,
              border: `1px solid ${border}`,
              borderRadius: 999,
              padding: '6px 6px 6px 14px',
              boxShadow: '0 4px 16px rgba(32,36,31,0.16)',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: accent }}>Admin mode</span>
            <button onClick={() => setShowAdminSettings(true)} className="lgaroom-btn-secondary" style={{ ...secondaryButtonStyle, padding: '6px 14px', fontSize: 12, borderRadius: 999 }}>
              Settings
            </button>
            <button onClick={logout} className="lgaroom-btn-secondary" style={{ ...secondaryButtonStyle, padding: '6px 14px', fontSize: 12, borderRadius: 999 }}>
              Log out
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAdminLogin(true)}
            aria-label="Admin sign in"
            title="Admin"
            className="lgaroom-fab"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: 'none',
              background: accent,
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(32,36,31,0.28)',
            }}
          >
            <LockIcon />
          </button>
        )}
      </div>
    </main>
  );
}

function LockIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const navButtonStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  border: 'none',
  background: surface,
  cursor: 'pointer',
  fontSize: 15,
  color: text,
};

function Legend({ color, label }: { color: { bg: string; fg: string; border: string }; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color.fg, display: 'inline-block' }} />
      {label}
    </div>
  );
}

function RequestModal({
  date,
  existing,
  onClose,
  onCreated,
}: {
  date: string;
  existing: Reservation[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [purpose, setPurpose] = useState('');
  const [startTime, setStartTime] = useState(TIME_OPTIONS[0]);
  const [endTime, setEndTime] = useState(TIME_OPTIONS[2] || TIME_OPTIONS[TIME_OPTIONS.length - 1]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const approvedForDay = existing.filter(r => r.status === 'approved');

  async function submit() {
    setError('');
    if (startTime >= endTime) {
      setError('Start time must be before end time.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/lga-room/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, startTime, endTime, name, email, purpose }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Could not submit request.');
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell onClose={onClose} title={`Request ${ROOM_NAME}`}>
      <div style={{ fontSize: 13, color: textMuted, marginBottom: 14 }}>{dateLabel}</div>

      {approvedForDay.length > 0 && (
        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Already booked this day</div>
          {approvedForDay.map(r => (
            <div key={r.id} style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTimeLabel(r.startTime)} – {formatTimeLabel(r.endTime)}</div>
          ))}
        </div>
      )}

      <Field label="Name">
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Your name" />
      </Field>
      <Field label="Email">
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={inputStyle} placeholder="you@example.com" />
      </Field>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Start time">
          <select value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle}>
            {TIME_OPTIONS.map(t => <option key={t} value={t}>{formatTimeLabel(t)}</option>)}
          </select>
        </Field>
        <Field label="End time">
          <select value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle}>
            {TIME_OPTIONS.map(t => <option key={t} value={t}>{formatTimeLabel(t)}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Purpose">
        <textarea value={purpose} onChange={e => setPurpose(e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} placeholder="What's this reservation for?" />
      </Field>

      {error && <div style={{ color: '#9A2E36', fontSize: 13, marginBottom: 10 }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
        <button onClick={onClose} className="lgaroom-btn-secondary" style={secondaryButtonStyle}>Cancel</button>
        <button onClick={submit} disabled={submitting} className="lgaroom-btn-primary" style={primaryButtonStyle}>
          {submitting ? 'Submitting…' : 'Submit request'}
        </button>
      </div>
    </ModalShell>
  );
}

function ReservationDetailsModal({
  reservation,
  adminMode,
  onClose,
  onAction,
}: {
  reservation: Reservation;
  adminMode: boolean;
  onClose: () => void;
  onAction: (id: string, action: 'approve' | 'deny' | 'delete') => void;
}) {
  const dateLabel = new Date(`${reservation.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const colors = STATUS_STYLES[reservation.status];

  return (
    <ModalShell onClose={onClose} title={ROOM_NAME}>
      <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 600, color: colors.fg, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 999, padding: '3px 10px', marginBottom: 12, textTransform: 'capitalize' }}>
        {reservation.status === 'denied' ? 'Not approved' : reservation.status}
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.8 }}>
        <div><strong>{dateLabel}</strong></div>
        <div style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTimeLabel(reservation.startTime)} – {formatTimeLabel(reservation.endTime)}</div>
        <div>Requested by: {reservation.name}</div>
        {adminMode && <div>Email: {reservation.email}</div>}
        <div>Purpose: {reservation.purpose}</div>
      </div>

      {adminMode && (
        <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
          {reservation.status !== 'approved' && (
            <button onClick={() => onAction(reservation.id, 'approve')} className="lgaroom-btn-primary" style={primaryButtonStyle}>Approve</button>
          )}
          {reservation.status !== 'denied' && (
            <button onClick={() => onAction(reservation.id, 'deny')} className="lgaroom-btn-secondary" style={{ ...secondaryButtonStyle, color: '#9A2E36', borderColor: '#E3B7BB' }}>Not approve</button>
          )}
          <button onClick={() => onAction(reservation.id, 'delete')} className="lgaroom-btn-secondary" style={{ ...secondaryButtonStyle, marginLeft: 'auto' }}>Delete</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <button onClick={onClose} className="lgaroom-btn-secondary" style={secondaryButtonStyle}>Close</button>
      </div>
    </ModalShell>
  );
}

function AdminLoginModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (password: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/lga-room/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) throw new Error('Incorrect password.');
      onSuccess(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell onClose={onClose} title="Admin sign in">
      <Field label="Password">
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          style={inputStyle}
          autoFocus
        />
      </Field>
      {error && <div style={{ color: '#9A2E36', fontSize: 13, marginBottom: 10 }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
        <button onClick={onClose} className="lgaroom-btn-secondary" style={secondaryButtonStyle}>Cancel</button>
        <button onClick={submit} disabled={submitting} className="lgaroom-btn-primary" style={primaryButtonStyle}>
          {submitting ? 'Checking…' : 'Sign in'}
        </button>
      </div>
    </ModalShell>
  );
}

type AdminSettings = {
  storage: { type: string; configured: boolean };
  email: { configured: boolean; adminEmail: string; fromEmail: string };
};

function AdminSettingsModal({ adminPassword, onClose }: { adminPassword: string; onClose: () => void }) {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/lga-room/admin/settings', { headers: { 'x-admin-password': adminPassword } })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Could not load settings.');
        if (!cancelled) setSettings(data);
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load settings.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [adminPassword]);

  async function handleDownload() {
    setDownloading(true);
    setError('');
    try {
      const response = await fetch('/api/lga-room/admin/export', { headers: { 'x-admin-password': adminPassword } });
      if (!response.ok) throw new Error('Could not download reservations.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'lga-room-reservations.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download reservations.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <ModalShell onClose={onClose} title="Admin settings">
      <div style={{ marginBottom: 18 }}>
        <SectionLabel>Reservation data</SectionLabel>
        <button onClick={handleDownload} disabled={downloading} className="lgaroom-btn-secondary" style={secondaryButtonStyle}>
          {downloading ? 'Preparing…' : 'Download reservations (.csv)'}
        </button>
      </div>

      {loading && <div style={{ fontSize: 13, color: textMuted }}>Loading settings…</div>}
      {error && <div style={{ color: '#9A2E36', fontSize: 13, marginBottom: 10 }}>{error}</div>}

      {settings && (
        <>
          <div style={{ marginBottom: 18 }}>
            <SectionLabel>Storage</SectionLabel>
            <StatusRow label={settings.storage.type} ok={settings.storage.configured} />
          </div>

          <div>
            <SectionLabel>Email notifications</SectionLabel>
            <StatusRow label={settings.email.configured ? 'Sending is configured' : 'Sending is not configured'} ok={settings.email.configured} />
            <div style={{ fontSize: 13, lineHeight: 1.8, marginTop: 8, color: text }}>
              <div>New requests notify: <strong>{settings.email.adminEmail}</strong></div>
              <div>Sent from: <strong>{settings.email.fromEmail}</strong></div>
              <div style={{ color: textMuted, marginTop: 6 }}>
                Submitting a request emails the admin address above. Approving or not approving a request emails the person who requested it.
              </div>
            </div>
          </div>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
        <button onClick={onClose} className="lgaroom-btn-secondary" style={secondaryButtonStyle}>Close</button>
      </div>
    </ModalShell>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8, color: textMuted }}>
      {children}
    </div>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: ok ? '#1F7A4D' : '#9A2E36', flexShrink: 0 }} />
      {label}
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(32,36,31,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}
    >
      <div onClick={e => e.stopPropagation()} className={publicSans.className} style={{ background: surface, borderRadius: 14, padding: 22, width: '100%', maxWidth: 380, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(32,36,31,0.28)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className={archivo.className} style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" className="lgaroom-closebtn" style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: textMuted, width: 26, height: 26, borderRadius: 6 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 12, flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 5, color: textMuted }}>{label}</div>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: `1px solid ${border}`,
  borderRadius: 8,
  padding: '9px 10px',
  fontSize: 14,
  fontFamily: 'inherit',
  color: text,
  boxSizing: 'border-box',
};

const primaryButtonStyle: React.CSSProperties = {
  background: accent,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '9px 16px',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 13,
  fontFamily: 'inherit',
};

const secondaryButtonStyle: React.CSSProperties = {
  background: surface,
  color: text,
  border: `1px solid ${border}`,
  borderRadius: 8,
  padding: '9px 16px',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 13,
  fontFamily: 'inherit',
};

const lgaRoomStyles = `
  .lgaroom-daycell { transition: background-color 0.12s ease; }
  .lgaroom-daycell:hover { background-color: ${accentTint}; }
  .lgaroom-chip { transition: background-color 0.12s ease; }
  .lgaroom-chip:hover { background-color: rgba(44,74,82,0.08) !important; }
  .lgaroom-navbtn:hover { background-color: ${accentTint} !important; }
  .lgaroom-addbtn:hover { background-color: rgba(44,74,82,0.1) !important; color: ${accentStrong} !important; }
  .lgaroom-btn-primary:hover { background-color: ${accentStrong} !important; }
  .lgaroom-btn-secondary:hover { background-color: ${accentTint} !important; }
  .lgaroom-closebtn:hover { background-color: ${accentTint} !important; }
  .lgaroom-fab:hover { background-color: ${accentStrong} !important; }
  input:focus-visible, select:focus-visible, textarea:focus-visible,
  button:focus-visible {
    outline: 2px solid ${accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    .lgaroom-daycell, .lgaroom-chip { transition: none; }
  }
`;
