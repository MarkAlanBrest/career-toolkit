# Lemon Squeezy setup

The code is complete, but Lemon Squeezy and Vercel need the IDs and secrets from your account before billing can run.

## 1. Create four Lemon Squeezy variants

Create these products/variants in the Lemon Squeezy dashboard:

1. Base subscription — enable license keys; set the subscription price.
2. Pro subscription — enable license keys; set the subscription price.
3. 25 AI generations — one-time purchase; do not generate a new license key.
4. 50 AI generations — one-time purchase; do not generate a new license key.

Copy each numeric variant ID. If a plan has monthly and annual pricing, put both variant IDs in that plan's comma-separated environment variable.

## 2. Add Vercel environment variables

Add every variable shown in `.env.example` to the Vercel project. The important mappings are:

- `LEMONSQUEEZY_BASE_VARIANT_IDS`: Base subscription variant ID(s)
- `LEMONSQUEEZY_PRO_VARIANT_IDS`: Pro subscription variant ID(s)
- `LEMONSQUEEZY_CREDITS_25_VARIANT_ID`: 25-credit one-time variant
- `LEMONSQUEEZY_CREDITS_50_VARIANT_ID`: 50-credit one-time variant
- `NEXT_PUBLIC_LEMONSQUEEZY_BASE_CHECKOUT_URL`: Base product checkout/share URL
- `NEXT_PUBLIC_LEMONSQUEEZY_PRO_CHECKOUT_URL`: Pro product checkout/share URL
- `LEMONSQUEEZY_API_KEY`: Lemon Squeezy API key used to create credit checkouts
- `LEMONSQUEEZY_STORE_ID`: numeric store ID
- `LEMONSQUEEZY_WEBHOOK_SECRET`: a long random value entered in both Lemon Squeezy and Vercel

Keep API keys and webhook secrets server-side. Do not place them in extension files or variables beginning with `NEXT_PUBLIC_`.
The two checkout URLs are intentionally public and connect the website's Base and Pro buttons to Lemon Squeezy.

## 3. Create the webhook

In Lemon Squeezy, create a webhook pointing to:

`https://career-toolkit-ruby.vercel.app/api/lemonsqueezy/webhook`

Use the same signing secret as `LEMONSQUEEZY_WEBHOOK_SECRET`. Subscribe to:

- `order_created`
- `subscription_created`
- `subscription_updated`
- `subscription_cancelled`
- `subscription_resumed`
- `subscription_expired`
- `subscription_payment_failed`
- `subscription_payment_success`

The webhook is signature-checked and idempotent. Repeated delivery cannot add the same credit pack twice.

## 4. Deploy and test

Use Lemon Squeezy test mode first:

1. Buy a Base plan and copy its generated license key.
2. Open Canvas Enhancer → Global Settings, enter the key, and save.
3. Confirm the account panel says Base and shows 0 of 50 used.
4. Run one AI action and reopen Global Settings; it should show 1 of 50 used.
5. Click Buy 25 more and complete the test checkout.
6. Reopen Global Settings; it should show 25 rollover credits.
7. Cancel or expire the test subscription and confirm AI generation is rejected after entitlement refresh. Non-AI toolbar features should still work.

When the tests pass, replace test-mode IDs/keys with live-mode values and redeploy.

## What is stored in Redis

License keys are never stored. The application stores a SHA-256 hash of each key, monthly generation counts, rollover-credit balances, a short entitlement cache, webhook idempotency records, and minimal subscription status data.
