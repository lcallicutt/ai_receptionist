"use client";

import { useActionState } from "react";
import { PhoneOutgoing } from "lucide-react";
import { startLiveTestCall } from "@/lib/actions/test-call";
import type { ActionState } from "@/lib/actions/business";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SubmitButton, FormMessage } from "@/components/ui/form-bits";

export function LiveTestCallPanel({ voiceConfigured }: { voiceConfigured: boolean }) {
  const [state, formAction] = useActionState<ActionState, FormData>(startLiveTestCall, {});

  if (!voiceConfigured) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500">
          Live test calls require the voice provider to be configured on this deployment
          (RETELL_API_KEY). Once configured, this panel syncs your receptionist to the provider
          and dials your phone.
        </p>
        <Badge variant="outline">voice provider not configured</Badge>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3" noValidate>
      <div>
        <Label htmlFor="testcall-number">Your phone number</Label>
        <Input id="testcall-number" name="toNumber" type="tel" required className="mt-1 w-56"
          placeholder="+19105551234" />
      </div>
      <SubmitButton>
        <PhoneOutgoing className="h-4 w-4" aria-hidden="true" />
        Call me now
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
