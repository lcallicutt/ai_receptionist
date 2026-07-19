import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { PlanTier } from "@/lib/plans";

/**
 * Resolves an organization's current plan tier from its subscription.
 * Falls back to "basic" when no subscription exists (safest, most
 * restrictive) so plan enforcement never fails open.
 */
export async function getOrgPlanTier(organizationId: string): Promise<PlanTier> {
  const db = await getDb();
  const rows = await db
    .select({ tier: schema.plans.tier })
    .from(schema.subscriptions)
    .innerJoin(schema.plans, eq(schema.subscriptions.planId, schema.plans.id))
    .where(eq(schema.subscriptions.organizationId, organizationId))
    .limit(1);
  return rows[0]?.tier ?? "basic";
}
