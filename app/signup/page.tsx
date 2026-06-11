'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function SignupForm() {
  const params = useSearchParams();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [className, setClassName] = useState('');
  const [teacher, setTeacher] = useState('');
  const [term, setTerm] = useState('');
  const [optIn, setOptIn] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (params.get('class')) setClassName(params.get('class')!);
    if (params.get('teacher')) setTeacher(params.get('teacher')!);
    if (params.get('term')) setTerm(params.get('term')!);
  }, [params]);

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!optIn) { setErrorMsg('Please check the opt-in box to continue.'); return; }
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) { setErrorMsg('Please enter a valid 10-digit US phone number.'); return; }
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone: digits, className, teacher, term, optIn }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Something went wrong. Try again.'); setStatus('error'); return; }
      setStatus('success');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h2 style={{ color: '#0770B8', fontSize: 26, fontWeight: 800, margin: '0 0 12px' }}>
              You&rsquo;re signed up!
            </h2>
            <p style={{ color: '#555', fontSize: 15, lineHeight: 1.5 }}>
              You&rsquo;ll receive text alerts for <strong>{className}</strong> with{' '}
              <strong>{teacher}</strong> this <strong>{term}</strong>.
            </p>
            <p style={{ color: '#888', fontSize: 13, marginTop: 16 }}>
              Reply STOP at any time to unsubscribe.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header banner */}
      <div style={styles.banner}>
        <div style={styles.bannerIcon}>📱</div>
        <div>
          <h1 style={styles.bannerTitle}>Sign Up for Text Alerts!</h1>
          <p style={styles.bannerSub}>
            Get class updates &amp; reminders sent straight to your phone.
            <br />
            Never miss a deadline or announcement again!
          </p>
        </div>
      </div>

      <div style={styles.card}>
        <form onSubmit={handleSubmit} noValidate>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Your Name *</label>
            <input
              style={styles.input}
              type="text"
              placeholder="First Last"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Cell Phone Number *</label>
            <input
              style={styles.input}
              type="tel"
              placeholder="(555) 867-5309"
              value={phone}
              onChange={e => setPhone(formatPhone(e.target.value))}
              required
            />
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label style={styles.label}>Class Name *</label>
              <input
                style={styles.input}
                type="text"
                placeholder="Biology 101"
                value={className}
                onChange={e => setClassName(e.target.value)}
                required
              />
            </div>
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label style={styles.label}>Term *</label>
              <input
                style={styles.input}
                type="text"
                placeholder="Fall 2026"
                value={term}
                onChange={e => setTerm(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Teacher Name *</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Mr. / Ms. Smith"
              value={teacher}
              onChange={e => setTeacher(e.target.value)}
              required
            />
          </div>

          <label style={styles.checkRow}>
            <input
              type="checkbox"
              checked={optIn}
              onChange={e => setOptIn(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#0770B8', cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, color: '#444', lineHeight: 1.4 }}>
              I agree to receive text message alerts from my teacher for this class.
              Message &amp; data rates may apply. Reply STOP to unsubscribe.
            </span>
          </label>

          {errorMsg && <p style={styles.error}>{errorMsg}</p>}

          <button
            type="submit"
            disabled={status === 'loading'}
            style={status === 'loading' ? { ...styles.submitBtn, ...styles.submitBtnDisabled } : styles.submitBtn}
          >
            {status === 'loading' ? 'Signing you up…' : '✅  Sign Me Up — It\'s Free!'}
          </button>
        </form>
      </div>

      <p style={styles.footer}>
        Your number is only used for class alerts from your teacher and will never be sold or shared.
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#555' }}>Loading…</div>}>
      <SignupForm />
    </Suspense>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #e8f4fd 0%, #f5faff 60%, #fff 100%)',
    fontFamily: "Lato, 'Helvetica Neue', Helvetica, Arial, sans-serif",
    padding: '0 0 32px',
    boxSizing: 'border-box',
  },
  banner: {
    background: 'linear-gradient(135deg, #0770B8 0%, #055fa0 100%)',
    color: '#fff',
    padding: '28px 32px',
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    boxShadow: '0 4px 16px rgba(7,112,184,0.3)',
  },
  bannerIcon: {
    fontSize: 52,
    lineHeight: 1,
    flexShrink: 0,
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
  },
  bannerTitle: {
    margin: '0 0 6px',
    fontSize: 26,
    fontWeight: 900,
    letterSpacing: '-0.5px',
    textShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  bannerSub: {
    margin: 0,
    fontSize: 14,
    opacity: 0.92,
    lineHeight: 1.5,
  },
  card: {
    maxWidth: 520,
    margin: '28px auto 0',
    background: '#fff',
    borderRadius: 10,
    boxShadow: '0 2px 20px rgba(0,0,0,0.10)',
    padding: '28px 32px',
    border: '1px solid #dde8f0',
  },
  fieldGroup: {
    marginBottom: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  row: {
    display: 'flex',
    gap: 12,
    marginBottom: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    color: '#2d3b45',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 15,
    border: '1.5px solid #c7d7e4',
    borderRadius: 6,
    outline: 'none',
    color: '#2d3b45',
    background: '#fff',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  },
  checkRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 20,
    cursor: 'pointer',
    marginTop: 4,
  },
  submitBtn: {
    display: 'block',
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #E66000 0%, #c95500 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 17,
    fontWeight: 900,
    letterSpacing: '0.3px',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(230,96,0,0.35)',
    transition: 'opacity 0.15s, transform 0.1s',
    fontFamily: 'inherit',
  },
  submitBtnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  error: {
    color: '#c0392b',
    fontSize: 13,
    background: '#fdf2f2',
    border: '1px solid #f5c6cb',
    borderRadius: 5,
    padding: '8px 12px',
    marginBottom: 12,
  },
  footer: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginTop: 16,
    padding: '0 24px',
    lineHeight: 1.5,
  },
};
