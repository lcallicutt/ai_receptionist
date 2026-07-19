"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { bookAppointment, type BookingState } from "@/lib/actions/booking";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton, FormMessage } from "@/components/ui/form-bits";
import { cn } from "@/lib/utils";

interface SlotOption {
  startIso: string;
  label: string;
}

export function BookingForm({
  types,
  selectedTypeId,
  slots,
}: {
  types: Array<{ id: string; name: string; durationMinutes: number }>;
  selectedTypeId: string | null;
  slots: SlotOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedSlot, setSelectedSlot] = React.useState<string>("");
  const [state, formAction] = useActionState<BookingState, FormData>(bookAppointment, {});

  if (types.length === 0) {
    return (
      <p className="text-sm text-ink-500">
        Define an appointment type first (Onboarding → Step 6) to enable booking.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="booking-type">Appointment type</Label>
        <Select
          id="booking-type"
          className="mt-1 max-w-sm"
          value={selectedTypeId ?? ""}
          onChange={(e) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("book", e.target.value);
            router.push(`/app/appointments?${params.toString()}`);
          }}
        >
          <option value="" disabled>
            Choose a type
          </option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.durationMinutes} min)
            </option>
          ))}
        </Select>
      </div>

      {selectedTypeId ? (
        slots.length === 0 ? (
          <p className="text-sm text-amber-700">
            No open slots in the next 7 days. Check business hours or adjust the appointment
            type&apos;s duration and notice requirements.
          </p>
        ) : (
          <form action={formAction} className="space-y-4" noValidate>
            <input type="hidden" name="appointmentTypeId" value={selectedTypeId} />
            <input type="hidden" name="leadId" value="" />
            <fieldset>
              <legend className="text-sm font-medium text-ink-700">Available slots</legend>
              <div className="mt-2 grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-3">
                {slots.map((slot) => (
                  <label
                    key={slot.startIso}
                    className={cn(
                      "cursor-pointer rounded-lg border px-3 py-2 text-center text-sm transition-colors",
                      selectedSlot === slot.startIso
                        ? "border-brand-600 bg-brand-100 text-brand-900"
                        : "border-ink-300/40 text-ink-700 hover:border-brand-300",
                    )}
                  >
                    <input
                      type="radio"
                      name="slotStart"
                      value={slot.startIso}
                      checked={selectedSlot === slot.startIso}
                      onChange={() => setSelectedSlot(slot.startIso)}
                      className="sr-only"
                    />
                    {slot.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="booking-name">Caller name</Label>
                <Input id="booking-name" name="callerName" required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="booking-phone">Caller phone</Label>
                <Input id="booking-phone" name="callerPhone" type="tel" required className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="booking-notes">Notes</Label>
              <Input id="booking-notes" name="notes" className="mt-1" />
            </div>
            <div className="flex items-center gap-3">
              <SubmitButton disabled={!selectedSlot}>Book appointment</SubmitButton>
              <FormMessage state={state} />
            </div>
          </form>
        )
      ) : null}
    </div>
  );
}
