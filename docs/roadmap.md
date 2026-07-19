# Implementation Roadmap

The product is built incrementally; the app is runnable after every phase.

## ✅ Phase 1 — Foundation (complete)

Project setup (Next.js 15, TS strict, Tailwind v4), credentials auth with
sessions and roles, multi-tenant organizations, full 45-table database schema
with migrations, design system, public marketing site (home, features,
industries, pricing, demo, contact, book-a-demo, legal placeholders, login),
client + admin portal shells with navigation, realistic seed data for five
demo verticals, unit + tenant-isolation tests.

## ✅ Phase 2 — Client Configuration (complete)

Business profile + business hours editing, 10-step onboarding wizard with
activation readiness score, receptionist settings with version history
(draft/publish/rollback) and pause/activate, FAQ management (add, edit,
reorder, activate/deactivate, escalation flags), qualification question
builder (13 answer types, scoring, disqualifiers, CRM save flags),
appointment type configuration, transfer + escalation rules, notification
recipients with server-enforced plan limits, and team management (invite,
role changes, remove — with last-owner protection). All mutations are
Zod-validated server actions behind role guards, with audit log entries.

## ✅ Phase 3 — Lead & Call Management (complete)

Call inbox with outcome filters and unread tracking; call detail with
transcript, structured summary, extracted lead details, qualification
answers, appointment info, system-event timeline, provider IDs, related SMS,
assignment, and notes. Lead pipeline with status filters and search; lead
detail with status/classification/assignment/follow-up/tags/notes and
related calls, appointments, and texts. Configurable lead scoring rules
(signal → points, hot/warm/cold thresholds) applied by the ingestion
pipeline on top of per-question score impacts. Provider-neutral call-event
ingestion powering both a signed sample webhook
(`POST /api/webhooks/sample` — HMAC verification, idempotency-key dedupe,
tenant resolution by called number, webhook event logging) and an in-app
call simulator on the Test Receptionist page. Admin platform-wide call and
lead lists.

## ✅ Phase 4 — Calendar Booking (complete)

`CalendarProvider` interface with two implementations: built-in scheduling
(busy time from the tenant's own appointments — always on) and Google
Calendar (OAuth connect flow, encrypted token storage with AES-256-GCM,
freeBusy lookup, event create/delete, automatic token refresh). Busy
intervals are merged across all connected sources so double-booking is
impossible. Timezone-aware availability engine honoring business hours,
durations, buffers, and minimum booking notice. Conflict-safe booking
action (re-validates the slot at write time), confirmation messages
rendered from appointment-type templates and queued for delivery (live
send arrives with SMS/email providers), appointment dashboard with status
filters and lifecycle transitions (confirm / complete / no-show / cancel,
with external event cleanup), and the Calendar Connections page.

## ✅ Phase 5 — Voice & Telephony (complete)

`VoiceProvider` (Retell) and `TelephonyProvider` (Twilio) adapters via REST
with no vendor SDKs; the Retell adapter compiles the receptionist config
into a guarded prompt (approved FAQs only, compliance statements, explicit
no-invention rules). Provider webhook routes following the platform
contract: Retell call_ended/call_analyzed (HMAC-SHA256, transcript +
recording + sentiment mapping into the ingestion pipeline) and Twilio voice
status callbacks (X-Twilio-Signature validation; terminal missed states
feed Phase 7 text-back). Ingestion now stores recording references and
voice-minute usage records. Phone Numbers page with manual mapping or
Twilio provisioning, plan-limit enforcement, and activate/deactivate. Live
test-call flow (agent sync + outbound dial) with honest not-configured
states. Admin Provider Health (deployment config, tenant connections,
integration activity) and Webhook Logs pages.

## ✅ Phase 6 — CRM & Automation (complete)

`CRMProvider` interface with GoHighLevel (contact upsert + activity notes +
tags, per-tenant encrypted API keys validated before storage) and generic
webhook (signed with X-FlowNet-Signature HMAC-SHA256, test delivery before
save) implementations. n8n automation events (call.completed, call.missed,
lead.created, appointment.booked) with optional signing. CRM sync service
wired into ingestion — every captured lead syncs automatically, updates
sync status/record id/error on the lead, and writes integration logs.
Retry paths: per-lead "Resync to CRM" in the client portal and
platform-admin retry on the real Failed Workflows page (failed syncs,
failed webhook events, failed integration operations). CRM Connections
page with connect/disconnect and live sync counts.

## ✅ Phase 7 — Missed-Call Text-Back (complete)

Text-back sender wired into missed/abandoned call ingestion with layered
protections checked in order: tenant toggle, caller opt-out, number SMS
capability, and per-caller cooldown (the cooldown clock starts at commit
time so races can never double-text). Messages queue honestly when the SMS
provider isn't configured and send through Twilio when it is, with failure
recording. Inbound Twilio SMS webhook (signature-verified, idempotent):
STOP/UNSUBSCRIBE opt-outs and START opt-ins recorded with consent entries;
real replies create or refresh a lead as follow_up_required. Configurable
template + cooldown on the Settings page; SMS Activity page shows the full
conversation stream with delivery status and opt-out badges.

## ✅ Phase 8 — Analytics & Usage (complete)

Analytics page with date-range filters and fourteen headline metrics
(answer/missed/FAQ-resolution/booking-conversion/lead-conversion rates, avg
duration, text-backs, CRM success, opportunities recovered) plus accessible
server-rendered charts — calls over time, call outcomes, conversion funnel,
lead quality, missed-call recovery — each with a table view. Charts follow
the dataviz method (single-hue magnitude marks, identity in labels, ink-token
text, validated contrast). Usage page with allowance meters, over-allowance
highlighting, and overage estimates from configurable per-unit rates
(`OVERAGE_RATES_CENTS`); admin usage page showing per-organization voice/SMS
consumption against plan allowances with estimated overage.

## Phase 9 — Billing & Production Hardening

Stripe integration (subscriptions, upgrades/downgrades, trials, overages,
suspension), security review, accessibility review, performance pass, expanded
test coverage, deployment documentation.

## Next recommended task

**Phase 9 — Billing & Production Hardening**: Stripe preparation (billing
status fields already exist), billing/compliance portal pages, expanded
security review, accessibility pass, and deployment documentation.
