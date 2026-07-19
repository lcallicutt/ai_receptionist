"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { requireOrgRole } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit";

export interface ActionState {
  error?: string;
  success?: string;
}

const profileSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required").max(200),
  website: z.string().trim().url("Enter a valid URL").max(500).or(z.literal("")),
  mainPhone: z.string().trim().max(30).or(z.literal("")),
  addressLine1: z.string().trim().max(200).or(z.literal("")),
  city: z.string().trim().max(100).or(z.literal("")),
  state: z.string().trim().max(50).or(z.literal("")),
  postalCode: z.string().trim().max(20).or(z.literal("")),
  timeZone: z.string().trim().min(1).max(64),
  serviceAreas: z.string().trim().max(1000).or(z.literal("")),
  primaryContactName: z.string().trim().max(200).or(z.literal("")),
  primaryContactEmail: z.string().trim().email("Enter a valid email").max(320).or(z.literal("")),
  notificationPhone: z.string().trim().max(30).or(z.literal("")),
});

export async function updateBusinessProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  const d = parsed.data;
  const db = await getDb();

  const values = {
    businessName: d.businessName,
    website: d.website || null,
    mainPhone: d.mainPhone || null,
    addressLine1: d.addressLine1 || null,
    city: d.city || null,
    state: d.state || null,
    postalCode: d.postalCode || null,
    timeZone: d.timeZone,
    serviceAreas: d.serviceAreas
      ? d.serviceAreas.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    primaryContactName: d.primaryContactName || null,
    primaryContactEmail: d.primaryContactEmail || null,
    notificationPhone: d.notificationPhone || null,
    updatedAt: new Date(),
  };

  const existing = await db
    .select({ id: schema.businessProfiles.id })
    .from(schema.businessProfiles)
    .where(eq(schema.businessProfiles.organizationId, ctx.organization.id))
    .limit(1);

  if (existing[0]) {
    await db
      .update(schema.businessProfiles)
      .set(values)
      .where(
        and(
          eq(schema.businessProfiles.id, existing[0].id),
          eq(schema.businessProfiles.organizationId, ctx.organization.id),
        ),
      );
  } else {
    await db.insert(schema.businessProfiles).values({
      id: newId("bp"),
      organizationId: ctx.organization.id,
      ...values,
    });
  }

  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "business_profile.update",
  });
  revalidatePath("/app/settings");
  revalidatePath("/app/onboarding");
  return { success: "Business profile saved" };
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function updateBusinessHours(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const db = await getDb();

  const rows: Array<{ day: number; isClosed: boolean; opensAt: string | null; closesAt: string | null }> = [];
  for (let day = 0; day <= 6; day++) {
    const key = DAY_KEYS[day]!;
    const isClosed = formData.get(`${key}-closed`) === "on";
    const opensAt = String(formData.get(`${key}-open`) ?? "").trim();
    const closesAt = String(formData.get(`${key}-close`) ?? "").trim();
    if (!isClosed) {
      if (!timeRe.test(opensAt) || !timeRe.test(closesAt)) {
        return { error: `Enter valid open and close times (HH:MM) for ${key.toUpperCase()}` };
      }
      if (opensAt >= closesAt) {
        return { error: `Opening time must be before closing time on ${key.toUpperCase()}` };
      }
    }
    rows.push({
      day,
      isClosed,
      opensAt: isClosed ? null : opensAt,
      closesAt: isClosed ? null : closesAt,
    });
  }

  for (const row of rows) {
    const existing = await db
      .select({ id: schema.businessHours.id })
      .from(schema.businessHours)
      .where(
        and(
          eq(schema.businessHours.organizationId, ctx.organization.id),
          eq(schema.businessHours.dayOfWeek, row.day),
        ),
      )
      .limit(1);
    if (existing[0]) {
      await db
        .update(schema.businessHours)
        .set({ isClosed: row.isClosed, opensAt: row.opensAt, closesAt: row.closesAt })
        .where(eq(schema.businessHours.id, existing[0].id));
    } else {
      await db.insert(schema.businessHours).values({
        id: newId("bh"),
        organizationId: ctx.organization.id,
        dayOfWeek: row.day,
        isClosed: row.isClosed,
        opensAt: row.opensAt,
        closesAt: row.closesAt,
      });
    }
  }

  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "business_hours.update",
  });
  revalidatePath("/app/settings");
  revalidatePath("/app/onboarding");
  return { success: "Business hours saved" };
}
