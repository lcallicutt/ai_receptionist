import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarConnectionsPanel } from "@/components/features/calendar-connections-panel";

export const metadata = { title: "Calendar Connections" };

export default async function CalendarsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const ctx = await requireOrgContext();
  const db = await getDb();
  const { error, connected } = await searchParams;

  const connections = await db
    .select()
    .from(schema.calendarConnections)
    .where(eq(schema.calendarConnections.organizationId, ctx.organization.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Calendar Connections</h1>
        <p className="text-sm text-ink-500">
          Where your receptionist checks availability and books appointments.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Connected calendars</CardTitle>
          <CardDescription>
            All connected sources are merged when computing open slots, so double-booking is
            prevented across calendars.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CalendarConnectionsPanel
            connections={connections.map((c) => ({
              id: c.id,
              provider: c.provider,
              accountEmail: c.accountEmail,
              status: c.status,
              lastSyncedAt: c.lastSyncedAt
                ? c.lastSyncedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
                : null,
            }))}
            googleConfigured={Boolean(process.env.GOOGLE_CLIENT_ID)}
            errorParam={error}
            connectedParam={connected}
          />
        </CardContent>
      </Card>
    </div>
  );
}
