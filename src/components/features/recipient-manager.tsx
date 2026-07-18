"use client";

import * as React from "react";
import { useActionState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  upsertNotificationRecipient,
  deleteNotificationRecipient,
} from "@/lib/actions/notifications";
import type { ActionState } from "@/lib/actions/business";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton, FormMessage } from "@/components/ui/form-bits";
import type { schema } from "@/lib/db";

type Recipient = typeof schema.notificationSettings.$inferSelect;

const TOGGLES: Array<[keyof Recipient & string, string]> = [
  ["callSummaryEmail", "Call summary by email"],
  ["callSummarySms", "Call summary by SMS"],
  ["crmNotification", "CRM notification"],
  ["highPriorityLeadAlert", "High-priority lead alert"],
  ["appointmentAlert", "Appointment alert"],
  ["failedBookingAlert", "Failed booking alert"],
  ["missedTransferAlert", "Missed transfer alert"],
  ["dailyDigest", "Daily call digest"],
  ["weeklySummary", "Weekly performance summary"],
];

export function RecipientManager({
  recipients,
  planLimitLabel,
}: {
  recipients: Recipient[];
  planLimitLabel: string;
}) {
  const [editing, setEditing] = React.useState<Recipient | null>(null);
  const [formKey, setFormKey] = React.useState(0);
  const [upsertState, upsertAction] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const result = await upsertNotificationRecipient(prev, fd);
      if (result.success) {
        setEditing(null);
        setFormKey((k) => k + 1);
      }
      return result;
    },
    {},
  );
  const [rowState, deleteAction] = useActionState<ActionState, FormData>(
    deleteNotificationRecipient,
    {},
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-500">{planLimitLabel}</p>

      <form key={formKey} action={upsertAction} className="space-y-3 rounded-lg border border-ink-300/25 p-4" noValidate>
        <h3 className="text-sm font-semibold text-ink-900">
          {editing ? "Edit recipient" : "Add a notification recipient"}
        </h3>
        <input type="hidden" name="id" value={editing?.id ?? ""} />
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="rec-name">Name</Label>
            <Input id="rec-name" name="recipientName" required className="mt-1"
              defaultValue={editing?.recipientName ?? ""} />
          </div>
          <div>
            <Label htmlFor="rec-email">Email</Label>
            <Input id="rec-email" name="recipientEmail" type="email" className="mt-1"
              defaultValue={editing?.recipientEmail ?? ""} />
          </div>
          <div>
            <Label htmlFor="rec-phone">Phone (for SMS)</Label>
            <Input id="rec-phone" name="recipientPhone" type="tel" className="mt-1"
              defaultValue={editing?.recipientPhone ?? ""} />
          </div>
        </div>
        <fieldset>
          <legend className="text-sm font-medium text-ink-700">Notifications</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {TOGGLES.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-ink-700">
                <input type="checkbox" name={key}
                  defaultChecked={editing ? Boolean(editing[key]) : key === "callSummaryEmail" || key === "highPriorityLeadAlert" || key === "appointmentAlert"}
                  className="h-4 w-4 accent-brand-700" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex items-center gap-3">
          <SubmitButton>{editing ? "Save changes" : "Add recipient"}</SubmitButton>
          {editing ? (
            <Button type="button" variant="ghost" onClick={() => { setEditing(null); setFormKey((k) => k + 1); }}>
              Cancel
            </Button>
          ) : null}
          <FormMessage state={upsertState} />
        </div>
      </form>

      <FormMessage state={rowState} />
      {recipients.length === 0 ? (
        <p className="text-sm text-ink-500">
          No recipients yet — add at least one so call summaries reach your team.
        </p>
      ) : (
        <ul className="divide-y divide-ink-300/15 rounded-lg border border-ink-300/25">
          {recipients.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink-900">{r.recipientName}</p>
                <p className="text-xs text-ink-500">
                  {[r.recipientEmail, r.recipientPhone].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {TOGGLES.filter(([key]) => Boolean(r[key])).map(([key, label]) => (
                    <Badge key={key} variant="neutral">{label}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(r); setFormKey((k) => k + 1); }}
                  aria-label={`Edit ${r.recipientName}`}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <form
                  action={deleteAction}
                  onSubmit={(e) => {
                    if (!confirm("Remove this recipient?")) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="id" value={r.id} />
                  <Button type="submit" variant="ghost" size="sm"
                    aria-label={`Remove ${r.recipientName}`}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
