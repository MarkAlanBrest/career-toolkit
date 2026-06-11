'use client';

import { useState } from 'react';

type ClassConfig = {
  id: string;
  teacherName: string;
  className: string;
  term: string;
};

export default function SignupForm({ config, configId }: { config: ClassConfig; configId: string }) {
  const [phone,  setPhone]  = useState('');
  const [optIn,  setOptIn]  = useState(false);
  const [step,   setStep]   = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const titleParts = [config.className, config.term].filter(Boolean).join(' · ');

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
        body: JSON.stringify({
          phone:     digits,
          className: config.className,
          courseId:  configId,
          term:      config.term,
          name:      'Student',
          optIn,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Something went wrong. Please try again.'); setStep('error'); return; }
      setStep('success');
    } catch { setErrorMsg('Network error. Please try again.'); setStep('error'); }
  }

  if (step === 'success') {
    return (
      <div style={S.page}>
        <div style={{ textAlign: 'center', color: '#fff', padding: 32 }}>
          <div style={{ fontSize: 40, lineHeight: 1 }}>🎉</div>
          <div style={{ ...S.title, marginTop: 10 }}>You&rsquo;re signed up!</div>
          <div style={{ ...S.sub, marginTop: 6 }}>
            You&rsquo;ll get text alerts for <strong>{config.className}</strong>.
            &nbsp;Contact your teacher to be removed.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <form onSubmit={submit} noValidate>
        <div style={S.inner}>
          <div style={S.headline}>
            <div style={S.titleRow}>
              <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>📱</span>
              <div>
                <div style={S.title}>Text Alerts — {titleParts}</div>
                <div style={S.sub}>
                  {config.teacherName
                    ? <>Sign up to get updates from <strong>{config.teacherName}</strong> sent to your phone.</>
                    : 'Sign up to get class updates sent to your phone.'}
                </div>
              </div>
            </div>
          </div>

          <div style={S.form}>
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

            <label style={S.checkLabel}>
              <input
                type="checkbox"
                checked={optIn}
                onChange={e => setOptIn(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#fff', cursor: 'pointer', flexShrink: 0, marginTop: 1 }}
              />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', lineHeight: 1.3 }}>
                I agree to receive<br />class text alerts
              </span>
            </label>

            <button
              type="submit"
              disabled={step === 'submitting'}
              style={step === 'submitting' ? { ...S.btn, opacity: 0.65, cursor: 'not-allowed' } : S.btn}
            >
              {step === 'submitting' ? 'Signing up…' : 'Sign Me Up! →'}
            </button>
          </div>
        </div>
      </form>

      {errorMsg && <div style={S.error}>{errorMsg}</div>}

      <div style={S.footer}>
        Your number is only used for class alerts and is never sold or shared &nbsp;·&nbsp; Contact your teacher to be removed
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0770B8 0%, #045a9a 60%, #034a82 100%)',
    fontFamily: "Lato, 'Helvetica Neue', Helvetica, Arial, sans-serif",
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    boxSizing: 'border-box',
    padding: '16px 24px 10px',
  },
  inner:    { display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', color: '#fff' },
  headline: { flex: '1 1 220px' },
  titleRow: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  title: { fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.2, textShadow: '0 1px 3px rgba(0,0,0,0.2)' },
  sub:   { fontSize: 13, color: 'rgba(255,255,255,0.88)', marginTop: 4, lineHeight: 1.4 },
  form:  { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: '1 1 340px' },
  inputWrap: { position: 'relative', flex: '1 1 160px', minWidth: 150, display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: 10, fontSize: 14, pointerEvents: 'none' },
  input: {
    width: '100%', padding: '9px 12px 9px 32px', fontSize: 15, fontWeight: 600,
    border: '2px solid rgba(255,255,255,0.4)', borderRadius: 6,
    background: 'rgba(255,255,255,0.15)', color: '#fff', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit', letterSpacing: '0.5px',
  },
  checkLabel: { display: 'flex', alignItems: 'flex-start', gap: 6, cursor: 'pointer', flexShrink: 0 },
  btn: {
    padding: '9px 18px', background: 'linear-gradient(135deg, #E66000, #c95500)',
    color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 900,
    cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 3px 10px rgba(230,96,0,0.4)',
    fontFamily: 'inherit', flexShrink: 0,
  },
  error:  { marginTop: 8, fontSize: 12, color: '#ffe0b2', background: 'rgba(0,0,0,0.2)', borderRadius: 4, padding: '5px 10px' },
  footer: { marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.55)', textAlign: 'center', letterSpacing: '0.2px' },
};
