'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function SignupWidget() {
  const params = useSearchParams();

  // These come from Canvas ENV (via extension postMessage) or URL params
  const [name,      setName]      = useState('');
  const [className, setClassName] = useState(params.get('class')   || '');
  const [teacher,   setTeacher]   = useState(params.get('teacher') || '');
  const [term,      setTerm]      = useState(params.get('term')    || '');
  const [ctxReady,  setCtxReady]  = useState(false);

  // Student-entered fields
  const [phone, setPhone]   = useState('');
  const [optIn, setOptIn]   = useState(false);
  const [step,  setStep]    = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (window.self === window.top) { setCtxReady(true); return; }

    const onMsg = (evt: MessageEvent) => {
      if (evt.data?.type !== 'CE_CONTEXT') return;
      if (evt.data.name)      setName(evt.data.name);
      // Only overwrite class/teacher/term if Canvas gave us something AND URL param didn't already set them
      if (evt.data.className) setClassName(prev => prev || evt.data.className);
      if (evt.data.term)      setTerm(prev => prev || evt.data.term);
      if (evt.data.teacher)   setTeacher(prev => prev || evt.data.teacher);
      setCtxReady(true);
    };

    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: 'CE_REQUEST_CONTEXT' }, '*');
    const t = setTimeout(() => setCtxReady(true), 2500);
    return () => { window.removeEventListener('message', onMsg); clearTimeout(t); };
  }, []);

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
    if (!className.trim()) { setErrorMsg('Please enter your class name.'); return; }
    setStep('submitting');
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:      name.trim()      || 'Student',
          phone:     digits,
          className: className.trim(),
          teacher:   teacher.trim()   || '—',
          term:      term.trim()      || '—',
          optIn,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Something went wrong. Please try again.'); setStep('error'); return; }
      setStep('success');
    } catch { setErrorMsg('Network error. Please try again.'); setStep('error'); }
  }

  const titleParts = [className, term].filter(Boolean).join(' · ');
  // Show fallback inputs for any field Canvas didn't fill in
  const needsClass   = ctxReady && !className;
  const needsTeacher = ctxReady && !teacher;
  const needsTerm    = ctxReady && !term;
  const hasFallbacks = needsClass || needsTeacher || needsTerm;

  if (step === 'success') {
    return (
      <div style={S.page}>
        <div style={{ textAlign: 'center', color: '#fff', padding: 32 }}>
          <div style={{ fontSize: 40, lineHeight: 1 }}>🎉</div>
          <div style={{ ...S.title, marginTop: 10 }}>
            You&rsquo;re signed up{name ? `, ${name.split(' ')[0]}` : ''}!
          </div>
          <div style={{ ...S.sub, marginTop: 6 }}>
            You&rsquo;ll get text alerts{className ? ` for ${className}` : ''}.
            &nbsp;To be removed, contact your teacher directly.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <form onSubmit={submit} noValidate>
        <div style={S.inner}>
          {/* Left: branding + greeting */}
          <div style={S.headline}>
            <div style={S.titleRow}>
              <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>📱</span>
              <div>
                <div style={S.title}>
                  Text Alerts{titleParts ? ` — ${titleParts}` : ''}
                </div>
                <div style={S.sub}>
                  {ctxReady && name
                    ? <>Hi, <strong>{name.split(' ')[0]}</strong>! Get class updates sent to your phone.</>
                    : 'Sign up to get class updates sent to your phone.'}
                </div>
              </div>
            </div>
          </div>

          {/* Right: phone + checkbox + button */}
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

        {/* Fallback inputs — only shown when Canvas ENV didn't provide the data */}
        {hasFallbacks && (
          <div style={S.fallbacks}>
            {needsClass && (
              <div style={S.fallbackField}>
                <label style={S.fallbackLabel}>Class Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Biology 101"
                  value={className}
                  onChange={e => setClassName(e.target.value)}
                  style={S.fallbackInput}
                />
              </div>
            )}
            {needsTeacher && (
              <div style={S.fallbackField}>
                <label style={S.fallbackLabel}>Teacher</label>
                <input
                  type="text"
                  placeholder="e.g. Mr. Smith"
                  value={teacher}
                  onChange={e => setTeacher(e.target.value)}
                  style={S.fallbackInput}
                />
              </div>
            )}
            {needsTerm && (
              <div style={S.fallbackField}>
                <label style={S.fallbackLabel}>Term</label>
                <input
                  type="text"
                  placeholder="e.g. Fall 2026"
                  value={term}
                  onChange={e => setTerm(e.target.value)}
                  style={S.fallbackInput}
                />
              </div>
            )}
          </div>
        )}
      </form>

      {errorMsg && <div style={S.error}>{errorMsg}</div>}

      <div style={S.footer}>
        Your number is only used for class alerts and is never sold or shared &nbsp;·&nbsp; Contact your teacher to be removed
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ background: '#0770B8', minHeight: '100vh' }} />}>
      <SignupWidget />
    </Suspense>
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
  inner: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
    color: '#fff',
  },
  headline: {
    flex: '1 1 220px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '-0.3px',
    lineHeight: 1.2,
    textShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  sub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 4,
    lineHeight: 1.4,
  },
  form: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    flex: '1 1 340px',
  },
  inputWrap: {
    position: 'relative',
    flex: '1 1 160px',
    minWidth: 150,
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 10,
    fontSize: 14,
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '9px 12px 9px 32px',
    fontSize: 15,
    fontWeight: 600,
    border: '2px solid rgba(255,255,255,0.4)',
    borderRadius: 6,
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    letterSpacing: '0.5px',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    cursor: 'pointer',
    flexShrink: 0,
  },
  btn: {
    padding: '9px 18px',
    background: 'linear-gradient(135deg, #E66000, #c95500)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 900,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxShadow: '0 3px 10px rgba(230,96,0,0.4)',
    fontFamily: 'inherit',
    letterSpacing: '0.2px',
    flexShrink: 0,
  },
  fallbacks: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 12,
    padding: '10px 12px',
    background: 'rgba(0,0,0,0.15)',
    borderRadius: 8,
  },
  fallbackField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    flex: '1 1 140px',
    minWidth: 120,
  },
  fallbackLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  fallbackInput: {
    padding: '6px 10px',
    fontSize: 13,
    border: '1.5px solid rgba(255,255,255,0.3)',
    borderRadius: 5,
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  },
  error: {
    marginTop: 8,
    fontSize: 12,
    color: '#ffe0b2',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: 4,
    padding: '5px 10px',
  },
  footer: {
    marginTop: 8,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    letterSpacing: '0.2px',
  },
};
