"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { requireOrgRole } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit";
import { getOrgPlanTier } from "@/lib/subscription";
import { planLimit, planLimitReached, PLAN_DEFINITIONS } from "@/lib/plans";
import { twilioProvider } from "@/lib/providers/telephony/twilio";
import type { ActionState } from "./business";

const e164Re = /^\+[1-9]\d{6,14}$/;

const addSchema = z.object({
  e164: z
    .string()
    .trim()
    .regex(e164Re, "Enter a number in E.164 format, e.g. +19105551234"),
  label: z.string().trim().max(100).or(z.literal("")),
  provision: z.enum(["map", "provision"]).default("map"),
});

export async function addPhoneNumber(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const parsed = addSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  const d = parsed.data;
  const db = await getDb();

  // Server-side plan enforcement on active numbers.
  const tier = await getOrgPlanTier(ctx.organization.id);
  const current = await db
    .select({ n: count() })
    .from(schema.phoneNumbers)
    .where(
      and(
        eq(schema.phoneNumbers.organizationId, ctx.organization.id),
        eq(schema.phoneNumbers.isActive, true),
      ),
    );
  if (planLimitReached(tier, "phone_numbers", current[0]?.n ?? 0)) {
    const cap = planLimit(tier, "phone_numbers");
    return {
      error: `Your ${PLAN_DEFINITIONS[tier].name} plan includes ${cap} phone number${cap === 1 ? "" : "s"}. Upgrade to add more.`,
    };
  }

  // Numbers are globally unique across tenants.
  const existing = await db
    .select({ id: schema.phoneNumbers.id })
    .from(schema.phoneNumbers)
    .where(eq(schema.phoneNumbers.e164, d.e164))
    .limit(1);
  if (existing[0]) return { error: "That number is already registered on the platform" };

  let providerNumberId: string | null = null;
  if (d.provision === "provision") {
    if (!twilioProvider.isConfigured()) {
      return {
        error:
          "Twilio isn't configured on this deployment — add the number as a manual mapping, or configure TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN.",
      };
    }
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const provisioned = await twilioProvider.provisionNumber(d.e164, baseUrl);
      providerNumberId = provisioned.providerNumberId;
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Provisioning failed" };
    }
  }

  const receptionists = await db
    .select({ id: schema.aiReceptionists.id })
    .from(schema.aiReceptionists)
    .where(eq(schema.aiReceptionists.organizationId, ctx.organization.id))
    .limit(1);

  await db.insert(schema.phoneNumbers).values({
    id: newId("pn"),
    organizationId: ctx.organization.id,
    receptionistId: receptionists[0]?.id ?? null,
    e164: d.e164,
    label: d.label || null,
    provider: "twilio",
    providerNumberId,
    capabilities: { voice: true, sms: true },
  });

  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: d.provision === "provision" ? "phone_number.provision" : "phone_number.map",
  });
  revalidatePath("/app/phone-numbers");
  revalidatePath("/app/onboarding");
  return { success: d.provision === "provision" ? "Number provisioned" : "Number mapped" };
}

export async function togglePhoneNumber(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing number" };
  const db = await getDb();
  const rows = await db
    .select({ isActive: schema.phoneNumbers.isActive })
    .from(schema.phoneNumbers)
    .where(
      and(eq(schema.phoneNumbers.id, id), eq(schema.phoneNumbers.organizationId, ctx.organization.id)),
    )
    .limit(1);
  if (!rows[0]) return { error: "Number not found" };

  if (!rows[0].isActive) {
    // Reactivation counts against the plan limit.
    const tier = await getOrgPlanTier(ctx.organization.id);
    const current = await db
      .select({ n: count() })
      .from(schema.phoneNumbers)
      .where(
        and(
          eq(schema.phoneNumbers.organizationId, ctx.organization.id),
          eq(schema.phoneNumbers.isActive, true),
        ),
      );
    if (planLimitReached(tier, "phone_numbers", current[0]?.n ?? 0)) {
      return { error: "Plan limit reached — deactivate another number first" };
    }
  }

  await db
    .update(schema.phoneNumbers)
    .set({ isActive: !rows[0].isActive })
    .where(eq(schema.phoneNumbers.id, id));
  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: rows[0].isActive ? "phone_number.deactivate" : "phone_number.activate",
    entityId: id,
  });
  revalidatePath("/app/phone-numbers");
  return { success: rows[0].isActive ? "Number deactivated" : "Number activated" };
}
