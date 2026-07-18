import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth/guards";
import { getOrgPlanTier } from "@/lib/subscription";
import { planLimit, PLAN_DEFINITIONS } from "@/lib/plans";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RecipientManager } from "@/components/features/recipient-manager";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const ctx = await requireOrgContext();
  const db = await getDb();
  const [recipients, tier] = await Promise.all([
    db
      .select()
      .from(schema.notificationSettings)
      .where(eq(schema.notificationSettings.organizationId, ctx.organization.id)),
    getOrgPlanTier(ctx.organization.id),
  ]);
  const cap = planLimit(tier, "notification_recipients");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Notifications</h1>
        <p className="text-sm text-ink-500">
          Who hears about calls, leads, and appointments — and how.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recipients</CardTitle>
          <CardDescription>
            Each recipient chooses which alerts they receive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecipientManager
            recipients={recipients}
            planLimitLabel={`Your ${PLAN_DEFINITIONS[tier].name} plan includes ${cap === null ? "unlimited" : cap} notification recipient${cap === 1 ? "" : "s"} (${recipients.length} in use).`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
