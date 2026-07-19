"use server";

import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { requireOrgRole } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit";
import { retellProvider } from "@/lib/providers/voice/retell";
import type { ActionState } from "./business";

const testCallSchema = z.object({
  toNumber: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{6,14}$/, "Enter your phone number in E.164 format, e.g. +19105551234"),
});

/**
 * Places a real outbound test call: syncs the receptionist's configuration
 * to the voice provider, then dials the requested number from the tenant's
 * line. Requires RETELL_API_KEY on the deployment.
 */
export async function startLiveTestCall(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  if (!retellProvider.isConfigured()) {
    return {
      error:
        "The voice provider isn't configured on this deployment (RETELL_API_KEY). Use the simulator below in the meantime.",
    };
  }
  const parsed = testCallSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  const db = await getDb();
  const orgId = ctx.organization.id;

  const [receptionists, numbers, faqs, questions] = await Promise.all([
    db.select().from(schema.aiReceptionists).where(eq(schema.aiReceptionists.organizationId, orgId)).limit(1),
    db
      .select()
      .from(schema.phoneNumbers)
      .where(and(eq(schema.phoneNumbers.organizationId, orgId), eq(schema.phoneNumbers.isActive, true)))
      .limit(1),
    db
      .select()
      .from(schema.faqs)
      .where(and(eq(schema.faqs.organizationId, orgId), eq(schema.faqs.isActive, true)))
      .orderBy(asc(schema.faqs.sortOrder)),
    db
      .select()
      .from(schema.qualificationQuestions)
      .where(
        and(
          eq(schema.qualificationQuestions.organizationId, orgId),
          eq(schema.qualificationQuestions.isActive, true),
        ),
      )
      .orderBy(asc(schema.qualificationQuestions.sortOrder)),
  ]);

  const receptionist = receptionists[0];
  if (!receptionist?.greeting) return { error: "Configure the receptionist's greeting first" };
  const fromNumber = numbers[0]?.e164;
  if (!fromNumber) return { error: "Add an active phone number first" };

  try {
    // Sync agent config, then dial. The provider connection row tracks the
    // provider-side agent id per tenant.
    const connections = await db
      .select()
      .from(schema.providerConnections)
      .where(
        and(
          eq(schema.providerConnections.organizationId, orgId),
          eq(schema.providerConnections.providerType, "voice"),
          eq(schema.providerConnections.provider, "retell"),
        ),
      )
      .limit(1);
    const existingAgentId =
      (connections[0]?.config as { agentId?: string } | null)?.agentId ?? undefined;

    const agent = await retellProvider.syncAgent(
      {
        receptionistName: receptionist.name,
        greeting: receptionist.greeting,
        voiceId: receptionist.voiceId,
        language: receptionist.language,
        businessKnowledge: receptionist.businessKnowledge,
        faqs: faqs.map((f) => ({ question: f.question, answer: f.answer })),
        qualificationPrompts: questions.map((q) => q.prompt),
        restrictedTopics: receptionist.restrictedTopics ?? [],
        complianceStatements: receptionist.complianceStatements ?? [],
      },
      existingAgentId,
    );

    if (connections[0]) {
      await db
        .update(schema.providerConnections)
        .set({ config: { agentId: agent.agentId }, status: "connected", lastHealthCheckAt: new Date() })
        .where(eq(schema.providerConnections.id, connections[0].id));
    } else {
      await db.insert(schema.providerConnections).values({
        id: newId("pc"),
        organizationId: orgId,
        providerType: "voice",
        provider: "retell",
        config: { agentId: agent.agentId },
        status: "connected",
        lastHealthCheckAt: new Date(),
      });
    }

    const call = await retellProvider.startTestCall(agent.agentId, fromNumber, parsed.data.toNumber);
    await db.insert(schema.integrationLogs).values({
      id: newId("il"),
      organizationId: orgId,
      providerType: "voice",
      provider: "retell",
      operation: "start_test_call",
      success: true,
      detail: { providerCallId: call.providerCallId },
    });
    await writeAuditLog({
      organizationId: orgId,
      actorUserId: ctx.user.id,
      action: "test_call.start",
    });
    return {
      success: `Test call started — your phone should ring shortly. The call and transcript will appear in the inbox when it completes.`,
    };
  } catch (err) {
    const db2 = await getDb();
    await db2.insert(schema.integrationLogs).values({
      id: newId("il"),
      organizationId: orgId,
      providerType: "voice",
      provider: "retell",
      operation: "start_test_call",
      success: false,
      detail: { message: err instanceof Error ? err.message : "unknown" },
    });
    return { error: err instanceof Error ? err.message : "Test call failed" };
  }
}
