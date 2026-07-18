"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { requireOrgContext, requireOrgRole } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit";
import type { ActionState } from "./business";

const LEAD_STATUSES = schema.leadStatusEnum.enumValues;
const LEAD_CLASSIFICATIONS = schema.leadClassificationEnum.enumValues;

async function getScopedLead(orgId: string, leadId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.leads)
    .where(and(eq(schema.leads.id, leadId), eq(schema.leads.organizationId, orgId)))
    .limit(1);
  return rows[0] ?? null;
}

function leadPaths(leadId: string) {
  revalidatePath("/app/leads");
  revalidatePath(`/app/leads/${leadId}`);
  revalidatePath("/app/calls");
}

export async function updateLeadStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgContext();
  const leadId = String(formData.get("leadId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!leadId || !(LEAD_STATUSES as readonly string[]).includes(status)) {
    return { error: "Invalid request" };
  }
  const lead = await getScopedLead(ctx.organization.id, leadId);
  if (!lead) return { error: "Lead not found" };
  const db = await getDb();
  await db
    .update(schema.leads)
    .set({ status: status as (typeof LEAD_STATUSES)[number], updatedAt: new Date() })
    .where(eq(schema.leads.id, leadId));
  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "lead.status_change",
    entityId: leadId,
    detail: { from: lead.status, to: status },
  });
  leadPaths(leadId);
  return { success: "Status updated" };
}

export async function updateLeadClassification(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgContext();
  const leadId = String(formData.get("leadId") ?? "");
  const classification = String(formData.get("classification") ?? "");
  if (!leadId || !(LEAD_CLASSIFICATIONS as readonly string[]).includes(classification)) {
    return { error: "Invalid request" };
  }
  const lead = await getScopedLead(ctx.organization.id, leadId);
  if (!lead) return { error: "Lead not found" };
  const db = await getDb();
  await db
    .update(schema.leads)
    .set({
      classification: classification as (typeof LEAD_CLASSIFICATIONS)[number],
      updatedAt: new Date(),
    })
    .where(eq(schema.leads.id, leadId));
  leadPaths(leadId);
  return { success: "Classification updated" };
}

export async function assignLead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireOrgContext();
  const leadId = String(formData.get("leadId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const lead = await getScopedLead(ctx.organization.id, leadId);
  if (!lead) return { error: "Lead not found" };
  const db = await getDb();

  let assignedUserId: string | null = null;
  if (userId) {
    // Assignee must be a member of the same organization.
    const membership = await db
      .select({ id: schema.organizationMembers.id })
      .from(schema.organizationMembers)
      .where(
        and(
          eq(schema.organizationMembers.organizationId, ctx.organization.id),
          eq(schema.organizationMembers.userId, userId),
        ),
      )
      .limit(1);
    if (!membership[0]) return { error: "Assignee is not a member of this organization" };
    assignedUserId = userId;
  }

  await db
    .update(schema.leads)
    .set({ assignedUserId, updatedAt: new Date() })
    .where(eq(schema.leads.id, leadId));
  leadPaths(leadId);
  return { success: assignedUserId ? "Lead assigned" : "Lead unassigned" };
}

const noteSchema = z.object({
  leadId: z.string().min(1),
  body: z.string().trim().min(1, "Note can't be empty").max(4000),
});

export async function addLeadNote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireOrgContext();
  const parsed = noteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid note" };
  }
  const lead = await getScopedLead(ctx.organization.id, parsed.data.leadId);
  if (!lead) return { error: "Lead not found" };
  const db = await getDb();
  await db.insert(schema.leadNotes).values({
    id: newId("note"),
    organizationId: ctx.organization.id,
    leadId: lead.id,
    authorUserId: ctx.user.id,
    body: parsed.data.body,
  });
  leadPaths(lead.id);
  return { success: "Note added" };
}

const tagSchema = z.object({
  leadId: z.string().min(1),
  tag: z
    .string()
    .trim()
    .min(1, "Tag can't be empty")
    .max(50)
    .transform((t) => t.toLowerCase().replace(/\s+/g, "-")),
});

