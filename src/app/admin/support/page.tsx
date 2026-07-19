import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImpersonateButton } from "@/components/features/impersonate-button";

export const metadata = { title: "Support Tools" };

export default async function SupportPage() {
  const db = await getDb();
  const [orgs, recentImpersonations] = await Promise.all([
    db.select().from(schema.organizations).orderBy(desc(schema.organizations.createdAt)),
    db
      .select({ log: schema.auditLogs, org: schema.organizations })
      .from(schema.auditLogs)
      .leftJoin(schema.organizations, eq(schema.auditLogs.organizationId, schema.organizations.id))
      .where(eq(schema.auditLogs.action, "support.impersonate_start"))
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(10),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Support Tools</h1>
        <p className="text-sm text-ink-500">
          Safe client impersonation and troubleshooting shortcuts
        </p>
      </div>

      <div className="rounded-lg border border-amber-300/50 bg-amber-50 p-4 text-sm text-amber-900">
        Impersonation gives you the organization owner&apos;s exact view — every action you take
        is theirs, with your admin identity recorded in the audit log. Log out to end the
        impersonation and sign back in as yourself.
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>Impersonate an owner or open the organization record</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-ink-300/15">
            {orgs.map((org) => (
              <li key={org.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <Link href={`/admin/organizations/${org.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                    {org.name}
                  </Link>
                  <span className="ml-2 text-xs text-ink-500">{org.industry.replaceAll("_", " ")}</span>
                  {org.isDemo ? <Badge variant="outline" className="ml-2">demo</Badge> : null}
                </div>
                <ImpersonateButton organizationId={org.id} orgName={org.name} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent impersonation sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentImpersonations.length === 0 ? (
            <p className="text-sm text-ink-500">No impersonation sessions recorded.</p>
          ) : (
            <ul className="divide-y divide-ink-300/15 text-sm">
              {recentImpersonations.map(({ log, org }) => (
                <li key={log.id} className="flex items-center justify-between py-2.5">
                  <span className="text-ink-700">
                    {org?.name ?? "Unknown org"}
                    <span className="text-ink-300">
                      {" "}· {(log.detail as { adminEmail?: string } | null)?.adminEmail ?? "admin"}
                    </span>
                  </span>
                  <span className="text-xs text-ink-300">
                    {log.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
