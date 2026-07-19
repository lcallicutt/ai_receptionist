import "server-only";
import { createHmac } from "crypto";

/**
 * AutomationWebhookProvider — n8n implementation. Emits platform events to
 * the configured n8n webhook so clients can build custom automations.
 * Fire-and-forget: automation failures never break the calling workflow,
 * but they are logged by callers via integration_logs.
 */

export type AutomationEvent =
  | "call.completed"
  | "call.missed"
  | "lead.created"
  | "lead.updated"
  | "appointment.booked"
  | "appointment.cancelled";

export function isAutomationConfigured(): boolean {
  return Boolean(process.env.N8N_WEBHOOK_URL);
}

export async function emitAutomationEvent(
  event: AutomationEvent,
  organizationId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return;

  const body = JSON.stringify({
    event,
    organizationId,
    sentAt: new Date().toISOString(),
    data,
  });
  const headers: Record<string, string> = { "content-type": "application/json" };
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (secret) {
    headers["x-flownet-signature"] = createHmac("sha256", secret).update(body).digest("hex");
  }
  const res = await fetch(url, { method: "POST", headers, body });
  if (!res.ok) throw new Error(`n8n webhook returned ${res.status}`);
}
