# Deployment Guide

## Target platform

The app is a standard Next.js 15 App Router application — it deploys to
Vercel, a Node server, or any container platform.

```bash
npm ci
npm run build
AUTH_SECRET=... DATABASE_URL=... npm run start
```

## Required environment (production)

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | **yes** | Neon Postgres connection string. Without it the app uses the embedded dev database — never do this in production. |
| `AUTH_SECRET` | **yes** | Session signing. The server refuses the dev fallback when `NODE_ENV=production`. |
| `CREDENTIALS_SECRET` | recommended | Separate key for encrypting stored integration credentials (falls back to `AUTH_SECRET`). |
| `NEXT_PUBLIC_APP_URL` | yes | Public base URL — used for provider webhook wiring. |

## Database setup

```bash
# one-time / per-release
DB_AUTO_MIGRATE=true DATABASE_URL=... npm run db:migrate
# optional demo data (flags orgs as demo)
DATABASE_URL=... npm run db:seed
```

Migrations are plain SQL in `drizzle/` — review them like code. Never edit an
applied migration; generate a new one (`npm run db:generate`) after schema
changes.

## Provider configuration

Each integration activates only when its credentials exist — the app shows
honest "not configured" states otherwise (Provider Health page lists all of
them).

| Provider | Variables | Webhooks to register |
| --- | --- | --- |
| Twilio | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WEBHOOK_URL`, `TWILIO_SMS_WEBHOOK_URL` | `POST /api/webhooks/twilio/voice` (status callback), `POST /api/webhooks/twilio/sms` (inbound SMS) |
| Retell | `RETELL_API_KEY`, `RETELL_WEBHOOK_SECRET` | `POST /api/webhooks/retell` |
| Google Calendar | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` | OAuth redirect: `/api/integrations/google/callback` |
| GoHighLevel | per-tenant API keys (UI) or `GHL_API_KEY` fallback | — |
| n8n | `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET` | receives FlowNet events |
| Sample provider | `SAMPLE_WEBHOOK_SECRET` | `POST /api/webhooks/sample` (dev/demo) |

Set `TWILIO_WEBHOOK_URL` / `TWILIO_SMS_WEBHOOK_URL` to the exact public URLs
Twilio calls — signature validation covers the full URL, so proxies that
rewrite it will fail verification (correctly).

## Background work

CRM sync, text-back, and automation events run inline as best-effort steps
during webhook processing with statuses recorded for retry. For high volume,
move them onto a queue (the service functions — `syncLeadToCrm`,
`maybeSendTextBack`, `emitAutomationEvent` — are already isolated and safe to
call from workers). Scheduled retries of failed CRM syncs can be a cron
hitting the same functions.

## Operations

- **Health:** `GET /api/health` returns `{status, database}`.
- **Provider health / failed workflows / webhook logs / audit logs:** admin
  portal pages, all backed by real tables.
- **Retention:** enforcement of recording/transcript retention windows is a
  scheduled job to add alongside your cron infrastructure; the per-tenant
  settings are already stored and editable.

## Stripe (when enabling billing)

`STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` are already in the environment
contract; subscriptions carry `stripeCustomerId`/`stripeSubscriptionId`
columns and internal billing statuses (trialing/active/past_due/suspended/
canceled/complimentary), so enabling Stripe is: checkout session creation on
the Billing page, a `/api/webhooks/stripe` route following the existing
webhook contract, and mapping subscription events onto those status fields.