export async function addLeadTag(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireOrgContext();
  const parsed = tagSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid tag" };
  }
  const lead = await getScopedLead(ctx.organization.id, parsed.data.leadId);
  if (!lead) return { error: "Lead not found" };
  const db = await getDb();
  const existing = await db
    .select({ id: schema.leadTags.id })
    .from(schema.leadTags)
    .where(and(eq(schema.leadTags.leadId, lead.id), eq(schema.leadTags.tag, parsed.data.tag)))
    .limit(1);
  if (existing[0]) return { error: "Tag already exists on this lead" };
  await db.insert(schema.leadTags).values({
    id: newId("tag"),
    organizationId: ctx.organization.id,
    leadId: lead.id,
    tag: parsed.data.tag,
  });
  leadPaths(lead.id);
  return { success: "Tag added" };
}

export async function removeLeadTag(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireOrgContext();
  const tagId = String(formData.get("tagId") ?? "");
  if (!tagId) return { error: "Missing tag" };
  const db = await getDb();
  const result = await db
    .delete(schema.leadTags)
    .where(and(eq(schema.leadTags.id, tagId), eq(schema.leadTags.organizationId, ctx.organization.id)))
    .returning();
  if (result.length === 0) return { error: "Tag not found" };
  revalidatePath("/app/leads");
  const removed = result[0];
  if (removed) revalidatePath(`/app/leads/${removed.leadId}`);
  return { success: "Tag removed" };
}

export async function setLeadFollowUp(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgContext();
  const leadId = String(formData.get("leadId") ?? "");
  const followUpAt = String(formData.get("followUpAt") ?? "");
  const lead = await getScopedLead(ctx.organization.id, leadId);
  if (!lead) return { error: "Lead not found" };
  let date: Date | null = null;
  if (followUpAt) {
    date = new Date(followUpAt);
    if (Number.isNaN(date.getTime())) return { error: "Enter a valid date and time" };
  }
  const db = await getDb();
  await db
    .update(schema.leads)
    .set({ followUpAt: date, updatedAt: new Date() })
    .where(eq(schema.leads.id, leadId));
  leadPaths(leadId);
  return { success: date ? "Follow-up scheduled" : "Follow-up cleared" };
}

/* ── Lead scoring rules ─────────────────────────────────────────────── */

const scoringSchema = z.object({
  id: z.string().trim().max(64).or(z.literal("")),
  name: z.string().trim().min(1, "Rule name is required").max(200),
  signal: z.string().trim().min(1, "Signal is required").max(100),
  points: z.coerce.number().int().min(-100).max(100),
});

export async function upsertScoringRule(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const parsed = scoringSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  const d = parsed.data;
  const db = await getDb();
  if (d.id) {
    const result = await db
      .update(schema.leadScoringRules)
      .set({ name: d.name, signal: d.signal, points: d.points })
      .where(
        and(
          eq(schema.leadScoringRules.id, d.id),
          eq(schema.leadScoringRules.organizationId, ctx.organization.id),
        ),
      )
      .returning();
    if (result.length === 0) return { error: "Rule not found" };
  } else {
    await db.insert(schema.leadScoringRules).values({
      id: newId("lsr"),
      organizationId: ctx.organization.id,
      name: d.name,
      signal: d.signal,
      points: d.points,
    });
  }
  revalidatePath("/app/qualification");
  return { success: d.id ? "Rule updated" : "Rule added" };
}

export async function deleteScoringRule(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing rule" };
  const db = await getDb();
  const result = await db
    .delete(schema.leadScoringRules)
    .where(
      and(
        eq(schema.leadScoringRules.id, id),
        eq(schema.leadScoringRules.organizationId, ctx.organization.id),
      ),
    )
    .returning();
  if (result.length === 0) return { error: "Rule not found" };
  revalidatePath("/app/qualification");
  return { success: "Rule deleted" };
}
