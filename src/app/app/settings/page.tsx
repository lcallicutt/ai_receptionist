import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BusinessProfileForm } from "@/components/features/business-profile-form";
import { BusinessHoursForm } from "@/components/features/business-hours-form";
import { TextBackSettingsForm } from "@/components/features/text-back-settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await requireOrgContext();
  const db = await getDb();

  const [profiles, hours] = await Promise.all([
    db
      .select()
      .from(schema.businessProfiles)
      .where(eq(schema.businessProfiles.organizationId, ctx.organization.id))
      .limit(1),
    db
      .select()
      .from(schema.businessHours)
      .where(eq(schema.businessHours.organizationId, ctx.organization.id))
      .orderBy(asc(schema.businessHours.dayOfWeek)),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Settings</h1>
        <p className="text-sm text-ink-500">Business information and hours</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Business profile</CardTitle>
          <CardDescription>
            Used across your receptionist&apos;s greeting, confirmations, and notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessProfileForm profile={profiles[0] ?? null} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Business hours</CardTitle>
          <CardDescription>
            Determines when the receptionist treats calls as during or after hours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessHoursForm hours={hours} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Missed-call text-back</CardTitle>
          <CardDescription>
            When a call can&apos;t be answered, an instant text keeps the lead alive. Opt-outs
            (STOP) are honored automatically and duplicates are prevented by the cooldown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TextBackSettingsForm
            enabled={profiles[0]?.textBackEnabled ?? true}
            message={profiles[0]?.textBackMessage ?? null}
            cooldownHours={profiles[0]?.textBackCooldownHours ?? 24}
          />
        </CardContent>
      </Card>
    </div>
  );
}
