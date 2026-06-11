'use client';

import { useState } from 'react';

type ClassConfig = {
  id: string;
  teacherName: string;
  className: string;
  term: string;
};

export default function SignupForm({ config, configId }: { config: ClassConfig; configId: string }) {
  const [phone,    setPhone]    = useState('');
  const [optIn,    setOptIn]    = useState(false);
  const [step,     setStep]     = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function fmtPhone(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`;
    return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    if (!optIn) { setErrorMsg('Please check the opt-in box to continue.'); return; }
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) { setErrorMsg('Enter a valid 10-digit US cell number.'); return; }
    setStep('submitting');
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits, className: config.className, courseId: configId, term: config.term, name: 'Student', optIn }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Something went wrong. Please try again.'); setStep('error'); return; }
      setStep('success');
    } catch { setErrorMsg('Network error. Please try again.'); setStep('error'); }
  }

  const titleParts = [config.className, config.term].filter(Boolean).join(' · ');

  if (step === 'success') {
    return (
      <div style={S.page}>
        <div style={{ textAlign: 'center', color: '#fff', padding: 40 }}>
          <div style={{ fontSize: 52, lineHeight: 1 }}>🎉</div>
          <h2 style={{ margin: '14px 0 8px', fontSize: 26, fontWeight: 900 }}>You&rsquo;re signed up!</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: 15 }}>
            You&rsquo;ll receive text alerts for <strong>{config.className}</strong>.<br />
            Contact your teacher to be removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.grid}>

        {/* ── LEFT: all text ── */}
        <div style={S.left}>
          <h1 style={S.title}>Text Alerts</h1>
          {titleParts && <p style={S.classLine}>{titleParts}</p>}
          <p style={S.sub}>
            {config.teacherName
              ? <>Sign up to get updates &amp; reminders from <strong>{config.teacherName}</strong> sent straight to your phone.</>
              : 'Sign up to get class updates and reminders sent straight to your phone.'}
          </p>
          <ul style={S.bullets}>
            <li>✓&nbsp; Instant reminders — never miss a deadline</li>
            <li>✓&nbsp; Direct updates from your teacher</li>
            <li>✓&nbsp; Sign up in seconds, it&rsquo;s free</li>
          </ul>
        </div>

        {/* ── RIGHT: form ── */}
        <div style={S.right}>
          <form onSubmit={submit} noValidate>
            <div style={S.field}>
              <label style={S.fieldLabel}>Your Cell Number</label>
              <div style={S.inputWrap}>
                <span style={S.inputIcon}>📞</span>
                <input
                  type="tel"
                  placeholder="(555) 867-5309"
                  value={phone}
                  onChange={e => setPhone(fmtPhone(e.target.value))}
                  required
                  style={S.input}
                />
              </div>
            </div>

            <label style={S.checkLabel}>
              <input
                type="checkbox"
                checked={optIn}
                onChange={e => setOptIn(e.target.checked)}
                style={{ width: 17, height: 17, accentColor: '#E66000', cursor: 'pointer', flexShrink: 0, marginTop: 2 }}
              />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
                I agree to receive text message alerts for this class
              </span>
            </label>

            {errorMsg && <p style={S.error}>{errorMsg}</p>}

            <button
              type="submit"
              disabled={step === 'submitting'}
              style={step === 'submitting' ? { ...S.btn, opacity: 0.65, cursor: 'not-allowed' } : S.btn}
            >
              {step === 'submitting' ? 'Signing up…' : 'Sign Me Up! →'}
            </button>
          </form>
        </div>

      </div>

      <p style={S.footer}>
        Your number is only used for class alerts and is never sold or shared &nbsp;·&nbsp; Contact your teacher to be removed
      </p>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0770B8 0%, #045a9a 55%, #034a82 100%)',
    fontFamily: "Lato, 'Helvetica Neue', Helvetica, Arial, sans-serif",
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '32px 40px 20px',
    boxSizing: 'border-box',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 300px',
    gap: 48,
    alignItems: 'center',
    maxWidth: 860,
    margin: '0 auto',
    width: '100%',
  },
  left: {
    color: '#fff',
  },
  title: {
    margin: '0 0 4px',
    fontSize: 34,
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '-0.5px',
    lineHeight: 1.1,
    textShadow: '0 2px 6px rgba(0,0,0,0.2)',
  },
  classLine: {
    margin: '0 0 12px',
    fontSize: 16,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: '0.2px',
  },
  sub: {
    margin: '0 0 20px',
    fontSize: 15,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 1.6,
  },
  bullets: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  right: {
    background: 'rgba(255,255,255,0.10)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 14,
    padding: '28px 24px',
    backdropFilter: 'blur(8px)',
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    display: 'block',
    fontSize: 11,
    fontWeight: 800,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.8px',
    marginBottom: 6,
  },
  inputWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 11,
    fontSize: 14,
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '11px 12px 11px 34px',
    fontSize: 16,
    fontWeight: 600,
    border: '2px solid rgba(255,255,255,0.35)',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
    letterSpacing: '0.5px',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    cursor: 'pointer',
    marginBottom: 20,
  },
  btn: {
    display: 'block',
    width: '100%',
    padding: '13px',
    background: 'linear-gradient(135deg, #E66000, #c95500)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 900,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(230,96,0,0.4)',
    fontFamily: 'inherit',
    letterSpacing: '0.2px',
  },
  error: {
    color: '#ffe0b2',
    fontSize: 12,
    background: 'rgba(0,0,0,0.2)',
    borderRadius: 4,
    padding: '6px 10px',
    marginBottom: 12,
  },
  footer: {
    marginTop: 24,
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center' as const,
    letterSpacing: '0.2px',
    maxWidth: 860,
    margin: '24px auto 0',
    width: '100%',
  },
};
