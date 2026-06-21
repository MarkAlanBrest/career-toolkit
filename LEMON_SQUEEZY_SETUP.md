# Lemon Squeezy setup

The code is complete, but Lemon Squeezy and Vercel need the IDs and secrets from your account before billing can run.

## 1. Create four Lemon Squeezy variants

Create these products/variants in the Lemon Squeezy dashboard:

1. Teaching Tools subscription — monthly and annual variants; enable license keys.
2. Creation Tools subscription — monthly and annual variants; enable license keys.
3. 100 Teaching AI gradings — $4.99 one-time purchase; do not generate a new license key.
4. 50 Creation AI generations — $9 one-time purchase; do not generate a new license key.

Copy each numeric variant ID. If a plan has monthly and annual pricing, put both variant IDs in that plan's comma-separated environment variable.

## 2. Add Vercel environment variables

Add every variable shown in `.env.example` to the Vercel project. The important mappings are:

- `LEMONSQUEEZY_TEACHING_VARIANT_IDS`: Teaching monthly and annual variant IDs
- `LEMONSQUEEZY_CREATION_VARIANT_IDS`: Creation monthly and annual variant IDs
- `LEMONSQUEEZY_TEACHING_REFILL_VARIANT_ID`: 100-grading refill variant
- `LEMONSQUEEZY_CREATION_REFILL_VARIANT_ID`: 50-generation refill variant
- `NEXT_PUBLIC_LEMONSQUEEZY_TEACHING_MONTHLY_URL`: Teaching monthly checkout URL
- `NEXT_PUBLIC_LEMONSQUEEZY_TEACHING_ANNUAL_URL`: Teaching annual checkout URL
- `NEXT_PUBLIC_LEMONSQUEEZY_CREATION_MONTHLY_URL`: Creation monthly checkout URL
- `NEXT_PUBLIC_LEMONSQUEEZY_CREATION_ANNUAL_URL`: Creation annual checkout URL
- `LEMONSQUEEZY_API_KEY`: Lemon Squeezy API key used to create credit checkouts
- `LEMONSQUEEZY_STORE_ID`: numeric store ID
- `LEMONSQUEEZY_WEBHOOK_SECRET`: a long random value entered in both Lemon Squeezy and Vercel

Keep API keys and webhook secrets server-side. Do not place them in extension files or variables beginning with `NEXT_PUBLIC_`.
The four checkout URLs are intentionally public and connect the monthly and annual website buttons to their Lemon Squeezy variants.

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

1. Buy Teaching Tools and copy its generated license key.
2. Open Canvas Enhancer → Global Settings, enter the key, and save.
3. Confirm Teaching Tools is active and shows 0 of 500 gradings used.
4. Confirm the Teaching toolbars load and the Creation toolbars do not.
5. Run one grading and confirm usage changes to 1 of 500.
6. Buy Creation Tools, enter both keys separated by a comma, and confirm both packages load after refreshing Canvas.
7. Complete each refill checkout and confirm the correct package balance increases.
8. Cancel a test subscription and confirm only that package stops loading after its entitlement expires.

When the tests pass, replace test-mode IDs/keys with live-mode values and redeploy.

## What is stored in Redis

License keys are never stored. The application stores a SHA-256 hash of each key, monthly generation counts, rollover-credit balances, a short entitlement cache, webhook idempotency records, and minimal subscription status data.
