import "server-only";
import { and, count, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { OrgContext } from "@/lib/auth/guards";
import { computeReadiness, type ReadinessResult } from "@/lib/readiness";

export const TOTAL_ONBOARDING_STEPS = 10;

/**
 * Gathers live configuration state for an already-authorized org context and
 * computes the activation readiness result. Not a server action — callers
 * must have resolved OrgContext through the auth guards first.
 */
export async function getActivationReadiness(ctx: OrgContext): Promise<ReadinessResult> {
  const db = await getDb();
  const orgId = ctx.organization.id;

  const [phoneNumbers, receptionists, hours, recipients, calendars, crms, retention, voiceConn] =
    await Promise.all([
      db
        .select({ n: count() })
        .from(schema.phoneNumbers)
        .where(and(eq(schema.phoneNumbers.organizationId, orgId), eq(schema.phoneNumbers.isActive, true))),
      db.select().from(schema.aiReceptionists).where(eq(schema.aiReceptionists.organizationId, orgId)).limit(1),
      db.select({ n: count() }).from(schema.businessHours).where(eq(schema.businessHours.organizationId, orgId)),
      db
        .select({ n: count() })
        .from(schema.notificationSettings)
        .where(eq(schema.notificationSettings.organizationId, orgId)),
      db
        .select({ n: count() })
        .from(schema.calendarConnections)
        .where(
          and(
            eq(schema.calendarConnections.organizationId, orgId),
            eq(schema.calendarConnections.status, "connected"),
          ),
        ),
      db
        .select({ n: count() })
        .from(schema.crmConnections)
        .where(
          and(eq(schema.crmConnections.organizationId, orgId), eq(schema.crmConnections.status, "connected")),
        ),
      db
        .select({ id: schema.dataRetentionSettings.id })
        .from(schema.dataRetentionSettings)
        .where(eq(schema.dataRetentionSettings.organizationId, orgId))
        .limit(1),
      db
        .select({ n: count() })
        .from(schema.providerConnections)
        .where(
          and(
            eq(schema.providerConnections.organizationId, orgId),
            eq(schema.providerConnections.providerType, "voice"),
            eq(schema.providerConnections.status, "connected"),
          ),
        ),
    ]);

  const receptionist = receptionists[0];
  const goals = receptionist?.callGoals ?? [];

  return computeReadiness({
    hasActivePhoneNumber: (phoneNumbers[0]?.n ?? 0) > 0,
    hasVoiceProviderConnection: (voiceConn[0]?.n ?? 0) > 0,
    hasGreeting: Boolean(receptionist?.greeting),
    hasBusinessHours: (hours[0]?.n ?? 0) > 0,
    callGoalCount: goals.length,
    notificationRecipientCount: recipients[0]?.n ?? 0,
    bookingEnabled: goals.includes("schedule_appointments"),
    hasCalendarConnection: (calendars[0]?.n ?? 0) > 0,
    crmLoggingEnabled: true, // CRM logging is a core behavior on every plan
    hasCrmConnection: (crms[0]?.n ?? 0) > 0,
    consentSettingsReviewed: Boolean(retention[0]),
  });
}
