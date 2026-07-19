import "server-only";
import type { CRMProvider, CrmLeadPayload, CrmSyncResult } from "./types";

const API_BASE = "https://rest.gohighlevel.com/v1";

/**
 * GoHighLevel adapter (REST v1). Credentials are per-tenant (stored
 * encrypted on the crm_connections row) with a platform-level env fallback.
 */
export class GoHighLevelProvider implements CRMProvider {
  readonly name = "gohighlevel";

  constructor(private apiKey: string) {}

  private headers(): Record<string, string> {
    return { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" };
  }

  async testConnection(): Promise<void> {
    const res = await fetch(`${API_BASE}/contacts/?limit=1`, { headers: this.headers() });
    if (!res.ok) throw new Error(`GoHighLevel auth check failed (${res.status})`);
  }

  async syncLead(
    payload: CrmLeadPayload,
    existingCrmRecordId?: string | null,
  ): Promise<CrmSyncResult> {
    const contactBody = JSON.stringify({
      name: payload.name ?? undefined,
      phone: payload.phone ?? undefined,
      email: payload.email ?? undefined,
      companyName: payload.company ?? undefined,
      address1: payload.address ?? undefined,
      source: payload.source ?? "FlowNet AI Receptionist",
      tags: ["flownet", payload.classification, ...payload.tags],
      customField: { flownet_lead_id: payload.flownetLeadId, flownet_score: String(payload.leadScore) },
    });

    let contactId = existingCrmRecordId ?? null;
    if (contactId) {
      const res = await fetch(`${API_BASE}/contacts/${contactId}`, {
        method: "PUT",
        headers: this.headers(),
        body: contactBody,
      });
      if (res.status === 404) contactId = null;
      else if (!res.ok) throw new Error(`GoHighLevel contact update failed (${res.status})`);
    }
    if (!contactId) {
      const res = await fetch(`${API_BASE}/contacts/`, {
        method: "POST",
        headers: this.headers(),
        body: contactBody,
      });
      if (!res.ok) throw new Error(`GoHighLevel contact creation failed (${res.status})`);
      const data = (await res.json()) as { contact?: { id?: string }; id?: string };
      contactId = data.contact?.id ?? data.id ?? null;
      if (!contactId) throw new Error("GoHighLevel did not return a contact id");
    }

    // Activity note: call reason, summary, and qualification answers.
    const noteLines = [
      payload.callReason ? `Reason: ${payload.callReason}` : null,
      payload.requestedService ? `Requested: ${payload.requestedService}` : null,
      `Score: ${payload.leadScore}/100 (${payload.classification})`,
      payload.callSummary ? `\n${payload.callSummary}` : null,
      payload.qualificationAnswers.length
        ? `\n${payload.qualificationAnswers.map((a) => `${a.question}: ${a.answer}`).join("\n")}`
        : null,
      payload.appointment
        ? `\nAppointment: ${payload.appointment.service ?? "Appointment"} at ${payload.appointment.startsAt}`
        : null,
    ].filter(Boolean);
    const noteRes = await fetch(`${API_BASE}/contacts/${contactId}/notes/`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ body: `FlowNet call log\n${noteLines.join("\n")}` }),
    });
    if (!noteRes.ok && noteRes.status !== 404) {
      // Note failure shouldn't lose the contact sync — surface via logs only.
      console.warn(`GoHighLevel note creation failed (${noteRes.status})`);
    }

    return { crmRecordId: contactId };
  }
}
