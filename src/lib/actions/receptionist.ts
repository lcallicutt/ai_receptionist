"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { requireOrgRole } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit";
import { TONE_OPTIONS } from "@/lib/receptionist-options";
import type { ActionState } from "./business";

const draftSchema = z.object({
  name: z.string().trim().min(1, "Receptionist name is required").max(100),
  tone: z.enum(TONE_OPTIONS.map(([v]) => v) as [string, ...string[]]),
  greeting: z.string().trim().min(1, "Greeting is required").max(2000),
  language: z.string().trim().min(2).max(20),
  speakingSpeed: z.coerce.number().min(0.5).max(2),
  formality: z.string().trim().max(50),
  voiceId: z.string().trim().max(100).or(z.literal("")),
  pronunciationNotes: z.string().trim().max(2000).or(z.literal("")),
  businessKnowledge: z.string().trim().max(8000).or(z.literal("")),
});

async function getOwnReceptionist(orgId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.aiReceptionists)
    .where(eq(schema.aiReceptionists.organizationId, orgId))
    .limit(1);
  return rows[0] ?? null;
}

/** Saves receptionist identity/voice/greeting as a draft (no version bump). */
export async function saveReceptionistDraft(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const parsed = draftSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  const goals = formData.getAll("callGoals").map(String).filter(Boolean);
  const d = parsed.data;
  const db = await getDb();

  const existing = await getOwnReceptionist(ctx.organization.id);
  const values = {
    name: d.name,
    tone: d.tone,
    greeting: d.greeting,
    language: d.language,
    speakingSpeed: d.speakingSpeed.toFixed(2),
    formality: d.formality || "professional",
    voiceId: d.voiceId || null,
    pronunciationNotes: d.pronunciationNotes || null,
    businessKnowledge: d.businessKnowledge || null,
    callGoals: goals,
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(schema.aiReceptionists)
      .set(values)
      .where(
        and(
          eq(schema.aiReceptionists.id, existing.id),
          eq(schema.aiReceptionists.organizationId, ctx.organization.id),
        ),
      );
  } else {
    await db.insert(schema.aiReceptionists).values({
      id: newId("recep"),
      organizationId: ctx.organization.id,
      status: "draft",
      ...values,
    });
  }

  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "receptionist.save_draft",
  });
  revalidatePath("/app/receptionist");
  revalidatePath("/app/onboarding");
  return { success: "Draft saved" };
}

/** Publishes the current configuration as a new immutable version. */
export async function publishReceptionist(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const label = String(formData.get("label") ?? "").trim().slice(0, 120) || null;
  const db = await getDb();

  const receptionist = await getOwnReceptionist(ctx.organization.id);
  if (!receptionist) return { error: "Save a draft before publishing" };
  if (!receptionist.greeting) return { error: "A greeting is required before publishing" };

  const latest = await db
    .select({ versionNumber: schema.receptionistVersions.versionNumber })
    .from(schema.receptionistVersions)
    .where(eq(schema.receptionistVersions.receptionistId, receptionist.id))
    .orderBy(desc(schema.receptionistVersions.versionNumber))
    .limit(1);
  const nextVersion = (latest[0]?.versionNumber ?? 0) + 1;

  const versionId = newId("rv");
  await db.insert(schema.receptionistVersions).values({
    id: versionId,
    organizationId: ctx.organization.id,
    receptionistId: receptionist.id,
    versionNumber: nextVersion,
    label,
    configSnapshot: {
      name: receptionist.name,
      tone: receptionist.tone,
      greeting: receptionist.greeting,
      language: receptionist.language,
      speakingSpeed: receptionist.speakingSpeed,
      formality: receptionist.formality,
      voiceId: receptionist.voiceId,
      pronunciationNotes: receptionist.pronunciationNotes,
      businessKnowledge: receptionist.businessKnowledge,
      callGoals: receptionist.callGoals,
    },
    publishedAt: new Date(),
    createdByUserId: ctx.user.id,
  });
  await db
    .update(schema.aiReceptionists)
    .set({ activeVersionId: versionId, updatedAt: new Date() })
    .where(eq(schema.aiReceptionists.id, receptionist.id));

  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "receptionist.publish",
    entityType: "receptionist_version",
    entityId: versionId,
    detail: { versionNumber: nextVersion },
  });
  revalidatePath("/app/receptionist");
  return { success: `Published version ${nextVersion}` };
}

/** Restores the configuration from a prior version (and re-publishes it). */
export async function rollbackReceptionist(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const versionId = String(formData.get("versionId") ?? "");
  if (!versionId) return { error: "Missing version" };
  const db = await getDb();

  const versions = await db
    .select()
    .from(schema.receptionistVersions)
    .where(
      and(
        eq(schema.receptionistVersions.id, versionId),
        eq(schema.receptionistVersions.organizationId, ctx.organization.id),
      ),
    )
    .limit(1);
  const version = versions[0];
  if (!version) return { error: "Version not found" };

  const snap = version.configSnapshot as Record<string, unknown>;
  await db
    .update(schema.aiReceptionists)
    .set({
      name: typeof snap.name === "string" ? snap.name : undefined,
      tone: typeof snap.tone === "string" ? snap.tone : undefined,
      greeting: typeof snap.greeting === "string" ? snap.greeting : null,
      language: typeof snap.language === "string" ? snap.language : undefined,
      speakingSpeed: typeof snap.speakingSpeed === "string" ? snap.speakingSpeed : undefined,
      formality: typeof snap.formality === "string" ? snap.formality : undefined,
      voiceId: typeof snap.voiceId === "string" ? snap.voiceId : null,
      pronunciationNotes:
        typeof snap.pronunciationNotes === "string" ? snap.pronunciationNotes : null,
      businessKnowledge:
        typeof snap.businessKnowledge === "string" ? snap.businessKnowledge : null,
      callGoals: Array.isArray(snap.callGoals) ? (snap.callGoals as string[]) : [],
      activeVersionId: version.id,
      updatedAt: new Date(),
    })
    .where(eq(schema.aiReceptionists.id, version.receptionistId));

  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "receptionist.rollback",
    entityType: "receptionist_version",
    entityId: version.id,
    detail: { versionNumber: version.versionNumber },
  });
  revalidatePath("/app/receptionist");
  return { success: `Rolled back to version ${version.versionNumber}` };
}

/** Pause or activate the receptionist. */
export async function setReceptionistStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const status = String(formData.get("status") ?? "");
  if (status !== "active" && status !== "paused") return { error: "Invalid status" };
  const db = await getDb();

  const receptionist = await getOwnReceptionist(ctx.organization.id);
  if (!receptionist) return { error: "No receptionist configured yet" };
  if (status === "active" && !receptionist.greeting) {
    return { error: "Configure a greeting before activating" };
  }

  await db
    .update(schema.aiReceptionists)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.aiReceptionists.id, receptionist.id));

  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: `receptionist.${status === "active" ? "activate" : "pause"}`,
  });
  revalidatePath("/app/receptionist");
  revalidatePath("/app");
  return { success: status === "active" ? "Receptionist activated" : "Receptionist paused" };
}
