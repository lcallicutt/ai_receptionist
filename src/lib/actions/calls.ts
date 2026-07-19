"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth/guards";
import type { ActionState } from "./business";

export async function assignCall(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireOrgContext();
  const callId = String(formData.get("callId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!callId) return { error: "Missing call" };
  const db = await getDb();

  const calls = await db
    .select({ id: schema.callRecords.id })
    .from(schema.callRecords)
    .where(
      and(eq(schema.callRecords.id, callId), eq(schema.callRecords.organizationId, ctx.organization.id)),
    )
    .limit(1);
  if (!calls[0]) return { error: "Call not found" };

  let assignedUserId: string | null = null;
  if (userId) {
    const membership = await db
      .select({ id: schema.organizationMembers.id })
      .from(schema.organizationMembers)
      .where(
        and(
          eq(schema.organizationMembers.organizationId, ctx.organization.id),
          eq(schema.organizationMembers.userId, userId),
        ),
      )
      .limit(1);
    if (!membership[0]) return { error: "Assignee is not a member of this organization" };
    assignedUserId = userId;
  }

  await db
    .update(schema.callRecords)
    .set({ assignedUserId })
    .where(eq(schema.callRecords.id, callId));
  revalidatePath("/app/calls");
  revalidatePath(`/app/calls/${callId}`);
  return { success: assignedUserId ? "Call assigned" : "Call unassigned" };
}

export async function toggleCallUnread(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgContext();
  const callId = String(formData.get("callId") ?? "");
  if (!callId) return { error: "Missing call" };
  const db = await getDb();
  const calls = await db
    .select({ isUnread: schema.callRecords.isUnread })
    .from(schema.callRecords)
    .where(
      and(eq(schema.callRecords.id, callId), eq(schema.callRecords.organizationId, ctx.organization.id)),
    )
    .limit(1);
  if (!calls[0]) return { error: "Call not found" };
  await db
    .update(schema.callRecords)
    .set({ isUnread: !calls[0].isUnread })
    .where(eq(schema.callRecords.id, callId));
  revalidatePath("/app/calls");
  revalidatePath(`/app/calls/${callId}`);
  return {};
}
