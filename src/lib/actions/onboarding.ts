"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { requireOrgRole } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit";
import { getActivationReadiness, TOTAL_ONBOARDING_STEPS } from "@/lib/onboarding-readiness";
import type { ActionState } from "./business";

async function getProgressRow(orgId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.onboardingProgress)
    .where(eq(schema.onboardingProgress.organizationId, orgId))
    .limit(1);
  if (rows[0]) return rows[0];
  const id = newId("ob");
  await db.insert(schema.onboardingProgress).values({
    id,
    organizationId: orgId,
    currentStep: 1,
    completedSteps: [],
  });
  const created = await db
    .select()
    .from(schema.onboardingProgress)
    .where(eq(schema.onboardingProgress.id, id))
    .limit(1);
  return created[0]!;
}

/** Marks a step complete and advances the wizard. */
export async function completeOnboardingStep(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const step = Number(formData.get("step"));
  if (!Number.isInteger(step) || step < 1 || step > TOTAL_ONBOARDING_STEPS) {
    return { error: "Invalid step" };
  }
  const db = await getDb();
  const progress = await getProgressRow(ctx.organization.id);
  const completed = new Set(progress.completedSteps ?? []);
  completed.add(step);
  const next = Math.min(step + 1, TOTAL_ONBOARDING_STEPS);

  await db
    .update(schema.onboardingProgress)
    .set({
      completedSteps: [...completed].sort((a, b) => a - b),
      currentStep: Math.max(progress.currentStep, next),
      updatedAt: new Date(),
    })
    .where(eq(schema.onboardingProgress.id, progress.id));

  revalidatePath("/app/onboarding");
  redirect(`/app/onboarding?step=${next}`);
}

/** Records that consent/recording settings were reviewed (activation gate). */
export async function markConsentReviewed(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const db = await getDb();
  const existing = await db
    .select({ id: schema.dataRetentionSettings.id })
    .from(schema.dataRetentionSettings)
    .where(eq(schema.dataRetentionSettings.organizationId, ctx.organization.id))
    .limit(1);
  if (existing[0]) {
    await db
      .update(schema.dataRetentionSettings)
      .set({ updatedAt: new Date() })
      .where(eq(schema.dataRetentionSettings.id, existing[0].id));
  } else {
    await db.insert(schema.dataRetentionSettings).values({
      id: newId("drs"),
      organizationId: ctx.organization.id,
      recordingEnabled: false,
    });
  }
  await db.insert(schema.consentRecords).values({
    id: newId("consent"),
    organizationId: ctx.organization.id,
    userId: ctx.user.id,
    consentType: "terms_of_service",
    granted: true,
    source: "onboarding",
  });
  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "onboarding.consent_reviewed",
  });
  revalidatePath("/app/onboarding");
  return { success: "Consent and recording settings recorded as reviewed" };
}

/** Final activation: validates readiness, then activates the receptionist. */
export async function activateReceptionist(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const readiness = await getActivationReadiness(ctx);
  if (!readiness.canActivate) {
    const failed = readiness.checks.filter((c) => c.severity === "blocker" && !c.passed);
    return {
      error: `Not ready to activate: ${failed.map((c) => c.label.toLowerCase()).join(", ")}`,
    };
  }
  const db = await getDb();

  const receptionists = await db
    .select({ id: schema.aiReceptionists.id })
    .from(schema.aiReceptionists)
    .where(eq(schema.aiReceptionists.organizationId, ctx.organization.id))
    .limit(1);
  if (!receptionists[0]) return { error: "No receptionist configured" };

  await db
    .update(schema.aiReceptionists)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(schema.aiReceptionists.id, receptionists[0].id));

  const progress = await getProgressRow(ctx.organization.id);
  await db
    .update(schema.onboardingProgress)
    .set({
      isComplete: true,
      activatedAt: new Date(),
      completedSteps: Array.from({ length: TOTAL_ONBOARDING_STEPS }, (_, i) => i + 1),
      currentStep: TOTAL_ONBOARDING_STEPS,
      updatedAt: new Date(),
    })
    .where(eq(schema.onboardingProgress.id, progress.id));

  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "onboarding.activate",
    detail: { readinessScore: readiness.score },
  });
  revalidatePath("/app/onboarding");
  revalidatePath("/app");
  return { success: "Your AI receptionist is live!" };
}
