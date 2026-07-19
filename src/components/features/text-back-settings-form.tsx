"use client";

import { useActionState } from "react";
import { updateTextBackSettings } from "@/lib/actions/text-back-settings";
import type { ActionState } from "@/lib/actions/business";
import { DEFAULT_TEXT_BACK_MESSAGE } from "@/lib/text-back-constants";
import { Input, Label, Textarea } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form-bits";

export function TextBackSettingsForm({
  enabled,
  message,
  cooldownHours,
}: {
  enabled: boolean;
  message: string | null;
  cooldownHours: number;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(updateTextBackSettings, {});

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" name="textBackEnabled" defaultChecked={enabled}
          className="h-4 w-4 accent-brand-700" />
        Send an automatic text when a call is missed
      </label>
      <div>
        <Label htmlFor="tb-message">Text-back message</Label>
        <Textarea id="tb-message" name="textBackMessage" rows={2} className="mt-1"
          defaultValue={message ?? ""} placeholder={DEFAULT_TEXT_BACK_MESSAGE} />
        <p className="mt-1 text-xs text-ink-300">
          Placeholders: {"{{business_name}}"}, {"{{caller_name}}"}. STOP replies opt callers out
          automatically.
        </p>
      </div>
      <div>
        <Label htmlFor="tb-cooldown">Cooldown (hours)</Label>
        <Input id="tb-cooldown" name="textBackCooldownHours" type="number" min={1} max={720}
          className="mt-1 w-32" defaultValue={cooldownHours} />
        <p className="mt-1 text-xs text-ink-300">
          The same caller never receives more than one text-back within this window.
        </p>
      </div>
      <div className="flex items-center gap-4">
        <SubmitButton>Save text-back settings</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
