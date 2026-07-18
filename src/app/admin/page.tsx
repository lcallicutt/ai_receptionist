import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { Building2, PhoneIncoming, Users, CalendarCheck2, Bot } from "lucide-react";
import { getDb, schema } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Platform Dashboard" };

export default async function AdminDashboardPage() {
  const db = await getDb();

  const [orgs, calls, leads, appointments, receptionists, orgList] = await Promise.all([
    db.select({ n: count() }).from(schema.organizations),
    db.select({ n: count() }).from(schema.callRecords),
    db.select({ n: count() }).from(schema.leads),
    db.select({ n: count() }).from(schema.appointments),
    db.select({ n: count() }).from(schema.aiReceptionists).where(eq(schema.aiReceptionists.status, "active")),
    db.select().from(schema.organizations).limit(10),
  ]);

  const metrics = [
    { label: "Organizations", value: orgs[0]?.n ?? 0, icon: Building2 },
    { label: "Active receptionists", value: receptionists[0]?.n ?? 0, icon: Bot },
    { label: "Total calls", value: calls[0]?.n ?? 0, icon: PhoneIncoming },
    { label: "Total leads", value: leads[0]?.n ?? 0, icon: Users },
    { label: "Appointments", value: appointments[0]?.n ?? 0, icon: CalendarCheck2 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Platform Dashboard</h1>
        <p className="text-sm text-ink-500">FlowNet-wide activity across all client accounts</p>
      </div>

      <section aria-label="Platform metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                <m.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-2xl font-bold text-ink-900">{m.value}</p>
                <p className="text-xs text-ink-500">{m.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>Most recent client accounts</CardDescription>
            </div>
            <Link href="/admin/organizations" className="text-sm font-medium text-brand-700 hover:underline">
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-300/20 text-xs uppercase tracking-wide text-ink-300">
                  <th scope="col" className="py-2 pr-4 font-medium">Name</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Industry</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Status</th>
                  <th scope="col" className="py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {orgList.map((org) => (
                  <tr key={org.id} className="border-b border-ink-300/10 last:border-0">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/organizations/${org.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {org.name}
                      </Link>
                      {org.isDemo ? (
                        <Badge variant="outline" className="ml-2">demo</Badge>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 text-ink-500">{org.industry.replaceAll("_", " ")}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={org.suspendedAt ? "danger" : "success"}>
                        {org.suspendedAt ? "suspended" : "active"}
                      </Badge>
                    </td>
                    <td className="py-3 text-ink-500">
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
