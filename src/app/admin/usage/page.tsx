import { eq, gte, sum } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import {
  PLAN_DEFINITIONS,
  planLimit,
  estimateOverageCents,
  formatPrice,
} from "@/lib/plans";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Usage" };

export default async function AdminUsagePage() {
  const db = await getDb();
  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);

  const [orgs, usageRows, subs] = await Promise.all([
    db.select().from(schema.organizations),
    db
      .select({
        organizationId: schema.usageRecords.organizationId,
        usageType: schema.usageRecords.usageType,
        total: sum(schema.usageRecords.quantity),
      })
      .from(schema.usageRecords)
      .where(gte(schema.usageRecords.recordedAt, periodStart))
      .groupBy(schema.usageRecords.organizationId, schema.usageRecords.usageType),
    db
      .select({ organizationId: schema.subscriptions.organizationId, tier: schema.plans.tier })
      .from(schema.subscriptions)
      .innerJoin(schema.plans, eq(schema.subscriptions.planId, schema.plans.id)),
  ]);

  const tierByOrg = new Map(subs.map((s) => [s.organizationId, s.tier]));
  const usageByOrg = new Map<string, Map<string, number>>();
  for (const row of usageRows) {
    const orgMap = usageByOrg.get(row.organizationId) ?? new Map<string, number>();
    orgMap.set(row.usageType, Math.round(Number(row.total ?? 0)));
    usageByOrg.set(row.organizationId, orgMap);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Usage</h1>
        <p className="text-sm text-ink-500">
          Billable usage by organization since{" "}
          {periodStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Current period</CardTitle>
          <CardDescription>Voice minutes and SMS against plan allowances</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-300/20 text-xs uppercase tracking-wide text-ink-300">
                  <th scope="col" className="px-6 py-3 font-medium">Organization</th>
                  <th scope="col" className="px-6 py-3 font-medium">Plan</th>
                  <th scope="col" className="px-6 py-3 font-medium">Voice minutes</th>
                  <th scope="col" className="px-6 py-3 font-medium">SMS</th>
                  <th scope="col" className="px-6 py-3 font-medium">Est. overage</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((org) => {
                  const tier = tierByOrg.get(org.id);
                  const usage = usageByOrg.get(org.id) ?? new Map<string, number>();
                  const voice = usage.get("voice_minutes") ?? 0;
                  const smsCount = usage.get("sms_messages") ?? 0;
                  const overage = tier
                    ? estimateOverageCents(tier, "voice_minutes", voice) +
                      estimateOverageCents(tier, "sms_messages", smsCount)
                    : 0;
                  const voiceAllowance = tier ? planLimit(tier, "included_voice_minutes") : null;
                  return (
                    <tr key={org.id} className="border-b border-ink-300/10 last:border-0">
                      <td className="px-6 py-3 font-medium text-ink-900">{org.name}</td>
                      <td className="px-6 py-3">
                        {tier ? (
                          <Badge variant="brand">{PLAN_DEFINITIONS[tier].name}</Badge>
                        ) : (
                          <span className="text-ink-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3 tabular-nums text-ink-700">
                        {voice.toLocaleString()}
                        {voiceAllowance !== null ? (
                          <span className="text-xs text-ink-300"> / {voiceAllowance.toLocaleString()}</span>
                        ) : null}
                      </td>
                      <td className="px-6 py-3 tabular-nums text-ink-700">{smsCount.toLocaleString()}</td>
                      <td className="px-6 py-3 tabular-nums">
                        {overage > 0 ? (
                          <span className="font-medium text-amber-700">{formatPrice(overage)}</span>
                        ) : (
                          <span className="text-ink-300">$0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
