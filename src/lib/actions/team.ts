"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { requireOrgRole } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/passwords";
import { writeAuditLog } from "@/lib/audit";

export interface TeamActionState {
  error?: string;
  success?: string;
  /** Shown once after an invite so the owner can share the temporary password. */
  tempPassword?: string;
}

const ASSIGNABLE_ROLES = ["owner", "manager", "member", "read_only"] as const;

const inviteSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(320),
  role: z.enum(ASSIGNABLE_ROLES),
});

export async function inviteMember(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const ctx = await requireOrgRole("owner");
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  const d = parsed.data;
  const db = await getDb();

  let userId: string;
  let tempPassword: string | undefined;
  const existingUsers = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, d.email))
    .limit(1);

  if (existingUsers[0]) {
    userId = existingUsers[0].id;
    const existingMembership = await db
      .select({ id: schema.organizationMembers.id })
      .from(schema.organizationMembers)
      .where(
        and(
          eq(schema.organizationMembers.userId, userId),
          eq(schema.organizationMembers.organizationId, ctx.organization.id),
        ),
      )
      .limit(1);
    if (existingMembership[0]) return { error: "That person is already a member" };
  } else {
    // Email delivery arrives with the EmailProvider in Phase 6; until then the
    // owner shares the generated temporary password directly.
    tempPassword = randomBytes(9).toString("base64url");
    userId = newId("user");
    await db.insert(schema.users).values({
      id: userId,
      email: d.email,
      name: d.name,
      passwordHash: await hashPassword(tempPassword),
    });
  }

  await db.insert(schema.organizationMembers).values({
    id: newId("mem"),
    organizationId: ctx.organization.id,
    userId,
    role: d.role,
  });

  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "team.invite",
    detail: { role: d.role },
  });
  revalidatePath("/app/team");
  return { success: `${d.name} added as ${d.role.replaceAll("_", " ")}`, tempPassword };
}

export async function changeMemberRole(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const ctx = await requireOrgRole("owner");
  const memberId = String(formData.get("memberId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!memberId || !(ASSIGNABLE_ROLES as readonly string[]).includes(role)) {
    return { error: "Invalid request" };
  }
  const db = await getDb();

  const members = await db
    .select()
    .from(schema.organizationMembers)
    .where(
      and(
        eq(schema.organizationMembers.id, memberId),
        eq(schema.organizationMembers.organizationId, ctx.organization.id),
      ),
    )
    .limit(1);
  const member = members[0];
  if (!member) return { error: "Member not found" };

  // Never demote the last owner.
  if (member.role === "owner" && role !== "owner") {
    const owners = await db
      .select({ n: count() })
      .from(schema.organizationMembers)
      .where(
        and(
          eq(schema.organizationMembers.organizationId, ctx.organization.id),
          eq(schema.organizationMembers.role, "owner"),
        ),
      );
    if ((owners[0]?.n ?? 0) <= 1) return { error: "An organization must keep at least one owner" };
  }

  await db
    .update(schema.organizationMembers)
    .set({ role: role as (typeof ASSIGNABLE_ROLES)[number] })
    .where(eq(schema.organizationMembers.id, memberId));

  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "team.change_role",
    entityId: memberId,
    detail: { role },
  });
  revalidatePath("/app/team");
  return { success: "Role updated" };
}

export async function removeMember(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const ctx = await requireOrgRole("owner");
  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId) return { error: "Invalid request" };
  const db = await getDb();

  const members = await db
    .select()
    .from(schema.organizationMembers)
    .where(
      and(
        eq(schema.organizationMembers.id, memberId),
        eq(schema.organizationMembers.organizationId, ctx.organization.id),
      ),
    )
    .limit(1);
  const member = members[0];
  if (!member) return { error: "Member not found" };
  if (member.userId === ctx.user.id) return { error: "You can't remove yourself" };
  if (member.role === "owner") {
    const owners = await db
      .select({ n: count() })
      .from(schema.organizationMembers)
      .where(
        and(
          eq(schema.organizationMembers.organizationId, ctx.organization.id),
          eq(schema.organizationMembers.role, "owner"),
        ),
      );
    if ((owners[0]?.n ?? 0) <= 1) return { error: "An organization must keep at least one owner" };
  }

  await db.delete(schema.organizationMembers).where(eq(schema.organizationMembers.id, memberId));

  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "team.remove_member",
    entityId: memberId,
  });
  revalidatePath("/app/team");
  return { success: "Member removed" };
}
