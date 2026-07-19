import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { getCrmProvider, type CrmLeadPayload } from "@/lib/providers/crm";

export type CrmSyncOutcome =
  | { status: "synced"; crmRecordId: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

/**
 * Syncs one lead to the tenant's connected CRM, updating the lead's sync
 * status either way and writing an integration log. Safe to call repeatedly:
 * an existing CRM record id becomes an update instead of a duplicate.
 */
export async function syncLeadToCrm(organizationId: string, leadId: string): Promise<CrmSyncOutcome> {
  const db = await getDb();

  const leads = await db
    .select()
    .from(schema.leads)
    .where(and(eq(schema.leads.id, leadId), eq(schema.leads.organizationId, organizationId)))
    .limit(1);
  const lead = leads[0];
  if (!lead) return { status: "skipped", reason: "lead not found" };

  const provider = await getCrmProvider(organizationId);
  if (!provider) {
    // No CRM connected — the lead stays in "pending" until one is.
    return { status: "skipped", reason: "no CRM connected" };
  }

  const [answers, tags, profiles, summaries, appointments] = await Promise.all([
    db.select().from(schema.leadAnswers).where(eq(schema.leadAnswers.leadId, lead.id)),
    db.select().from(schema.leadTags).where(eq(schema.leadTags.leadId, lead.id)),
    db
      .select({ businessName: schema.businessProfiles.businessName })
      .from(schema.businessProfiles)
      .where(eq(schema.businessProfiles.organizationId, organizationId))
      .limit(1),
    db
      .select({ detailedSummary: schema.callSummaries.detailedSummary })
      .from(schema.callSummaries)
      .innerJoin(schema.callRecords, eq(schema.callSummaries.callRecordId, schema.callRecords.id))
      .where(eq(schema.callRecords.leadId, lead.id))
      .orderBy(desc(schema.callSummaries.createdAt))
      .limit(1),
    db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.leadId, lead.id))
      .orderBy(desc(schema.appointments.startsAt))
      .limit(1),
  ]);

  const payload: CrmLeadPayload = {
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    company: lead.company,
    address: lead.address,
    callReason: lead.callReason,
    requestedService: lead.requestedService,
    leadScore: lead.score,
    classification: lead.classification,
    status: lead.status,
    source: lead.source,
    tags: tags.map((t) => t.tag),
    qualificationAnswers: answers.map((a) => ({ question: a.questionPrompt, answer: a.answer })),
    callSummary: summaries[0]?.detailedSummary ?? null,
    appointment: appointments[0]
      ? { service: appointments[0].service, startsAt: appointments[0].startsAt.toISOString() }
      : null,
    flownetLeadId: lead.id,
    businessName: profiles[0]?.businessName ?? "FlowNet client",
  };

  const startedAtMs = Date.now();
  try {
    const result = await provider.syncLead(payload, lead.crmRecordId);
    await db
      .update(schema.leads)
      .set({
        crmSyncStatus: "synced",
        crmRecordId: result.crmRecordId,
        crmSyncError: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.leads.id, lead.id));
    await db.insert(schema.integrationLogs).values({
      id: newId("il"),
      organizationId,
      providerType: "crm",
      provider: provider.name,
      operation: "sync_lead",
      relatedLeadId: lead.id,
      success: true,
      durationMs: Date.now() - startedAtMs,
    });
    return { status: "synced", crmRecordId: result.crmRecordId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    await db
      .update(schema.leads)
      .set({ crmSyncStatus: "failed", crmSyncError: message, updatedAt: new Date() })
      .where(eq(schema.leads.id, lead.id));
    await db.insert(schema.integrationLogs).values({
      id: newId("il"),
      organizationId,
      providerType: "crm",
      provider: provider.name,
      operation: "sync_lead",
      relatedLeadId: lead.id,
      success: false,
      detail: { message },
      durationMs: Date.now() - startedAtMs,
    });
    return { status: "failed", error: message };
  }
}
