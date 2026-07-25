'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Reservation } from '@/lib/lgaRoom';
import {
  Field,
  ModalShell,
  ROOM_NAME,
  SectionLabel,
  StatusRow,
  STATUS_STYLES,
  TIME_OPTIONS,
  WEEKDAY_LABELS,
  accentStrong,
  accentTint,
  border,
  buildCalendarWeeks,
  durationHours,
  formatDateLabel,
  formatTimeLabel,
  inputStyle,
  navButtonStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  surface,
  text,
  textMuted,
  toDateStr,
} from '../shared';

export function RequestModal({
  date,
  existing,
  onClose,
  onCreated,
}: {
  date: string;
  existing: Reservation[];
  onClose: () => void;
  onCreated: (reservation: Reservation, emailWarning?: string) => void;
}) {
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [eventName, setEventName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [startTime, setStartTime] = useState(TIME_OPTIONS[0]);
  const [endTime, setEndTime] = useState(TIME_OPTIONS[2] || TIME_OPTIONS[TIME_OPTIONS.length - 1]);
  const [numberOfPeople, setNumberOfPeople] = useState('1');
  const [setupRequirements, setSetupRequirements] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const dateLabel = formatDateLabel(date);
  const approvedForDay = existing.filter(r => r.status === 'approved');

  async function submit() {
    setError('');
    if (startTime >= endTime) { setError('Start time must be before end time.'); return; }
    if (!name.trim() || !email.trim() || !eventName.trim() || !purpose.trim()) {
      setError('Please fill in name, email, event name, and purpose.');
      return;
    }
    const people = Number(numberOfPeople);
    if (!Number.isInteger(people) || people < 1) { setError('Number of people must be a whole number of at least 1.'); return; }

    setSubmitting(true);
    try {
      const response = await fetch('/api/lga-room/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, startTime, endTime, name, organization, email, phone, eventName, purpose, numberOfPeople: people, setupRequirements, specialRequests }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Could not submit request.');
      const emailWarning = data.email && !data.email.sent
        ? 'Your reservation was saved, but the administrator notification email could not be sent.'
        : undefined;
      onCreated(data.reservation as Reservation, emailWarning);
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
        <div style={{ background: '#F6F5F1', border: `1px solid ${border}`, borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Already booked this day</div>
          {approvedForDay.map(r => (
            <div key={r.id} style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTimeLabel(r.startTime)} – {formatTimeLabel(r.endTime)}</div>
          ))}
        </div>
      )}

      <Field label="Name"><input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Your name" /></Field>
      <Field label="Organization"><input value={organization} onChange={e => setOrganization(e.target.value)} style={inputStyle} placeholder="Optional" /></Field>
      <Field label="Email"><input value={email} onChange={e => setEmail(e.target.value)} type="email" style={inputStyle} placeholder="you@example.com" /></Field>
      <Field label="Phone"><input value={phone} onChange={e => setPhone(e.target.value)} type="tel" style={inputStyle} placeholder="Optional" /></Field>
      <Field label="Event Name"><input value={eventName} onChange={e => setEventName(e.target.value)} style={inputStyle} placeholder="e.g. Quarterly board meeting" /></Field>
      <Field label="Purpose"><textarea value={purpose} onChange={e => setPurpose(e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} placeholder="What's this reservation for?" /></Field>

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

      <Field label="Number of People">
        <input value={numberOfPeople} onChange={e => setNumberOfPeople(e.target.value)} type="number" min={1} style={inputStyle} />
      </Field>
      <Field label="Setup Requirements">
        <textarea value={setupRequirements} onChange={e => setSetupRequirements(e.target.value)} style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} placeholder="Optional — tables, chairs, projector, etc." />
      </Field>
      <Field label="Special Requests">
        <textarea value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} placeholder="Optional" />
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

export function EditReservationModal({
  reservation,
  adminEmail,
  adminPassword,
  onClose,
  onSaved,
}: {
  reservation: Reservation;
  adminEmail: string;
  adminPassword: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(reservation.name);
  const [organization, setOrganization] = useState(reservation.organization);
  const [email, setEmail] = useState(reservation.email);
  const [phone, setPhone] = useState(reservation.phone);
  const [eventName, setEventName] = useState(reservation.eventName);
  const [purpose, setPurpose] = useState(reservation.purpose);
  const [numberOfPeople, setNumberOfPeople] = useState(String(reservation.numberOfPeople));
  const [setupRequirements, setSetupRequirements] = useState(reservation.setupRequirements);
  const [specialRequests, setSpecialRequests] = useState(reservation.specialRequests);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!name.trim() || !email.trim() || !eventName.trim() || !purpose.trim()) {
      setError('Please fill in name, email, event name, and purpose.');
      return;
    }
    const people = Number(numberOfPeople);
    if (!Number.isInteger(people) || people < 1) { setError('Number of people must be a whole number of at least 1.'); return; }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/lga-room/reservations/${reservation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-email': adminEmail, 'x-admin-password': adminPassword },
        body: JSON.stringify({ name, organization, email, phone, eventName, purpose, numberOfPeople: people, setupRequirements, specialRequests }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Could not save changes.');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell onClose={onClose} title="Edit reservation">
      <Field label="Name"><input value={name} onChange={e => setName(e.target.value)} style={inputStyle} /></Field>
      <Field label="Organization"><input value={organization} onChange={e => setOrganization(e.target.value)} style={inputStyle} /></Field>
      <Field label="Email"><input value={email} onChange={e => setEmail(e.target.value)} type="email" style={inputStyle} /></Field>
      <Field label="Phone"><input value={phone} onChange={e => setPhone(e.target.value)} type="tel" style={inputStyle} /></Field>
      <Field label="Event Name"><input value={eventName} onChange={e => setEventName(e.target.value)} style={inputStyle} /></Field>
      <Field label="Purpose"><textarea value={purpose} onChange={e => setPurpose(e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} /></Field>
      <Field label="Number of People"><input value={numberOfPeople} onChange={e => setNumberOfPeople(e.target.value)} type="number" min={1} style={inputStyle} /></Field>
      <Field label="Setup Requirements"><textarea value={setupRequirements} onChange={e => setSetupRequirements(e.target.value)} style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} /></Field>
      <Field label="Special Requests"><textarea value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} /></Field>

      {error && <div style={{ color: '#9A2E36', fontSize: 13, marginBottom: 10 }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
        <button onClick={onClose} className="lgaroom-btn-secondary" style={secondaryButtonStyle}>Cancel</button>
        <button onClick={submit} disabled={submitting} className="lgaroom-btn-primary" style={primaryButtonStyle}>
          {submitting ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </ModalShell>
  );
}

export function MoveTimeModal({
  reservation,
  adminEmail,
  adminPassword,
  onClose,
  onSaved,
}: {
  reservation: Reservation;
  adminEmail: string;
  adminPassword: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(reservation.date);
  const [startTime, setStartTime] = useState(reservation.startTime);
  const [endTime, setEndTime] = useState(reservation.endTime);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (startTime >= endTime) { setError('Start time must be before end time.'); return; }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/lga-room/reservations/${reservation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-email': adminEmail, 'x-admin-password': adminPassword },
        body: JSON.stringify({ date, startTime, endTime, notifyTimeChange: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Could not move this reservation.');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not move this reservation.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell onClose={onClose} title="Move reservation time">
      <div style={{ fontSize: 13, color: textMuted, marginBottom: 14 }}>
        {reservation.eventName} — the requester will be emailed about this change.
      </div>
      <Field label="Date"><input value={date} onChange={e => setDate(e.target.value)} type="date" style={inputStyle} /></Field>
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

      {error && <div style={{ color: '#9A2E36', fontSize: 13, marginBottom: 10 }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
        <button onClick={onClose} className="lgaroom-btn-secondary" style={secondaryButtonStyle}>Cancel</button>
        <button onClick={submit} disabled={submitting} className="lgaroom-btn-primary" style={primaryButtonStyle}>
          {submitting ? 'Saving…' : 'Move reservation'}
        </button>
      </div>
    </ModalShell>
  );
}

export function ReservationDetailsModal({
  reservation,
  adminMode,
  adminEmail,
  adminPassword,
  onClose,
  onAction,
  onReload,
}: {
  reservation: Reservation;
  adminMode: boolean;
  adminEmail: string;
  adminPassword: string;
  onClose: () => void;
  onAction: (id: string, action: 'approve' | 'deny' | 'delete') => void;
  onReload: () => void;
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [showMoveTime, setShowMoveTime] = useState(false);
  const colors = STATUS_STYLES[reservation.status];

  return (
    <>
      <ModalShell onClose={onClose} title={ROOM_NAME}>
        <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 600, color: colors.fg, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 999, padding: '3px 10px', marginBottom: 12, textTransform: 'capitalize' }}>
          {reservation.status === 'denied' ? 'Not approved' : reservation.status}
        </div>

        <div style={{ fontSize: 14, lineHeight: 1.8 }}>
          <div><strong>{reservation.eventName}</strong></div>
          <div>{formatDateLabel(reservation.date)}</div>
          <div style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTimeLabel(reservation.startTime)} – {formatTimeLabel(reservation.endTime)}</div>
          <div>Requested by: {reservation.name}{reservation.organization ? ` (${reservation.organization})` : ''}</div>
          {adminMode && <div>Email: {reservation.email}</div>}
          {adminMode && reservation.phone && <div>Phone: {reservation.phone}</div>}
          <div>Number of people: {reservation.numberOfPeople}</div>
          <div>Purpose: {reservation.purpose}</div>
          {reservation.setupRequirements && <div>Setup requirements: {reservation.setupRequirements}</div>}
          {reservation.specialRequests && <div>Special requests: {reservation.specialRequests}</div>}
        </div>

        {adminMode && (
          <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            {reservation.status !== 'approved' && (
              <button onClick={() => onAction(reservation.id, 'approve')} className="lgaroom-btn-primary" style={primaryButtonStyle}>Approve</button>
            )}
            {reservation.status !== 'denied' && (
              <button onClick={() => onAction(reservation.id, 'deny')} className="lgaroom-btn-secondary" style={{ ...secondaryButtonStyle, color: '#9A2E36', borderColor: '#E3B7BB' }}>Not approve</button>
            )}
            <button onClick={() => setShowEdit(true)} className="lgaroom-btn-secondary" style={secondaryButtonStyle}>Edit</button>
            <button onClick={() => setShowMoveTime(true)} className="lgaroom-btn-secondary" style={secondaryButtonStyle}>Move time</button>
            <button onClick={() => onAction(reservation.id, 'delete')} className="lgaroom-btn-secondary" style={{ ...secondaryButtonStyle, marginLeft: 'auto' }}>Delete</button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <button onClick={onClose} className="lgaroom-btn-secondary" style={secondaryButtonStyle}>Close</button>
        </div>
      </ModalShell>

      {showEdit && (
        <EditReservationModal
          reservation={reservation}
          adminEmail={adminEmail}
          adminPassword={adminPassword}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); onReload(); onClose(); }}
        />
      )}

      {showMoveTime && (
        <MoveTimeModal
          reservation={reservation}
          adminEmail={adminEmail}
          adminPassword={adminPassword}
          onClose={() => setShowMoveTime(false)}
          onSaved={() => { setShowMoveTime(false); onReload(); onClose(); }}
        />
      )}
    </>
  );
}

export function AdminLoginModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (email: string, password: string) => void }) {
  const [email, setEmail] = useState('');
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
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error('Incorrect email or password.');
      onSuccess(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect email or password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell onClose={onClose} title="Admin sign in">
      <Field label="Email">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          style={inputStyle}
          autoFocus
        />
      </Field>
      <Field label="Password">
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          style={inputStyle}
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

type AdminSettingsData = {
  storage: { configured: boolean };
  email: {
    configured: boolean;
    fromEmail: string | null;
    provider: string;
    configurationError?: string | null;
    fromEmailInvalid: boolean;
    usingTestSender: boolean;
  };
  notify: { adminNotifyEmail: string; buildingManagerEmail: string; maintenanceEmail: string };
  sender: {
    email: string;
    name: string;
    replyToEmail: string;
    microsoftTenantId: string;
    microsoftClientId: string;
    microsoftClientSecretSet: boolean;
  };
};

type AdminListEntry = { email: string; createdAt: string };

export function AdminSettingsModal({ adminEmail, adminPassword, onClose }: { adminEmail: string; adminPassword: string; onClose: () => void }) {
  const authHeaders = { 'x-admin-email': adminEmail, 'x-admin-password': adminPassword };

  const [settings, setSettings] = useState<AdminSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [adminNotifyEmail, setAdminNotifyEmail] = useState('');
  const [buildingManagerEmail, setBuildingManagerEmail] = useState('');
  const [maintenanceEmail, setMaintenanceEmail] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [replyToEmail, setReplyToEmail] = useState('');
  const [microsoftTenantId, setMicrosoftTenantId] = useState('');
  const [microsoftClientId, setMicrosoftClientId] = useState('');
  const [microsoftClientSecret, setMicrosoftClientSecret] = useState('');
  const [microsoftClientSecretSet, setMicrosoftClientSecretSet] = useState(false);
  const [editingMicrosoftSettings, setEditingMicrosoftSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState('');

  const [admins, setAdmins] = useState<AdminListEntry[] | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminsError, setAdminsError] = useState('');

  function loadAdmins() {
    fetch('/api/lga-room/admin/accounts', { headers: authHeaders })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Could not load admins.');
        setAdmins(data.admins || []);
      })
      .catch(err => setAdminsError(err instanceof Error ? err.message : 'Could not load admins.'));
  }

  useEffect(() => {
    let cancelled = false;
    fetch('/api/lga-room/admin/settings', { headers: authHeaders })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Could not load settings.');
        if (!cancelled) {
          setSettings(data);
          setAdminNotifyEmail(data.notify?.adminNotifyEmail || '');
          setBuildingManagerEmail(data.notify?.buildingManagerEmail || '');
          setMaintenanceEmail(data.notify?.maintenanceEmail || '');
          setSenderEmail(data.sender?.email || '');
          setSenderName(data.sender?.name || '');
          setReplyToEmail(data.sender?.replyToEmail || '');
          setMicrosoftTenantId(data.sender?.microsoftTenantId || '');
          setMicrosoftClientId(data.sender?.microsoftClientId || '');
          setMicrosoftClientSecretSet(Boolean(data.sender?.microsoftClientSecretSet));
        }
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load settings.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    loadAdmins();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminEmail, adminPassword]);

  async function handleDownload() {
    setDownloading(true);
    setError('');
    try {
      const response = await fetch('/api/lga-room/admin/export', { headers: authHeaders });
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

  async function handleSaveNotify() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const response = await fetch('/api/lga-room/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          adminNotifyEmail,
          buildingManagerEmail,
          maintenanceEmail,
          senderEmail,
          senderName,
          replyToEmail,
          microsoftTenantId,
          microsoftClientId,
          microsoftClientSecret,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Could not save settings.');
      setMicrosoftClientSecretSet(Boolean(data.sender?.microsoftClientSecretSet));
      setMicrosoftClientSecret('');
      setEditingMicrosoftSettings(false);
      setSettings(prev => prev ? {
        ...prev,
        sender: {
          email: senderEmail,
          name: senderName,
          replyToEmail,
          microsoftTenantId,
          microsoftClientId,
          microsoftClientSecretSet: Boolean(data.sender?.microsoftClientSecretSet),
        },
        email: {
          ...prev.email,
          configured: Boolean(
            senderEmail && microsoftTenantId && microsoftClientId &&
            (microsoftClientSecret || microsoftClientSecretSet)
          ) || prev.email.configured,
          provider: senderEmail && microsoftTenantId && microsoftClientId
            ? 'Microsoft 365'
            : prev.email.provider,
          fromEmail: senderEmail
            ? `${senderName || ROOM_NAME + ' Reservations'} <${senderEmail}>`
            : prev.email.fromEmail,
        },
      } : prev);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestEmail() {
    setTestingEmail(true);
    setError('');
    setTestEmailResult('');
    try {
      // Testing always uses server-side settings, so save the values currently visible
      // in the form first. This prevents an apparently filled form from testing stale data.
      const saveResponse = await fetch('/api/lga-room/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          adminNotifyEmail,
          buildingManagerEmail,
          maintenanceEmail,
          senderEmail,
          senderName,
          replyToEmail,
          microsoftTenantId,
          microsoftClientId,
          microsoftClientSecret,
        }),
      });
      const saveData = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saveData?.error || 'Could not save email settings.');
      setMicrosoftClientSecretSet(Boolean(saveData.sender?.microsoftClientSecretSet));
      setMicrosoftClientSecret('');
      setEditingMicrosoftSettings(false);
      setSaved(true);

      const response = await fetch('/api/lga-room/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ email: adminNotifyEmail }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'The test email failed.');
      setTestEmailResult(`Test email sent to ${adminNotifyEmail}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The test email failed.');
    } finally {
      setTestingEmail(false);
    }
  }

  async function handleAddAdmin() {
    setAddingAdmin(true);
    setAdminsError('');
    try {
      const response = await fetch('/api/lga-room/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ email: newAdminEmail, password: newAdminPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Could not add this admin.');
      setNewAdminEmail('');
      setNewAdminPassword('');
      loadAdmins();
    } catch (err) {
      setAdminsError(err instanceof Error ? err.message : 'Could not add this admin.');
    } finally {
      setAddingAdmin(false);
    }
  }

  async function handleRemoveAdmin(email: string) {
    setAdminsError('');
    try {
      const response = await fetch(`/api/lga-room/admin/accounts?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Could not remove this admin.');
      loadAdmins();
    } catch (err) {
      setAdminsError(err instanceof Error ? err.message : 'Could not remove this admin.');
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
            <SectionLabel>System status</SectionLabel>
            <StatusRow label={settings.storage.configured ? 'Reservations are saving correctly' : 'Reservations are not being saved — contact your developer'} ok={settings.storage.configured} />
            <div style={{ marginTop: 6 }}>
              <StatusRow
                label={
                  !settings.email.configured
                    ? settings.email.configurationError || 'Email sending is not set up yet'
                    : settings.email.fromEmailInvalid
                      ? 'Email sending address looks incorrect — contact your developer'
                      : settings.email.usingTestSender
                        ? 'Test sender only — emails to other recipients will be rejected'
                        : `${settings.email.provider} is configured — use the test below to verify delivery`
                }
                ok={settings.email.configured && !settings.email.fromEmailInvalid && !settings.email.usingTestSender}
              />
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <SectionLabel>School Outlook sender</SectionLabel>
            <div style={{ fontSize: 12.5, color: textMuted, marginBottom: 10 }}>
              Send reservation messages from a school Microsoft 365 mailbox. Your school IT
              administrator must create an Entra app with Microsoft Graph <strong>Mail.Send</strong> application
              permission, grant admin consent, and scope it to this mailbox. The client secret is saved
              server-side and is never shown again. Microsoft uses the mailbox&apos;s directory display name on sent mail.
            </div>
            {!editingMicrosoftSettings && (
              <button
                type="button"
                onClick={() => setEditingMicrosoftSettings(true)}
                className="lgaroom-btn-secondary"
                style={{ ...secondaryButtonStyle, marginBottom: 12 }}
              >
                Edit Microsoft settings
              </button>
            )}
            <Field label="Sender email">
              <input value={senderEmail} onChange={e => setSenderEmail(e.target.value)} type="email" style={inputStyle} placeholder="lgaroom@yourschool.edu" readOnly={!editingMicrosoftSettings} />
            </Field>
            <Field label="Display name label (optional)">
              <input value={senderName} onChange={e => setSenderName(e.target.value)} type="text" style={inputStyle} placeholder={`${ROOM_NAME} Reservations`} readOnly={!editingMicrosoftSettings} />
            </Field>
            <Field label="Microsoft tenant ID">
              <input
                value={microsoftTenantId}
                onChange={e => setMicrosoftTenantId(e.target.value.replace(/[^0-9a-f-]/gi, '').slice(0, 36))}
                type="text"
                name="microsoft-directory-tenant-id"
                style={inputStyle}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                autoComplete="one-time-code"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={36}
                data-lpignore="true"
                data-1p-ignore
                readOnly={!editingMicrosoftSettings}
              />
            </Field>
            <Field label="Application (client) ID">
              <input
                value={microsoftClientId}
                onChange={e => setMicrosoftClientId(e.target.value.replace(/[^0-9a-f-]/gi, '').slice(0, 36))}
                type="text"
                name="microsoft-application-client-id"
                style={inputStyle}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                autoComplete="one-time-code"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={36}
                data-lpignore="true"
                data-1p-ignore
                readOnly={!editingMicrosoftSettings}
              />
            </Field>
            <Field label={`Client secret${microsoftClientSecretSet ? ' (saved — leave blank to keep it)' : ''}`}>
              <input
                value={microsoftClientSecret}
                onChange={e => setMicrosoftClientSecret(e.target.value)}
                type="password"
                name="microsoft-application-client-secret-value"
                style={inputStyle}
                placeholder={microsoftClientSecretSet ? '••••••••••••' : 'secret value'}
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore
                readOnly={!editingMicrosoftSettings}
              />
            </Field>
            <Field label="Replies go to (optional)">
              <input value={replyToEmail} onChange={e => setReplyToEmail(e.target.value)} type="email" style={inputStyle} placeholder="leave blank to reply to the sender mailbox" readOnly={!editingMicrosoftSettings} />
            </Field>
            {editingMicrosoftSettings && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={handleSaveNotify} disabled={saving} className="lgaroom-btn-primary" style={primaryButtonStyle}>
                  {saving ? 'Saving…' : 'Save Microsoft settings'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSenderEmail(settings.sender.email || '');
                    setSenderName(settings.sender.name || '');
                    setReplyToEmail(settings.sender.replyToEmail || '');
                    setMicrosoftTenantId(settings.sender.microsoftTenantId || '');
                    setMicrosoftClientId(settings.sender.microsoftClientId || '');
                    setMicrosoftClientSecret('');
                    setEditingMicrosoftSettings(false);
                  }}
                  disabled={saving}
                  className="lgaroom-btn-secondary"
                  style={secondaryButtonStyle}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 18 }}>
            <SectionLabel>Notification emails</SectionLabel>
            <div style={{ fontSize: 12.5, color: textMuted, marginBottom: 10 }}>
              Who gets emailed, and when. Leave any of these blank to turn that email off.
            </div>
            <Field label="New request alerts (you)">
              <input value={adminNotifyEmail} onChange={e => setAdminNotifyEmail(e.target.value)} type="email" style={inputStyle} placeholder="you@example.com" />
            </Field>
            <Field label="Building Manager (on approval)">
              <input value={buildingManagerEmail} onChange={e => setBuildingManagerEmail(e.target.value)} type="email" style={inputStyle} placeholder="manager@example.com" />
            </Field>
            <Field label="Maintenance (on approval)">
              <input value={maintenanceEmail} onChange={e => setMaintenanceEmail(e.target.value)} type="email" style={inputStyle} placeholder="maintenance@example.com" />
            </Field>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={handleSaveNotify} disabled={saving} className="lgaroom-btn-primary" style={primaryButtonStyle}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={handleTestEmail} disabled={testingEmail || !adminNotifyEmail} className="lgaroom-btn-secondary" style={secondaryButtonStyle}>
                {testingEmail ? 'Sending test…' : 'Send test email'}
              </button>
              {saved && <span style={{ fontSize: 12.5, color: '#1F7A4D' }}>Saved</span>}
            </div>
            {testEmailResult && <div style={{ marginTop: 8, fontSize: 12.5, color: '#1F7A4D' }}>{testEmailResult}</div>}
          </div>

          <div>
            <SectionLabel>Admins</SectionLabel>
            <div style={{ fontSize: 12.5, color: textMuted, marginBottom: 10 }}>
              Anyone listed here can sign in and manage reservations.
            </div>

            {adminsError && <div style={{ color: '#9A2E36', fontSize: 13, marginBottom: 10 }}>{adminsError}</div>}

            {admins && admins.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {admins.map(a => (
                  <div key={a.email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${border}`, fontSize: 13.5 }}>
                    <span>{a.email}</span>
                    <button
                      onClick={() => handleRemoveAdmin(a.email)}
                      className="lgaroom-btn-secondary"
                      style={{ ...secondaryButtonStyle, padding: '4px 10px', fontSize: 12, color: '#9A2E36', borderColor: '#E3B7BB' }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            {admins && admins.length === 0 && (
              <div style={{ fontSize: 13, color: textMuted, marginBottom: 12 }}>No admins added yet.</div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <Field label="Email">
                <input value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} type="email" style={inputStyle} placeholder="new.admin@example.com" />
              </Field>
              <Field label="Password">
                <input value={newAdminPassword} onChange={e => setNewAdminPassword(e.target.value)} type="password" style={inputStyle} placeholder="At least 8 characters" />
              </Field>
            </div>
            <button onClick={handleAddAdmin} disabled={addingAdmin || !newAdminEmail || !newAdminPassword} className="lgaroom-btn-secondary" style={secondaryButtonStyle}>
              {addingAdmin ? 'Adding…' : 'Add admin'}
            </button>
          </div>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
        <button onClick={onClose} className="lgaroom-btn-secondary" style={secondaryButtonStyle}>Close</button>
      </div>
    </ModalShell>
  );
}

function ReportTable({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  if (!rows.length) return <div style={{ fontSize: 13, color: textMuted }}>Nothing to show.</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c} style={{ textAlign: 'left', padding: '6px 10px', borderBottom: `2px solid ${border}`, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: textMuted }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${border}` }}>
              {row.map((cell, j) => <td key={j} style={{ padding: '7px 10px', verticalAlign: 'top' }}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TodayReport({ reservations, todayStr }: { reservations: Reservation[]; todayStr: string }) {
  const rows = reservations
    .filter(r => r.status === 'approved' && r.date === todayStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map(r => [`${formatTimeLabel(r.startTime)} – ${formatTimeLabel(r.endTime)}`, r.eventName, r.organization || '—', r.numberOfPeople]);
  return <ReportTable columns={['Time', 'Event', 'Organization', 'People']} rows={rows} />;
}

function UpcomingReport({ reservations, todayStr }: { reservations: Reservation[]; todayStr: string }) {
  const [days, setDays] = useState<7 | 30>(7);
  const endStr = useMemo(() => {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    return toDateStr(endDate);
  }, [days]);

  const rows = reservations
    .filter(r => r.status === 'approved' && r.date >= todayStr && r.date <= endStr)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .map(r => [formatDateLabel(r.date), `${formatTimeLabel(r.startTime)} – ${formatTimeLabel(r.endTime)}`, r.eventName, r.organization || '—']);

  return (
    <div>
      <div className="lgaroom-no-print" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[7, 30].map(d => (
          <button
            key={d}
            onClick={() => setDays(d as 7 | 30)}
            className="lgaroom-tab"
            style={{
              border: `1px solid ${border}`,
              background: days === d ? accentTint : surface,
              color: days === d ? accentStrong : text,
              borderRadius: 6,
              padding: '5px 12px',
              fontSize: 12.5,
              cursor: 'pointer',
              fontWeight: days === d ? 700 : 500,
            }}
          >
            Next {d} days
          </button>
        ))}
      </div>
      <ReportTable columns={['Date', 'Time', 'Event', 'Organization']} rows={rows} />
    </div>
  );
}

function PendingReport({ reservations }: { reservations: Reservation[] }) {
  const rows = reservations
    .filter(r => r.status === 'pending')
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .map(r => [formatDateLabel(r.date), `${formatTimeLabel(r.startTime)} – ${formatTimeLabel(r.endTime)}`, r.eventName, r.name, r.organization || '—']);
  return <ReportTable columns={['Date', 'Time', 'Event', 'Requested By', 'Organization']} rows={rows} />;
}

function UsageReport({ reservations }: { reservations: Reservation[] }) {
  const byMonth = new Map<string, { count: number; hours: number }>();
  reservations.filter(r => r.status === 'approved').forEach(r => {
    const month = r.date.slice(0, 7);
    const entry = byMonth.get(month) || { count: 0, hours: 0 };
    entry.count += 1;
    entry.hours += durationHours(r.startTime, r.endTime);
    byMonth.set(month, entry);
  });
  const rows = Array.from(byMonth.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, entry]) => [
      new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      entry.count,
      entry.hours.toFixed(1),
    ]);
  return <ReportTable columns={['Month', 'Reservations', 'Total Hours']} rows={rows} />;
}

function OrganizationReport({ reservations }: { reservations: Reservation[] }) {
  const byOrg = new Map<string, { count: number; hours: number }>();
  reservations.filter(r => r.status === 'approved').forEach(r => {
    const org = r.organization || 'Individual (no organization)';
    const entry = byOrg.get(org) || { count: 0, hours: 0 };
    entry.count += 1;
    entry.hours += durationHours(r.startTime, r.endTime);
    byOrg.set(org, entry);
  });
  const rows = Array.from(byOrg.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([org, entry]) => [org, entry.count, entry.hours.toFixed(1)]);
  return <ReportTable columns={['Organization', 'Reservations', 'Total Hours']} rows={rows} />;
}

function SetupReport({ reservations, todayStr }: { reservations: Reservation[]; todayStr: string }) {
  const rows = reservations
    .filter(r => r.status === 'approved' && r.date >= todayStr && r.setupRequirements)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(r => [formatDateLabel(r.date), `${formatTimeLabel(r.startTime)} – ${formatTimeLabel(r.endTime)}`, r.eventName, r.setupRequirements, r.specialRequests || '—']);
  return <ReportTable columns={['Date', 'Time', 'Event', 'Setup Requirements', 'Special Requests']} rows={rows} />;
}

function MonthlyReport({ reservations }: { reservations: Reservation[] }) {
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const weeks = useMemo(() => buildCalendarWeeks(month), [month]);
  const byDate = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    reservations.filter(r => r.status === 'approved').forEach(r => {
      const list = map.get(r.date) || [];
      list.push(r);
      map.set(r.date, list);
    });
    map.forEach(list => list.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return map;
  }, [reservations]);

  return (
    <div>
      <div className="lgaroom-no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="lgaroom-navbtn" style={{ ...navButtonStyle, border: `1px solid ${border}`, borderRadius: 6 }}>‹</button>
        <div style={{ fontWeight: 700, minWidth: 140 }}>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>
        <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="lgaroom-navbtn" style={{ ...navButtonStyle, border: `1px solid ${border}`, borderRadius: 6 }}>›</button>
        <button onClick={() => window.print()} className="lgaroom-btn-secondary" style={{ ...secondaryButtonStyle, marginLeft: 'auto' }}>Print</button>
      </div>

      <div className="lgaroom-print-area" style={{ border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: accentTint }}>
          {WEEKDAY_LABELS.map(l => <div key={l} style={{ padding: '6px 8px', fontSize: 11, fontWeight: 600, color: accentStrong }}>{l}</div>)}
        </div>
        {weeks.map((week, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderTop: i === 0 ? 'none' : `1px solid ${border}` }}>
            {week.map(date => {
              const dateStr = toDateStr(date);
              const inMonth = date.getMonth() === month.getMonth();
              const dayReservations = byDate.get(dateStr) || [];
              return (
                <div key={dateStr} style={{ minHeight: 70, borderRight: `1px solid ${border}`, padding: 4, opacity: inMonth ? 1 : 0.4 }}>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{date.getDate()}</div>
                  {dayReservations.map(r => (
                    <div key={r.id} style={{ fontSize: 9.5, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {formatTimeLabel(r.startTime)} {r.eventName}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

type ReportTab = 'today' | 'upcoming' | 'pending' | 'monthly' | 'usage' | 'organization' | 'setup';

const REPORT_TABS: { id: ReportTab; label: string }[] = [
  { id: 'today', label: "Today's Schedule" },
  { id: 'upcoming', label: 'Upcoming Reservations' },
  { id: 'pending', label: 'Pending Approval' },
  { id: 'monthly', label: 'Monthly Calendar' },
  { id: 'usage', label: 'Room Usage' },
  { id: 'organization', label: 'By Organization' },
  { id: 'setup', label: 'Setup Requirements' },
];

export function ReportsModal({ reservations, onClose }: { reservations: Reservation[]; onClose: () => void }) {
  const [tab, setTab] = useState<ReportTab>('today');
  const todayStr = toDateStr(new Date());

  return (
    <ModalShell onClose={onClose} title="Reports" wide>
      <div className="lgaroom-no-print" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, borderBottom: `1px solid ${border}`, paddingBottom: 12 }}>
        {REPORT_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="lgaroom-tab"
            style={{
              border: 'none',
              background: tab === t.id ? accentTint : 'transparent',
              color: tab === t.id ? accentStrong : textMuted,
              fontWeight: tab === t.id ? 700 : 500,
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12.5,
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'today' && <TodayReport reservations={reservations} todayStr={todayStr} />}
      {tab === 'upcoming' && <UpcomingReport reservations={reservations} todayStr={todayStr} />}
      {tab === 'pending' && <PendingReport reservations={reservations} />}
      {tab === 'monthly' && <MonthlyReport reservations={reservations} />}
      {tab === 'usage' && <UsageReport reservations={reservations} />}
      {tab === 'organization' && <OrganizationReport reservations={reservations} />}
      {tab === 'setup' && <SetupReport reservations={reservations} todayStr={todayStr} />}

      <div className="lgaroom-no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
        <button onClick={onClose} className="lgaroom-btn-secondary" style={secondaryButtonStyle}>Close</button>
      </div>
    </ModalShell>
  );
}
