import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import { formatPhone } from "@/lib/utils";

export const metadata = { title: "Leads" };

export default async function AdminLeadsPage() {
  const db = await getDb();
  const leads = await db
    .select({ lead: schema.leads, org: schema.organizations })
    .from(schema.leads)
    .innerJoin(schema.organizations, eq(schema.leads.organizationId, schema.organizations.id))
    .orderBy(desc(schema.leads.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Leads</h1>
        <p className="text-sm text-ink-500">
          Platform-wide leads, including website demo requests (most recent 100)
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-300/20 text-xs uppercase tracking-wide text-ink-300">
                  <th scope="col" className="px-6 py-3 font-medium">Lead</th>
                  <th scope="col" className="px-6 py-3 font-medium">Organization</th>
                  <th scope="col" className="px-6 py-3 font-medium">Source</th>
                  <th scope="col" className="px-6 py-3 font-medium">Status</th>
                  <th scope="col" className="px-6 py-3 font-medium">Score</th>
                  <th scope="col" className="px-6 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(({ lead, org }) => (
                  <tr key={lead.id} className="border-b border-ink-300/10 last:border-0">
                    <td className="px-6 py-3">
                      <span className="font-medium text-ink-900">{lead.name ?? "Unknown"}</span>
                      <span className="block text-xs text-ink-500">
                        {lead.phone ? formatPhone(lead.phone) : lead.email ?? "—"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-ink-500">{org.name}</td>
                    <td className="px-6 py-3 text-ink-500">{lead.source?.replaceAll("_", " ") ?? "—"}</td>
                    <td className="px-6 py-3">
                      <Badge variant={statusVariant(lead.status)}>{lead.status.replaceAll("_", " ")}</Badge>
                    </td>
                    <td className="px-6 py-3 text-ink-500">{lead.score}</td>
                    <td className="px-6 py-3 text-ink-500">
                      {lead.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
