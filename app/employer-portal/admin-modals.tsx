'use client';

import { useEffect, useRef, useState } from 'react';
import { AdminLoginModal } from '../lga-room/calendar/modals';
import {
  Field,
  ModalShell,
  SectionLabel,
  StatusRow,
  border,
  inputStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  textMuted,
  surface,
  accentStrong,
} from '../lga-room/shared';

export { AdminLoginModal };

type NotificationRecipients = {
  applicantRequest: string[];
  jobPosting: string[];
  general: string[];
};

const EMPTY_NOTIFICATION_RECIPIENTS: NotificationRecipients = {
  applicantRequest: [],
  jobPosting: [],
  general: [],
};

const NOTIFICATION_TYPES: Array<{
  key: keyof NotificationRecipients;
  title: string;
  description: string;
}> = [
  {
    key: 'applicantRequest',
    title: 'Applicant requests',
    description: 'Sent when an employer requests students or graduates through the portal.',
  },
  {
    key: 'jobPosting',
    title: 'Job openings',
    description: 'Sent when an employer submits a job posting to Career Services.',
  },
  {
    key: 'general',
    title: 'General employer inquiries',
    description: 'Sent for other employer portal requests and Career Services messages.',
  },
];

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
  notify: { recipients: NotificationRecipients };
  sender: {
    email: string;
    name: string;
    replyToEmail: string;
    microsoftTenantId: string;
    microsoftClientId: string;
    microsoftConnected: boolean;
    microsoftConnectedAt: string | null;
  };
};

type AdminListEntry = { email: string; createdAt: string };

