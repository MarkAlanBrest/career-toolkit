'use client';

import { useEffect, useState } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const PACKS = [
  { key: 'starter', label: 'Starter', price: '$10', credits: 1000 },
  { key: 'teacher', label: 'Teacher', price: '$20', credits: 2000 },
  { key: 'department', label: 'Department', price: '$50', credits: 5000 },
] as const;

type PackKey = typeof PACKS[number]['key'];
type TeacherContact = { email: string; accountId: string | null; name: string };
type TransferEvent = { id?: string; recipientEmail?: string; credits?: number; status?: string; createdAt?: string };
type TeacherData = {
  credits: { balance: number; used: number };
  teachers: TeacherContact[];
  transfers: TransferEvent[];
};

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

function TeacherCreditPanel({ accountId }: { accountId: string }) {
  const [data, setData] = useState<TeacherData | null>(null);
  const [teacherEmail, setTeacherEmail] = useState('');
  const [sendAmounts, setSendAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => {
    if (!accountId) return;
    fetch(`/api/credits/team?accountId=${encodeURIComponent(accountId)}`)
      .then(r => r.json())
      .then(result => {
        if (!result.error) setData(result);
      })
      .catch(() => {});
  };

  useEffect(load, [accountId]);

  const update = async (action: 'add' | 'remove' | 'send', email: string, credits?: number) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setMessage('Enter a valid teacher email.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/credits/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, action, email: cleanEmail, credits }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Could not update teachers.');

      setData(result);
      setTeacherEmail('');
      setSendAmounts(prev => ({ ...prev, [cleanEmail]: '' }));
      setMessage(action === 'add' ? 'Teacher added.' : action === 'remove' ? 'Teacher removed.' : 'Credits sent.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not update teachers.');
    } finally {
      setLoading(false);
    }
  };

  if (!accountId) {
    return (
      <section style={{ borderTop: `1px solid ${line}`, paddingTop: 16, display: 'grid', gap: 8 }}>
        <div style={sectionLabel}>Teacher credit sharing</div>
        <div style={noteBox}>
          Open AI Credits from the Canvas Enhancer toolbar to add teachers and send credits. The toolbar sends the account ID this screen needs.
        </div>
      </section>
    );
  }

  return (
    <section style={{ borderTop: `1px solid ${line}`, paddingTop: 16, display: 'grid', gap: 12 }}>
      <div>
        <div style={sectionLabel}>Teacher credit sharing</div>
        <div style={{ marginTop: 5, fontSize: 12, lineHeight: 1.55, color: '#526A79' }}>
          Add teachers by email. Send any amount from your balance. Once sent, the credits belong to that teacher.
        </div>
      </div>

      <div style={{ border: `1px solid ${line}`, borderRadius: 8, padding: 10, background: '#fff' }}>
        <div style={{ fontSize: 11, color: '#526A79' }}>Your available credits</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: ink }}>{(data?.credits.balance || 0).toLocaleString()}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
        <input
          type="email"
          value={teacherEmail}
          onChange={e => setTeacherEmail(e.target.value)}
          placeholder="teacher@school.edu"
          style={inputStyle}
        />
        <button type="button" disabled={loading} onClick={() => update('add', teacherEmail)} style={blueButton}>
          Add
        </button>
      </div>

      {!!data?.teachers.length && (
        <div style={{ display: 'grid', gap: 9 }}>
          {data.teachers.map(teacher => {
            const amount = sendAmounts[teacher.email] || '';

            return (
              <div key={teacher.email} style={{ border: `1px solid ${line}`, borderRadius: 8, padding: 10, background: '#fff', display: 'grid', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', fontSize: 12, color: ink }}>
                  <div>
                    <strong>{teacher.name || teacher.email}</strong>
                    {teacher.name && <span style={{ color: '#526A79' }}> - {teacher.email}</span>}
                    {!teacher.accountId && <span style={{ color: '#526A79' }}> - credits will wait until they open the app</span>}
                  </div>
                  <button type="button" disabled={loading} onClick={() => update('remove', teacher.email)} style={lightButton}>
                    Remove
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={e => setSendAmounts(prev => ({ ...prev, [teacher.email]: e.target.value }))}
                    placeholder="Credits to send"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => update('send', teacher.email, Math.floor(Number(amount || 0)))}
                    style={greenButton}
                  >
                    Send
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!!data?.transfers.length && (
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#526A79', textTransform: 'uppercase' }}>Recent sent credits</div>
          {data.transfers.slice(0, 5).map((transfer, index) => (
            <div key={transfer.id || index} style={{ fontSize: 12, color: '#526A79', lineHeight: 1.45 }}>
              Sent {Number(transfer.credits || 0).toLocaleString()} credits to {transfer.recipientEmail || 'teacher'} ({transfer.status || 'sent'}).
            </div>
          ))}
        </div>
      )}

      {message && (
        <div style={{ fontSize: 12, color: message.includes('Could') || message.includes('valid') || message.includes('Not') ? '#DC2626' : green }}>
          {message}
        </div>
      )}
    </section>
  );
}

function CheckoutForm({ packPrice, accountId, name, email, onSuccess }: {
  packPrice: string;
  accountId: string;
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
      body: JSON.stringify({ accountId, name: name.trim(), email: email.trim() }),
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
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          style={{ width: 14, height: 14, marginTop: 2, cursor: 'pointer', flexShrink: 0 }}
        />
        <span>
          I agree to the{' '}
          <a href="https://career-toolkit-ruby.vercel.app/terms" target="_blank" rel="noopener noreferrer" style={{ color: blue, textDecoration: 'underline' }}>Terms of Purchase</a>
          {' '}and{' '}
          <a href="https://career-toolkit-ruby.vercel.app/privacy" target="_blank" rel="noopener noreferrer" style={{ color: blue, textDecoration: 'underline' }}>Privacy Policy</a>
          . Credits are non-refundable. Auto-reload, if enabled, will charge my card automatically.
        </span>
      </label>
      {errMsg && <div style={errorBox}>{errMsg}</div>}
      <button type="submit" disabled={!stripe || !elements || loading || !agreed} style={{ ...blueButton, padding: '13px 0', borderRadius: 8 }}>
        {loading ? 'Processing...' : `Pay ${packPrice}`}
      </button>
      <div style={{ textAlign: 'center', fontSize: 11, color: '#8BA5B5' }}>Secured by Stripe</div>
    </form>
  );
}

export default function BuyCreditsPage() {
  const [accountId, setAccountId] = useState('');
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
    const packParam = params.get('pack') as PackKey | null;
    setAccountId(id);
    if (packParam && PACKS.find(p => p.key === packParam)) setSelectedPack(packParam);
    if (params.get('saveCard') === 'true') setSaveCard(true);

    if (id) {
      fetch(`/api/credits/profile?accountId=${encodeURIComponent(id)}`)
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
    let cancelled = false;

    const delay = name || email ? 700 : 0;
    const timer = setTimeout(() => {
      setLoadingSecret(true);
      setSecretError('');
      setClientSecret(null);
      fetch('/api/stripe/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, pack: selectedPack, saveCard, name, email }),
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
  }, [accountId, selectedPack, saveCard, name, email]);

  const currentPack = PACKS.find(p => p.key === selectedPack)!;
  const elementsOptions: StripeElementsOptions = clientSecret
    ? { clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: blue, fontFamily: font, borderRadius: '6px' } } }
    : {};

  if (success) {
    return (
      <div style={{ fontFamily: font, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: green }}>
          {currentPack.credits.toLocaleString()} credits added.
        </div>
        <div style={{ fontSize: 14, color: '#526A79' }}>Your balance has been updated.</div>
        <button onClick={() => window.parent.postMessage({ type: 'CE_CLOSE_CHECKOUT' }, '*')} style={blueButton}>
          Done
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: font, color: ink, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={sectionLabel}>Select a pack</div>
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

      <TeacherCreditPanel accountId={accountId} />

      {secretError && <div style={errorBox}>{secretError}</div>}
      {loadingSecret && <div style={{ textAlign: 'center', padding: '24px 0', color: '#526A79', fontSize: 13 }}>Loading checkout...</div>}
      {clientSecret && (
        <Elements stripe={stripePromise} options={elementsOptions}>
          <CheckoutForm
            packPrice={currentPack.price}
            accountId={accountId}
            name={name}
            email={email}
            onSuccess={() => {
              setSuccess(true);
              window.parent.postMessage({ type: 'CE_PAYMENT_SUCCESS', credits: currentPack.credits }, '*');
            }}
          />
        </Elements>
      )}
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

const greenButton: React.CSSProperties = {
  ...blueButton,
  background: green,
};

const lightButton: React.CSSProperties = {
  border: `1px solid ${line}`,
  borderRadius: 7,
  background: '#fff',
  color: '#526A79',
  padding: '5px 8px',
  cursor: 'pointer',
  fontFamily: font,
};

const noteBox: React.CSSProperties = {
  border: `1px solid ${line}`,
  borderRadius: 8,
  padding: 10,
  fontSize: 12,
  lineHeight: 1.55,
  color: '#526A79',
  background: '#fff',
};

const errorBox: React.CSSProperties = {
  fontSize: 13,
  color: '#DC2626',
  padding: '8px 10px',
  background: '#FEF2F2',
  border: '1px solid #FECACA',
  borderRadius: 6,
};
