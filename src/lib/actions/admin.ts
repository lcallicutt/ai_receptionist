"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { setSessionCookie } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import type { ActionState } from "./business";

/** Toggle a feature flag globally (platform admin only). */
export async function toggleFeatureFlag(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requirePlatformAdmin();
  const key = String(formData.get("key") ?? "");
  if (!key) return { error: "Missing flag" };
  const db = await getDb();
  const flags = await db
    .select()
    .from(schema.featureFlags)
    .where(eq(schema.featureFlags.key, key))
    .limit(1);
  if (!flags[0]) return { error: "Flag not found" };
  await db
    .update(schema.featureFlags)
    .set({ enabledGlobally: !flags[0].enabledGlobally, updatedAt: new Date() })
    .where(eq(schema.featureFlags.id, flags[0].id));
  await writeAuditLog({
    organizationId: null,
    actorUserId: admin.id,
    action: "feature_flag.toggle",
    entityId: flags[0].id,
    detail: { key, enabled: !flags[0].enabledGlobally },
  });
  revalidatePath("/admin/feature-flags");
  return { success: `${key} ${flags[0].enabledGlobally ? "disabled" : "enabled"}` };
}

/**
 * Safe support impersonation: a platform admin assumes the organization
 * owner's session. Fully audit-logged with the admin's identity; the
 * admin logs out to end the impersonation.
 */
export async function impersonateOrgOwner(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requirePlatformAdmin();
  const organizationId = String(formData.get("organizationId") ?? "");
  if (!organizationId) return { error: "Missing organization" };
  const db = await getDb();

  const owners = await db
    .select({ userId: schema.organizationMembers.userId })
    .from(schema.organizationMembers)
    .where(
      and(
        eq(schema.organizationMembers.organizationId, organizationId),
        eq(schema.organizationMembers.role, "owner"),
      ),
    )
    .limit(1);
  if (!owners[0]) return { error: "This organization has no owner to impersonate" };

  await writeAuditLog({
    organizationId,
    actorUserId: owners[0].userId,
    impersonatedByUserId: admin.id,
    action: "support.impersonate_start",
    detail: { adminEmail: admin.email },
  });
  await setSessionCookie({ userId: owners[0].userId, impersonatedBy: admin.id });
  redirect("/app");
}
