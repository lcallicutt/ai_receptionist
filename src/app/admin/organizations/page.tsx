import Link from "next/link";
import { desc, eq, count } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Organizations" };

export default async function OrganizationsPage() {
  const db = await getDb();
  const orgs = await db
    .select({
      org: schema.organizations,
      memberCount: count(schema.organizationMembers.id),
    })
    .from(schema.organizations)
    .leftJoin(
      schema.organizationMembers,
      eq(schema.organizationMembers.organizationId, schema.organizations.id),
    )
    .groupBy(schema.organizations.id)
    .orderBy(desc(schema.organizations.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Organizations</h1>
        <p className="text-sm text-ink-500">All client accounts on the platform</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-300/20 text-xs uppercase tracking-wide text-ink-300">
                  <th scope="col" className="px-6 py-3 font-medium">Name</th>
                  <th scope="col" className="px-6 py-3 font-medium">Industry</th>
                  <th scope="col" className="px-6 py-3 font-medium">Members</th>
                  <th scope="col" className="px-6 py-3 font-medium">Status</th>
                  <th scope="col" className="px-6 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map(({ org, memberCount }) => (
                  <tr key={org.id} className="border-b border-ink-300/10 last:border-0">
                    <td className="px-6 py-3">
                      <Link
                        href={`/admin/organizations/${org.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {org.name}
                      </Link>
                      {org.isDemo ? <Badge variant="outline" className="ml-2">demo</Badge> : null}
                    </td>
                    <td className="px-6 py-3 text-ink-500">{org.industry.replaceAll("_", " ")}</td>
                    <td className="px-6 py-3 text-ink-500">{memberCount}</td>
                    <td className="px-6 py-3">
                      <Badge variant={org.suspendedAt ? "danger" : "success"}>
                        {org.suspendedAt ? "suspended" : "active"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-ink-500">
                      {org.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
