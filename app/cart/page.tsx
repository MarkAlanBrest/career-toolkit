'use client';

import { useMemo, useState } from 'react';
import SiteNav from '../components/SiteNav';
import { formatPrice, PRODUCTS } from '@/lib/products';
import type { Product, ProductKey } from '@/lib/products';

type CartState = Partial<Record<ProductKey, number>>;

const navy = '#2d3b45';
const blue = '#0770B8';
const border = '#d8dde3';
const light = '#f4f6f8';
const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

function cycleText(product: Product) {
  return product.cycle === 'monthly' ? '/mo' : '';
}

function metricText(product: Product, quantity = 1) {
  const total = product.included * quantity;
  if (total === 0) return 'No AI usage included';
  if (product.meter === 'creation') return `${total} page creations`;
  return `${total} graded papers`;
}

export default function CartPage() {
  const subscriptions = PRODUCTS.filter(product => product.kind === 'subscription');
  const addons = PRODUCTS.filter(product => product.kind === 'addon');
  const [cart, setCart] = useState<CartState>({ creation_tools: 1 });
  const [message, setMessage] = useState('');
  const [checkoutMethod, setCheckoutMethod] = useState<'card' | 'paypal' | null>(null);

  const selected = useMemo(() => {
    return PRODUCTS
      .map(product => ({ product, quantity: cart[product.key] || 0 }))
      .filter(item => item.quantity > 0);
  }, [cart]);

  const monthlyTotal = selected
    .filter(item => item.product.kind === 'subscription')
    .reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);

  const oneTimeTotal = selected
    .filter(item => item.product.kind === 'addon')
    .reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);

  function setSubscription(product: Product) {
    setMessage('');
    setCart(current => {
      const next = { ...current };
      for (const item of subscriptions) {
        if (item.meter === product.meter) delete next[item.key];
      }
      next[product.key] = 1;
      return next;
    });
  }

  function setAddon(product: Product, quantity: number) {
    setMessage('');
    setCart(current => {
      const next = { ...current };
      if (quantity <= 0) delete next[product.key];
      else next[product.key] = quantity;
      return next;
    });
  }

  async function startCheckout(method: 'card' | 'paypal') {
    if (!selected.length) {
      setMessage('Choose at least one package.');
      return;
    }
    const items = selected.map(item => ({ key: item.product.key, quantity: item.quantity }));
    window.localStorage.setItem('ce_checkout_cart', JSON.stringify(items));
    setCheckoutMethod(method);
    setMessage('');
    try {
      const response = await fetch('/api/paypal/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, items }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) throw new Error(data?.error || 'Could not start checkout.');
      window.location.href = data.url;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not start checkout.');
      setCheckoutMethod(null);
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: light, fontFamily: font, color: navy }}>
      <SiteNav active="cart" />
      <section style={{ background: '#fff', borderBottom: `1px solid ${border}`, padding: '34px 28px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <h1 style={{ fontSize: 30, lineHeight: 1.15, margin: '0 0 8px', fontWeight: 900 }}>Shopping Cart</h1>
          <p style={{ margin: 0, color: '#596873', fontSize: 15 }}>Choose the tools and add-on packs to send to PayPal checkout.</p>
        </div>
      </section>

      <section style={{ maxWidth: 1060, margin: '0 auto', padding: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <section style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 8, padding: 18 }}>
            <h2 style={{ fontSize: 18, margin: '0 0 14px' }}>Packages</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
              {subscriptions.map(product => {
                const active = Boolean(cart[product.key]);
                return (
                  <button
                    key={product.key}
                    onClick={() => setSubscription(product)}
                    style={{
                      textAlign: 'left',
                      background: active ? '#e8f3fb' : '#fff',
                      border: active ? `2px solid ${blue}` : `1px solid ${border}`,
                      borderRadius: 8,
                      padding: 16,
                      cursor: 'pointer',
                      minHeight: 150,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: 16 }}>{product.name}</strong>
                      <span style={{ color: blue, fontWeight: 800 }}>{formatPrice(product.priceCents)}{cycleText(product)}</span>
                    </div>
                    <div style={{ color: '#596873', fontSize: 13, lineHeight: 1.5, marginTop: 10 }}>{product.description}</div>
                    <div style={{ color: navy, fontSize: 13, fontWeight: 700, marginTop: 12 }}>{metricText(product)}</div>
                  </button>
                );
              })}
            </div>
          </section>

          <section style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 8, padding: 18 }}>
            <h2 style={{ fontSize: 18, margin: '0 0 14px' }}>Add-ons</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {addons.map(product => {
                const quantity = cart[product.key] || 0;
                return (
                  <div key={product.key} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', border: `1px solid ${border}`, borderRadius: 8, padding: 14 }}>
                    <div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
                        <strong>{product.name}</strong>
                        <span style={{ color: blue, fontWeight: 800 }}>{formatPrice(product.priceCents)}</span>
                      </div>
                      <div style={{ color: '#596873', fontSize: 13, marginTop: 5 }}>{product.description}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => setAddon(product, quantity - 1)} style={{ width: 32, height: 32, border: `1px solid ${border}`, background: '#fff', borderRadius: 6, fontSize: 18, cursor: 'pointer' }}>-</button>
                      <input
                        value={quantity}
                        onChange={event => setAddon(product, Number(event.target.value) || 0)}
                        inputMode="numeric"
                        style={{ width: 48, height: 32, border: `1px solid ${border}`, borderRadius: 6, textAlign: 'center' }}
                      />
                      <button onClick={() => setAddon(product, quantity + 1)} style={{ width: 32, height: 32, border: `1px solid ${border}`, background: blue, color: '#fff', borderRadius: 6, fontSize: 18, cursor: 'pointer' }}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 8, padding: 18, alignSelf: 'start', position: 'sticky', top: 76 }}>
          <h2 style={{ fontSize: 18, margin: '0 0 14px' }}>Order Summary</h2>
          {selected.length === 0 && <div style={{ color: '#596873', fontSize: 14 }}>Your cart is empty.</div>}
          {selected.map(({ product, quantity }) => (
            <div key={product.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, borderTop: '1px solid #edf0f2', padding: '12px 0' }}>
              <div>
                <strong style={{ fontSize: 14 }}>{product.name}</strong>
                <div style={{ color: '#596873', fontSize: 12, marginTop: 3 }}>{metricText(product, quantity)}{quantity > 1 ? ` (${quantity} packs)` : ''}</div>
              </div>
              <div style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{formatPrice(product.priceCents * quantity)}{cycleText(product)}</div>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${border}`, paddingTop: 14, marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Monthly</span>
              <strong>{formatPrice(monthlyTotal)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span>One time</span>
              <strong>{formatPrice(oneTimeTotal)}</strong>
            </div>
            <button disabled={Boolean(checkoutMethod)} onClick={() => startCheckout('card')} style={{ width: '100%', background: blue, color: '#fff', border: 'none', borderRadius: 6, padding: '12px 14px', fontSize: 15, fontWeight: 800, cursor: checkoutMethod ? 'default' : 'pointer', opacity: checkoutMethod ? 0.7 : 1 }}>
              {checkoutMethod === 'card' ? 'Opening card checkout...' : 'Pay with card'}
            </button>
            <button disabled={Boolean(checkoutMethod)} onClick={() => startCheckout('paypal')} style={{ width: '100%', background: '#ffc439', color: '#111827', border: 'none', borderRadius: 6, padding: '12px 14px', fontSize: 15, fontWeight: 800, cursor: checkoutMethod ? 'default' : 'pointer', opacity: checkoutMethod ? 0.7 : 1, marginTop: 10 }}>
              {checkoutMethod === 'paypal' ? 'Opening PayPal...' : 'Pay with PayPal'}
            </button>
            {message && <div style={{ marginTop: 10, color: '#b42318', fontSize: 13, lineHeight: 1.45 }}>{message}</div>}
          </div>
        </aside>
      </section>
    </main>
  );
}