export function EmployerAdminSettingsModal({
  adminEmail,
  adminPassword,
  onClose,
}: {
  adminEmail: string;
  adminPassword: string;
  onClose: () => void;
}) {
  const authHeaders = { 'x-admin-email': adminEmail, 'x-admin-password': adminPassword };
  const settingsUrl = '/api/employer-portal/admin/settings';

  const [settings, setSettings] = useState<AdminSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notificationRecipients, setNotificationRecipients] = useState<NotificationRecipients>(EMPTY_NOTIFICATION_RECIPIENTS);
  const [recipientDrafts, setRecipientDrafts] = useState<Record<keyof NotificationRecipients, string>>({
    applicantRequest: '',
    jobPosting: '',
    general: '',
  });
  const [testEmail, setTestEmail] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [replyToEmail, setReplyToEmail] = useState('');
  const [microsoftTenantId, setMicrosoftTenantId] = useState('');
  const [microsoftClientId, setMicrosoftClientId] = useState('');
  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [connectingMicrosoft, setConnectingMicrosoft] = useState(false);
  const [microsoftConnectInfo, setMicrosoftConnectInfo] = useState<{ userCode: string; verificationUri: string } | null>(null);
  const microsoftConnectRun = useRef(0);
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
    fetch(settingsUrl, { headers: authHeaders })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Could not load settings.');
        if (!cancelled) {
          setSettings(data);
          setNotificationRecipients(data.notify?.recipients || EMPTY_NOTIFICATION_RECIPIENTS);
          setSenderEmail(data.sender?.email || '');
          setSenderName(data.sender?.name || '');
          setReplyToEmail(data.sender?.replyToEmail || '');
          setMicrosoftTenantId(data.sender?.microsoftTenantId || '');
          setMicrosoftClientId(data.sender?.microsoftClientId || '');
          setMicrosoftConnected(Boolean(data.sender?.microsoftConnected));
        }
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load settings.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    loadAdmins();
    return () => {
      cancelled = true;
      microsoftConnectRun.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminEmail, adminPassword]);

  function addNotificationRecipient(type: keyof NotificationRecipients) {
    const email = recipientDrafts[type].trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address before adding it.');
      return;
    }
    setNotificationRecipients(current => ({
      ...current,
      [type]: current[type].includes(email) ? current[type] : [...current[type], email],
    }));
    setRecipientDrafts(current => ({ ...current, [type]: '' }));
    setError('');
    setSaved(false);
  }

  function removeNotificationRecipient(type: keyof NotificationRecipients, email: string) {
    setNotificationRecipients(current => ({
      ...current,
      [type]: current[type].filter(recipient => recipient !== email),
    }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const response = await fetch(settingsUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          notificationRecipients,
          replyToEmail,
          microsoftTenantId,
          microsoftClientId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Could not save settings.');
      setMicrosoftConnected(Boolean(data.sender?.microsoftConnected));
      setSettings(prev => prev ? {
        ...prev,
        sender: {
          email: senderEmail,
          name: senderName,
          replyToEmail,
          microsoftTenantId,
          microsoftClientId,
          microsoftConnected: Boolean(data.sender?.microsoftConnected),
          microsoftConnectedAt: data.sender?.microsoftConnectedAt || null,
        },
        email: {
          ...prev.email,
          configured: Boolean(data.sender?.microsoftConnected) ||
            (!microsoftTenantId && !microsoftClientId && prev.email.configured),
          provider: data.sender?.microsoftConnected ? 'Microsoft 365' : prev.email.provider,
          fromEmail: senderEmail
            ? `${senderName || 'NCST Career Services'} <${senderEmail}>`
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
      const saveResponse = await fetch(settingsUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          notificationRecipients,
          replyToEmail,
          microsoftTenantId,
          microsoftClientId,
        }),
      });
      const saveData = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saveData?.error || 'Could not save email settings.');
      setMicrosoftConnected(Boolean(saveData.sender?.microsoftConnected));
      setSaved(true);

      const response = await fetch(settingsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ email: testEmail }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'The test email failed.');
      setTestEmailResult(`Test email sent to ${testEmail}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The test email failed.');
    } finally {
      setTestingEmail(false);
    }
  }

  async function handleConnectMicrosoft() {
    const run = microsoftConnectRun.current + 1;
    microsoftConnectRun.current = run;
    setConnectingMicrosoft(true);
    setMicrosoftConnectInfo(null);
    setError('');
    setTestEmailResult('');
    const microsoftWindow = window.open('about:blank', 'employer-portal-microsoft-connect');
    try {
      const startResponse = await fetch(settingsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          action: 'startMicrosoftConnection',
          tenantId: microsoftTenantId,
          clientId: microsoftClientId,
        }),
      });
      const start = await startResponse.json();
      if (!startResponse.ok) throw new Error(start?.error || 'Could not start Microsoft sign-in.');
      setMicrosoftConnectInfo({ userCode: start.userCode, verificationUri: start.verificationUri });
      if (microsoftWindow) {
        microsoftWindow.location.href = start.verificationUriComplete || start.verificationUri;
      }

      const deadline = Date.now() + Number(start.expiresIn || 900) * 1000;
      let intervalMs = Math.max(5, Number(start.interval || 5)) * 1000;
      while (microsoftConnectRun.current === run && Date.now() < deadline) {
        await new Promise(resolve => window.setTimeout(resolve, intervalMs));
        if (microsoftConnectRun.current !== run) return;
        const pollResponse = await fetch(settingsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            action: 'pollMicrosoftConnection',
            tenantId: microsoftTenantId,
            clientId: microsoftClientId,
            deviceCode: start.deviceCode,
          }),
        });
        const poll = await pollResponse.json();
        if (pollResponse.status === 202) {
          if (poll.slowDown) intervalMs += 5000;
          continue;
        }
        if (!pollResponse.ok) throw new Error(poll?.error || 'Microsoft sign-in failed.');
        setMicrosoftConnected(true);
        setSenderEmail(poll.email || '');
        setSenderName(poll.name || '');
        setMicrosoftConnectInfo(null);
        setTestEmailResult(`Microsoft account connected: ${poll.email}.`);
        return;
      }
      if (microsoftConnectRun.current === run) {
        throw new Error('Microsoft sign-in expired. Select Connect Microsoft account to try again.');
      }
    } catch (err) {
      if (microsoftWindow && !microsoftWindow.closed) microsoftWindow.close();
      setError(err instanceof Error ? err.message : 'Microsoft sign-in failed.');
    } finally {
      if (microsoftConnectRun.current === run) setConnectingMicrosoft(false);
    }
  }

  async function handleDisconnectMicrosoft() {
    microsoftConnectRun.current += 1;
    setConnectingMicrosoft(false);
    setMicrosoftConnectInfo(null);
    setError('');
    const response = await fetch(settingsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ action: 'disconnectMicrosoft' }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data?.error || 'Could not disconnect Microsoft account.');
      return;
    }
    setMicrosoftConnected(false);
    setSenderEmail('');
    setSenderName('');
    setTestEmailResult('Microsoft account disconnected.');
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
    <ModalShell onClose={onClose} title="Email settings" wide>
      <div style={{ fontSize: 12.5, color: textMuted, marginBottom: 16 }}>
        Uses the same school Outlook mailbox and admin accounts as the LG Room site.
      </div>

      {loading && <div style={{ fontSize: 13, color: textMuted }}>Loading settings…</div>}
      {error && <div style={{ color: '#9A2E36', fontSize: 13, marginBottom: 10 }}>{error}</div>}

      {settings && (
        <>
          <div style={{ marginBottom: 18 }}>
            <SectionLabel>System status</SectionLabel>
            <StatusRow label={settings.storage.configured ? 'Settings are saving correctly' : 'Settings are not being saved — contact your developer'} ok={settings.storage.configured} />
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
              Connect the school mailbox through Microsoft. No client secret is needed. In Entra,
              enable public client flows and add delegated Microsoft Graph <strong>Mail.Send</strong> and <strong>User.Read</strong> permissions.
            </div>
            <Field label="Microsoft tenant ID">
              <input
                value={microsoftTenantId}
                onChange={e => setMicrosoftTenantId(e.target.value.replace(/[^0-9a-f-]/gi, '').slice(0, 36))}
                type="text"
                style={inputStyle}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                autoComplete="one-time-code"
                spellCheck={false}
                maxLength={36}
              />
            </Field>
            <Field label="Application (client) ID">
              <input
                value={microsoftClientId}
                onChange={e => setMicrosoftClientId(e.target.value.replace(/[^0-9a-f-]/gi, '').slice(0, 36))}
                type="text"
                style={inputStyle}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                autoComplete="one-time-code"
                spellCheck={false}
                maxLength={36}
              />
            </Field>
            <Field label="Replies go to (optional)">
              <input value={replyToEmail} onChange={e => setReplyToEmail(e.target.value)} type="email" style={inputStyle} placeholder="leave blank to reply to the connected mailbox" />
            </Field>
            {microsoftConnected && senderEmail && (
              <div style={{ marginBottom: 10, fontSize: 13, color: '#1F7A4D' }}>
                Connected as <strong>{senderEmail}</strong>
              </div>
            )}
            {microsoftConnectInfo && (
              <div style={{ marginBottom: 10, padding: 10, border: `1px solid ${border}`, borderRadius: 8, fontSize: 13 }}>
                At <strong>{microsoftConnectInfo.verificationUri}</strong>, enter code{' '}
                <strong style={{ letterSpacing: '0.08em' }}>{microsoftConnectInfo.userCode}</strong>.
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleConnectMicrosoft}
                disabled={connectingMicrosoft || !microsoftTenantId || !microsoftClientId}
                className="lgaroom-btn-primary"
                style={primaryButtonStyle}
              >
                {connectingMicrosoft ? 'Waiting for Microsoft sign-in…' : microsoftConnected ? 'Reconnect Microsoft account' : 'Connect Microsoft account'}
              </button>
              {microsoftConnected && (
                <button
                  type="button"
                  onClick={handleDisconnectMicrosoft}
                  disabled={connectingMicrosoft}
                  className="lgaroom-btn-secondary"
                  style={secondaryButtonStyle}
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <SectionLabel>Notification emails</SectionLabel>
            <div style={{ fontSize: 12.5, color: textMuted, marginBottom: 10 }}>
              Add Career Services recipients for each employer portal request type.
            </div>

            <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
              {NOTIFICATION_TYPES.map(type => (
                <div key={type.key} style={{ padding: 13, border: `1px solid ${border}`, borderRadius: 9, background: '#FAFBFC' }}>
                  <div style={{ marginBottom: 9 }}>
                    <strong style={{ display: 'block', color: accentStrong, fontSize: 13.5 }}>{type.title}</strong>
                    <span style={{ color: textMuted, fontSize: 12 }}>{type.description}</span>
                  </div>
                  {notificationRecipients[type.key].length > 0 && (
                    <div style={{ display: 'grid', gap: 5, marginBottom: 9 }}>
                      {notificationRecipients[type.key].map(email => (
                        <div key={email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '6px 8px', borderRadius: 6, background: surface, fontSize: 12.5 }}>
                          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</span>
                          <button
                            type="button"
                            onClick={() => removeNotificationRecipient(type.key, email)}
                            className="lgaroom-btn-secondary"
                            style={{ ...secondaryButtonStyle, flex: '0 0 auto', padding: '3px 8px', color: '#9A2E36', fontSize: 11.5 }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 7 }}>
                    <input
                      aria-label={`Add recipient for ${type.title}`}
                      value={recipientDrafts[type.key]}
                      onChange={event => setRecipientDrafts(current => ({ ...current, [type.key]: event.target.value }))}
                      onKeyDown={event => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addNotificationRecipient(type.key);
                        }
                      }}
                      type="email"
                      style={{ ...inputStyle, margin: 0 }}
                      placeholder="name@example.com"
                    />
                    <button
                      type="button"
                      onClick={() => addNotificationRecipient(type.key)}
                      className="lgaroom-btn-secondary"
                      style={{ ...secondaryButtonStyle, flex: '0 0 auto' }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={handleSave} disabled={saving} className="lgaroom-btn-primary" style={primaryButtonStyle}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              {saved && <span style={{ fontSize: 12.5, color: '#1F7A4D' }}>Saved</span>}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 14 }}>
              <Field label="Test email address">
                <input value={testEmail} onChange={event => setTestEmail(event.target.value)} type="email" style={inputStyle} placeholder="name@example.com" />
              </Field>
              <button onClick={handleTestEmail} disabled={testingEmail || !testEmail} className="lgaroom-btn-secondary" style={{ ...secondaryButtonStyle, marginBottom: 12 }}>
                {testingEmail ? 'Sending test…' : 'Send test email'}
              </button>
            </div>
            {testEmailResult && <div style={{ marginTop: 8, fontSize: 12.5, color: '#1F7A4D' }}>{testEmailResult}</div>}
          </div>

          <div>
            <SectionLabel>Admins</SectionLabel>
            <div style={{ fontSize: 12.5, color: textMuted, marginBottom: 10 }}>
              Admin accounts are shared with the LG Room site.
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
