"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { requireOrgContext } from "@/lib/auth/guards";
import { ingestCallEvent, type CallEvent } from "@/lib/ingestion";
import type { ActionState } from "./business";

const SAMPLE_CALLERS = [
  { name: "Taylor Brooks", phone: "+15550100001" },
  { name: "Sam Rivera", phone: "+15550100002" },
  { name: "Casey Morgan", phone: "+15550100003" },
  { name: "Jamie Patel", phone: "+15550100004" },
];

export interface SimulateState extends ActionState {
  callId?: string;
}

/**
 * Generates a clearly-labeled simulated inbound call for the current tenant
 * so the full pipeline (call record, transcript, summary, lead scoring,
 * timeline) can be exercised before live telephony arrives in Phase 5.
 */
export async function simulateIncomingCall(
  _prev: SimulateState,
  formData: FormData,
): Promise<SimulateState> {
  const ctx = await requireOrgContext();
  const scenario = String(formData.get("scenario") ?? "qualified_lead");
  const db = await getDb();

  const numbers = await db
    .select({ e164: schema.phoneNumbers.e164 })
    .from(schema.phoneNumbers)
    .where(eq(schema.phoneNumbers.organizationId, ctx.organization.id))
    .limit(1);
  const toNumber = numbers[0]?.e164;
  if (!toNumber) return { error: "Add a phone number to your account before simulating calls" };

  const questions = await db
    .select({ prompt: schema.qualificationQuestions.prompt })
    .from(schema.qualificationQuestions)
    .where(eq(schema.qualificationQuestions.organizationId, ctx.organization.id))
    .limit(3);

  const caller = SAMPLE_CALLERS[Math.floor(Math.random() * SAMPLE_CALLERS.length)]!;
  const businessName = ctx.organization.name;
  const now = new Date();

  let event: CallEvent;
  if (scenario === "missed_call") {
    event = {
      providerCallId: newId("sim"),
      provider: "simulator",
      fromNumber: caller.phone,
      toNumber,
      startedAt: now,
      durationSeconds: 0,
      status: "missed",
      outcome: "follow_up_required",
      sentiment: "neutral",
      urgency: "medium",
      caller: null,
      reasonForCalling: "Missed call (simulated)",
      requestedService: null,
      transcript: [],
      summary: `[SIMULATED] Missed call from ${caller.phone}. Missed-call text-back will engage automatically once SMS goes live in Phase 7.`,
      smsSummary: `[SIMULATED] Missed call from ${caller.phone}.`,
      qualificationAnswers: [],
      matchedScoringSignals: [],
      disqualified: false,
    };
  } else if (scenario === "faq_call") {
    event = {
      providerCallId: newId("sim"),
      provider: "simulator",
      fromNumber: caller.phone,
      toNumber,
      startedAt: now,
      durationSeconds: 75,
      status: "completed",
      outcome: "faq_resolved",
      sentiment: "positive",
      urgency: "low",
      caller: { name: caller.name, email: null },
      reasonForCalling: "General question (simulated)",
      requestedService: null,
      transcript: [
        { role: "assistant", text: `Thank you for calling ${businessName}, how can I help you today?` },
        { role: "caller", text: "I just had a quick question about your hours." },
        { role: "assistant", text: "Happy to help — we answered that from your approved FAQ list." },
        { role: "caller", text: "Perfect, that's all I needed. Thanks!" },
      ],
      summary: `[SIMULATED] ${caller.name} asked a question answered from the approved FAQ list. No follow-up needed.`,
      smsSummary: `[SIMULATED] FAQ resolved for ${caller.name}.`,
      qualificationAnswers: [],
      matchedScoringSignals: [],
      disqualified: false,
    };
  } else {
    event = {
      providerCallId: newId("sim"),
      provider: "simulator",
      fromNumber: caller.phone,
      toNumber,
      startedAt: now,
      durationSeconds: 210,
      status: "completed",
      outcome: "lead_captured",
      sentiment: "positive",
      urgency: "medium",
      caller: { name: caller.name, email: null },
      reasonForCalling: "New service inquiry (simulated)",
      requestedService: "Primary service",
      transcript: [
        { role: "assistant", text: `Thank you for calling ${businessName}, how can I help you today?` },
        { role: "caller", text: "Hi, I'm interested in your services and would like to learn more." },
        { role: "assistant", text: "Wonderful — let me ask a couple of quick questions so the right person can help you." },
        { role: "caller", text: "Sure, go ahead." },
        { role: "assistant", text: "Great, I have everything I need. Someone will follow up shortly!" },
      ],
      summary: `[SIMULATED] ${caller.name} inquired about services and answered qualification questions. Lead captured and scored; recommended next action: follow up within one business day.`,
      smsSummary: `[SIMULATED] New lead: ${caller.name}, service inquiry.`,
      qualificationAnswers: questions.map((q, i) => ({
        question: q.prompt,
        answer: i === 0 ? "Primary service" : "Yes",
      })),
      matchedScoringSignals: ["in_service_area", "ready_to_schedule", "complete_contact_info"],
      disqualified: false,
    };
  }

  try {
    const result = await ingestCallEvent(ctx.organization.id, event);
    revalidatePath("/app/calls");
    revalidatePath("/app/leads");
    revalidatePath("/app");
    return {
      success: "Simulated call created — open it in the call inbox",
      callId: result.callRecordId,
    };
  } catch (err) {
    console.error("simulate call failed", err);
    return { error: "Could not create the simulated call" };
  }
}
