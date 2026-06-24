'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type Signup = {
  id: number;
  name: string;
  phone: string;
  className: string;
  teacher?: string;
  term: string;
  createdAt: string;
};

function formatPhone(d: string) {
  const s = d.replace(/\D/g, '');
  if (s.length !== 10) return d;
  return `(${s.slice(0, 3)}) ${s.slice(3, 6)}-${s.slice(6)}`;
}

function Dashboard() {
  const params = useSearchParams();
  const [teacher, setTeacher] = useState(params.get('teacher') || '');
  const [cls, setCls] = useState(params.get('class') || '');
  const [token, setToken] = useState(params.get('token') || '');
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      const saved = window.localStorage.getItem('signup_admin_token') || '';
      if (saved) setToken(saved);
    }
  }, [token]);

  async function load() {
    if (!teacher.trim()) { setError('Enter a teacher name to filter signups.'); return; }
    setLoading(true); setError('');
    try {
      const qs = new URLSearchParams({ teacher: teacher.trim() });
      if (cls.trim()) qs.set('class', cls.trim());
      if (token.trim()) qs.set('token', token.trim());
      const res = await fetch(`/api/signup?${qs}`);
      const data = await res.json();
      if (!res.ok) {
        setError(res.status === 401 ? 'Unauthorized. Enter the signup admin token.' : data.error || 'Failed to load');
        setSignups([]);
      }
      else {
        if (token.trim()) window.localStorage.setItem('signup_admin_token', token.trim());
        setSignups(data.signups);
        setFetched(true);
      }
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  }

  function exportCSV() {
    const header = 'Name,Phone,Class,Teacher,Term,Signed Up\n';
    const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = signups.map(s =>
      [s.name, formatPhone(s.phone), s.className, s.teacher || '', s.term, new Date(s.createdAt).toLocaleString()]
        .map(csvCell).join(',')
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'text-alert-signups.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ fontFamily: "Lato, 'Helvetica Neue', Helvetica, Arial, sans-serif", maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ background: 'linear-gradient(135deg, #0770B8, #055fa0)', color: '#fff', borderRadius: 10, padding: '24px 28px', marginBottom: 28, boxShadow: '0 4px 16px rgba(7,112,184,0.25)' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>📋 Text Alert Signups</h1>
        <p style={{ margin: '6px 0 0', opacity: 0.88, fontSize: 14 }}>View and export students who signed up for text notifications.</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 200px' }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Teacher Name</label>
          <input value={teacher} onChange={e => setTeacher(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Mr. Smith" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 200px' }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Class (optional)</label>
          <input value={cls} onChange={e => setCls(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="All classes" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 200px' }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admin Token</label>
          <input value={token} onChange={e => setToken(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Required when configured" type="password" style={inputStyle} />
        </div>
        <button onClick={load} disabled={loading} style={{ padding: '10px 22px', background: '#0770B8', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: 'pointer', height: 40 }}>
          {loading ? 'Loading…' : 'Search'}
        </button>
        {signups.length > 0 && (
          <button onClick={exportCSV} style={{ padding: '10px 22px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: 'pointer', height: 40 }}>
            ⬇ Export CSV
          </button>
        )}
      </div>

      {error && <p style={{ color: '#c0392b', background: '#fdf2f2', border: '1px solid #f5c6cb', borderRadius: 6, padding: '10px 14px', fontSize: 14 }}>{error}</p>}

      {fetched && (
        <div>
          <p style={{ color: '#555', fontSize: 14, marginBottom: 12 }}>
            <strong>{signups.length}</strong> signup{signups.length !== 1 ? 's' : ''} found.
          </p>
          {signups.length === 0 ? (
            <p style={{ color: '#888', fontSize: 14 }}>No signups found for that filter.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f5f7fa', borderBottom: '2px solid #dde' }}>
                    {['Name', 'Phone', 'Class', 'Term', 'Signed Up'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#2d3b45', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {signups.map((s, i) => (
                    <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fbfc', borderBottom: '1px solid #eee' }}>
                      <td style={tdStyle}>{s.name}</td>
                      <td style={tdStyle}>{formatPhone(s.phone)}</td>
                      <td style={tdStyle}>{s.className}</td>
                      <td style={tdStyle}>{s.term}</td>
                      <td style={{ ...tdStyle, color: '#888', fontSize: 12 }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '9px 12px', border: '1.5px solid #c7d7e4', borderRadius: 6,
  fontSize: 14, color: '#2d3b45', outline: 'none', fontFamily: 'inherit', height: 40, boxSizing: 'border-box',
};
const tdStyle: React.CSSProperties = { padding: '9px 14px', color: '#333' };

export default function SignupsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#555' }}>Loading…</div>}>
      <Dashboard />
    </Suspense>
  );
}
