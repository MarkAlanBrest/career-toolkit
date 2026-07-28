'use client';

import { useState } from 'react';
import { ModalShell, Field, primaryButtonStyle, secondaryButtonStyle } from '../lga-room/shared';

export function EmployerLoginModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError('');
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
      {error && <p style={{ margin: '10px 0 0', color: '#9b2c2c', fontSize: 12 }}>{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button type="button" onClick={onClose} style={secondaryButtonStyle}>Cancel</button>
        <button type="button" onClick={submit} disabled={submitting} style={primaryButtonStyle}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
    </ModalShell>
  );
}
