"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { requireOrgRole } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit";
import type { ActionState } from "./business";

const faqSchema = z.object({
  id: z.string().trim().max(64).or(z.literal("")),
  question: z.string().trim().min(1, "Question is required").max(500),
  answer: z.string().trim().min(1, "Approved answer is required").max(4000),
  category: z.string().trim().max(100).or(z.literal("")),
  keywords: z.string().trim().max(500).or(z.literal("")),
});

export async function upsertFaq(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const parsed = faqSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  const d = parsed.data;
  const escalate = formData.get("escalateIfUnanswered") === "on";
  const db = await getDb();

  const values = {
    question: d.question,
    answer: d.answer,
    category: d.category || null,
    keywords: d.keywords ? d.keywords.split(",").map((k) => k.trim()).filter(Boolean) : [],
    escalateIfUnanswered: escalate,
    updatedAt: new Date(),
  };

  if (d.id) {
    const result = await db
      .update(schema.faqs)
      .set(values)
      .where(and(eq(schema.faqs.id, d.id), eq(schema.faqs.organizationId, ctx.organization.id)))
      .returning();
    if (result.length === 0) return { error: "FAQ not found" };
  } else {
    const maxOrder = await db
      .select({ sortOrder: schema.faqs.sortOrder })
      .from(schema.faqs)
      .where(eq(schema.faqs.organizationId, ctx.organization.id))
      .orderBy(asc(schema.faqs.sortOrder));
    await db.insert(schema.faqs).values({
      id: newId("faq"),
      organizationId: ctx.organization.id,
      sortOrder: (maxOrder.at(-1)?.sortOrder ?? -1) + 1,
      ...values,
    });
  }

  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: d.id ? "faq.update" : "faq.create",
  });
  revalidatePath("/app/faqs");
  revalidatePath("/app/onboarding");
  return { success: d.id ? "FAQ updated" : "FAQ added" };
}

export async function deleteFaq(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing FAQ" };
  const db = await getDb();
  const result = await db
    .delete(schema.faqs)
    .where(and(eq(schema.faqs.id, id), eq(schema.faqs.organizationId, ctx.organization.id)))
    .returning();
  if (result.length === 0) return { error: "FAQ not found" };
  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "faq.delete",
    entityId: id,
  });
  revalidatePath("/app/faqs");
  return { success: "FAQ deleted" };
}

export async function toggleFaq(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing FAQ" };
  const db = await getDb();
  const rows = await db
    .select({ isActive: schema.faqs.isActive })
    .from(schema.faqs)
    .where(and(eq(schema.faqs.id, id), eq(schema.faqs.organizationId, ctx.organization.id)))
    .limit(1);
  if (!rows[0]) return { error: "FAQ not found" };
  await db
    .update(schema.faqs)
    .set({ isActive: !rows[0].isActive, updatedAt: new Date() })
    .where(and(eq(schema.faqs.id, id), eq(schema.faqs.organizationId, ctx.organization.id)));
  revalidatePath("/app/faqs");
  return { success: rows[0].isActive ? "FAQ deactivated" : "FAQ activated" };
}

/** Moves an FAQ up or down one position within the organization's list. */
export async function moveFaq(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id || (direction !== "up" && direction !== "down")) return { error: "Invalid request" };
  const db = await getDb();

  const all = await db
    .select({ id: schema.faqs.id, sortOrder: schema.faqs.sortOrder })
    .from(schema.faqs)
    .where(eq(schema.faqs.organizationId, ctx.organization.id))
    .orderBy(asc(schema.faqs.sortOrder));
  const index = all.findIndex((f) => f.id === id);
  if (index === -1) return { error: "FAQ not found" };
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= all.length) return {};

  const a = all[index]!;
  const b = all[swapWith]!;
  await db.update(schema.faqs).set({ sortOrder: b.sortOrder }).where(eq(schema.faqs.id, a.id));
  await db.update(schema.faqs).set({ sortOrder: a.sortOrder }).where(eq(schema.faqs.id, b.id));
  revalidatePath("/app/faqs");
  return {};
}
