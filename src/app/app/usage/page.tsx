import { and, eq, gte, sum } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth/guards";
import { getOrgPlanTier } from "@/lib/subscription";
import {
  PLAN_DEFINITIONS,
  planLimit,
  estimateOverageCents,
  USAGE_ALLOWANCE_KEYS,
  USAGE_LABELS,
  formatPrice,
  type UsageType,
} from "@/lib/plans";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UsageMeter } from "@/components/ui/charts";

export const metadata = { title: "Usage" };

export default async function UsagePage() {
  const ctx = await requireOrgContext();
  const db = await getDb();
  const orgId = ctx.organization.id;

  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);

  const [tier, usageRows] = await Promise.all([
    getOrgPlanTier(orgId),
    db
      .select({ usageType: schema.usageRecords.usageType, total: sum(schema.usageRecords.quantity) })
      .from(schema.usageRecords)
      .where(and(eq(schema.usageRecords.organizationId, orgId), gte(schema.usageRecords.recordedAt, periodStart)))
      .groupBy(schema.usageRecords.usageType),
  ]);
  const usageByType = new Map(usageRows.map((r) => [r.usageType, Math.round(Number(r.total ?? 0))]));
  const plan = PLAN_DEFINITIONS[tier];

  const meteredTypes = Object.keys(USAGE_ALLOWANCE_KEYS) as UsageType[];
  const totalOverageCents = meteredTypes.reduce(
    (sumCents, type) => sumCents + estimateOverageCents(tier, type, usageByType.get(type) ?? 0),
    0,
  );

  const otherTypes = ([...usageByType.keys()] as UsageType[]).filter(
    (t) => !meteredTypes.includes(t),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Usage</h1>
        <p className="text-sm text-ink-500">
          {plan.name} plan · current period since{" "}
          {periodStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Metered usage</CardTitle>
          <CardDescription>
            Usage against your plan&apos;s included allowances. Overage estimates use the
            platform&apos;s configured per-unit rates
            {plan.usageBased ? " and bill monthly on the Premium plan" : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {meteredTypes.map((type) => {
            const allowanceKey = USAGE_ALLOWANCE_KEYS[type]!;
            return (
              <UsageMeter
                key={type}
                label={USAGE_LABELS[type].label}
                used={usageByType.get(type) ?? 0}
                allowance={planLimit(tier, allowanceKey)}
                unit={USAGE_LABELS[type].unit}
              />
            );
          })}
          <div className="border-t border-ink-300/15 pt-4">
            <p className="text-sm text-ink-500">
              Estimated overage this period:{" "}
              <span className="font-semibold text-ink-900">
                {totalOverageCents > 0 ? formatPrice(totalOverageCents) : "$0"}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {otherTypes.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Other usage</CardTitle>
            <CardDescription>Recorded activity without a metered allowance</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-3">
              {otherTypes.map((type) => (
                <div key={type} className="rounded-lg border border-ink-300/20 p-3">
                  <dt className="text-xs text-ink-500">{USAGE_LABELS[type]?.label ?? type}</dt>
                  <dd className="text-lg font-bold tabular-nums text-ink-900">
                    {(usageByType.get(type) ?? 0).toLocaleString()}{" "}
                    <span className="text-xs font-normal text-ink-500">
                      {USAGE_LABELS[type]?.unit ?? ""}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
