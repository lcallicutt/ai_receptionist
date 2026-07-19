import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth/guards";
import { getOrgPlanTier } from "@/lib/subscription";
import { planLimit, PLAN_DEFINITIONS } from "@/lib/plans";
import { twilioProvider } from "@/lib/providers/telephony/twilio";
import { formatPhone } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PhoneNumbersManager } from "@/components/features/phone-numbers-manager";

export const metadata = { title: "Phone Numbers" };

export default async function PhoneNumbersPage() {
  const ctx = await requireOrgContext();
  const db = await getDb();

  const [numbers, tier] = await Promise.all([
    db
      .select({ number: schema.phoneNumbers, receptionist: schema.aiReceptionists })
      .from(schema.phoneNumbers)
      .leftJoin(
        schema.aiReceptionists,
        eq(schema.phoneNumbers.receptionistId, schema.aiReceptionists.id),
      )
      .where(eq(schema.phoneNumbers.organizationId, ctx.organization.id)),
    getOrgPlanTier(ctx.organization.id),
  ]);
  const cap = planLimit(tier, "phone_numbers");
  const activeCount = numbers.filter((n) => n.number.isActive).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Phone Numbers</h1>
        <p className="text-sm text-ink-500">
          Numbers routed to your AI receptionist. Incoming calls are matched to your account by
          the called number.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your numbers</CardTitle>
          <CardDescription>
            Map a number you already own, or provision a new one through Twilio when configured.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PhoneNumbersManager
            numbers={numbers.map(({ number, receptionist }) => ({
              id: number.id,
              e164Formatted: formatPhone(number.e164),
              label: number.label,
              provider: number.provider,
              isActive: number.isActive,
              hasProviderId: Boolean(number.providerNumberId),
              receptionistName: receptionist?.name ?? null,
            }))}
            twilioConfigured={twilioProvider.isConfigured()}
            planLimitLabel={`Your ${PLAN_DEFINITIONS[tier].name} plan includes ${cap === null ? "unlimited" : cap} phone number${cap === 1 ? "" : "s"} (${activeCount} active).`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
