import "server-only";
import { createHmac } from "crypto";
import type { CRMProvider, CrmLeadPayload, CrmSyncResult } from "./types";

/**
 * Generic webhook CRM adapter: POSTs the normalized lead payload to a
 * tenant-configured endpoint, signed with X-FlowNet-Signature
 * (hex HMAC-SHA256 of the raw body). Works with any webhook-capable CRM,
 * Zapier/Make, or custom endpoints.
 */
export class WebhookCrmProvider implements CRMProvider {
  readonly name = "webhook";

  constructor(
    private webhookUrl: string,
    private secret: string | null,
  ) {}

  private sign(body: string): Record<string, string> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.secret) {
      headers["x-flownet-signature"] = createHmac("sha256", this.secret)
        .update(body)
        .digest("hex");
    }
    return headers;
  }

  buildBody(payload: CrmLeadPayload, event: string): string {
    return JSON.stringify({ event, sentAt: new Date().toISOString(), lead: payload });
  }

  async testConnection(): Promise<void> {
    const body = JSON.stringify({ event: "flownet.test", sentAt: new Date().toISOString() });
    const res = await fetch(this.webhookUrl, {
      method: "POST",
      headers: this.sign(body),
      body,
    });
    if (!res.ok) throw new Error(`Webhook endpoint returned ${res.status}`);
  }

  async syncLead(
    payload: CrmLeadPayload,
    existingCrmRecordId?: string | null,
  ): Promise<CrmSyncResult> {
    const body = this.buildBody(payload, existingCrmRecordId ? "lead.updated" : "lead.created");
    const res = await fetch(this.webhookUrl, {
      method: "POST",
      headers: this.sign(body),
      body,
    });
    if (!res.ok) throw new Error(`Webhook CRM returned ${res.status}`);
    // Webhook receivers may echo back their record id; otherwise the
    // FlowNet lead id is the stable reference.
    let crmRecordId = existingCrmRecordId ?? payload.flownetLeadId;
    try {
      const data = (await res.json()) as { recordId?: string };
      if (data.recordId) crmRecordId = data.recordId;
    } catch {
      // Non-JSON acknowledgment is fine.
    }
    return { crmRecordId };
  }
}
