import "server-only";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { readSession } from "./session";

export type Role =
  | "super_admin"
  | "agency_admin"
  | "owner"
  | "manager"
  | "member"
  | "read_only";

/** Role hierarchy for "at least this role" checks within an organization. */
const ROLE_RANK: Record<Role, number> = {
  super_admin: 60,
  agency_admin: 50,
  owner: 40,
  manager: 30,
  member: 20,
  read_only: 10,
};

export function roleAtLeast(role: Role, required: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

export interface AuthedUser {
  id: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
}

export interface OrgContext {
  user: AuthedUser;
  organization: typeof schema.organizations.$inferSelect;
  role: Role;
}

/** Returns the authenticated user or null. Never trusts client-supplied IDs. */
export async function getAuthedUser(): Promise<AuthedUser | null> {
  const session = await readSession();
  if (!session) return null;
  const db = await getDb();
  const rows = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      isPlatformAdmin: schema.users.isPlatformAdmin,
    })
    .from(schema.users)
    .where(eq(schema.users.id, session.userId))
    .limit(1);
  return rows[0] ?? null;
}

/** Redirects to /login when unauthenticated. */
export async function requireUser(): Promise<AuthedUser> {
  const user = await getAuthedUser();
  if (!user) redirect("/login");
  return user;
}

/** Requires FlowNet platform admin (Super Admin portal). */
export async function requirePlatformAdmin(): Promise<AuthedUser> {
  const user = await requireUser();
  if (!user.isPlatformAdmin) redirect("/app");
  return user;
}

/**
 * Verifies the authenticated user's membership in an organization, resolved
 * server-side. Organization IDs from the browser are only ever accepted after
 * this membership check — cross-tenant access is denied here.
 */
export async function getOrgContext(organizationId?: string): Promise<OrgContext | null> {
  const user = await getAuthedUser();
  if (!user) return null;
  const db = await getDb();

  const memberships = await db
    .select({
      role: schema.organizationMembers.role,
      organization: schema.organizations,
    })
    .from(schema.organizationMembers)
    .innerJoin(
      schema.organizations,
      eq(schema.organizationMembers.organizationId, schema.organizations.id),
    )
    .where(
      organizationId
        ? and(
            eq(schema.organizationMembers.userId, user.id),
            eq(schema.organizationMembers.organizationId, organizationId),
          )
        : eq(schema.organizationMembers.userId, user.id),
    )
    .limit(1);

  const membership = memberships[0];
  if (!membership) return null;
  return { user, organization: membership.organization, role: membership.role };
}

/** Redirects when the user has no membership in the requested organization. */
export async function requireOrgContext(organizationId?: string): Promise<OrgContext> {
  const user = await requireUser();
  const ctx = await getOrgContext(organizationId);
  if (!ctx) {
    if (user.isPlatformAdmin) redirect("/admin");
    redirect("/login");
  }
  return ctx;
}

/** Requires at least the given role within the organization. */
export async function requireOrgRole(required: Role, organizationId?: string): Promise<OrgContext> {
  const ctx = await requireOrgContext(organizationId);
  if (!roleAtLeast(ctx.role, required)) redirect("/app");
  return ctx;
}
