"use client";

import { useActionState } from "react";
import { updateAppointmentStatus } from "@/lib/actions/booking";
import type { ActionState } from "@/lib/actions/business";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-bits";

const TRANSITIONS: Record<string, Array<[string, string]>> = {
  scheduled: [
    ["confirmed", "Confirm"],
    ["cancelled", "Cancel"],
  ],
  confirmed: [
    ["completed", "Complete"],
    ["no_show", "No-show"],
    ["cancelled", "Cancel"],
  ],
  rescheduled: [
    ["confirmed", "Confirm"],
    ["cancelled", "Cancel"],
  ],
};

export function AppointmentRowActions({
  appointmentId,
  status,
}: {
  appointmentId: string;
  status: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(updateAppointmentStatus, {});
  const transitions = TRANSITIONS[status] ?? [];
  if (transitions.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {transitions.map(([next, label]) => (
        <form
          key={next}
          action={formAction}
          onSubmit={(e) => {
            if (next === "cancelled" && !confirm("Cancel this appointment?")) e.preventDefault();
          }}
        >
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <input type="hidden" name="status" value={next} />
          <Button type="submit" variant={next === "cancelled" ? "ghost" : "outline"} size="sm">
            {label}
          </Button>
        </form>
      ))}
      <FormMessage state={state} />
    </div>
  );
}
