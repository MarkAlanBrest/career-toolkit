'use client';

import { useState, useEffect } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const PACKS = [
  { key: 'starter',    label: 'Starter',    price: '$10', credits: 1000 },
  { key: 'teacher',    label: 'Teacher',    price: '$20', credits: 2000 },
  { key: 'department', label: 'Department', price: '$50', credits: 5000 },
] as const;
type PackKey = typeof PACKS[number]['key'];

const ink  = '#1B303D';
const blue = '#0770B8';
const line = '#D8E1E8';
const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

function CheckoutForm({ packPrice, onSuccess }: { packPrice: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || loading) return;
    setLoading(true);
    setErrMsg('');

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      setLoading(false);
      setErrMsg(error.message || 'Payment failed. Please try again.');
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      onSuccess();
    } else {
      setLoading(false);
      setErrMsg('Payment did not complete. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PaymentElement options={{ layout: 'tabs' }} />
      {errMsg && (
        <div style={{ fontSize: 13, color: '#DC2626', padding: '8px 10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6 }}>
          {errMsg}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || !elements || loading}
        style={{
          padding: '13px 0',
          background: loading ? '#94a3b8' : blue,
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 700,
          cursor: loading ? 'wait' : 'pointer',
          fontFamily: font,
          transition: 'background .15s',
        }}
      >
        {loading ? 'Processing…' : `Pay ${packPrice}`}
      </button>
      <div style={{ textAlign: 'center', fontSize: 11, color: '#8BA5B5', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
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
  const [success, setSuccess] = useState(false);

  // Read URL params once on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('accountId') || '';
    setAccountId(id);
    const packParam = params.get('pack') as PackKey | null;
    if (packParam && PACKS.find(p => p.key === packParam)) setSelectedPack(packParam);
    if (params.get('saveCard') === 'true') setSaveCard(true);
  }, []);

  // Auto-fetch PaymentIntent whenever accountId, pack, or saveCard changes
  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    setLoadingSecret(true);
    setSecretError('');
    setClientSecret(null);
    fetch('/api/stripe/payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, pack: selectedPack, saveCard }),
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (!data.clientSecret) throw new Error(data.error || 'Could not start checkout.');
        setClientSecret(data.clientSecret);
      })
      .catch(err => {
        if (cancelled) return;
        setSecretError(err instanceof Error ? err.message : 'Could not start checkout.');
      })
      .finally(() => { if (!cancelled) setLoadingSecret(false); });
    return () => { cancelled = true; };
  }, [accountId, selectedPack, saveCard]);

  const handleSuccess = () => {
    const pack = PACKS.find(p => p.key === selectedPack)!;
    setSuccess(true);
    // Post credits added back to hub — hub updates balance optimistically
    window.parent.postMessage({ type: 'CE_PAYMENT_SUCCESS', credits: pack.credits }, '*');
  };

  if (success) {
    const pack = PACKS.find(p => p.key === selectedPack)!;
    return (
      <div style={{ fontFamily: font, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>✓</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#15803D' }}>
          {pack.credits.toLocaleString()} credits added!
        </div>
        <div style={{ fontSize: 14, color: '#526A79' }}>Your account has been updated.</div>
        <button
          onClick={() => window.parent.postMessage({ type: 'CE_CLOSE_CHECKOUT' }, '*')}
          style={{ marginTop: 8, padding: '10px 24px', background: blue, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: font }}
        >
          Done
        </button>
      </div>
    );
  }

  const currentPack = PACKS.find(p => p.key === selectedPack)!;
  const elementsOptions: StripeElementsOptions = clientSecret
    ? { clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: blue, fontFamily: font, borderRadius: '6px' } } }
    : {};

  return (
    <div style={{ fontFamily: font, color: ink, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Pack selector */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#526A79', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
          Select a pack
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {PACKS.map(pack => (
            <button
              key={pack.key}
              type="button"
              onClick={() => setSelectedPack(pack.key)}
              style={{
                padding: '10px 6px',
                border: `2px solid ${selectedPack === pack.key ? blue : line}`,
                borderRadius: 8,
                background: selectedPack === pack.key ? '#EDF5FF' : '#fff',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all .12s',
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
          onChange={e => setSaveCard(e.target.checked)}
          style={{ width: 16, height: 16, cursor: 'pointer' }}
        />
        Save card for automatic top-ups
      </label>

      {/* Error */}
      {secretError && (
        <div style={{ fontSize: 13, color: '#DC2626', padding: '8px 10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6 }}>
          {secretError}
        </div>
      )}

      {/* Payment form — loads automatically */}
      {loadingSecret && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#526A79', fontSize: 13 }}>
          Loading checkout…
        </div>
      )}
      {clientSecret && (
        <Elements stripe={stripePromise} options={elementsOptions}>
          <CheckoutForm packPrice={currentPack.price} onSuccess={handleSuccess} />
        </Elements>
      )}
    </div>
  );
}
