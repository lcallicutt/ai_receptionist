import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireOrgContext, roleAtLeast } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TeamManager } from "@/components/features/team-manager";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const ctx = await requireOrgContext();
  const db = await getDb();
  const rows = await db
    .select({
      memberId: schema.organizationMembers.id,
      userId: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.organizationMembers.role,
    })
    .from(schema.organizationMembers)
    .innerJoin(schema.users, eq(schema.organizationMembers.userId, schema.users.id))
    .where(eq(schema.organizationMembers.organizationId, ctx.organization.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Team</h1>
        <p className="text-sm text-ink-500">
          Who can access this portal, and what they can do.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Owners can invite teammates and manage roles. An organization always keeps at least
            one owner.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamManager
            members={rows}
            currentUserId={ctx.user.id}
            canManage={roleAtLeast(ctx.role, "owner")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
