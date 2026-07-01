'use client';

import { useState, FormEvent, useEffect } from 'react';

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
const navy = '#1E293B';
const blue = '#1E4D8C';
const lightBlue = '#2563EB';
const border = '#E2E8F0';
const muted = '#64748B';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: navy, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: `1px solid ${border}`,
  borderRadius: 8, fontSize: 14, fontFamily: font, color: navy,
  outline: 'none', boxSizing: 'border-box',
};

export default function DocumentCreatorSignup() {
  const [schoolName, setSchoolName] = useState('');
  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [checking, setChecking]     = useState(true);

  useEffect(() => {
    fetch('/api/document-creator/auth/session')
      .then(r => r.json())
      .then(d => { if (d.session) window.location.href = '/document-creator/admin'; else setChecking(false); })
      .catch(() => setChecking(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const resp = await fetch('/api/document-creator/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolName, name, email: email.trim().toLowerCase(), password }),
      });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error || 'Sign up failed.'); return; }
      window.location.href = '/document-creator/admin';
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F1F5F9', fontFamily: font }}>
        <div style={{ color: muted, fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F1F5F9', fontFamily: font, padding: '24px 16px' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 440, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🗂️</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: navy, letterSpacing: '-0.3px' }}>Document Creator</div>
          <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>Create your school account</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="School / Institution Name">
            <input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value)} required
              placeholder="Riverside Technical College" style={inputStyle}
              onFocus={e => { e.target.style.borderColor = lightBlue; }} onBlur={e => { e.target.style.borderColor = border; }} />
          </Field>

          <Field label="Your Full Name">
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              placeholder="Jane Smith" style={inputStyle}
              onFocus={e => { e.target.style.borderColor = lightBlue; }} onBlur={e => { e.target.style.borderColor = border; }} />
          </Field>

          <Field label="Email Address">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="admin@school.edu" style={inputStyle}
              onFocus={e => { e.target.style.borderColor = lightBlue; }} onBlur={e => { e.target.style.borderColor = border; }} />
          </Field>

          <Field label="Password">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="At least 8 characters" style={inputStyle}
              onFocus={e => { e.target.style.borderColor = lightBlue; }} onBlur={e => { e.target.style.borderColor = border; }} />
          </Field>

          <Field label="Confirm Password">
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
              placeholder="Re-enter password" style={inputStyle}
              onFocus={e => { e.target.style.borderColor = lightBlue; }} onBlur={e => { e.target.style.borderColor = border; }} />
          </Field>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#DC2626' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ background: blue, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: font, marginTop: 6 }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: muted }}>
          Already have an account?{' '}
          <a href="/document-creator/login" style={{ color: blue, textDecoration: 'none', fontWeight: 600 }}>Sign in</a>
        </div>
      </div>

      <div style={{ marginTop: 20, fontSize: 11, color: '#94A3B8' }}>
        Powered by Career Toolkit ·{' '}
        <a href="https://career-toolkit-ruby.vercel.app/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#94A3B8' }}>Privacy</a>
      </div>
    </div>
  );
}
