'use client';

import { useEffect, useState } from 'react';

type TeacherContact = { email: string; accountId: string | null; name: string };
type TransferEvent = { id?: string; recipientEmail?: string; credits?: number; status?: string; createdAt?: string };
type TeacherData = {
  credits: { balance: number; used: number };
  teachers: TeacherContact[];
  transfers: TransferEvent[];
};
type SearchResult = { found: boolean; teacher?: { accountId: string; name: string; email: string; balance: number } };

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
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [sendAmount, setSendAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [existingAmounts, setExistingAmounts] = useState<Record<string, string>>({});
  const [existingLoading, setExistingLoading] = useState(false);

  const load = () => {
    if (!accountId) return;
    fetch(`/api/credits/team?accountId=${encodeURIComponent(accountId)}`)
      .then(r => r.json())
      .then(result => { if (!result.error) setData(result); })
      .catch(() => {});
  };

  useEffect(load, [accountId]);

  const handleSearch = async () => {
    const email = searchEmail.trim().toLowerCase();
    if (!isValidEmail(email)) { setMessage('Enter a valid email address.'); return; }
    setSearching(true);
    setSearchResult(null);
    setMessage('');
    setSendAmount('');
    try {
      const res = await fetch(`/api/credits/search?email=${encodeURIComponent(email)}&accountId=${encodeURIComponent(accountId)}`);
      const result = await res.json();
      setSearchResult(result);
    } catch {
      setMessage('Search failed. Check your connection.');
    } finally {
      setSearching(false);
    }
  };

  const handleSend = async (email: string, credits: number) => {
    if (!credits || credits <= 0) { setMessage('Enter a valid credit amount.'); return; }
    setSending(true);
    setMessage('');
    try {
      // Always ensure teacher is in the team before sending (SADD is idempotent)
      await fetch('/api/credits/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, action: 'add', email }),
      });
      const res = await fetch('/api/credits/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, action: 'send', email, credits }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Could not send credits.');
      setData(result);
      setSearchEmail('');
      setSearchResult(null);
      setSendAmount('');
      setMessage(`Sent ${credits.toLocaleString()} credits to ${email}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not send credits.');
    } finally {
      setSending(false);
    }
  };

  const handleExistingAction = async (action: 'remove' | 'send', email: string, credits?: number) => {
    setExistingLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/credits/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, action, email, credits }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Action failed.');
      setData(result);
      setExistingAmounts(prev => ({ ...prev, [email]: '' }));
      setMessage(action === 'send' ? `Sent credits to ${email}.` : 'Teacher removed.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setExistingLoading(false);
    }
  };

  if (!accountId) {
    return (
      <div style={{ padding: 16, fontSize: 13, color: '#526A79', border: `1px solid ${line}`, borderRadius: 8 }}>
        Open this screen from the Canvas Enhancer toolbar so it knows which credit account to manage.
      </div>
    );
  }

  const creditAmount = Math.floor(Number(sendAmount || 0));
  const searchedEmail = searchEmail.trim().toLowerCase();
  const isSuccessMessage = message.startsWith('Sent ') || message === 'Teacher removed.';

  return (
    <div style={{ display: 'grid', gap: 20, fontFamily: font }}>

      {/* Balance */}
      <div style={{ border: `1px solid ${line}`, borderRadius: 8, padding: '12px 14px', background: '#F8FAFC' }}>
        <div style={{ fontSize: 11, color: '#526A79', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Your available credits</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: ink }}>{(data?.credits.balance ?? 0).toLocaleString()}</div>
      </div>

      {/* Find teacher */}
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: ink }}>Find a teacher</div>
        <div style={{ fontSize: 12, color: '#526A79', lineHeight: 1.55 }}>
          Enter their email to check if they have Canvas Enhancer installed, then send credits directly.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
          <input
            type="email"
            value={searchEmail}
            onChange={e => { setSearchEmail(e.target.value); setSearchResult(null); }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="teacher@school.edu"
            style={inputStyle}
          />
          <button type="button" disabled={searching} onClick={handleSearch} style={blueButton}>
            {searching ? 'Searching...' : 'Find'}
          </button>
        </div>

        {/* Search result */}
        {searchResult && (
          <div style={{
            border: `1px solid ${searchResult.found ? '#86EFAC' : line}`,
            borderRadius: 8,
            padding: 14,
            background: searchResult.found ? '#F0FDF4' : '#F8FAFC',
            display: 'grid',
            gap: 10,
          }}>
            {searchResult.found && searchResult.teacher ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, color: green }}>OK</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: ink }}>
                      {searchResult.teacher.name || searchedEmail}
                    </div>
                    {searchResult.teacher.name && (
                      <div style={{ fontSize: 12, color: '#526A79' }}>{searchResult.teacher.email}</div>
                    )}
                    <div style={{ fontSize: 12, color: '#526A79' }}>
                      Canvas Enhancer installed - {searchResult.teacher.balance.toLocaleString()} credits on account
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                  <input
                    type="number" min="1" step="1"
                    value={sendAmount}
                    onChange={e => setSendAmount(e.target.value)}
                    placeholder="Credits to send"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    disabled={sending || !creditAmount}
                    onClick={() => handleSend(searchedEmail, creditAmount)}
                    style={greenButton}
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 15, color: '#DC2626' }}>No</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: ink }}>Teacher not found</div>
                    <div style={{ fontSize: 12, color: '#526A79', lineHeight: 1.55, marginTop: 3 }}>
                      <strong>{searchedEmail}</strong> has not set up Canvas Enhancer yet.
                      You can still send credits. They will be held and applied automatically when the teacher installs Canvas Enhancer and adds this email.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                  <input
                    type="number" min="1" step="1"
                    value={sendAmount}
                    onChange={e => setSendAmount(e.target.value)}
                    placeholder="Credits to hold for them"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    disabled={sending || !creditAmount}
                    onClick={() => handleSend(searchedEmail, creditAmount)}
                    style={{ ...blueButton, background: '#526A79' }}
                  >
                    {sending ? 'Sending...' : 'Send Anyway'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Existing teachers */}
      {!!data?.teachers.length && (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: ink }}>Your teachers</div>
          {data.teachers.map(teacher => {
            const amount = existingAmounts[teacher.email] || '';
            return (
              <div key={teacher.email} style={{ border: `1px solid ${line}`, borderRadius: 8, padding: 12, background: '#fff', display: 'grid', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: ink }}>{teacher.name || teacher.email}</div>
                    {teacher.name && <div style={{ fontSize: 12, color: '#526A79' }}>{teacher.email}</div>}
                    <div style={{ fontSize: 11, color: teacher.accountId ? green : '#526A79', marginTop: 2 }}>
                      {teacher.accountId ? 'Installed' : 'Not installed yet - credits will wait'}
                    </div>
                  </div>
                  <button type="button" disabled={existingLoading} onClick={() => handleExistingAction('remove', teacher.email)} style={removeButton}>
                    Remove
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                  <input
                    type="number" min="1" step="1"
                    value={amount}
                    onChange={e => setExistingAmounts(prev => ({ ...prev, [teacher.email]: e.target.value }))}
                    placeholder="Credits to send"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    disabled={existingLoading || !Math.floor(Number(amount || 0))}
                    onClick={() => handleExistingAction('send', teacher.email, Math.floor(Number(amount || 0)))}
                    style={greenButton}
                  >
                    Send
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transfer history */}
      {!!data?.transfers.length && (
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#526A79', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Recent transfers</div>
          {data.transfers.slice(0, 8).map((t, i) => (
            <div key={t.id || i} style={{ fontSize: 12, color: '#526A79', lineHeight: 1.5, padding: '6px 0', borderTop: `1px solid ${line}` }}>
              Sent <strong>{Number(t.credits || 0).toLocaleString()}</strong> credits to {t.recipientEmail || 'teacher'}
              {' '}<span style={{ color: t.status === 'delivered' ? green : '#526A79' }}>
                ({t.status === 'delivered' ? 'delivered' : 'pending - will apply on install'})
              </span>
            </div>
          ))}
        </div>
      )}

      {message && (
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: isSuccessMessage ? green : '#DC2626',
          padding: '8px 10px',
          background: isSuccessMessage ? '#F0FDF4' : '#FEF2F2',
          border: `1px solid ${isSuccessMessage ? '#86EFAC' : '#FECACA'}`,
          borderRadius: 6,
        }}>
          {message}
        </div>
      )}
    </div>
  );
}

const blueButton: React.CSSProperties = {
  padding: '9px 16px',
  border: 'none',
  borderRadius: 6,
  background: blue,
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: font,
  whiteSpace: 'nowrap',
};

const greenButton: React.CSSProperties = { ...blueButton, background: green };

const removeButton: React.CSSProperties = {
  padding: '5px 10px',
  border: `1px solid ${line}`,
  borderRadius: 6,
  background: '#fff',
  color: '#526A79',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: font,
};
