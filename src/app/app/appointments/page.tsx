import Link from "next/link";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { CalendarDays } from "lucide-react";
import { getDb, schema } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth/guards";
import { getAvailableSlotsForType } from "@/lib/booking";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { BookingForm } from "@/components/features/booking-form";
import { AppointmentRowActions } from "@/components/features/appointment-row-actions";
import { formatPhone, cn } from "@/lib/utils";

export const metadata = { title: "Appointments" };

const STATUS_FILTERS = [
  ["upcoming", "Upcoming"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
  ["rescheduled", "Rescheduled"],
  ["no_show", "No-shows"],
  ["failed", "Failed"],
  ["all", "All"],
] as const;

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; book?: string }>;
}) {
  const ctx = await requireOrgContext();
  const db = await getDb();
  const orgId = ctx.organization.id;
  const { status = "upcoming", book = "" } = await searchParams;

  const conditions: SQL[] = [eq(schema.appointments.organizationId, orgId)];
  if (status === "upcoming") {
    // scheduled/confirmed/rescheduled — anything still on the calendar
  } else if (
    status !== "all" &&
    (schema.appointmentStatusEnum.enumValues as readonly string[]).includes(status)
  ) {
    conditions.push(
      eq(schema.appointments.status, status as (typeof schema.appointmentStatusEnum.enumValues)[number]),
    );
  }

  const [appointmentsRaw, types, profiles] = await Promise.all([
    db
      .select({ appt: schema.appointments, lead: schema.leads })
      .from(schema.appointments)
      .leftJoin(schema.leads, eq(schema.appointments.leadId, schema.leads.id))
      .where(and(...conditions))
      .orderBy(desc(schema.appointments.startsAt))
      .limit(100),
    db
      .select()
      .from(schema.appointmentTypes)
      .where(
        and(eq(schema.appointmentTypes.organizationId, orgId), eq(schema.appointmentTypes.isActive, true)),
      ),
    db
      .select({ timeZone: schema.businessProfiles.timeZone })
      .from(schema.businessProfiles)
      .where(eq(schema.businessProfiles.organizationId, orgId))
      .limit(1),
  ]);

  const appointments =
    status === "upcoming"
      ? appointmentsRaw.filter(({ appt }) =>
          ["scheduled", "confirmed", "rescheduled"].includes(appt.status),
        )
      : appointmentsRaw;

  const selectedTypeId = types.some((t) => t.id === book) ? book : null;
  const slotData = selectedTypeId ? await getAvailableSlotsForType(orgId, selectedTypeId) : null;
  const timeZone = profiles[0]?.timeZone ?? "America/New_York";
  const slots =
    slotData?.slots.map((s) => ({
      startIso: s.start.toISOString(),
      label: s.start.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone,
      }),
    })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Appointments</h1>
        <p className="text-sm text-ink-500">
          Bookings made by your receptionist and your team
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Book an appointment</CardTitle>
          <CardDescription>
            Availability honors business hours, durations, buffers, booking notice, and existing
            appointments across connected calendars.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BookingForm
            types={types.map((t) => ({
              id: t.id,
              name: t.name,
              durationMinutes: t.durationMinutes,
            }))}
            selectedTypeId={selectedTypeId}
            slots={slots}
          />
        </CardContent>
      </Card>

      <nav aria-label="Filter appointments" className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(([value, label]) => (
          <Link
            key={value}
            href={value === "upcoming" ? "/app/appointments" : `/app/appointments?status=${value}`}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              status === value
                ? "border-brand-600 bg-brand-100 text-brand-800"
                : "border-ink-300/40 text-ink-500 hover:border-brand-300",
            )}
            aria-current={status === value ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>

      <Card>
        <CardContent className="p-0">
          {appointments.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={CalendarDays}
                title="No appointments match"
                description="Appointments booked by your receptionist or your team appear here."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-300/20 text-xs uppercase tracking-wide text-ink-300">
                    <th scope="col" className="px-6 py-3 font-medium">Caller</th>
                    <th scope="col" className="px-6 py-3 font-medium">Service</th>
                    <th scope="col" className="px-6 py-3 font-medium">When</th>
                    <th scope="col" className="px-6 py-3 font-medium">Status</th>
                    <th scope="col" className="px-6 py-3 font-medium">Confirmation</th>
                    <th scope="col" className="px-6 py-3 font-medium">Calendar</th>
                    <th scope="col" className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map(({ appt, lead }) => (
                    <tr key={appt.id} className="border-b border-ink-300/10 last:border-0">
                      <td className="px-6 py-3">
                        {lead ? (
                          <Link href={`/app/leads/${lead.id}`} className="font-medium text-brand-700 hover:underline">
                            {appt.callerName ?? lead.name ?? "Unknown"}
                          </Link>
                        ) : (
                          <span className="font-medium text-ink-900">{appt.callerName ?? "Unknown"}</span>
                        )}
                        <span className="block text-xs text-ink-500">
                          {appt.callerPhone ? formatPhone(appt.callerPhone) : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-ink-500">{appt.service ?? "—"}</td>
                      <td className="px-6 py-3 text-ink-500">
                        {appt.startsAt.toLocaleString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={statusVariant(appt.status)}>{appt.status.replaceAll("_", " ")}</Badge>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={appt.confirmationSent ? "success" : "warning"}>
                          {appt.confirmationSent ? "sent" : "queued"}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={statusVariant(appt.calendarSyncStatus)}>
                          {appt.calendarSyncStatus}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        <AppointmentRowActions appointmentId={appt.id} status={appt.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
