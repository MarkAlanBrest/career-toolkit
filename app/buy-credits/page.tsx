'use client';

import { useEffect, useState } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const PACKS = [
  { key: 'starter', label: 'Starter',    price: '$10',  credits: 1000  },
  { key: 'teacher', label: 'Teacher',    price: '$20',  credits: 2000  },
  { key: 'power',   label: 'Power User', price: '$50',  credits: 5000  },
  { key: 'school',  label: 'School',     price: '$250', credits: 25000 },
] as const;

type PackKey = typeof PACKS[number]['key'];

const ink = '#1B303D';
const blue = '#0770B8';
const green = '#15803D';
const line = '#D8E1E8';
const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 11px',
  border: `1px solid ${line}`,
  borderRadius: 6,
  fontSize: 13,
  fontFamily: font,
  color: ink,
  boxSizing: 'border-box',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: '#526A79',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  marginBottom: 5,
};

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function CheckoutForm({ packPrice, accountId, accountToken, name, email, onSuccess }: {
  packPrice: string;
  accountId: string;
  accountToken: string;
  name: string;
  email: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || loading) return;

    if (!name.trim() || !isValidEmail(email)) {
      setErrMsg('Please enter your name and a valid email address above.');
      return;
    }

    setLoading(true);
    setErrMsg('');

    fetch('/api/credits/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, accountToken, name: name.trim(), email: email.trim() }),
    }).catch(() => {});

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      setLoading(false);
      setErrMsg(error.message || 'Payment failed. Please try again.');
      return;
    }

    if (paymentIntent?.status === 'succeeded') onSuccess();
    else {
      setLoading(false);
      setErrMsg('Payment did not complete. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PaymentElement options={{ layout: 'tabs' }} />
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 12, color: '#526A79', lineHeight: 1.55 }}>
        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ width: 14, height: 14, marginTop: 2, cursor: 'pointer', flexShrink: 0 }} />
        <span>
          I agree to the{' '}
          <a href="https://career-toolkit-ruby.vercel.app/terms" target="_blank" rel="noopener noreferrer" style={{ color: blue, textDecoration: 'underline' }}>Terms of Purchase</a>
          {' '}and{' '}
          <a href="https://career-toolkit-ruby.vercel.app/privacy" target="_blank" rel="noopener noreferrer" style={{ color: blue, textDecoration: 'underline' }}>Privacy Policy</a>
          . Credits are non-refundable. Auto-reload, if enabled, will charge my card automatically.
        </span>
      </label>
      {errMsg && <div style={errorBox}>{errMsg}</div>}
      <button type="submit" disabled={!stripe || !elements || loading || !agreed} style={{ ...blueButton, padding: '13px 0' }}>
        {loading ? 'Processing...' : `Pay ${packPrice}`}
      </button>
      <div style={{ textAlign: 'center', fontSize: 11, color: '#8BA5B5' }}>Secured by Stripe</div>
    </form>
  );
}

export default function BuyCreditsPage() {
  const [accountId, setAccountId] = useState('');
  const [accountToken, setAccountToken] = useState('');
  const [selectedPack, setSelectedPack] = useState<PackKey>('teacher');
  const [saveCard, setSaveCard] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingSecret, setLoadingSecret] = useState(false);
  const [secretError, setSecretError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('accountId') || '';
    const token = params.get('accountToken') || '';
    const packParam = params.get('pack') as PackKey | null;
    setAccountId(id);
    setAccountToken(token);
    if (packParam && PACKS.find(p => p.key === packParam)) setSelectedPack(packParam);
    if (params.get('saveCard') === 'true') setSaveCard(true);

    if (id) {
      fetch(`/api/credits/profile?accountId=${encodeURIComponent(id)}&accountToken=${encodeURIComponent(token)}`)
        .then(r => r.json())
        .then(data => {
          if (data.profile?.name) setName(data.profile.name);
          if (data.profile?.email) setEmail(data.profile.email);
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!accountId) return;
    if (!accountToken) {
      setSecretError('Reopen this screen from the Canvas Enhancer toolbar so it can verify your credit account.');
      return;
    }
    let cancelled = false;

    const delay = name || email ? 700 : 0;
    const timer = setTimeout(() => {
      setLoadingSecret(true);
      setSecretError('');
      setClientSecret(null);
      fetch('/api/stripe/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, accountToken, pack: selectedPack, saveCard, name, email }),
      })
        .then(r => r.json())
        .then(data => {
          if (cancelled) return;
          if (!data.clientSecret) throw new Error(data.error || 'Could not start checkout.');
          setClientSecret(data.clientSecret);
        })
        .catch(err => {
          if (!cancelled) setSecretError(err instanceof Error ? err.message : 'Could not start checkout.');
        })
        .finally(() => {
          if (!cancelled) setLoadingSecret(false);
        });
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [accountId, accountToken, selectedPack, saveCard, name, email]);

  const currentPack = PACKS.find(p => p.key === selectedPack)!;
  const elementsOptions: StripeElementsOptions = clientSecret
    ? { clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: blue, fontFamily: font, borderRadius: '6px' } } }
    : {};

  if (success) {
    return (
      <div style={{ fontFamily: font, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: green }}>{currentPack.credits.toLocaleString()} credits added.</div>
        <div style={{ fontSize: 14, color: '#526A79' }}>Your balance has been updated.</div>
        <button onClick={() => window.parent.postMessage({ type: 'CE_CLOSE_CHECKOUT' }, '*')} style={blueButton}>Done</button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: font, color: ink, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section style={{ display: 'grid', gap: 14 }}>
        <div>
          <div style={sectionLabel}>Buy credits</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
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
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 800, color: selectedPack === pack.key ? blue : ink }}>{pack.price}</div>
                <div style={{ fontSize: 11, color: '#526A79', marginTop: 2 }}>{pack.credits.toLocaleString()} cr</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@school.edu" style={inputStyle} />
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: ink }}>
          <input type="checkbox" checked={saveCard} onChange={e => setSaveCard(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
          Save card for automatic top-ups
        </label>

        {secretError && <div style={errorBox}>{secretError}</div>}
        {loadingSecret && <div style={{ textAlign: 'center', padding: '24px 0', color: '#526A79', fontSize: 13 }}>Loading checkout...</div>}
        {clientSecret && (
          <Elements stripe={stripePromise} options={elementsOptions}>
            <CheckoutForm
              packPrice={currentPack.price}
              accountId={accountId}
              accountToken={accountToken}
              name={name}
              email={email}
              onSuccess={() => {
                setSuccess(true);
                window.parent.postMessage({ type: 'CE_PAYMENT_SUCCESS', credits: currentPack.credits }, '*');
              }}
            />
          </Elements>
        )}
      </section>
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: '#526A79',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: 8,
};

const blueButton: React.CSSProperties = {
  padding: '10px 14px',
  border: 'none',
  borderRadius: 8,
  background: blue,
  color: '#fff',
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: font,
};

const errorBox: React.CSSProperties = {
  fontSize: 13,
  color: '#DC2626',
  padding: '8px 10px',
  background: '#FEF2F2',
  border: '1px solid #FECACA',
  borderRadius: 6,
};
