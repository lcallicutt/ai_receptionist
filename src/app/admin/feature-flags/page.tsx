import { asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FeatureFlagToggle } from "@/components/features/feature-flag-toggle";

export const metadata = { title: "Feature Flags" };

const DEFAULT_FLAGS: Array<{ key: string; description: string }> = [
  { key: "stripe_billing", description: "Self-serve Stripe checkout and plan changes" },
  { key: "outlook_calendar", description: "Microsoft Outlook calendar adapter" },
  { key: "hubspot_crm", description: "HubSpot CRM adapter" },
  { key: "multi_receptionist", description: "Multiple receptionists per organization (Premium)" },
  { key: "weekly_digest_email", description: "Automated weekly performance summary emails" },
];

export default async function FeatureFlagsPage() {
  const db = await getDb();

  // Seed the default flag set on first visit so toggles always have rows.
  const existing = await db.select().from(schema.featureFlags);
  const existingKeys = new Set(existing.map((f) => f.key));
  for (const flag of DEFAULT_FLAGS) {
    if (!existingKeys.has(flag.key)) {
      await db.insert(schema.featureFlags).values({
        id: newId("flag"),
        key: flag.key,
        description: flag.description,
        enabledGlobally: false,
      });
    }
  }
  const flags = await db.select().from(schema.featureFlags).orderBy(asc(schema.featureFlags.key));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Feature Flags</h1>
        <p className="text-sm text-ink-500">
          Global rollout switches. Per-organization overrides are stored on each flag and applied
          server-side.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Flags</CardTitle>
          <CardDescription>Toggles are audit-logged</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-ink-300/15">
            {flags.map((flag) => (
              <li key={flag.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-mono text-sm font-medium text-ink-900">{flag.key}</p>
                  <p className="text-xs text-ink-500">{flag.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={flag.enabledGlobally ? "success" : "neutral"}>
                    {flag.enabledGlobally ? "enabled" : "disabled"}
                  </Badge>
                  <FeatureFlagToggle flagKey={flag.key} enabled={flag.enabledGlobally} />
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
