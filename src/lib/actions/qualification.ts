"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { requireOrgRole } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit";
import { QUESTION_TYPE_OPTIONS } from "@/lib/receptionist-options";
import type { ActionState } from "./business";

const questionSchema = z.object({
  id: z.string().trim().max(64).or(z.literal("")),
  prompt: z.string().trim().min(1, "Question prompt is required").max(1000),
  questionType: z.enum(QUESTION_TYPE_OPTIONS.map(([v]) => v) as [string, ...string[]]),
  disqualifyingAnswer: z.string().trim().max(500).or(z.literal("")),
  leadScoreImpact: z.coerce.number().int().min(-100).max(100),
  internalNotes: z.string().trim().max(2000).or(z.literal("")),
});

/** Ensures the org has a default qualification flow and returns its id. */
async function ensureFlow(orgId: string): Promise<string> {
  const db = await getDb();
  const flows = await db
    .select({ id: schema.qualificationFlows.id })
    .from(schema.qualificationFlows)
    .where(eq(schema.qualificationFlows.organizationId, orgId))
    .limit(1);
  if (flows[0]) return flows[0].id;
  const id = newId("qf");
  await db.insert(schema.qualificationFlows).values({
    id,
    organizationId: orgId,
    name: "Default intake",
  });
  return id;
}

export async function upsertQuestion(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const parsed = questionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  const d = parsed.data;
  const required = formData.get("required") === "on";
  const saveToCrm = formData.get("saveToCrm") === "on";
  const db = await getDb();

  const values = {
    prompt: d.prompt,
    questionType: d.questionType as (typeof schema.questionTypeEnum.enumValues)[number],
    required,
    saveToCrm,
    disqualifyingAnswer: d.disqualifyingAnswer || null,
    leadScoreImpact: d.leadScoreImpact,
    internalNotes: d.internalNotes || null,
  };

  if (d.id) {
    const result = await db
      .update(schema.qualificationQuestions)
      .set(values)
      .where(
        and(
          eq(schema.qualificationQuestions.id, d.id),
          eq(schema.qualificationQuestions.organizationId, ctx.organization.id),
        ),
      )
      .returning();
    if (result.length === 0) return { error: "Question not found" };
  } else {
    const flowId = await ensureFlow(ctx.organization.id);
    const existing = await db
      .select({ sortOrder: schema.qualificationQuestions.sortOrder })
      .from(schema.qualificationQuestions)
      .where(eq(schema.qualificationQuestions.flowId, flowId))
      .orderBy(asc(schema.qualificationQuestions.sortOrder));
    await db.insert(schema.qualificationQuestions).values({
      id: newId("qq"),
      organizationId: ctx.organization.id,
      flowId,
      sortOrder: (existing.at(-1)?.sortOrder ?? -1) + 1,
      ...values,
    });
  }

  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: d.id ? "qualification.update" : "qualification.create",
  });
  revalidatePath("/app/qualification");
  revalidatePath("/app/onboarding");
  return { success: d.id ? "Question updated" : "Question added" };
}

export async function deleteQuestion(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing question" };
  const db = await getDb();
  const result = await db
    .delete(schema.qualificationQuestions)
    .where(
      and(
        eq(schema.qualificationQuestions.id, id),
        eq(schema.qualificationQuestions.organizationId, ctx.organization.id),
      ),
    )
    .returning();
  if (result.length === 0) return { error: "Question not found" };
  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "qualification.delete",
    entityId: id,
  });
  revalidatePath("/app/qualification");
  return { success: "Question deleted" };
}

export async function moveQuestion(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id || (direction !== "up" && direction !== "down")) return { error: "Invalid request" };
  const db = await getDb();

  const all = await db
    .select({
      id: schema.qualificationQuestions.id,
      sortOrder: schema.qualificationQuestions.sortOrder,
    })
    .from(schema.qualificationQuestions)
    .where(eq(schema.qualificationQuestions.organizationId, ctx.organization.id))
    .orderBy(asc(schema.qualificationQuestions.sortOrder));
  const index = all.findIndex((q) => q.id === id);
  if (index === -1) return { error: "Question not found" };
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= all.length) return {};

  const a = all[index]!;
  const b = all[swapWith]!;
  await db
    .update(schema.qualificationQuestions)
    .set({ sortOrder: b.sortOrder })
    .where(eq(schema.qualificationQuestions.id, a.id));
  await db
    .update(schema.qualificationQuestions)
    .set({ sortOrder: a.sortOrder })
    .where(eq(schema.qualificationQuestions.id, b.id));
  revalidatePath("/app/qualification");
  return {};
}
