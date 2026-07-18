"use client";

import { useActionState } from "react";
import Link from "next/link";
import { PhoneIncoming } from "lucide-react";
import { simulateIncomingCall, type SimulateState } from "@/lib/actions/simulate";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton, FormMessage } from "@/components/ui/form-bits";

export function SimulateCallPanel() {
  const [state, formAction] = useActionState<SimulateState, FormData>(simulateIncomingCall, {});

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="sim-scenario">Scenario</Label>
        <Select id="sim-scenario" name="scenario" className="mt-1 max-w-sm" defaultValue="qualified_lead">
          <option value="qualified_lead">Qualified lead — inquiry with answers captured</option>
          <option value="faq_call">FAQ call — question answered, no lead</option>
          <option value="missed_call">Missed call — text-back pipeline</option>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton>
          <PhoneIncoming className="h-4 w-4" aria-hidden="true" />
          Simulate incoming call
        </SubmitButton>
        <FormMessage state={state} />
      </div>
      {state.callId ? (
        <p className="text-sm">
          <Link href={`/app/calls/${state.callId}`} className="font-medium text-brand-700 hover:underline">
            Open the simulated call →
          </Link>
        </p>
      ) : null}
    </form>
  );
}
