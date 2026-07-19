import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { renderTemplate } from "@/lib/booking";
import { twilioProvider } from "@/lib/providers/telephony/twilio";
import { DEFAULT_TEXT_BACK_MESSAGE } from "@/lib/text-back-constants";

export type TextBackOutcome =
  | { status: "sent" | "queued"; smsMessageId: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

/**
 * Missed-call text-back with layered protections, checked in order:
 * tenant toggle, caller opt-out, number SMS capability, and per-caller
 * cooldown. When the SMS provider isn't configured the message is queued
 * (visible in SMS Activity) instead of silently pretending to send.
 */
export async function maybeSendTextBack(
  organizationId: string,
  callerId: string,
  relatedCallId: string,
): Promise<TextBackOutcome> {
  const db = await getDb();

  const [profiles, callers, numbers] = await Promise.all([
    db
      .select()
      .from(schema.businessProfiles)
      .where(eq(schema.businessProfiles.organizationId, organizationId))
      .limit(1),
    db
      .select()
      .from(schema.callers)
      .where(and(eq(schema.callers.id, callerId), eq(schema.callers.organizationId, organizationId)))
      .limit(1),
    db
      .select()
      .from(schema.phoneNumbers)
      .where(
        and(
          eq(schema.phoneNumbers.organizationId, organizationId),
          eq(schema.phoneNumbers.isActive, true),
        ),
      )
      .limit(1),
  ]);
  const profile = profiles[0];
  const caller = callers[0];
  const fromNumber = numbers[0];

  if (!caller) return { status: "skipped", reason: "caller not found" };
  if (profile && !profile.textBackEnabled) return { status: "skipped", reason: "text-back disabled" };
  if (caller.smsOptedOut) return { status: "skipped", reason: "caller opted out" };
  if (!fromNumber) return { status: "skipped", reason: "no active phone number" };
  if (fromNumber.capabilities && !fromNumber.capabilities.sms) {
    return { status: "skipped", reason: "number is not SMS-capable" };
  }

  const cooldownHours = profile?.textBackCooldownHours ?? 24;
  if (caller.lastTextBackAt) {
    const elapsed = Date.now() - caller.lastTextBackAt.getTime();
    if (elapsed < cooldownHours * 60 * 60 * 1000) {
      return { status: "skipped", reason: "cooldown active" };
    }
  }

  const body = renderTemplate(profile?.textBackMessage || DEFAULT_TEXT_BACK_MESSAGE, {
    business_name: profile?.businessName ?? "our team",
    caller_name: caller.name ?? "",
  });

  const smsMessageId = newId("sms");
  const configured = twilioProvider.isConfigured();
  await db.insert(schema.smsMessages).values({
    id: smsMessageId,
    organizationId,
    callerId,
    relatedCallId,
    direction: "outbound",
    fromNumber: fromNumber.e164,
    toNumber: caller.phone,
    body,
    isTextBack: true,
    status: "queued",
    provider: "twilio",
  });
  // The cooldown clock starts as soon as we commit to messaging this caller,
  // so retries and races can never double-text.
  await db
    .update(schema.callers)
    .set({ lastTextBackAt: new Date() })
    .where(eq(schema.callers.id, callerId));

  if (!configured) {
    return { status: "queued", smsMessageId };
  }

  try {
    const result = await twilioProvider.sendSms(fromNumber.e164, caller.phone, body);
    await db
      .update(schema.smsMessages)
      .set({ status: "sent", providerMessageId: result.providerMessageId })
      .where(eq(schema.smsMessages.id, smsMessageId));
    await db.insert(schema.integrationLogs).values({
      id: newId("il"),
      organizationId,
      providerType: "sms",
      provider: "twilio",
      operation: "send_text_back",
      relatedCallId,
      success: true,
    });
    return { status: "sent", smsMessageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    await db
      .update(schema.smsMessages)
      .set({ status: "failed", error: message })
      .where(eq(schema.smsMessages.id, smsMessageId));
    await db.insert(schema.integrationLogs).values({
      id: newId("il"),
      organizationId,
      providerType: "sms",
      provider: "twilio",
      operation: "send_text_back",
      relatedCallId,
      success: false,
      detail: { message },
    });
    return { status: "failed", error: message };
  }
}

const OPT_OUT_KEYWORDS = new Set(["stop", "stopall", "unsubscribe", "cancel", "end", "quit"]);
const OPT_IN_KEYWORDS = new Set(["start", "unstop", "yes"]);

export function classifyInboundKeyword(body: string): "opt_out" | "opt_in" | "message" {
  const normalized = body.trim().toLowerCase();
  if (OPT_OUT_KEYWORDS.has(normalized)) return "opt_out";
  if (OPT_IN_KEYWORDS.has(normalized)) return "opt_in";
  return "message";
}
