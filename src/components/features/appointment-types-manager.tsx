"use client";

import * as React from "react";
import { useActionState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  upsertAppointmentType,
  deleteAppointmentType,
} from "@/lib/actions/appointments-config";
import type { ActionState } from "@/lib/actions/business";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton, FormMessage } from "@/components/ui/form-bits";
import type { schema } from "@/lib/db";

type AppointmentType = typeof schema.appointmentTypes.$inferSelect;

export function AppointmentTypesManager({ types }: { types: AppointmentType[] }) {
  const [editing, setEditing] = React.useState<AppointmentType | null>(null);
  const [formKey, setFormKey] = React.useState(0);
  const [upsertState, upsertAction] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const result = await upsertAppointmentType(prev, fd);
      if (result.success) {
        setEditing(null);
        setFormKey((k) => k + 1);
      }
      return result;
    },
    {},
  );
  const [rowState, deleteAction] = useActionState<ActionState, FormData>(deleteAppointmentType, {});

  return (
    <div className="space-y-6">
      <form key={formKey} action={upsertAction} className="space-y-3 rounded-lg border border-ink-300/25 p-4" noValidate>
        <h3 className="text-sm font-semibold text-ink-900">
          {editing ? "Edit appointment type" : "Add an appointment type"}
        </h3>
        <input type="hidden" name="id" value={editing?.id ?? ""} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="at-name">Name</Label>
            <Input id="at-name" name="name" required className="mt-1"
              defaultValue={editing?.name ?? ""} placeholder="e.g. Consultation" />
          </div>
          <div>
            <Label htmlFor="at-duration">Duration (minutes)</Label>
            <Input id="at-duration" name="durationMinutes" type="number" min={5} max={480}
              className="mt-1" defaultValue={editing?.durationMinutes ?? 30} />
          </div>
          <div>
            <Label htmlFor="at-buffer">Buffer (minutes)</Label>
            <Input id="at-buffer" name="bufferMinutes" type="number" min={0} max={240}
              className="mt-1" defaultValue={editing?.bufferMinutes ?? 0} />
          </div>
          <div>
            <Label htmlFor="at-notice">Booking notice (hours)</Label>
            <Input id="at-notice" name="minNoticeHours" type="number" min={0} max={720}
              className="mt-1" defaultValue={editing?.minNoticeHours ?? 2} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="at-location">Location</Label>
            <Input id="at-location" name="location" className="mt-1"
              defaultValue={editing?.location ?? ""} placeholder="Office, on-site, etc." />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="at-link">Virtual meeting link</Label>
            <Input id="at-link" name="virtualMeetingLink" type="url" className="mt-1"
              defaultValue={editing?.virtualMeetingLink ?? ""} placeholder="https://…" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="at-confirm">Confirmation message</Label>
            <Textarea id="at-confirm" name="confirmationMessage" rows={2} className="mt-1"
              defaultValue={editing?.confirmationMessage ?? ""}
              placeholder="Hi {{caller_name}}, your {{appointment_type}} is confirmed for {{time}}." />
          </div>
          <div>
            <Label htmlFor="at-remind">Reminder message</Label>
            <Textarea id="at-remind" name="reminderMessage" rows={2} className="mt-1"
              defaultValue={editing?.reminderMessage ?? ""} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SubmitButton>{editing ? "Save changes" : "Add appointment type"}</SubmitButton>
          {editing ? (
            <Button type="button" variant="ghost" onClick={() => { setEditing(null); setFormKey((k) => k + 1); }}>
              Cancel
            </Button>
          ) : null}
          <FormMessage state={upsertState} />
        </div>
      </form>

      <FormMessage state={rowState} />
      {types.length === 0 ? (
        <p className="text-sm text-ink-500">
          No appointment types yet. Skip this step if you don&apos;t take appointments.
        </p>
      ) : (
        <ul className="divide-y divide-ink-300/15 rounded-lg border border-ink-300/25">
          {types.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink-900">{t.name}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge variant="neutral">{t.durationMinutes} min</Badge>
                  {t.bufferMinutes > 0 ? <Badge variant="outline">+{t.bufferMinutes} min buffer</Badge> : null}
                  <Badge variant="outline">{t.minNoticeHours}h notice</Badge>
                  {t.location ? <Badge variant="neutral">{t.location}</Badge> : null}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(t); setFormKey((k) => k + 1); }}
                  aria-label={`Edit ${t.name}`}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <form
                  action={deleteAction}
                  onSubmit={(e) => {
                    if (!confirm(`Delete "${t.name}"?`)) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="id" value={t.id} />
                  <Button type="submit" variant="ghost" size="sm" aria-label={`Delete ${t.name}`}>
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
