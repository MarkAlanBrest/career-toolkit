'use client';

import { useEffect, useState } from 'react';
import { formatPrice, Product } from '@/lib/products';

type AdminSummary = {
  products: Product[];
  stats?: Record<string, number | null>;
  billingProvider?: string;
  accountModel?: string;
  generatedAt?: string;
  error?: string;
};

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
const blue = '#0770B8';
const navy = '#2d3b45';

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [savedToken, setSavedToken] = useState('');
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem('ce_admin_token') || '';
    setToken(stored);
    setSavedToken(stored);
  }, []);

  useEffect(() => {
    if (!savedToken) return;
    let cancelled = false;
    setLoading(true);
    fetch('/api/admin/summary', { headers: { 'x-admin-token': savedToken } })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || 'Admin request failed.');
        return data as AdminSummary;
      })
      .then(data => { if (!cancelled) setSummary(data); })
      .catch(error => { if (!cancelled) setSummary({ products: [], error: error instanceof Error ? error.message : 'Admin request failed.' }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [savedToken]);

  function saveToken() {
    window.localStorage.setItem('ce_admin_token', token.trim());
    setSavedToken(token.trim());
  }

  const creditPacks = summary?.products || [];

  return (
    <main style={{ minHeight: '100vh', background: '#f4f6f8', fontFamily: font, color: navy }}>
      <header style={{ background: blue, color: '#fff', padding: '22px 28px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 24, lineHeight: 1.2, margin: 0 }}>Canvas Enhancer Admin</h1>
            <div style={{ fontSize: 13, opacity: 0.88, marginTop: 4 }}>PayPal billing, Canvas-based access, no app passwords.</div>
          </div>
          <a href="/pricing" style={{ color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>Pricing</a>
        </div>
      </header>

      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '28px' }}>
        <div style={{ background: '#fff', border: '1px solid #d8dde3', borderRadius: 8, padding: 18, marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Admin token</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              value={token}
              onChange={event => setToken(event.target.value)}
              type="password"
              placeholder="Enter ADMIN_TOKEN"
              style={{ flex: '1 1 260px', minWidth: 0, border: '1px solid #c7cdd4', borderRadius: 6, padding: '10px 12px', fontSize: 14 }}
            />
            <button onClick={saveToken} style={{ background: blue, color: '#fff', border: 'none', borderRadius: 6, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}>
              Load
            </button>
          </div>
          {summary?.error && <div style={{ color: '#b42318', fontSize: 13, marginTop: 10 }}>{summary.error}</div>}
          {loading && <div style={{ color: '#6b7780', fontSize: 13, marginTop: 10 }}>Loading admin data...</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginBottom: 18 }}>
          {Object.entries(summary?.stats || {}).map(([label, value]) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #d8dde3', borderRadius: 8, padding: 16 }}>
              <div style={{ textTransform: 'capitalize', fontSize: 12, color: '#6b7780', marginBottom: 6 }}>{label.replace(/([A-Z])/g, ' $1')}</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{value ?? 'n/a'}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 18 }}>
          <section style={{ background: '#fff', border: '1px solid #d8dde3', borderRadius: 8, padding: 18 }}>
            <h2 style={{ fontSize: 17, margin: '0 0 14px' }}>AI Credit Packs</h2>
            {creditPacks.map(product => (
              <div key={product.key} style={{ borderTop: '1px solid #edf0f2', padding: '14px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <strong>{product.name}</strong>
                  <span>{formatPrice(product.priceCents)}</span>
                </div>
                <div style={{ color: '#6b7780', fontSize: 13, marginTop: 4 }}>{product.description}</div>
              </div>
            ))}
          </section>

          <section style={{ background: '#fff', border: '1px solid #d8dde3', borderRadius: 8, padding: 18 }}>
            <h2 style={{ fontSize: 17, margin: '0 0 14px' }}>Billing Setup</h2>
            <div style={{ fontSize: 14, lineHeight: 1.7 }}>
              Provider: <strong>{summary?.billingProvider || 'paypal'}</strong><br />
              Account model: <strong>{summary?.accountModel || 'canvas_identity_plus_license'}</strong><br />
              Last refresh: <strong>{summary?.generatedAt ? new Date(summary.generatedAt).toLocaleString() : 'Not loaded'}</strong>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
