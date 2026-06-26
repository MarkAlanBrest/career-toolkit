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
type TeamMember = { email: string; accountId: string | null; name: string };
type UsageEvent = {
  accountId?: string;
  teacherName?: string;
  teacherEmail?: string;
  credits?: number;
  meter?: string;
  model?: string;
  createdAt?: string;
};
type TeamData = {
  ownerEnabled: boolean;
  ownedTeam: {
    balance: number;
    used: number;
    members: TeamMember[];
    recentUsage: UsageEvent[];
  };
  sharedTeams: {
    id: string;
    label: string;
    ownerEmail?: string;
    balance: number;
    used: number;
  }[];
};

const ink  = '#1B303D';
const blue = '#0770B8';
const line = '#D8E1E8';
const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 11px', border: `1px solid ${line}`, borderRadius: 6,
  fontSize: 13, fontFamily: font, color: ink, boxSizing: 'border-box', outline: 'none',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: '#526A79',
  textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5,
};

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function TeamPanel({ accountId, enabledHint }: { accountId: string; enabledHint: boolean }) {
  const [team, setTeam] = useState<TeamData | null>(null);
  const [memberEmail, setMemberEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadTeam = () => {
    if (!accountId) return;
    fetch(`/api/credits/team?accountId=${encodeURIComponent(accountId)}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) setTeam(data);
      })
      .catch(() => {});
  };

  useEffect(loadTeam, [accountId]);

  const updateMember = async (action: 'add' | 'remove', email: string) => {
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
        body: JSON.stringify({ accountId, action, email: cleanEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update teachers.');
      setTeam(prev => prev ? { ...prev, ownerEnabled: true, ownedTeam: data.ownedTeam } : prev);
      setMemberEmail('');
      setMessage(action === 'add' ? 'Teacher added.' : 'Teacher removed.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not update teachers.');
    } finally {
      setLoading(false);
    }
  };

  if (!accountId) return null;

  const ownerEnabled = Boolean(team?.ownerEnabled || enabledHint);

  return (
    <section style={{ borderTop: `1px solid ${line}`, paddingTop: 16, display: 'grid', gap: 12 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#526A79', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Department sharing
        </div>
        <div style={{ marginTop: 5, fontSize: 12, lineHeight: 1.55, color: '#526A79' }}>
          Add teachers by email. They can use shared department credits and still buy their own personal credits.
        </div>
      </div>

      {ownerEnabled ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ border: `1px solid ${line}`, borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 11, color: '#526A79' }}>Shared balance</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: ink }}>{(team?.ownedTeam.balance || 0).toLocaleString()}</div>
            </div>
            <div style={{ border: `1px solid ${line}`, borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 11, color: '#526A79' }}>Shared used</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: ink }}>{(team?.ownedTeam.used || 0).toLocaleString()}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
            <input
              type="email"
              value={memberEmail}
              onChange={e => setMemberEmail(e.target.value)}
              placeholder="teacher@school.edu"
              style={inputStyle}
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => updateMember('add', memberEmail)}
              style={{ padding: '0 14px', border: 'none', borderRadius: 8, background: blue, color: '#fff', fontWeight: 800, cursor: loading ? 'wait' : 'pointer' }}
            >
              Add
            </button>
          </div>

          {!!team?.ownedTeam.members.length && (
            <div style={{ display: 'grid', gap: 7 }}>
              {team.ownedTeam.members.map(member => (
                <div key={member.email} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', fontSize: 12, color: ink }}>
                  <div>
                    <strong>{member.name || member.email}</strong>
                    {member.name && <span style={{ color: '#526A79' }}> · {member.email}</span>}
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => updateMember('remove', member.email)}
                    style={{ border: `1px solid ${line}`, borderRadius: 7, background: '#fff', color: '#526A79', padding: '5px 8px', cursor: loading ? 'wait' : 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {!!team?.ownedTeam.recentUsage.length && (
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#526A79', textTransform: 'uppercase' }}>Recent shared usage</div>
              {team.ownedTeam.recentUsage.slice(0, 5).map((event, index) => (
                <div key={`${event.createdAt || ''}-${index}`} style={{ fontSize: 12, color: '#526A79', lineHeight: 1.45 }}>
                  {event.teacherName || event.teacherEmail || 'Teacher'} used {Number(event.credits || 0)} credits for {event.meter || 'AI'}.
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ border: `1px solid ${line}`, borderRadius: 8, padding: 10, fontSize: 12, lineHeight: 1.55, color: '#526A79', background: '#fff' }}>
          Buy AI credits to enable department sharing. The buyer becomes the owner and can add or remove teachers.
        </div>
      )}

      {!!team?.sharedTeams.length && (
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#526A79', textTransform: 'uppercase' }}>Shared with me</div>
          {team.sharedTeams.map(shared => (
            <div key={shared.id} style={{ fontSize: 12, color: '#526A79', lineHeight: 1.45 }}>
              {shared.label}: {shared.balance.toLocaleString()} credits available
            </div>
          ))}
        </div>
      )}

      {message && (
        <div style={{ fontSize: 12, color: message.includes('Could') || message.includes('valid') || message.includes('Buy') ? '#DC2626' : '#15803D' }}>
          {message}
        </div>
      )}
    </section>
  );
}

function CheckoutForm({ packPrice, accountId, name, email, onSuccess }: {
  packPrice: string; accountId: string; name: string; email: string; onSuccess: () => void;
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

    // Save profile (non-blocking — don't delay payment if this fails)
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
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 12, color: '#526A79', lineHeight: 1.55 }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          style={{ width: 14, height: 14, marginTop: 2, cursor: 'pointer', flexShrink: 0 }}
        />
        <span>
          I agree to the{' '}
          <a href="https://career-toolkit-ruby.vercel.app/terms" target="_blank" rel="noopener noreferrer"
            style={{ color: blue, textDecoration: 'underline' }}>Terms of Purchase</a>
          {' '}and{' '}
          <a href="https://career-toolkit-ruby.vercel.app/privacy" target="_blank" rel="noopener noreferrer"
            style={{ color: blue, textDecoration: 'underline' }}>Privacy Policy</a>
          . Credits are non-refundable. Auto-reload (if enabled) will charge my card automatically.
        </span>
      </label>
      {errMsg && (
        <div style={{ fontSize: 13, color: '#DC2626', padding: '8px 10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6 }}>
          {errMsg}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || !elements || loading || !agreed}
        style={{
          padding: '13px 0', background: loading ? '#94a3b8' : blue, color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700,
          cursor: loading ? 'wait' : 'pointer', fontFamily: font, transition: 'background .15s',
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
  const [creditTarget, setCreditTarget] = useState<'personal' | 'shared'>('personal');
  const [saveCard, setSaveCard] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingSecret, setLoadingSecret] = useState(false);
  const [secretError, setSecretError] = useState('');
  const [success, setSuccess] = useState(false);

  // Read URL params on mount, then load saved profile
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('accountId') || '';
    setAccountId(id);
    const packParam = params.get('pack') as PackKey | null;
    if (packParam && PACKS.find(p => p.key === packParam)) setSelectedPack(packParam);
    if (params.get('target') === 'shared') setCreditTarget('shared');
    if (params.get('saveCard') === 'true') setSaveCard(true);

    if (id) {
      fetch(`/api/credits/profile?accountId=${encodeURIComponent(id)}`)
        .then(r => r.json())
        .then(data => {
          if (data.profile?.name)  setName(data.profile.name);
          if (data.profile?.email) setEmail(data.profile.email);
        })
        .catch(() => {});
    }
  }, []);

  // Auto-fetch PaymentIntent; debounce when name/email change to avoid
  // creating a new PI on every keystroke
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
        body: JSON.stringify({ accountId, pack: selectedPack, saveCard, name, email, creditTarget }),
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
    }, delay);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [accountId, selectedPack, saveCard, name, email, creditTarget]);

  const handleSuccess = () => {
    const pack = PACKS.find(p => p.key === selectedPack)!;
    setSuccess(true);
    window.parent.postMessage({ type: 'CE_PAYMENT_SUCCESS', credits: pack.credits, creditTarget }, '*');
  };

  if (success) {
    const pack = PACKS.find(p => p.key === selectedPack)!;
    return (
      <div style={{ fontFamily: font, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>✓</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#15803D' }}>
          {pack.credits.toLocaleString()} credits added!
        </div>
        <div style={{ fontSize: 14, color: '#526A79' }}>
          {creditTarget === 'shared' ? 'Your shared department balance has been updated.' : 'Your personal balance has been updated.'}
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

      {/* Balance target */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#526A79', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
          Add credits to
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            ['personal', 'My credits', 'Only I use these credits.'],
            ['shared', 'Department credits', 'Teachers I add can use these credits.'],
          ].map(([key, label, help]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCreditTarget(key as 'personal' | 'shared')}
              style={{
                padding: '10px 9px',
                border: `2px solid ${creditTarget === key ? blue : line}`,
                borderRadius: 8,
                background: creditTarget === key ? '#EDF5FF' : '#fff',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: creditTarget === key ? blue : ink }}>{label}</div>
              <div style={{ fontSize: 11, color: '#526A79', marginTop: 3, lineHeight: 1.35 }}>{help}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Name + Email */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle}>Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Jane Smith"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="jane@school.edu"
            style={inputStyle}
          />
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

      <TeamPanel accountId={accountId} enabledHint={creditTarget === 'shared'} />

      {/* Error */}
      {secretError && (
        <div style={{ fontSize: 13, color: '#DC2626', padding: '8px 10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6 }}>
          {secretError}
        </div>
      )}

      {/* Payment form */}
      {loadingSecret && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#526A79', fontSize: 13 }}>
          Loading checkout…
        </div>
      )}
      {clientSecret && (
        <Elements stripe={stripePromise} options={elementsOptions}>
          <CheckoutForm
            packPrice={currentPack.price}
            accountId={accountId}
            name={name}
            email={email}
            onSuccess={handleSuccess}
          />
        </Elements>
      )}
    </div>
  );
}
