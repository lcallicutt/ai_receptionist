# FlowNet AI Receptionist

**Missed Calls Equal Missed Leads.**

Multi-tenant SaaS platform by FlowNet Automation for configuring and managing AI
receptionists for small businesses — 24/7 call answering, lead qualification,
appointment booking, missed-call text-back, CRM logging, and owner notifications.

> **Status: Phase 1 (Foundation) complete.** Auth, multi-tenant organizations,
> roles, full database schema, design system, public marketing site, pricing,
> portal shells, and seed data. See [docs/roadmap.md](docs/roadmap.md) for the
> phased implementation plan.

## Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, shadcn-style components, Lucide icons, React Hook Form + Zod
- **Backend:** Next.js server actions & route handlers, Drizzle ORM, PostgreSQL (Neon in production, embedded PGlite fallback for local dev)
- **Auth:** Self-contained credentials auth (scrypt + signed httpOnly session cookies) with role-based access. Designed so Clerk or another provider can be swapped in behind `src/lib/auth/`.
- **Testing:** Vitest (unit + real-database tenant-isolation tests)

## Local setup

```bash
npm install
npm run db:seed     # creates + migrates the embedded dev DB and seeds demo data
npm run dev         # http://localhost:3000
```

No external services are required for local development: when `DATABASE_URL` is
unset, the app uses an embedded PGlite (Postgres WASM) database stored in
`.data/` — the same Drizzle schema and SQL run against real Postgres in
production.

> **Note:** only one process may hold the embedded database open at a time.
> Don't run `dev`, `db:seed`, or scripts concurrently against `.data/`.

### Demo logins (after seeding)

| Portal | Email | Password |
| --- | --- | --- |
| FlowNet Admin (`/admin`) | `admin@flownetautomation.example` | `admin-password-123` |
| Client (`/app`) | `owner@brightpathrealty.example` | `demo-password-123` |

Every seeded demo organization (BrightPath Realty, Harbor Home Services,
Serenity Med Spa, Carter Legal Group, New Hope Community Church) has an owner
account using `demo-password-123`.

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values. Key variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string (falls back to embedded PGlite when unset) |
| `AUTH_SECRET` | Secret for signing session tokens — **required in production** |
| `TWILIO_*`, `RETELL_*`, `GOOGLE_*`, `GHL_*`, `RESEND_*`, `N8N_*`, `STRIPE_*` | Provider credentials for later phases (adapter interfaces) |

All secrets are server-side only. Never commit `.env.local`.

## Database

- Schema: `src/lib/db/schema.ts` (45 tables, all tenant-owned tables carry `organization_id`)
- Generate migrations after schema changes: `npm run db:generate`
- Apply migrations: `npm run db:migrate` (PGlite dev DB auto-migrates on boot)
- Seed demo data: `npm run db:seed` (idempotent)
- Reset dev DB: `npm run db:reset`

## Commands

```bash
npm run dev         # dev server
npm run build       # production build
npm run start       # serve production build (requires AUTH_SECRET)
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm test            # vitest
```

## Documentation

- [Architecture overview](docs/architecture.md)
- [Provider adapter guide](docs/provider-adapters.md)
- [Security & compliance notes](docs/security-and-compliance.md)
- [Implementation roadmap](docs/roadmap.md)

## Compliance note

This platform provides **configuration controls** for compliance-sensitive
features (call recording disclosure, SMS opt-out, retention, disclaimers). It
does **not** guarantee compliance with HIPAA, TCPA, attorney ethics rules, or
state recording laws — each client must obtain professional compliance guidance
for their use case.
