import { notFound } from "next/navigation";
import { eq, count } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import { formatPhone } from "@/lib/utils";

export const metadata = { title: "Organization Detail" };

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const db = await getDb();

  const orgRows = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, orgId))
    .limit(1);
  const org = orgRows[0];
  if (!org) notFound();

  const [profileRows, receptionists, numbers, members, callCount, leadCount, subscriptionRows] =
    await Promise.all([
      db
        .select()
        .from(schema.businessProfiles)
        .where(eq(schema.businessProfiles.organizationId, orgId))
        .limit(1),
      db.select().from(schema.aiReceptionists).where(eq(schema.aiReceptionists.organizationId, orgId)),
      db.select().from(schema.phoneNumbers).where(eq(schema.phoneNumbers.organizationId, orgId)),
      db
        .select({ member: schema.organizationMembers, user: schema.users })
        .from(schema.organizationMembers)
        .innerJoin(schema.users, eq(schema.organizationMembers.userId, schema.users.id))
        .where(eq(schema.organizationMembers.organizationId, orgId)),
      db.select({ n: count() }).from(schema.callRecords).where(eq(schema.callRecords.organizationId, orgId)),
      db.select({ n: count() }).from(schema.leads).where(eq(schema.leads.organizationId, orgId)),
      db
        .select({ sub: schema.subscriptions, plan: schema.plans })
        .from(schema.subscriptions)
        .innerJoin(schema.plans, eq(schema.subscriptions.planId, schema.plans.id))
        .where(eq(schema.subscriptions.organizationId, orgId))
        .limit(1),
    ]);

  const profile = profileRows[0];
  const subscription = subscriptionRows[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">{org.name}</h1>
        {org.isDemo ? <Badge variant="outline">demo</Badge> : null}
        <Badge variant={org.suspendedAt ? "danger" : "success"}>
          {org.suspendedAt ? "suspended" : "active"}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Business profile</CardTitle>
          </CardHeader>
          <CardContent>
            {profile ? (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-300">Industry</dt>
                  <dd className="text-ink-900">{org.industry.replaceAll("_", " ")}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-300">Time zone</dt>
                  <dd className="text-ink-900">{profile.timeZone}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-300">Main phone</dt>
                  <dd className="text-ink-900">{profile.mainPhone ? formatPhone(profile.mainPhone) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-300">Contact</dt>
                  <dd className="text-ink-900">{profile.primaryContactName ?? "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-ink-300">Address</dt>
                  <dd className="text-ink-900">
                    {[profile.addressLine1, profile.city, profile.state, profile.postalCode]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-ink-500">No business profile yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription & activity</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink-300">Plan</dt>
                <dd className="text-ink-900">{subscription ? subscription.plan.name : "None"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink-300">Billing status</dt>
                <dd>
                  {subscription ? (
                    <Badge variant={statusVariant(subscription.sub.status)}>
                      {subscription.sub.status}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink-300">Total calls</dt>
                <dd className="text-ink-900">{callCount[0]?.n ?? 0}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink-300">Total leads</dt>
                <dd className="text-ink-900">{leadCount[0]?.n ?? 0}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receptionists & numbers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {receptionists.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg bg-surface-muted p-3">
                <span className="font-medium text-ink-900">{r.name}</span>
                <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
              </div>
            ))}
            {numbers.map((n) => (
              <div key={n.id} className="flex items-center justify-between rounded-lg bg-surface-muted p-3">
                <span className="text-ink-900">{formatPhone(n.e164)}</span>
                <span className="text-xs text-ink-500">{n.provider}</span>
              </div>
            ))}
            {receptionists.length === 0 && numbers.length === 0 ? (
              <p className="text-ink-500">No receptionists or numbers configured.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>Users with access to this organization</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {members.map(({ member, user }) => (
                <li key={member.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-ink-900">{user.name}</p>
                    <p className="text-xs text-ink-500">{user.email}</p>
                  </div>
                  <Badge variant="brand">{member.role.replaceAll("_", " ")}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
