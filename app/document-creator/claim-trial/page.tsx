'use client';

import { useEffect, useState } from 'react';

export default function ClaimTrial() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/document-creator/auth/claim-trial', { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setStatus('ok');
          setMsg(`${d.credits.toLocaleString()} credits added to your account!`);
          setTimeout(() => { window.location.href = '/document-creator/admin'; }, 2000);
        } else {
          setStatus('error');
          setMsg(d.error || 'Something went wrong.');
        }
      })
      .catch(() => { setStatus('error'); setMsg('Network error.'); });
  }, []);

  const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F1F5F9', fontFamily: font, flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 40 }}>{status === 'loading' ? '⏳' : status === 'ok' ? '✅' : '❌'}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#1E293B' }}>
        {status === 'loading' ? 'Adding credits...' : msg}
      </div>
      {status === 'ok' && <div style={{ fontSize: 13, color: '#64748B' }}>Redirecting to admin panel...</div>}
      {status === 'error' && (
        <a href="/document-creator/admin" style={{ fontSize: 13, color: '#1E4D8C' }}>Go to admin panel</a>
      )}
    </div>
  );
}
