'use client';

import { useEffect, useState } from 'react';

type ClassConfig = {
  id: string;
  teacherName: string;
  className: string;
  term: string;
};

export default function SignupForm({ config }: { config: ClassConfig; configId: string }) {
  const [studentName, setStudentName] = useState('');
  const [courseId, setCourseId] = useState('');
  const [courseName, setCourseName] = useState(config.className);
  const [phone, setPhone] = useState('');
  const [optIn, setOptIn] = useState(false);
  const [step, setStep] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const onMsg = (evt: MessageEvent) => {
      if (evt.data?.type !== 'CE_CONTEXT') return;
      if (evt.data.name || evt.data.studentName) setStudentName(evt.data.name || evt.data.studentName);
      if (evt.data.courseId || evt.data.course_id) setCourseId(String(evt.data.courseId || evt.data.course_id));
      if (evt.data.className || evt.data.courseName) setCourseName(evt.data.className || evt.data.courseName);
    };
    window.addEventListener('message', onMsg);

    const refCourse = document.referrer.match(/\/courses\/(\d+)/)?.[1];
    if (refCourse) setCourseId(prev => prev || refCourse);

    let attempts = 0;
    const requestContext = () => {
      if (window.self === window.top) return;
      window.parent.postMessage({ type: 'CE_REQUEST_CONTEXT' }, '*');
      attempts += 1;
      if (attempts >= 8) window.clearInterval(timer);
    };
    requestContext();
    const timer = window.setInterval(requestContext, 500);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('message', onMsg);
    };
  }, []);

  function fmtPhone(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
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
          phone: digits,
          className: courseName || config.className,
          courseId,
          term: config.term,
          name: studentName.trim() || 'Student',
          optIn,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong. Please try again.');
        setStep('error');
        return;
      }
      setStep('success');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStep('error');
    }
  }

  if (step === 'success') {
    return (
      <div style={S.page}>
        <div style={S.success}>Signed up!</div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <form onSubmit={submit} noValidate>
        <div style={S.inner}>
          <label style={S.checkLabel}>
            <input
              type="checkbox"
              aria-label="I agree to receive text messages"
              checked={optIn}
              onChange={e => setOptIn(e.target.checked)}
              style={S.checkbox}
            />
            <span style={S.checkText}>I agree to receive text messages</span>
          </label>

          <input
            type="tel"
            aria-label="Cell phone number"
            placeholder="(555) 867-5309"
            value={phone}
            onChange={e => setPhone(fmtPhone(e.target.value))}
            required
            style={S.input}
          />

          <button
            type="submit"
            disabled={step === 'submitting'}
            style={step === 'submitting' ? { ...S.btn, opacity: 0.65, cursor: 'not-allowed' } : S.btn}
          >
            {step === 'submitting' ? 'Signing up...' : 'Sign Up'}
          </button>
        </div>
      </form>
      {errorMsg && <div style={S.error}>{errorMsg}</div>}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'transparent',
    fontFamily: "Lato, 'Helvetica Neue', Helvetica, Arial, sans-serif",
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    boxSizing: 'border-box',
    padding: 8,
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    background: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    padding: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    flex: '0 1 auto',
  },
  checkbox: {
    width: 20,
    height: 20,
    accentColor: '#0770B8',
    cursor: 'pointer',
    flexShrink: 0,
  },
  checkText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
  },
  input: {
    flex: '0 0 155px',
    width: 155,
    padding: '9px 11px',
    fontSize: 15,
    fontWeight: 600,
    border: '1px solid #c7cdd1',
    borderRadius: 6,
    background: '#fff',
    color: '#111827',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  btn: {
    padding: '10px 16px',
    background: '#0770B8',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 900,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
    flexShrink: 0,
  },
  error: {
    marginTop: 6,
    fontSize: 12,
    color: '#b91c1c',
    background: '#fef2f2',
    borderRadius: 4,
    padding: '5px 8px',
  },
  success: {
    color: '#047857',
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: 6,
    padding: '10px 12px',
    fontSize: 14,
    fontWeight: 700,
    textAlign: 'center',
  },
};
