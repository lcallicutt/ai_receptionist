import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb, schema } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Audit Logs" };

export default async function AuditLogsPage() {
  const db = await getDb();
  const impersonator = alias(schema.users, "impersonator");
  const logs = await db
    .select({
      log: schema.auditLogs,
      org: schema.organizations,
      actor: schema.users,
      impersonator,
    })
    .from(schema.auditLogs)
    .leftJoin(schema.organizations, eq(schema.auditLogs.organizationId, schema.organizations.id))
    .leftJoin(schema.users, eq(schema.auditLogs.actorUserId, schema.users.id))
    .leftJoin(impersonator, eq(schema.auditLogs.impersonatedByUserId, impersonator.id))
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Audit Logs</h1>
        <p className="text-sm text-ink-500">
          Who changed what, when — including impersonation sessions (most recent 100)
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>All sensitive actions across the platform are recorded</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-300/20 text-xs uppercase tracking-wide text-ink-300">
                  <th scope="col" className="px-6 py-3 font-medium">When</th>
                  <th scope="col" className="px-6 py-3 font-medium">Actor</th>
                  <th scope="col" className="px-6 py-3 font-medium">Action</th>
                  <th scope="col" className="px-6 py-3 font-medium">Organization</th>
                  <th scope="col" className="px-6 py-3 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(({ log, org, actor, impersonator: imp }) => (
                  <tr key={log.id} className="border-b border-ink-300/10 last:border-0">
                    <td className="px-6 py-3 whitespace-nowrap text-ink-500">
                      {log.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-ink-900">{actor?.name ?? "system"}</span>
                      {imp ? (
                        <Badge variant="warning" className="ml-2">via {imp.name}</Badge>
                      ) : null}
                    </td>
                    <td className="px-6 py-3">
                      <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs text-ink-700">
                        {log.action}
                      </code>
                    </td>
                    <td className="px-6 py-3 text-ink-500">{org?.name ?? "—"}</td>
                    <td className="max-w-[16rem] truncate px-6 py-3 text-xs text-ink-500">
                      {log.detail ? JSON.stringify(log.detail) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
