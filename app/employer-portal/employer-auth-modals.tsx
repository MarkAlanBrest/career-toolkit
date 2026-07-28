'use client';

import { useEffect, useState } from 'react';
import { ModalShell, Field, primaryButtonStyle, secondaryButtonStyle } from '../lga-room/shared';
import styles from './employer-portal.module.css';

export function EmployerLoginModal({
  onClose,
  onSuccess,
  onCreateAccount,
}: {
  onClose: () => void;
  onSuccess: () => void;
  onCreateAccount: () => void;
}) {
  const [view, setView] = useState<'sign-in' | 'forgot-password'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submitSignIn() {
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/employer-portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Could not sign in.');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitForgotPassword() {
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/employer-portal/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Could not send reset email.');
      setNotice(data.message || 'If an employer account exists for that email, a reset link has been sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.');
    } finally {
      setSubmitting(false);
    }
  }

  if (view === 'forgot-password') {
    return (
      <ModalShell onClose={onClose} title="Reset your password">
        <p style={{ margin: '0 0 14px', fontSize: 13, color: '#606b78', lineHeight: 1.5 }}>
          Enter the email address for your employer account. We will email you a link to choose a new password.
        </p>
        <Field label="Email">
          <input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" />
        </Field>
        {error && <p style={{ margin: '10px 0 0', color: '#9b2c2c', fontSize: 12 }}>{error}</p>}
        {notice && <p style={{ margin: '10px 0 0', color: '#1f5f3f', fontSize: 12 }}>{notice}</p>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <button type="button" className={styles.authModalTextButton} onClick={() => { setView('sign-in'); setError(''); setNotice(''); }}>
            Back to sign in
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} style={secondaryButtonStyle}>Cancel</button>
            <button type="button" onClick={submitForgotPassword} disabled={submitting} style={primaryButtonStyle}>
              {submitting ? 'Sending…' : 'Email reset link'}
            </button>
          </div>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} title="Employer sign in">
      <p style={{ margin: '0 0 14px', fontSize: 13, color: '#606b78', lineHeight: 1.5 }}>
        Sign in if you created an employer login. Your company information will be ready and forms will be easier to complete.
        You can still use the portal without an account anytime.
      </p>
      <Field label="Email">
        <input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" />
      </Field>
      <Field label="Password">
        <input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" />
      </Field>
      <div className={styles.authModalForgotRow}>
        <button type="button" className={styles.authModalTextButton} onClick={() => { setView('forgot-password'); setError(''); setNotice(''); }}>
          Forgot your password?
        </button>
      </div>
      {error && <p className={styles.authModalError}>{error}</p>}
      <div className={styles.authModalActions}>
        <button type="button" onClick={onClose} style={secondaryButtonStyle}>Cancel</button>
        <button type="button" onClick={submitSignIn} disabled={submitting} style={primaryButtonStyle}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
      <div className={styles.authModalDivider}>
        <span>New employer?</span>
      </div>
      <button
        type="button"
        className={styles.authModalSecondaryAction}
        onClick={() => { onClose(); onCreateAccount(); }}
      >
        Create employer account
      </button>
      <p className={styles.authModalHelper}>
        Register with Career Services and optionally create a login on the registration form.
      </p>
    </ModalShell>
  );
}

export function EmployerResetPasswordPanel({
  token,
  onSuccess,
}: {
  token: string;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function validateToken() {
      setChecking(true);
      try {
        const response = await fetch(`/api/employer-portal/auth/reset-password?token=${encodeURIComponent(token)}`, {
          cache: 'no-store',
        });
        const data = await response.json();
        if (!cancelled) setValid(Boolean(data.valid));
      } catch {
        if (!cancelled) setValid(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    void validateToken();
    return () => { cancelled = true; };
  }, [token]);

  async function submit() {
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/employer-portal/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', token, password, confirmPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Could not reset password.');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.');
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return <p style={{ margin: 0, color: '#606b78', fontSize: 13 }}>Checking your reset link…</p>;
  }

  if (!valid) {
    return (
      <div>
        <p style={{ margin: '0 0 12px', color: '#606b78', fontSize: 13, lineHeight: 1.5 }}>
          This password reset link is invalid or has expired. Request a new link from the employer sign-in screen.
        </p>
        <a href="/employer-portal" style={{ color: '#001f52', fontSize: 12, fontWeight: 700 }}>Back to employer portal</a>
      </div>
    );
  }

  return (
    <div>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: '#606b78', lineHeight: 1.5 }}>
        Choose a new password for your employer account.
      </p>
      <Field label="New password">
        <input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" minLength={8} />
      </Field>
      <Field label="Confirm password">
        <input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} />
      </Field>
      {error && <p style={{ margin: '10px 0 0', color: '#9b2c2c', fontSize: 12 }}>{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button type="button" onClick={submit} disabled={submitting} style={primaryButtonStyle}>
          {submitting ? 'Saving…' : 'Save new password'}
        </button>
      </div>
    </div>
  );
}
