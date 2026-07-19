"use client";

import { useActionState } from "react";
import { CalendarCheck2 } from "lucide-react";
import { disconnectCalendar } from "@/lib/actions/booking";
import type { ActionState } from "@/lib/actions/business";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-bits";

interface ConnectionRow {
  id: string;
  provider: string;
  accountEmail: string | null;
  status: string;
  lastSyncedAt: string | null;
}

export function CalendarConnectionsPanel({
  connections,
  googleConfigured,
  errorParam,
  connectedParam,
}: {
  connections: ConnectionRow[];
  googleConfigured: boolean;
  errorParam?: string;
  connectedParam?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(disconnectCalendar, {});

  const errorMessages: Record<string, string> = {
    google_not_configured:
      "Google Calendar isn't configured on this deployment yet (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).",
    oauth_denied: "Google authorization was cancelled.",
    invalid_state: "The authorization link expired — please try connecting again.",
    token_exchange_failed: "Google rejected the authorization — please try again.",
    no_refresh_token: "Google didn't grant offline access — remove the app's access in your Google account and reconnect.",
  };

  return (
    <div className="space-y-5">
      {connectedParam ? (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
          Calendar connected successfully.
        </p>
      ) : null}
      {errorParam ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800" role="alert">
          {errorMessages[errorParam] ?? "Something went wrong connecting the calendar."}
        </p>
      ) : null}
      <FormMessage state={state} />

      <div className="rounded-lg border border-ink-300/25 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
              <CalendarCheck2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-ink-900">Built-in scheduling</p>
              <p className="text-xs text-ink-500">
                Availability from your business hours and existing appointments. Always on.
              </p>
            </div>
          </div>
          <Badge variant="success">active</Badge>
        </div>
      </div>

      {connections.map((c) => (
        <div key={c.id} className="rounded-lg border border-ink-300/25 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium capitalize text-ink-900">{c.provider} Calendar</p>
              <p className="text-xs text-ink-500">
                {c.accountEmail ?? "Connected account"}
                {c.lastSyncedAt ? ` · last synced ${c.lastSyncedAt}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
              {c.status === "connected" ? (
                <form
                  action={formAction}
                  onSubmit={(e) => {
                    if (!confirm("Disconnect this calendar?")) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="connectionId" value={c.id} />
                  <Button type="submit" variant="ghost" size="sm" className="text-red-600">
                    Disconnect
                  </Button>
                </form>
              ) : (
                <a href="/api/integrations/google/start" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Reconnect
                </a>
              )}
            </div>
          </div>
        </div>
      ))}

      {!connections.some((c) => c.provider === "google") ? (
        <div className="rounded-lg border border-dashed border-ink-300/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink-900">Google Calendar</p>
              <p className="text-xs text-ink-500">
                Two-way availability: your Google events block booking slots, and new bookings
                appear on your calendar.
              </p>
            </div>
            {googleConfigured ? (
              <a href="/api/integrations/google/start" className={buttonVariants({ variant: "primary", size: "sm" })}>
                Connect Google Calendar
              </a>
            ) : (
              <Badge variant="outline">requires deployment configuration</Badge>
            )}
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-dashed border-ink-300/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink-900">Microsoft Outlook Calendar</p>
            <p className="text-xs text-ink-500">Coming in a later phase via the same adapter interface.</p>
          </div>
          <Badge variant="outline">planned</Badge>
        </div>
      </div>
    </div>
  );
}
