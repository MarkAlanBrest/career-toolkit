'use client';

import { useEffect, useState } from 'react';

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
const navy = '#1E293B';
const blue = '#1E4D8C';
const border = '#E2E8F0';
const muted = '#64748B';
const green = '#15803D';
const red = '#DC2626';

type Session = { email: string; name: string; role: string; schoolId: string; schoolName: string; accountId: string; accountToken: string };
type Teacher = { email: string; name: string; active: boolean; createdAt: string };
type UsageEntry = { email: string; name: string; docType: string; docTypeLabel: string; model: string; ts: number };
type UsageStats = {
  totalAll: number;
  totalMonth: number;
  byTeacher: { name: string; email: string; total: number; thisMonth: number }[];
  byDocType: { label: string; count: number }[];
  recent: UsageEntry[];
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, marginBottom: 20 }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, fontWeight: 700, fontSize: 13, color: navy, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{title}</div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function Btn({ onClick, disabled, color = blue, children }: { onClick?: () => void; disabled?: boolean; color?: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: color, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, fontFamily: font }}>
      {children}
    </button>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ flex: 1, padding: '8px 11px', border: `1px solid ${border}`, borderRadius: 7, fontSize: 13, fontFamily: font, color: navy, outline: 'none', minWidth: 0 }} />
  );
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgColor, setMsgColor] = useState(green);

  // Add teacher form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPass, setNewPass] = useState('');
  const [adding, setAdding] = useState(false);

  // Reset password
  const [resetEmail, setResetEmail] = useState('');
  const [resetPass, setResetPass] = useState('');
  const [resetting, setResetting] = useState(false);

  const [balance, setBalance] = useState<number | null>(null);
  const [model, setModel] = useState<string>('claude-haiku-4-5');
  const [savingModel, setSavingModel] = useState(false);

  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  function showMsg(text: string, color = green) { setMsg(text); setMsgColor(color); setTimeout(() => setMsg(''), 4000); }

  useEffect(() => {
    fetch('/api/document-creator/auth/session')
      .then(r => r.json())
      .then(data => {
        if (!data.session) { window.location.href = '/document-creator/login'; return; }
        if (data.session.role !== 'admin') { window.location.href = '/document-creator'; return; }
        setSession(data.session);
        setLoading(false);
        loadTeachers();
        loadBalance(data.session.accountId, data.session.accountToken);
        loadModel();
        loadUsage();
      })
      .catch(() => { window.location.href = '/document-creator/login'; });
  }, []);

  function loadTeachers() {
    setLoadingTeachers(true);
    fetch('/api/document-creator/admin/teachers')
      .then(r => r.json())
      .then(data => { if (data.teachers) setTeachers(data.teachers); })
      .catch(() => {})
      .finally(() => setLoadingTeachers(false));
  }

  function loadBalance(accountId: string, accountToken: string) {
    fetch(`/api/credits/status?accountId=${encodeURIComponent(accountId)}&accountToken=${encodeURIComponent(accountToken)}`)
      .then(r => r.json())
      .then(data => { if (data.balance !== undefined) setBalance(data.balance); })
      .catch(() => {});
  }

  async function addTeacher() {
    if (!newEmail || !newName || !newPass) { showMsg('All fields required.', red); return; }
    setAdding(true);
    try {
      const resp = await fetch('/api/document-creator/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, name: newName, password: newPass }),
      });
      const data = await resp.json();
      if (!resp.ok) { showMsg(data.error || 'Failed to add teacher.', red); return; }
      setNewEmail(''); setNewName(''); setNewPass('');
      showMsg('Teacher added successfully.');
      loadTeachers();
    } finally {
      setAdding(false);
    }
  }

  async function removeTeacher(email: string) {
    if (!confirm(`Remove ${email}? Their account will be deactivated.`)) return;
    const resp = await fetch('/api/document-creator/admin/teachers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (resp.ok) { showMsg('Teacher removed.'); loadTeachers(); }
    else { const d = await resp.json(); showMsg(d.error || 'Failed.', red); }
  }

  async function resetPassword() {
    if (!resetEmail || !resetPass) { showMsg('Email and new password required.', red); return; }
    setResetting(true);
    try {
      const resp = await fetch('/api/document-creator/admin/teachers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, password: resetPass }),
      });
      const data = await resp.json();
      if (!resp.ok) { showMsg(data.error || 'Failed.', red); return; }
      setResetEmail(''); setResetPass('');
      showMsg('Password reset successfully.');
    } finally {
      setResetting(false);
    }
  }

  function loadUsage() {
    setLoadingUsage(true);
    fetch('/api/document-creator/usage/stats')
      .then(r => r.json())
      .then(data => { if (data.totalAll !== undefined) setUsage(data); })
      .catch(() => {})
      .finally(() => setLoadingUsage(false));
  }

  function timeAgo(ts: number) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  function loadModel() {
    fetch('/api/document-creator/settings')
      .then(r => r.json())
      .then(d => { if (d.adminSettings?.model) setModel(d.adminSettings.model); })
      .catch(() => {});
  }

  async function saveModel(newModel: string) {
    setModel(newModel);
    setSavingModel(true);
    try {
      const settingsResp = await fetch('/api/document-creator/settings');
      const settingsData = await settingsResp.json();
      const updated = { ...(settingsData.adminSettings || {}), model: newModel };
      await fetch('/api/document-creator/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminSettings: updated }),
      });
      showMsg(`Model switched to ${newModel === 'claude-haiku-4-5' ? 'Haiku ($0.03/doc)' : 'Sonnet ($0.10/doc)'}.`);
    } catch {
      showMsg('Failed to save model preference.', red);
    } finally {
      setSavingModel(false);
    }
  }

  async function logout() {
    await fetch('/api/document-creator/auth/logout', { method: 'POST' });
    window.location.href = '/document-creator/login';
  }

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: font, color: muted }}>Loading...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: font }}>
      {/* Header */}
      <div style={{ background: navy, color: '#fff', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🗂️</span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Document Creator</span>
          <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 4 }}>Admin · {session?.schoolName}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a href="/document-creator" style={{ color: '#94A3B8', fontSize: 13, textDecoration: 'none' }}>Open App →</a>
          <button onClick={logout} style={{ background: 'transparent', border: '1px solid #475569', color: '#CBD5E1', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontFamily: font }}>Sign Out</button>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '32px auto', padding: '0 20px' }}>
        {msg && (
          <div style={{ background: msgColor === green ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${msgColor === green ? '#86EFAC' : '#FCA5A5'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: msgColor }}>
            {msg}
          </div>
        )}

        {/* Usage Dashboard */}
        <Section title="Usage Dashboard">
          {loadingUsage ? (
            <div style={{ color: muted, fontSize: 13 }}>Loading...</div>
          ) : !usage || usage.totalAll === 0 ? (
            <div style={{ color: muted, fontSize: 13 }}>No documents generated yet. Usage will appear here after your first generation.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Stat cards */}
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { label: 'This Month', value: usage.totalMonth },
                  { label: 'All Time', value: usage.totalAll },
                ].map(card => (
                  <div key={card.label} style={{ flex: 1, background: '#F8FAFC', border: `1px solid ${border}`, borderRadius: 10, padding: '14px 18px' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: navy }}>{card.value.toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>{card.label}</div>
                  </div>
                ))}
              </div>

              {/* By teacher */}
              {usage.byTeacher.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>By Teacher</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${border}` }}>
                        <th style={{ textAlign: 'left', padding: '5px 8px', color: muted, fontWeight: 600 }}>Name</th>
                        <th style={{ textAlign: 'right', padding: '5px 8px', color: muted, fontWeight: 600 }}>This Month</th>
                        <th style={{ textAlign: 'right', padding: '5px 8px', color: muted, fontWeight: 600 }}>All Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.byTeacher.map(t => (
                        <tr key={t.email} style={{ borderBottom: `1px solid ${border}` }}>
                          <td style={{ padding: '7px 8px', color: navy, fontWeight: 500 }}>{t.name}<span style={{ color: muted, fontWeight: 400, fontSize: 11, marginLeft: 6 }}>{t.email}</span></td>
                          <td style={{ padding: '7px 8px', textAlign: 'right', color: navy }}>{t.thisMonth}</td>
                          <td style={{ padding: '7px 8px', textAlign: 'right', color: muted }}>{t.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* By doc type */}
              {usage.byDocType.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Popular Document Types</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {usage.byDocType.map(dt => {
                      const pct = Math.round((dt.count / usage.totalAll) * 100);
                      return (
                        <div key={dt.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ fontSize: 13, color: navy, width: 130, flexShrink: 0 }}>{dt.label}</div>
                          <div style={{ flex: 1, background: '#E2E8F0', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, background: blue, height: '100%', borderRadius: 4 }} />
                          </div>
                          <div style={{ fontSize: 12, color: muted, width: 36, textAlign: 'right', flexShrink: 0 }}>{dt.count}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent activity */}
              {usage.recent.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Recent Activity</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {usage.recent.map((entry, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${border}`, fontSize: 12 }}>
                        <div style={{ color: navy }}>{entry.name} <span style={{ color: muted }}>→</span> <span style={{ color: blue }}>{entry.docTypeLabel}</span></div>
                        <div style={{ color: muted, flexShrink: 0, marginLeft: 12 }}>{timeAgo(entry.ts)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* Credits */}
        <Section title="AI Credits">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: balance !== null && balance < 20 ? red : navy }}>
                {balance !== null ? balance.toLocaleString() : '—'}
              </div>
              <div style={{ fontSize: 13, color: muted, marginTop: 2 }}>Available credits · {model === 'claude-haiku-4-5' ? '3' : '10'} credits per document</div>
            </div>
            <a
              href={`/buy-credits?accountId=${encodeURIComponent(session?.accountId || '')}&accountToken=${encodeURIComponent(session?.accountToken || '')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: blue, color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600 }}
            >
              Buy Credits
            </a>
          </div>
        </Section>

        {/* AI Model */}
        <Section title="AI Model">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { id: 'claude-haiku-4-5',  label: 'Haiku',  cost: '$0.03 / document', desc: 'Fast and affordable. Handles most documents well.' },
              { id: 'claude-sonnet-4-6', label: 'Sonnet', cost: '$0.10 / document', desc: 'Higher quality. Better for complex layouts and detailed rubrics.' },
            ].map(opt => (
              <label key={opt.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', border: `2px solid ${model === opt.id ? blue : border}`, borderRadius: 10, cursor: savingModel ? 'not-allowed' : 'pointer', background: model === opt.id ? '#F0F4FF' : '#fff' }}>
                <input type="radio" name="model" value={opt.id} checked={model === opt.id} onChange={() => saveModel(opt.id)} disabled={savingModel} style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: navy }}>{opt.label} <span style={{ fontWeight: 400, fontSize: 12, color: model === opt.id ? blue : muted }}>— {opt.cost}</span></div>
                  <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </Section>

        {/* Teachers */}
        <Section title={`Teachers (${teachers.length})`}>
          {loadingTeachers ? (
            <div style={{ color: muted, fontSize: 13 }}>Loading...</div>
          ) : teachers.length === 0 ? (
            <div style={{ color: muted, fontSize: 13 }}>No teachers yet. Add one below.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: muted, fontWeight: 600 }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: muted, fontWeight: 600 }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: muted, fontWeight: 600 }}>Added</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {teachers.map(t => (
                  <tr key={t.email} style={{ borderBottom: `1px solid ${border}` }}>
                    <td style={{ padding: '8px 8px', color: navy, fontWeight: 500 }}>{t.name}</td>
                    <td style={{ padding: '8px 8px', color: muted }}>{t.email}</td>
                    <td style={{ padding: '8px 8px', color: muted }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                      <button onClick={() => removeTeacher(t.email)} style={{ background: 'none', border: 'none', color: red, cursor: 'pointer', fontSize: 13, fontFamily: font }}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* Add Teacher */}
        <Section title="Add Teacher">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input value={newName} onChange={setNewName} placeholder="Full Name" />
              <Input value={newEmail} onChange={setNewEmail} placeholder="email@school.edu" type="email" />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input value={newPass} onChange={setNewPass} placeholder="Temporary password (min 8 chars)" type="password" />
              <Btn onClick={addTeacher} disabled={adding}>{adding ? 'Adding...' : 'Add Teacher'}</Btn>
            </div>
          </div>
        </Section>

        {/* Reset Password */}
        <Section title="Reset Teacher Password">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input value={resetEmail} onChange={setResetEmail} placeholder="teacher@school.edu" type="email" />
            <Input value={resetPass} onChange={setResetPass} placeholder="New password (min 8 chars)" type="password" />
            <Btn onClick={resetPassword} disabled={resetting}>{resetting ? 'Saving...' : 'Reset'}</Btn>
          </div>
        </Section>

        <div style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 8 }}>
          Account ID: <span style={{ fontFamily: 'monospace' }}>{session?.accountId}</span>
        </div>
      </div>
    </div>
  );
}
