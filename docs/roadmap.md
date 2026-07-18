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

## Phase 3 — Lead & Call Management

Call inbox + call detail (transcript, summary, events timeline), lead pipeline
with statuses/notes/tags/assignment, configurable lead scoring, call summary
generation, sample provider event ingestion.

## Phase 4 — Calendar Booking

`CalendarProvider` interface, Google Calendar implementation, availability
lookup, appointment booking with buffers/notice rules, confirmations,
appointment dashboard.

## Phase 5 — Voice & Telephony

`VoiceProvider`/`TelephonyProvider` adapters (Retell + Twilio first),
phone-number mapping, incoming call webhooks with signature verification and
idempotency, call status events, transcript/recording ingestion, test-call
experience.

## Phase 6 — CRM & Automation

`CRMProvider` interface, GoHighLevel integration, generic CRM webhooks, n8n
integration, retry management for failed syncs, integration logs + admin
failed-workflow tooling.

## Phase 7 — Missed-Call Text-Back

Missed-call detection, `SMSProvider` sends within compliance rules, STOP/opt-out
handling, cooldown protection, two-way conversation tracking into leads.

## Phase 8 — Analytics & Usage

Dashboard metrics and charts, reports, usage tracking against plan allowances,
server-enforced plan limits at feature boundaries, admin monitoring.

## Phase 9 — Billing & Production Hardening

Stripe integration (subscriptions, upgrades/downgrades, trials, overages,
suspension), security review, accessibility review, performance pass, expanded
test coverage, deployment documentation.

## Next recommended task

**Phase 3 — Lead & Call Management**: the call inbox and call detail pages
(transcripts, summaries, event timelines are already seeded), the lead
pipeline with statuses/notes/tags/assignment, and configurable lead scoring.
The schema and seed data for all of it are in place.
