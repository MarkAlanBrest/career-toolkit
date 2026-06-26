'use client';

import { useEffect, useState } from 'react';

type TeacherContact = { email: string; accountId: string | null; name: string };
type TransferEvent = { id?: string; recipientEmail?: string; credits?: number; status?: string; createdAt?: string };
type TeacherData = {
  credits: { balance: number; used: number };
  teachers: TeacherContact[];
  transfers: TransferEvent[];
};

const ink = '#1B303D';
const blue = '#0770B8';
const green = '#15803D';
const line = '#D8E1E8';
const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 11px',
  border: `1px solid ${line}`,
  borderRadius: 6,
  fontSize: 13,
  fontFamily: font,
  color: ink,
  boxSizing: 'border-box',
  outline: 'none',
};

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function TeacherCreditPanel({ accountId, standalone = false }: { accountId: string; standalone?: boolean }) {
  const [data, setData] = useState<TeacherData | null>(null);
  const [teacherEmail, setTeacherEmail] = useState('');
  const [sendAmounts, setSendAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => {
    if (!accountId) return;
    fetch(`/api/credits/team?accountId=${encodeURIComponent(accountId)}`)
      .then(r => r.json())
      .then(result => {
        if (!result.error) setData(result);
      })
      .catch(() => {});
  };

  useEffect(load, [accountId]);

  const update = async (action: 'add' | 'remove' | 'send', email: string, credits?: number) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setMessage('Enter a valid teacher email.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/credits/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, action, email: cleanEmail, credits }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Could not update teachers.');

      setData(result);
      setTeacherEmail('');
      setSendAmounts(prev => ({ ...prev, [cleanEmail]: '' }));
      setMessage(action === 'add' ? 'Teacher added.' : action === 'remove' ? 'Teacher removed.' : 'Credits sent.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not update teachers.');
    } finally {
      setLoading(false);
    }
  };

  if (!accountId) {
    return (
      <section style={{ borderTop: standalone ? 'none' : `1px solid ${line}`, paddingTop: standalone ? 0 : 16, display: 'grid', gap: 8 }}>
        <div style={sectionLabel}>Teacher credit sharing</div>
        <div style={noteBox}>
          Open this screen from the Canvas Enhancer toolbar so it knows which credit account to manage.
        </div>
      </section>
    );
  }

  return (
    <section style={{ borderTop: standalone ? 'none' : `1px solid ${line}`, paddingTop: standalone ? 0 : 16, display: 'grid', gap: 12 }}>
      <div>
        <div style={sectionLabel}>Teacher credit sharing</div>
        <div style={{ marginTop: 5, fontSize: 12, lineHeight: 1.55, color: '#526A79' }}>
          Add teachers by email. Send any amount from your balance. Once sent, the credits belong to that teacher.
        </div>
      </div>

      <div style={{ border: `1px solid ${line}`, borderRadius: 8, padding: 10, background: '#fff' }}>
        <div style={{ fontSize: 11, color: '#526A79' }}>Your available credits</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: ink }}>{(data?.credits.balance || 0).toLocaleString()}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
        <input type="email" value={teacherEmail} onChange={e => setTeacherEmail(e.target.value)} placeholder="teacher@school.edu" style={inputStyle} />
        <button type="button" disabled={loading} onClick={() => update('add', teacherEmail)} style={blueButton}>Add</button>
      </div>

      {!!data?.teachers.length && (
        <div style={{ display: 'grid', gap: 9 }}>
          {data.teachers.map(teacher => {
            const amount = sendAmounts[teacher.email] || '';
            return (
              <div key={teacher.email} style={{ border: `1px solid ${line}`, borderRadius: 8, padding: 10, background: '#fff', display: 'grid', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', fontSize: 12, color: ink }}>
                  <div>
                    <strong>{teacher.name || teacher.email}</strong>
                    {teacher.name && <span style={{ color: '#526A79' }}> - {teacher.email}</span>}
                    {!teacher.accountId && <span style={{ color: '#526A79' }}> - credits will wait until they open the app</span>}
                  </div>
                  <button type="button" disabled={loading} onClick={() => update('remove', teacher.email)} style={lightButton}>Remove</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={e => setSendAmounts(prev => ({ ...prev, [teacher.email]: e.target.value }))}
                    placeholder="Credits to send"
                    style={inputStyle}
                  />
                  <button type="button" disabled={loading} onClick={() => update('send', teacher.email, Math.floor(Number(amount || 0)))} style={greenButton}>Send</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!!data?.transfers.length && (
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#526A79', textTransform: 'uppercase' }}>Recent sent credits</div>
          {data.transfers.slice(0, 5).map((transfer, index) => (
            <div key={transfer.id || index} style={{ fontSize: 12, color: '#526A79', lineHeight: 1.45 }}>
              Sent {Number(transfer.credits || 0).toLocaleString()} credits to {transfer.recipientEmail || 'teacher'} ({transfer.status || 'sent'}).
            </div>
          ))}
        </div>
      )}

      {message && (
        <div style={{ fontSize: 12, color: message.includes('Could') || message.includes('valid') || message.includes('Not') ? '#DC2626' : green }}>
          {message}
        </div>
      )}
    </section>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: '#526A79',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: 8,
};

const blueButton: React.CSSProperties = {
  padding: '10px 14px',
  border: 'none',
  borderRadius: 8,
  background: blue,
  color: '#fff',
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: font,
};

const greenButton: React.CSSProperties = { ...blueButton, background: green };

const lightButton: React.CSSProperties = {
  border: `1px solid ${line}`,
  borderRadius: 7,
  background: '#fff',
  color: '#526A79',
  padding: '5px 8px',
  cursor: 'pointer',
  fontFamily: font,
};

const noteBox: React.CSSProperties = {
  border: `1px solid ${line}`,
  borderRadius: 8,
  padding: 10,
  fontSize: 12,
  lineHeight: 1.55,
  color: '#526A79',
  background: '#fff',
};
