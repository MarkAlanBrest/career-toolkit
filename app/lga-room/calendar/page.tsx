'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Reservation } from '@/lib/lgaRoom';
import { getFederalHolidays } from '@/lib/lgaRoomHolidays';
import {
  ADMIN_STORAGE_KEY,
  Legend,
  LockIcon,
  ROOM_NAME,
  STATUS_STYLES,
  WEEKDAY_LABELS,
  accent,
  accentStrong,
  accentTint,
  archivo,
  bg,
  border,
  buildCalendarWeeks,
  formatTimeLabel,
  isSameDate,
  lgaRoomStyles,
  navButtonStyle,
  publicSans,
  secondaryButtonStyle,
  surface,
  text,
  textMuted,
  toDateStr,
} from '../shared';
import {
  AdminLoginModal,
  AdminSettingsModal,
  RequestModal,
  ReportsModal,
  ReservationDetailsModal,
} from './modals';

export default function LgaRoomCalendarPage() {
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
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [showReports, setShowReports] = useState(false);

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
    let session: { email: string; password: string };
    try {
      session = JSON.parse(stored);
    } catch {
      window.localStorage.removeItem(ADMIN_STORAGE_KEY);
      return;
    }
    fetch('/api/lga-room/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    }).then(response => {
      if (response.ok) {
        setAdminEmail(session.email);
        setAdminPassword(session.password);
        setAdminMode(true);
      } else {
        window.localStorage.removeItem(ADMIN_STORAGE_KEY);
      }
    });
  }, []);

  function logout() {
    window.localStorage.removeItem(ADMIN_STORAGE_KEY);
    setAdminEmail('');
    setAdminPassword('');
    setAdminMode(false);
  }

  const weeks = useMemo(() => buildCalendarWeeks(currentMonth), [currentMonth]);

  const holidays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const map = new Map<string, string>();
    [year - 1, year, year + 1].forEach(y => getFederalHolidays(y).forEach((name, date) => map.set(date, name)));
    return map;
  }, [currentMonth]);

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
    const headers = { 'Content-Type': 'application/json', 'x-admin-email': adminEmail, 'x-admin-password': adminPassword };
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
            Reservations are on an approval basis
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
                const holidayName = holidays.get(dateStr);

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
                      background: holidayName ? 'rgba(44,74,82,0.035)' : 'transparent',
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

                    {holidayName && (
                      <div title={holidayName} style={{ fontSize: 9.5, fontWeight: 600, color: accentStrong, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {holidayName}
                      </div>
                    )}

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
                              {formatTimeLabel(r.startTime)} {r.eventName}
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
          adminEmail={adminEmail}
          adminPassword={adminPassword}
          onClose={() => setViewingReservation(null)}
          onAction={handleReservationAction}
          onReload={loadReservations}
        />
      )}

      {showAdminLogin && (
        <AdminLoginModal
          onClose={() => setShowAdminLogin(false)}
          onSuccess={(email, password) => {
            window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify({ email, password }));
            setAdminEmail(email);
            setAdminPassword(password);
            setAdminMode(true);
            setShowAdminLogin(false);
          }}
        />
      )}

      {showAdminSettings && (
        <AdminSettingsModal adminEmail={adminEmail} adminPassword={adminPassword} onClose={() => setShowAdminSettings(false)} />
      )}

      {showReports && (
        <ReportsModal reservations={reservations} onClose={() => setShowReports(false)} />
      )}

      <div className="lgaroom-no-print" style={{ position: 'fixed', right: 20, bottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
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
            <button onClick={() => setShowReports(true)} className="lgaroom-btn-secondary" style={{ ...secondaryButtonStyle, padding: '6px 14px', fontSize: 12, borderRadius: 999 }}>
              Reports
            </button>
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
