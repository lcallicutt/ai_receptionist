# Security & Compliance Notes

## Security model (Phase 1)

- **Tenant isolation:** every tenant table carries `organization_id`; all
  queries are scoped through `requireOrgContext`, which verifies the
  authenticated user's membership server-side. Browser-supplied org IDs are
  never trusted. Covered by `tests/tenant-isolation.test.ts` against a real
  Postgres (PGlite) database.
- **Sessions:** httpOnly, SameSite=Lax, HS256-signed cookies; 7-day TTL.
  `AUTH_SECRET` is mandatory in production — the server refuses the dev
  fallback secret when `NODE_ENV=production`.
- **Passwords:** scrypt with per-hash random salt and constant-time compare.
- **Login:** uniform error message to prevent account enumeration.
- **Server actions:** all inputs validated with Zod before any DB access.
- **Secrets:** environment variables only; `.env*` is gitignored;
  `.env.example` contains placeholders only. Integration credentials are stored
  encrypted (`encrypted_credentials` columns) — never returned to the browser.
- **Roles:** rank-based hierarchy (super_admin > agency_admin > owner >
  manager > member > read_only) enforced by `requireOrgRole`.

## Planned hardening (Phases 5–9)

Rate limiting, webhook signature verification + idempotent processing,
time-limited recording URLs, PII redaction in structured logs, audit trails on
sensitive actions (schema already includes `audit_logs`, `consent_records`,
`webhook_events`), CSRF review for any non-server-action mutations, and a
pre-launch security review.

## Compliance limitations (important)

The platform intentionally does **not** claim automatic compliance with:

- HIPAA (med spa / health-adjacent clients)
- TCPA and state SMS-consent rules (missed-call text-back)
- One-party / two-party call recording laws (state-specific)
- Attorney advertising and ethics rules (law office clients)

Instead it ships **configuration controls**: recording on/off per tenant with
disclosure text, consent tracking, SMS STOP handling, retention settings, and
industry disclaimer templates (legal, medical, emergency, church routing).
Clients are told during onboarding that they must obtain their own professional
compliance guidance.

Never log API keys, auth tokens, payment data, or unnecessary sensitive
personal information.
