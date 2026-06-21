# Canvas Enhancer / Career Toolkit

Next.js service and Chrome extension for Canvas Enhancer.

## Billing

Lemon Squeezy provides checkout, subscription billing, receipts, tax handling, cancellation, and license keys. This application validates those keys and enforces AI usage on the server:

- Teaching Tools: communication, scheduling, reports, auditing, and 500 AI gradings per calendar month
- Creation Tools: Rich Content and Quiz Maker toolbars with 100 AI generations per calendar month
- Purchased credits: used after the monthly allowance and never expire
- Inactive packages: their toolbars do not load; the free AI launcher and Global Settings remain available
- Exhausted packages: the toolbar remains available, but further AI actions require a refill

See [LEMON_SQUEEZY_SETUP.md](./LEMON_SQUEEZY_SETUP.md) before deploying.

## Development

Copy `.env.example` to `.env.local`, fill in the values, then run:

```bash
npm install
npm run dev
```

Verify a production build with `npm run build`.
