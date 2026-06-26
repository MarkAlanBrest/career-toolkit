'use client';

import { useState, useEffect, useCallback } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const PACKS = [
  { key: 'starter',    label: 'Starter',        price: '$10', cents: 1000, credits: 1000 },
  { key: 'teacher',    label: 'Teacher',         price: '$20', cents: 2000, credits: 2000 },
  { key: 'department', label: 'Department',      price: '$50', cents: 5000, credits: 5000 },
] as const;
type PackKey = typeof PACKS[number]['key'];

const ink  = '#1B303D';
const blue = '#0770B8';
const line = '#D8E1E8';
const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

function CheckoutForm({ accountId, pack, saveCard, credits, onSuccess }: {
  accountId: string; pack: PackKey; saveCard: boolean; credits: number; onSuccess: (newBalance: number) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || status === 'loading') return;
    setStatus('loading');
    setErrMsg('');

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      setStatus('error');
      setErrMsg(error.message || 'Payment failed. Please try again.');
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      // The webhook adds credits; we also fetch the new balance to report back
      try {
        const res = await fetch(`/api/credits/status?accountId=${encodeURIComponent(accountId)}`);
        const data = await res.json();
        onSuccess(data.balance ?? 0);
      } catch {
        onSuccess(credits); // optimistic fallback
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PaymentElement options={{ layout: 'tabs' }} />
      {saveCard && (
        <div style={{ fontSize: 12, color: '#526A79', padding: '8px 10px', background: '#F4F8FB', border: `1px solid ${line}`, borderRadius: 6 }}>
          Your card will be saved for automatic top-ups. You can change this anytime in the credits panel.
        </div>
      )}
      {errMsg && (
        <div style={{ fontSize: 13, color: '#DC2626', padding: '8px 10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6 }}>
          {errMsg}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || !elements || status === 'loading'}
        style={{
          padding: '13px 0', background: status === 'loading' ? '#94a3b8' : blue, color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: status === 'loading' ? 'wait' : 'pointer',
          fontFamily: font, transition: 'background .15s',
        }}
      >
        {status === 'loading' ? 'Processing…' : `Pay ${PACKS.find(p => p.key === pack)?.price}`}
      </button>
      <div style={{ textAlign: 'center', fontSize: 11, color: '#8BA5B5', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Secured by Stripe
      </div>
    </form>
  );
}

export default function BuyCreditsPage() {
  const [accountId, setAccountId] = useState('');
  const [selectedPack, setSelectedPack] = useState<PackKey>('teacher');
  const [saveCard, setSaveCard] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingSecret, setLoadingSecret] = useState(false);
  const [secretError, setSecretError] = useState('');
  const [success, setSuccess] = useState<{ credits: number; balance: number } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('accountId') || '';
    setAccountId(id);
    const packParam = params.get('pack') as PackKey | null;
    if (packParam && PACKS.find(p => p.key === packParam)) setSelectedPack(packParam);
    if (params.get('saveCard') === 'true') setSaveCard(true);
  }, []);

  const fetchClientSecret = useCallback(async (pack: PackKey, save: boolean) => {
    if (!accountId) return;
    setLoadingSecret(true);
    setSecretError('');
    setClientSecret(null);
    try {
      const res = await fetch('/api/stripe/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, pack, saveCard: save }),
      });
      const data = await res.json();
      if (!res.ok || !data.clientSecret) throw new Error(data.error || 'Could not start checkout.');
      setClientSecret(data.clientSecret);
    } catch (err) {
      setSecretError(err instanceof Error ? err.message : 'Could not start checkout.');
    } finally {
      setLoadingSecret(false);
    }
  }, [accountId]);

  const handlePackSelect = (pack: PackKey) => {
    setSelectedPack(pack);
    setClientSecret(null);
  };

  const handleSaveCardToggle = (val: boolean) => {
    setSaveCard(val);
    setClientSecret(null);
  };

  const handleSuccess = (balance: number) => {
    const pack = PACKS.find(p => p.key === selectedPack)!;
    setSuccess({ credits: pack.credits, balance });
    window.parent.postMessage({ type: 'CE_PAYMENT_SUCCESS', credits: pack.credits, balance }, '*');
  };

  if (success) {
    return (
      <div style={{ fontFamily: font, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>✓</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#15803D' }}>{success.credits.toLocaleString()} credits added!</div>
        <div style={{ fontSize: 14, color: '#526A79' }}>
          New balance: <strong>{success.balance.toLocaleString()}</strong> credits
        </div>
        <button
          onClick={() => window.parent.postMessage({ type: 'CE_CLOSE_CHECKOUT' }, '*')}
          style={{ marginTop: 8, padding: '10px 24px', background: blue, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: font }}
        >
          Done
        </button>
      </div>
    );
  }

  const elementsOptions: StripeElementsOptions = clientSecret
    ? { clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: blue, fontFamily: font, borderRadius: '6px' } } }
    : {};

  return (
    <div style={{ fontFamily: font, color: ink, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Pack selector */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#526A79', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
          Select a pack
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {PACKS.map(pack => (
            <button
              key={pack.key}
              type="button"
              onClick={() => handlePackSelect(pack.key)}
              style={{
                padding: '10px 6px', border: `2px solid ${selectedPack === pack.key ? blue : line}`,
                borderRadius: 8, background: selectedPack === pack.key ? '#EDF5FF' : '#fff',
                cursor: 'pointer', textAlign: 'center', transition: 'all .12s',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 800, color: selectedPack === pack.key ? blue : ink }}>{pack.price}</div>
              <div style={{ fontSize: 11, color: '#526A79', marginTop: 2 }}>{pack.credits.toLocaleString()} cr</div>
            </button>
          ))}
        </div>
      </div>

      {/* Save card toggle */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: ink }}>
        <input
          type="checkbox"
          checked={saveCard}
          onChange={e => handleSaveCardToggle(e.target.checked)}
          style={{ width: 16, height: 16, cursor: 'pointer' }}
        />
        Save card for automatic top-ups
      </label>

      {/* Payment form or CTA */}
      {clientSecret ? (
        <Elements stripe={stripePromise} options={elementsOptions}>
          <CheckoutForm
            accountId={accountId}
            pack={selectedPack}
            saveCard={saveCard}
            credits={PACKS.find(p => p.key === selectedPack)!.credits}
            onSuccess={handleSuccess}
          />
        </Elements>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {secretError && (
            <div style={{ fontSize: 13, color: '#DC2626', padding: '8px 10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6 }}>
              {secretError}
            </div>
          )}
          <button
            type="button"
            disabled={!accountId || loadingSecret}
            onClick={() => fetchClientSecret(selectedPack, saveCard)}
            style={{
              padding: '13px 0', background: (!accountId || loadingSecret) ? '#94a3b8' : blue, color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700,
              cursor: (!accountId || loadingSecret) ? 'wait' : 'pointer', fontFamily: font,
            }}
          >
            {loadingSecret ? 'Loading…' : `Pay with Card — ${PACKS.find(p => p.key === selectedPack)?.price}`}
          </button>
        </div>
      )}
    </div>
  );
}
