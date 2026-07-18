# Provider Adapter Guide

The platform is provider-neutral by design. All vendor-specific logic lives
behind adapter interfaces; core services (call workflow, booking, CRM logging,
notifications) depend only on the interfaces.

## Interfaces (introduced from Phase 4 onward)

| Interface | First implementation | Alternatives kept as adapters |
| --- | --- | --- |
| `TelephonyProvider` | Twilio | Telnyx |
| `SMSProvider` | Twilio | Telnyx |
| `VoiceProvider` | Retell AI | Vapi, Bland AI |
| `CalendarProvider` | Google Calendar | Microsoft Outlook |
| `CRMProvider` | GoHighLevel + generic webhook | HubSpot |
| `EmailProvider` | Resend (or Gmail) | any transactional provider |
| `AutomationWebhookProvider` | n8n | Make/Zapier-style webhooks |

## Rules

1. **No provider SDK imports outside its adapter.** Core services receive an
   interface, resolved per-organization from `provider_connections`.
2. **Credentials come from environment variables** (platform-level) or the
   encrypted `provider_connections.encrypted_credentials` column
   (tenant-level). Secrets are never sent to the browser and never logged.
3. **Every webhook endpoint** verifies the provider's signature, stores the
   provider event ID, and dedupes via `webhook_events.idempotency_key` before
   any processing.
4. **Every provider call** writes an `integration_logs` row (operation,
   success, duration, PII-redacted detail) so failures are diagnosable from the
   admin portal.
5. **Mocked integrations must be labeled.** Demo/simulated data is flagged
   (`organizations.is_demo`, demo UI badges) — no fake success responses in
   production paths.

## Adding a new provider

1. Implement the interface in `src/lib/providers/<type>/<vendor>.ts`.
2. Register it in the provider factory keyed by `provider_connections.provider`.
3. Add credential fields to `.env.example` (placeholders only).
4. Add webhook routes under `src/app/api/webhooks/<vendor>/` with signature
   verification.
5. Add adapter tests covering the mapping to/from the normalized internal
   models (calls, leads, appointments, messages).
