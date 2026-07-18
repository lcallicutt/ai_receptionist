import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { computeLeadScore, classifyScore } from "@/lib/lead-scoring";

/**
 * Provider-neutral incoming call event. Voice providers (Retell, Vapi, Bland)
 * are mapped into this shape by their adapters; the sample webhook and the
 * in-app simulator emit it directly.
 */
export const callEventSchema = z.object({
  providerCallId: z.string().min(1).max(128),
  provider: z.string().min(1).max(50).default("sample"),
  fromNumber: z.string().min(4).max(30),
  toNumber: z.string().min(4).max(30),
  startedAt: z.coerce.date(),
  durationSeconds: z.number().int().min(0).max(60 * 60 * 4),
  status: z.enum(schema.callStatusEnum.enumValues),
  outcome: z.enum(schema.callOutcomeEnum.enumValues).nullish(),
  sentiment: z.enum(["positive", "neutral", "negative"]).nullish(),
  urgency: z.enum(["low", "medium", "high"]).nullish(),
  caller: z
    .object({
      name: z.string().max(200).nullish(),
      email: z.string().email().max(320).nullish(),
    })
    .nullish(),
  reasonForCalling: z.string().max(1000).nullish(),
  requestedService: z.string().max(300).nullish(),
  transcript: z
    .array(z.object({ role: z.enum(["assistant", "caller"]), text: z.string().max(4000) }))
    .max(500)
    .default([]),
  summary: z.string().max(8000).nullish(),
  smsSummary: z.string().max(600).nullish(),
  qualificationAnswers: z
    .array(z.object({ question: z.string().max(1000), answer: z.string().max(2000) }))
    .max(100)
    .default([]),
  matchedScoringSignals: z.array(z.string().max(100)).max(50).default([]),
  disqualified: z.boolean().default(false),
});

export type CallEvent = z.infer<typeof callEventSchema>;

export interface IngestResult {
  callRecordId: string;
  leadId: string | null;
  callerId: string;
}

/**
 * Ingests a normalized call event for a tenant: upserts the caller, creates
 * the call record, transcript, summary, timeline events, and (when caller
 * data warrants) a scored lead. Callers must already have resolved the
 * organization (via phone-number mapping or an authorized session).
 */
