# Canvas Enhancer / Career Toolkit

Next.js service and Chrome extension for Canvas Enhancer.

## Billing

Lemon Squeezy provides checkout, subscription billing, receipts, tax handling, cancellation, and license keys. This application validates those keys and enforces AI usage on the server:

- Base: 50 AI generations per calendar month
- Pro: 150 AI generations per calendar month
- Purchased credits: used after the monthly allowance and never expire
- Inactive or exhausted accounts: only AI generation is blocked; the installed toolbars continue working

See [LEMON_SQUEEZY_SETUP.md](./LEMON_SQUEEZY_SETUP.md) before deploying.

## Development

Copy `.env.example` to `.env.local`, fill in the values, then run:

```bash
npm install
npm run dev
```

Verify a production build with `npm run build`.
