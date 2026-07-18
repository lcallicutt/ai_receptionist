"use client";

import { useActionState } from "react";
import { updateBusinessHours, type ActionState } from "@/lib/actions/business";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form-bits";
import type { schema } from "@/lib/db";

type HoursRow = typeof schema.businessHours.$inferSelect;

const DAYS = [
  ["sun", "Sunday"],
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
] as const;

export function BusinessHoursForm({ hours }: { hours: HoursRow[] }) {
  const [state, formAction] = useActionState<ActionState, FormData>(updateBusinessHours, {});
  const byDay = new Map(hours.map((h) => [h.dayOfWeek, h]));

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="space-y-2">
        {DAYS.map(([key, label], day) => {
          const row = byDay.get(day);
          return (
            <fieldset key={key} className="grid grid-cols-[7rem_1fr_1fr_auto] items-center gap-3 rounded-lg border border-ink-300/20 px-3 py-2">
              <legend className="sr-only">{label} hours</legend>
              <span className="text-sm font-medium text-ink-900">{label}</span>
              <div>
                <Label htmlFor={`${key}-open`} className="sr-only">
                  {label} opens at
                </Label>
                <Input id={`${key}-open`} name={`${key}-open`} type="time"
                  defaultValue={row?.opensAt ?? "09:00"} />
              </div>
              <div>
                <Label htmlFor={`${key}-close`} className="sr-only">
                  {label} closes at
                </Label>
                <Input id={`${key}-close`} name={`${key}-close`} type="time"
                  defaultValue={row?.closesAt ?? "17:00"} />
              </div>
              <label className="flex items-center gap-2 text-sm text-ink-500">
                <input type="checkbox" name={`${key}-closed`}
                  defaultChecked={row?.isClosed ?? false} className="h-4 w-4 accent-brand-700" />
                Closed
              </label>
            </fieldset>
          );
        })}
      </div>
      <div className="flex items-center gap-4">
        <SubmitButton>Save business hours</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