export async function ingestCallEvent(organizationId: string, event: CallEvent): Promise<IngestResult> {
  const db = await getDb();

  // Upsert caller by (org, phone)
  const existingCallers = await db
    .select()
    .from(schema.callers)
    .where(
      and(eq(schema.callers.organizationId, organizationId), eq(schema.callers.phone, event.fromNumber)),
    )
    .limit(1);
  let callerId: string;
  if (existingCallers[0]) {
    callerId = existingCallers[0].id;
    if (event.caller?.name && !existingCallers[0].name) {
      await db
        .update(schema.callers)
        .set({ name: event.caller.name, email: event.caller.email ?? existingCallers[0].email })
        .where(eq(schema.callers.id, callerId));
    }
  } else {
    callerId = newId("caller");
    await db.insert(schema.callers).values({
      id: callerId,
      organizationId,
      phone: event.fromNumber,
      name: event.caller?.name ?? null,
      email: event.caller?.email ?? null,
    });
  }

  // Receptionist for this org (first active one)
  const receptionists = await db
    .select({ id: schema.aiReceptionists.id })
    .from(schema.aiReceptionists)
    .where(eq(schema.aiReceptionists.organizationId, organizationId))
    .limit(1);

  // Lead — created when we captured something worth following up on
  let leadId: string | null = null;
  const shouldCreateLead =
    event.outcome !== "spam" &&
    event.outcome !== "faq_resolved" &&
    (Boolean(event.caller?.name) || event.qualificationAnswers.length > 0 || Boolean(event.requestedService));

  if (shouldCreateLead) {
    const rules = await db
      .select()
      .from(schema.leadScoringRules)
      .where(eq(schema.leadScoringRules.organizationId, organizationId));
    const answerImpacts = await db
      .select({
        prompt: schema.qualificationQuestions.prompt,
        impact: schema.qualificationQuestions.leadScoreImpact,
      })
      .from(schema.qualificationQuestions)
      .where(eq(schema.qualificationQuestions.organizationId, organizationId))
      .orderBy(asc(schema.qualificationQuestions.sortOrder));
    const impactByPrompt = new Map(answerImpacts.map((a) => [a.prompt, a.impact]));
    const baseScore = event.qualificationAnswers.reduce(
      (sum, a) => sum + (impactByPrompt.get(a.question) ?? 0),
      0,
    );
    const score = computeLeadScore(rules, event.matchedScoringSignals, baseScore);
    const classification = classifyScore(score, event.disqualified);

    leadId = newId("lead");
    await db.insert(schema.leads).values({
      id: leadId,
      organizationId,
      callerId,
      name: event.caller?.name ?? null,
      phone: event.fromNumber,
      email: event.caller?.email ?? null,
      callReason: event.reasonForCalling ?? null,
      requestedService: event.requestedService ?? null,
      status: event.disqualified
        ? "disqualified"
        : event.outcome === "appointment_booked"
          ? "appointment_booked"
          : "new",
      classification,
      score,
      source: event.provider === "simulator" ? "simulated_call" : "ai_receptionist",
    });
    for (const answer of event.qualificationAnswers) {
      await db.insert(schema.leadAnswers).values({
        id: newId("la"),
        organizationId,
        leadId,
        questionPrompt: answer.question,
        answer: answer.answer,
      });
    }
  }

  const callRecordId = newId("call");
  await db.insert(schema.callRecords).values({
    id: callRecordId,
    organizationId,
    receptionistId: receptionists[0]?.id ?? null,
    callerId,
    leadId,
    direction: "inbound",
    status: event.status,
    outcome: event.outcome ?? null,
    fromNumber: event.fromNumber,
    toNumber: event.toNumber,
    startedAt: event.startedAt,
    endedAt: new Date(event.startedAt.getTime() + event.durationSeconds * 1000),
    durationSeconds: event.durationSeconds,
    sentiment: event.sentiment ?? null,
    urgency: event.urgency ?? null,
    isUnread: true,
    provider: event.provider,
    providerCallId: event.providerCallId,
  });

  if (event.transcript.length > 0) {
    await db.insert(schema.callTranscripts).values({
      id: newId("tr"),
      organizationId,
      callRecordId,
      segments: event.transcript,
      provider: event.provider,
    });
  }
  if (event.summary || event.smsSummary) {
    await db.insert(schema.callSummaries).values({
      id: newId("cs"),
      organizationId,
      callRecordId,
      smsSummary: event.smsSummary ?? null,
      detailedSummary: event.summary ?? null,
      reasonForCalling: event.reasonForCalling ?? null,
      sentiment: event.sentiment ?? null,
    });
  }

  const timeline =
    event.status === "missed" || event.status === "abandoned"
      ? ["call_received", "missed_call_detected"]
      : ["call_received", "greeting_played", "intent_identified", "summary_generated"];
  for (const [i, eventType] of timeline.entries()) {
    await db.insert(schema.callEvents).values({
      id: newId("ce"),
      organizationId,
      callRecordId,
      eventType,
      occurredAt: new Date(event.startedAt.getTime() + i * 3000),
    });
  }

  return { callRecordId, leadId, callerId };
}

/** Resolves the tenant that owns a called phone number (E.164). */
export async function resolveOrgByPhoneNumber(toNumber: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db
    .select({ organizationId: schema.phoneNumbers.organizationId })
    .from(schema.phoneNumbers)
    .where(and(eq(schema.phoneNumbers.e164, toNumber), eq(schema.phoneNumbers.isActive, true)))
    .limit(1);
  return rows[0]?.organizationId ?? null;
}
