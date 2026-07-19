import { desc, eq, count } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";

export const metadata = { title: "Receptionists" };

export default async function AdminReceptionistsPage() {
  const db = await getDb();
  const [receptionists, versionCounts] = await Promise.all([
    db
      .select({ receptionist: schema.aiReceptionists, org: schema.organizations })
      .from(schema.aiReceptionists)
      .innerJoin(schema.organizations, eq(schema.aiReceptionists.organizationId, schema.organizations.id))
      .orderBy(desc(schema.aiReceptionists.updatedAt)),
    db
      .select({ receptionistId: schema.receptionistVersions.receptionistId, n: count() })
      .from(schema.receptionistVersions)
      .groupBy(schema.receptionistVersions.receptionistId),
  ]);
  const versionsByReceptionist = new Map(versionCounts.map((v) => [v.receptionistId, v.n]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Receptionists</h1>
        <p className="text-sm text-ink-500">Every AI receptionist across the platform</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-300/20 text-xs uppercase tracking-wide text-ink-300">
                  <th scope="col" className="px-6 py-3 font-medium">Name</th>
                  <th scope="col" className="px-6 py-3 font-medium">Organization</th>
                  <th scope="col" className="px-6 py-3 font-medium">Status</th>
                  <th scope="col" className="px-6 py-3 font-medium">Tone</th>
                  <th scope="col" className="px-6 py-3 font-medium">Versions</th>
                  <th scope="col" className="px-6 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {receptionists.map(({ receptionist, org }) => (
                  <tr key={receptionist.id} className="border-b border-ink-300/10 last:border-0">
                    <td className="px-6 py-3 font-medium text-ink-900">{receptionist.name}</td>
                    <td className="px-6 py-3 text-ink-500">{org.name}</td>
                    <td className="px-6 py-3">
                      <Badge variant={statusVariant(receptionist.status)}>{receptionist.status}</Badge>
                    </td>
                    <td className="px-6 py-3 text-ink-500">{receptionist.tone.replaceAll("_", " ")}</td>
                    <td className="px-6 py-3 text-ink-500">
                      {versionsByReceptionist.get(receptionist.id) ?? 0}
                    </td>
                    <td className="px-6 py-3 text-ink-500">
                      {receptionist.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
