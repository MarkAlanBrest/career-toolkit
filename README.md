# Canvas Enhancer / Career Toolkit

Next.js service and Chrome extension for Canvas Enhancer.

## System documentation

- [Server and third-party services inventory](./documentation.md)

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
# Canvas Broadcast Center

The administrator broadcast tool is available at `/canvas-broadcast`. It reads eligible Canvas
courses and active student enrollments on the server, deduplicates recipients, sends Canvas Inbox
conversations in batches, and stores reusable templates plus the last 25 broadcast attempts.

Configure these server-side environment variables before using it:

```env
CANVAS_BASE_URL=https://your-school.instructure.com
CANVAS_API_TOKEN=your-server-only-token
CANVAS_ACCOUNT_ID=1
CANVAS_BROADCAST_ADMIN_PASSWORD=choose-a-strong-access-key
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

The Redis variables are strongly recommended in production. Without them, the existing local
file-backed development store is used and data is not durable on serverless hosting. Never prefix
the Canvas token with `NEXT_PUBLIC_`.
