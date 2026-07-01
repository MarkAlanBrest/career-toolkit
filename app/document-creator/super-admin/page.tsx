'use client';

import { useEffect, useState } from 'react';

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
const navy = '#1E293B';
const blue = '#1E4D8C';
const border = '#E2E8F0';
const muted = '#64748B';
const green = '#15803D';
const red = '#DC2626';

type School = { id: string; name: string; adminEmail: string; accountId: string; teacherCount: number; balance: number; createdAt: string };

function Input({ value, onChange, placeholder, type = 'text', style: extra }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; style?: React.CSSProperties }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ flex: 1, padding: '8px 11px', border: `1px solid ${border}`, borderRadius: 7, fontSize: 13, fontFamily: font, color: navy, outline: 'none', minWidth: 0, ...extra }} />
  );
}

function Btn({ onClick, disabled, color = blue, children, small }: { onClick?: () => void; disabled?: boolean; color?: string; children: React.ReactNode; small?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: color, color: '#fff', border: 'none', borderRadius: 7, padding: small ? '6px 12px' : '8px 16px', fontSize: small ? 12 : 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, fontFamily: font, whiteSpace: 'nowrap' }}>
      {children}
    </button>
  );
}

export default function SuperAdminPage() {
  const [adminToken, setAdminToken] = useState('');
  const [savedToken, setSavedToken] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgColor, setMsgColor] = useState(green);

  // Create school form
  const [schoolName, setSchoolName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit credits
  const [creditSchool, setCreditSchool] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [savingCredits, setSavingCredits] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('dc_super_admin_token') || '';
    setAdminToken(stored);
    if (stored) { setSavedToken(stored); }
  }, []);

  function showMsg(text: string, color = green) { setMsg(text); setMsgColor(color); setTimeout(() => setMsg(''), 5000); }

  function saveToken() {
    localStorage.setItem('dc_super_admin_token', adminToken.trim());
    setSavedToken(adminToken.trim());
    loadSchools(adminToken.trim());
  }

  function loadSchools(token = savedToken) {
    if (!token) return;
    setLoading(true);
    fetch('/api/document-creator/super-admin/schools', { headers: { 'x-admin-token': token } })
      .then(r => r.json())
      .then(data => {
        if (data.error) { showMsg(data.error, red); return; }
        setSchools(data.schools || []);
      })
      .catch(() => showMsg('Failed to load schools.', red))
      .finally(() => setLoading(false));
  }

  async function createSchool() {
    if (!schoolName || !adminEmail || !adminName || !adminPass) { showMsg('All fields required.', red); return; }
    setCreating(true);
    try {
      const resp = await fetch('/api/document-creator/super-admin/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': savedToken },
        body: JSON.stringify({ schoolName, adminEmail, adminName, adminPassword: adminPass }),
      });
      const data = await resp.json();
      if (!resp.ok) { showMsg(data.error || 'Failed.', red); return; }
      setSchoolName(''); setAdminEmail(''); setAdminName(''); setAdminPass('');
      showMsg(`School "${data.school.name}" created successfully.`);
      loadSchools();
    } finally {
      setCreating(false);
    }
  }

  async function deleteSchool(school: School) {
    if (!confirm(`Delete "${school.name}"? This is permanent and removes all teachers and settings.`)) return;
    const resp = await fetch('/api/document-creator/super-admin/schools', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': savedToken },
      body: JSON.stringify({ schoolId: school.id }),
    });
    if (resp.ok) { showMsg('School deleted.'); loadSchools(); }
    else { const d = await resp.json(); showMsg(d.error || 'Failed.', red); }
  }

  async function setCredits() {
    const amount = parseInt(creditAmount, 10);
    if (!creditSchool || isNaN(amount)) { showMsg('Select school and enter credit amount.', red); return; }
    setSavingCredits(true);
    try {
      const resp = await fetch('/api/document-creator/super-admin/schools', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': savedToken },
        body: JSON.stringify({ schoolId: creditSchool, credits: amount }),
      });
      const data = await resp.json();
      if (!resp.ok) { showMsg(data.error || 'Failed.', red); return; }
      showMsg('Credits updated.');
      setCreditSchool(''); setCreditAmount('');
      loadSchools();
    } finally {
      setSavingCredits(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: font }}>
      <div style={{ background: navy, color: '#fff', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>🗂️</span>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Document Creator</span>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>Super Admin</span>
      </div>

      <div style={{ maxWidth: 900, margin: '32px auto', padding: '0 20px' }}>
        {!savedToken ? (
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, padding: 28, maxWidth: 440 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: navy, marginBottom: 12 }}>Enter Admin Token</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input value={adminToken} onChange={setAdminToken} placeholder="Admin token" type="password" />
              <Btn onClick={saveToken}>Access</Btn>
            </div>
          </div>
        ) : (
          <>
            {msg && (
              <div style={{ background: msgColor === green ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${msgColor === green ? '#86EFAC' : '#FCA5A5'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: msgColor }}>
                {msg}
              </div>
            )}

            {/* Schools list */}
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, marginBottom: 20 }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: navy, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Schools ({schools.length})</span>
                <button onClick={() => loadSchools()} style={{ background: 'none', border: 'none', color: blue, cursor: 'pointer', fontSize: 13, fontFamily: font }}>Refresh</button>
              </div>
              <div style={{ padding: 20 }}>
                {loading ? (
                  <div style={{ color: muted, fontSize: 13 }}>Loading...</div>
                ) : schools.length === 0 ? (
                  <div style={{ color: muted, fontSize: 13 }}>No schools yet.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${border}` }}>
                        <th style={{ textAlign: 'left', padding: '6px 8px', color: muted, fontWeight: 600 }}>School</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px', color: muted, fontWeight: 600 }}>Admin</th>
                        <th style={{ textAlign: 'center', padding: '6px 8px', color: muted, fontWeight: 600 }}>Teachers</th>
                        <th style={{ textAlign: 'right', padding: '6px 8px', color: muted, fontWeight: 600 }}>Credits</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px', color: muted, fontWeight: 600 }}>Created</th>
                        <th style={{ width: 70 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {schools.map(s => (
                        <tr key={s.id} style={{ borderBottom: `1px solid ${border}` }}>
                          <td style={{ padding: '8px 8px', color: navy, fontWeight: 600 }}>{s.name}</td>
                          <td style={{ padding: '8px 8px', color: muted }}>{s.adminEmail}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'center', color: navy }}>{s.teacherCount}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', color: s.balance < 20 ? red : green, fontWeight: 600 }}>{s.balance?.toLocaleString()}</td>
                          <td style={{ padding: '8px 8px', color: muted }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                          <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                            <button onClick={() => deleteSchool(s)} style={{ background: 'none', border: 'none', color: red, cursor: 'pointer', fontSize: 12, fontFamily: font }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Manage Credits */}
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, marginBottom: 20 }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, fontWeight: 700, fontSize: 13, color: navy, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Set School Credits</div>
              <div style={{ padding: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={creditSchool} onChange={e => setCreditSchool(e.target.value)}
                  style={{ flex: 2, padding: '8px 11px', border: `1px solid ${border}`, borderRadius: 7, fontSize: 13, fontFamily: font, color: navy, outline: 'none' }}>
                  <option value="">Select school...</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name} (current: {s.balance})</option>)}
                </select>
                <Input value={creditAmount} onChange={setCreditAmount} placeholder="New balance" type="number" style={{ flex: 1 }} />
                <Btn onClick={setCredits} disabled={savingCredits}>{savingCredits ? 'Saving...' : 'Set Credits'}</Btn>
              </div>
            </div>

            {/* Create School */}
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, marginBottom: 20 }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, fontWeight: 700, fontSize: 13, color: navy, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Create New School</div>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Input value={schoolName} onChange={setSchoolName} placeholder="School / Institution Name" />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Input value={adminName} onChange={setAdminName} placeholder="Admin Full Name" />
                  <Input value={adminEmail} onChange={setAdminEmail} placeholder="Admin Email" type="email" />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Input value={adminPass} onChange={setAdminPass} placeholder="Admin Password (min 8 chars)" type="password" />
                  <Btn onClick={createSchool} disabled={creating}>{creating ? 'Creating...' : 'Create School'}</Btn>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button onClick={() => { localStorage.removeItem('dc_super_admin_token'); setSavedToken(''); }} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 12, fontFamily: font }}>Sign out of super-admin</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
