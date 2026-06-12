'use client';

import { useState } from 'react';

const BASE = 'https://career-toolkit-ruby.vercel.app';

export default function SetupPage() {
  const [teacherName, setTeacherName] = useState('');
  const [className,   setClassName]   = useState('');
  const [term,        setTerm]        = useState('');
  const [step,        setStep]        = useState<'form' | 'loading' | 'done'>('form');
  const [signupUrl,   setSignupUrl]   = useState('');
  const [copied,      setCopied]      = useState<'link' | 'embed' | null>(null);
  const [error,       setError]       = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!className.trim() || !term.trim()) { setError('Class name and term are required.'); return; }
    setStep('loading');
    try {
      const res = await fetch('/api/class-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherName: teacherName.trim(), className: className.trim(), term: term.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); setStep('form'); return; }
      setSignupUrl(`${BASE}/signup/${data.id}`);
      setStep('done');
    } catch { setError('Network error. Please try again.'); setStep('form'); }
  }

  function copyLink() {
    navigator.clipboard.writeText(signupUrl).then(() => {
      setCopied('link');
      setTimeout(() => setCopied(null), 2500);
    });
  }

  function copyEmbed() {
    const code = `<iframe src="${signupUrl}" width="100%" height="80" frameborder="0" style="border:none; width:100%; min-height:80px;"></iframe>`;
    navigator.clipboard.writeText(code).then(() => {
      setCopied('embed');
      setTimeout(() => setCopied(null), 2500);
    });
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={{ fontSize: 40 }}>📱</div>
        <div>
          <h1 style={S.headerTitle}>Text Alert Signup Setup</h1>
          <p style={S.headerSub}>Create a signup page for your class — takes 30 seconds.</p>
        </div>
      </div>

      <div style={S.card}>
        {step !== 'done' ? (
          <form onSubmit={handleCreate} noValidate>
            <h2 style={S.cardTitle}>Your Class Info</h2>
            <p style={S.cardSub}>Fill this in once. You&rsquo;ll get a link to share with your students.</p>

            <div style={S.field}>
              <label style={S.label}>Your Name</label>
              <input style={S.input} type="text" placeholder="Ms. Johnson" value={teacherName}
                onChange={e => setTeacherName(e.target.value)} />
            </div>

            <div style={S.field}>
              <label style={S.label}>Class Name *</label>
              <input style={S.input} type="text" placeholder="e.g. English 101, AP Biology, Algebra II"
                value={className} onChange={e => setClassName(e.target.value)} required />
            </div>

            <div style={S.field}>
              <label style={S.label}>Term *</label>
              <input style={S.input} type="text" placeholder="e.g. Fall 2026, Spring 2026"
                value={term} onChange={e => setTerm(e.target.value)} required />
            </div>

            {error && <p style={S.error}>{error}</p>}

            <button type="submit" disabled={step === 'loading'} style={step === 'loading' ? { ...S.btn, opacity: 0.6 } : S.btn}>
              {step === 'loading' ? 'Creating…' : 'Create My Signup Page →'}
            </button>
          </form>
        ) : (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
              <h2 style={{ ...S.cardTitle, textAlign: 'center' }}>Your signup page is ready!</h2>
              <p style={{ ...S.cardSub, textAlign: 'center' }}>
                Share this link with your students. They click it, enter their phone number, and they&rsquo;re signed up.
              </p>
            </div>

            <div style={S.urlBox}>
              <span style={{ flex: 1, fontSize: 14, color: '#2d3b45', wordBreak: 'break-all' }}>{signupUrl}</span>
              <button onClick={copyLink} style={S.copyBtn}>
                {copied === 'link' ? '✓ Copied!' : 'Copy Link'}
              </button>
            </div>

            <button onClick={copyEmbed} style={{ ...S.outlineBtn, width: '100%', marginTop: 10, fontSize: 13 }}>
              {copied === 'embed' ? '✓ Embed Code Copied!' : '📋 Copy as Embed Code (for Canvas page editor)'}
            </button>

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <a href={signupUrl} target="_blank" rel="noreferrer"
                style={{ ...S.btn, textDecoration: 'none', textAlign: 'center', flex: 1 }}>
                Preview Page ↗
              </a>
              <button onClick={() => { setStep('form'); setClassName(''); setTerm(''); setTeacherName(''); setCopied(null); }}
                style={{ ...S.outlineBtn, flex: 1 }}>
                Create Another Class
              </button>
            </div>

            <p style={{ marginTop: 20, fontSize: 12, color: '#999', textAlign: 'center' }}>
              Share the link in a Canvas announcement, email, or anywhere students can see it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #e8f4fd 0%, #f5faff 60%, #fff 100%)',
    fontFamily: "Lato, 'Helvetica Neue', Helvetica, Arial, sans-serif",
    padding: '0 0 40px',
  },
  header: {
    background: 'linear-gradient(135deg, #0770B8 0%, #055fa0 100%)',
    color: '#fff',
    padding: '28px 32px',
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    boxShadow: '0 4px 16px rgba(7,112,184,0.3)',
  },
  headerTitle: { margin: '0 0 4px', fontSize: 24, fontWeight: 900 },
  headerSub:   { margin: 0, fontSize: 14, opacity: 0.9 },
  card: {
    maxWidth: 480,
    margin: '36px auto 0',
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 2px 24px rgba(0,0,0,0.10)',
    padding: '32px 36px',
    border: '1px solid #dde8f0',
  },
  cardTitle: { margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#2d3b45' },
  cardSub:   { margin: '0 0 24px', fontSize: 14, color: '#666' },
  field:     { marginBottom: 18 },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: '#555',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: 5,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 15,
    border: '1.5px solid #c7d7e4',
    borderRadius: 6,
    outline: 'none',
    color: '#2d3b45',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  btn: {
    display: 'block',
    width: '100%',
    padding: '13px',
    background: 'linear-gradient(135deg, #0770B8, #055fa0)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 800,
    cursor: 'pointer',
    marginTop: 8,
    fontFamily: 'inherit',
  },
  outlineBtn: {
    display: 'block',
    padding: '13px',
    background: '#fff',
    color: '#0770B8',
    border: '2px solid #0770B8',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  urlBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#f0f7ff',
    border: '1.5px solid #b3d4f0',
    borderRadius: 8,
    padding: '12px 14px',
  },
  copyBtn: {
    padding: '7px 14px',
    background: '#0770B8',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
    fontFamily: 'inherit',
  },
  error: {
    color: '#c0392b',
    background: '#fdf2f2',
    border: '1px solid #f5c6cb',
    borderRadius: 5,
    padding: '8px 12px',
    fontSize: 13,
    marginBottom: 12,
  },
};
