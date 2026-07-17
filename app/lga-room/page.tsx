'use client';

import { useEffect, useMemo, useState } from 'react';

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

const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
const green = '#1e7d34';
const amber = '#92400e';
const navy = '#2d3b45';
const border = '#d8dde3';

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

function statusColors(status: ReservationStatus) {
  if (status === 'approved') return { bg: '#e6f4ea', fg: green, border: '#bfe3cb' };
  if (status === 'denied') return { bg: '#f1f2f4', fg: '#6b7780', border: '#dadfe3' };
  return { bg: '#fff4e0', fg: amber, border: '#f3ddac' };
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
    <main style={{ minHeight: '100vh', background: '#f4f6f8', fontFamily: font, color: navy, paddingBottom: 64 }}>
      <header style={{ background: green, color: '#fff', padding: '12px 24px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <h1 style={{ fontSize: 19, margin: 0 }}>{ROOM_NAME} Reservations</h1>
          <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
            Requests are marked pending until approved. Room hours: {formatTimeLabel(ROOM_OPEN_TIME)} – {formatTimeLabel(ROOM_CLOSE_TIME)}.
          </div>
        </div>
      </header>

      <section style={{ maxWidth: 820, margin: '0 auto', padding: '14px 16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              style={navButtonStyle}
            >
              ‹
            </button>
            <div style={{ fontSize: 15, fontWeight: 700, minWidth: 130, textAlign: 'center' }}>
              {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </div>
            <button
              onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              style={navButtonStyle}
            >
              ›
            </button>
            <button
              onClick={() => setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
              style={{ ...navButtonStyle, width: 'auto', padding: '0 10px', fontSize: 12 }}
            >
              Today
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
            <Legend color={statusColors('pending')} label="Pending" />
            <Legend color={statusColors('approved')} label="Approved" />
            {adminMode && <Legend color={statusColors('denied')} label="Not approved" />}
          </div>
        </div>

        {loadError && <div style={{ color: '#b42318', fontSize: 13, marginBottom: 12 }}>{loadError}</div>}

        <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: '#eef1f3' }}>
            {WEEKDAY_LABELS.map(label => (
              <div key={label} style={{ padding: '5px 8px', fontSize: 11, fontWeight: 700, color: '#6b7780' }}>
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
                    style={{
                      minHeight: 76,
                      borderRight: `1px solid ${border}`,
                      padding: 4,
                      opacity: inMonth ? 1 : 0.4,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: isToday ? 800 : 500,
                          color: isToday ? '#fff' : navy,
                          background: isToday ? green : 'transparent',
                          borderRadius: '50%',
                          width: 17,
                          height: 17,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {date.getDate()}
                      </span>
                      <button
                        onClick={() => setRequestDate(dateStr)}
                        title="Request this room"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#8a949c',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 700,
                          lineHeight: 1,
                          padding: 2,
                        }}
                      >
                        +
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', maxHeight: 46 }}>
                      {dayReservations.map(r => {
                        const colors = statusColors(r.status);
                        return (
                          <button
                            key={r.id}
                            onClick={() => setViewingReservation(r)}
                            style={{
                              textAlign: 'left',
                              fontSize: 10,
                              background: colors.bg,
                              color: colors.fg,
                              border: `1px solid ${colors.border}`,
                              borderRadius: 4,
                              padding: '1px 4px',
                              cursor: 'pointer',
                              textDecoration: r.status === 'denied' ? 'line-through' : 'none',
                            }}
                          >
                            {formatTimeLabel(r.startTime)} {r.name}
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

        {loading && <div style={{ fontSize: 13, color: '#6b7780', marginTop: 12 }}>Loading reservations…</div>}
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

      <div style={{ position: 'fixed', right: 20, bottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        {adminMode ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#fff',
              border: `1px solid ${border}`,
              borderRadius: 999,
              padding: '6px 6px 6px 14px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: green }}>Admin mode</span>
            <button onClick={logout} style={{ ...secondaryButtonStyle, padding: '6px 14px', fontSize: 12, borderRadius: 999 }}>
              Log out
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAdminLogin(true)}
            title="Admin"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: 'none',
              background: '#2d3b45',
              color: '#fff',
              fontSize: 18,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
            }}
          >
            🔒
          </button>
        )}
      </div>
    </main>
  );
}

const navButtonStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 6,
  border: `1px solid ${border}`,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 14,
};

function Legend({ color, label }: { color: { bg: string; fg: string; border: string }; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color.fg, display: 'inline-block' }} />
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
      <div style={{ fontSize: 13, color: '#6b7780', marginBottom: 14 }}>{dateLabel}</div>

      {approvedForDay.length > 0 && (
        <div style={{ background: '#f4f6f8', border: `1px solid ${border}`, borderRadius: 6, padding: 10, marginBottom: 14, fontSize: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Already booked this day:</div>
          {approvedForDay.map(r => (
            <div key={r.id}>{formatTimeLabel(r.startTime)} – {formatTimeLabel(r.endTime)}</div>
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

      {error && <div style={{ color: '#b42318', fontSize: 13, marginBottom: 10 }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
        <button onClick={onClose} style={secondaryButtonStyle}>Cancel</button>
        <button onClick={submit} disabled={submitting} style={primaryButtonStyle}>
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
  const colors = statusColors(reservation.status);

  return (
    <ModalShell onClose={onClose} title={ROOM_NAME}>
      <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, color: colors.fg, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 4, padding: '2px 8px', marginBottom: 12, textTransform: 'capitalize' }}>
        {reservation.status === 'denied' ? 'Not approved' : reservation.status}
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.8 }}>
        <div><strong>{dateLabel}</strong></div>
        <div>{formatTimeLabel(reservation.startTime)} – {formatTimeLabel(reservation.endTime)}</div>
        <div>Requested by: {reservation.name}</div>
        {adminMode && <div>Email: {reservation.email}</div>}
        <div>Purpose: {reservation.purpose}</div>
      </div>

      {adminMode && (
        <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
          {reservation.status !== 'approved' && (
            <button onClick={() => onAction(reservation.id, 'approve')} style={{ ...primaryButtonStyle, background: green }}>Approve</button>
          )}
          {reservation.status !== 'denied' && (
            <button onClick={() => onAction(reservation.id, 'deny')} style={{ ...secondaryButtonStyle, color: '#b42318', borderColor: '#f0b4ab' }}>Not approve</button>
          )}
          <button onClick={() => onAction(reservation.id, 'delete')} style={{ ...secondaryButtonStyle, marginLeft: 'auto' }}>Delete</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <button onClick={onClose} style={secondaryButtonStyle}>Close</button>
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
      {error && <div style={{ color: '#b42318', fontSize: 13, marginBottom: 10 }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
        <button onClick={onClose} style={secondaryButtonStyle}>Cancel</button>
        <button onClick={submit} disabled={submitting} style={primaryButtonStyle}>
          {submitting ? 'Checking…' : 'Sign in'}
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 10, padding: 20, width: '100%', maxWidth: 380, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: '#6b7780' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 12, flex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: '#6b7780' }}>{label}</div>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: `1px solid ${border}`,
  borderRadius: 6,
  padding: '8px 10px',
  fontSize: 14,
  fontFamily: font,
  boxSizing: 'border-box',
};

const primaryButtonStyle: React.CSSProperties = {
  background: green,
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '9px 16px',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: 13,
};

const secondaryButtonStyle: React.CSSProperties = {
  background: '#fff',
  color: navy,
  border: `1px solid ${border}`,
  borderRadius: 6,
  padding: '9px 16px',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: 13,
};
