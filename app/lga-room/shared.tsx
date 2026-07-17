import { Archivo, Public_Sans } from 'next/font/google';
import type { ReservationStatus } from '@/lib/lgaRoom';

export const archivo = Archivo({ subsets: ['latin'], weight: ['600', '700', '800'] });
export const publicSans = Public_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

export const ROOM_NAME = 'LGA Room';
export const ROOM_LOCATION = 'New Castle School of Trades — Main Campus';
export const ROOM_OPEN_TIME = '07:00';
export const ROOM_CLOSE_TIME = '21:00';
export const ADMIN_STORAGE_KEY = 'lga_room_admin_password';

// Warm paper ground with a deep teal-slate accent — kept deliberately apart from the
// pending/approved/denied semantic colors below so status is never confused with brand.
export const bg = '#F6F5F1';
export const surface = '#FFFFFF';
export const text = '#20241F';
export const textMuted = '#5C6560';
export const border = '#E2DFD5';
export const accent = '#2C4A52';
export const accentStrong = '#1F373D';
export const accentTint = '#E7EFEF';

export const STATUS_STYLES: Record<ReservationStatus, { bg: string; fg: string; border: string }> = {
  pending: { bg: '#FCF3DE', fg: '#8A5A0B', border: '#EED9A6' },
  approved: { bg: '#E4F5EA', fg: '#1F7A4D', border: '#BEE1CC' },
  denied: { bg: '#F5E9EA', fg: '#8B3A42', border: '#E3CDD0' },
};

export function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function toDateStr(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatTimeLabel(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${pad(m)} ${period}`;
}

export function formatDateLabel(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function isSameDate(a: Date, b: Date) {
  return toDateStr(a) === toDateStr(b);
}

export function buildCalendarWeeks(monthDate: Date): Date[][] {
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

export function durationHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function timeOptions(): string[] {
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

export const TIME_OPTIONS = timeOptions();

export function LockIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Legend({ color, label }: { color: { bg: string; fg: string; border: string }; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color.fg, display: 'inline-block' }} />
      {label}
    </div>
  );
}

export function ModalShell({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(32,36,31,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={publicSans.className}
        style={{ background: surface, borderRadius: 14, padding: 22, width: '100%', maxWidth: wide ? 720 : 380, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(32,36,31,0.28)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className={archivo.className} style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" className="lgaroom-closebtn" style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: textMuted, width: 26, height: 26, borderRadius: 6 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 12, flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 5, color: textMuted }}>{label}</div>
      {children}
    </label>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8, color: textMuted }}>
      {children}
    </div>
  );
}

export function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: ok ? '#1F7A4D' : '#9A2E36', flexShrink: 0 }} />
      {label}
    </div>
  );
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  border: `1px solid ${border}`,
  borderRadius: 8,
  padding: '9px 10px',
  fontSize: 14,
  fontFamily: 'inherit',
  color: text,
  boxSizing: 'border-box',
};

export const primaryButtonStyle: React.CSSProperties = {
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

export const secondaryButtonStyle: React.CSSProperties = {
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

export const navButtonStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  border: 'none',
  background: surface,
  cursor: 'pointer',
  fontSize: 15,
  color: text,
};

export const lgaRoomStyles = `
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
  .lgaroom-tab:hover { background-color: ${accentTint} !important; }
  input:focus-visible, select:focus-visible, textarea:focus-visible,
  button:focus-visible {
    outline: 2px solid ${accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    .lgaroom-daycell, .lgaroom-chip { transition: none; }
  }
  @media print {
    body * { visibility: hidden; }
    .lgaroom-print-area, .lgaroom-print-area * { visibility: visible; }
    .lgaroom-print-area { position: absolute; top: 0; left: 0; width: 100%; }
    .lgaroom-no-print { display: none !important; }
  }
`;
