import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { BusyInterval } from "@/lib/availability";
import type { CalendarProvider } from "./types";
import { InternalCalendarProvider } from "./internal";
import { GoogleCalendarProvider } from "./google";

export type { CalendarProvider } from "./types";

/**
 * Resolves the calendar providers for a tenant. The internal provider is
 * always included (it owns the appointments table), and a connected external
 * calendar contributes additional busy time + receives created events.
 */
export async function getCalendarProviders(organizationId: string): Promise<{
  primary: CalendarProvider;
  all: CalendarProvider[];
}> {
  const db = await getDb();
  const internal = new InternalCalendarProvider(organizationId);
  const providers: CalendarProvider[] = [internal];
  let primary: CalendarProvider = internal;

  const connections = await db
    .select()
    .from(schema.calendarConnections)
    .where(
      and(
        eq(schema.calendarConnections.organizationId, organizationId),
        eq(schema.calendarConnections.status, "connected"),
      ),
    );
  for (const connection of connections) {
    if (connection.provider === "google") {
      const google = await GoogleCalendarProvider.fromConnection(connection);
      if (google) {
        providers.push(google);
        primary = google;
      }
    }
  }
  return { primary, all: providers };
}

/** Merged busy intervals across every provider for the tenant. */
export async function getMergedBusyIntervals(
  organizationId: string,
  from: Date,
  to: Date,
): Promise<BusyInterval[]> {
  const { all } = await getCalendarProviders(organizationId);
  const results = await Promise.allSettled(all.map((p) => p.getBusyIntervals(from, to)));
  // A failing external provider must not open double-booking windows — the
  // internal provider (index 0) is required; external failures degrade to
  // "unknown busy time" and are surfaced by health checks, not swallowed here.
  const internal = results[0];
  if (internal?.status === "rejected") throw internal.reason;
  return results
    .filter((r): r is PromiseFulfilledResult<BusyInterval[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);
}
