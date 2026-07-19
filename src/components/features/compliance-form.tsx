"use client";

import { useActionState } from "react";
import { updateComplianceSettings, requestDataDeletion } from "@/lib/actions/compliance";
import type { ActionState } from "@/lib/actions/business";
import { Input, Label, Textarea } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form-bits";

export function ComplianceForm({
  recordingEnabled,
  recordingDisclosure,
  recordingRetentionDays,
  transcriptRetentionDays,
  legalDisclaimer,
}: {
  recordingEnabled: boolean;
  recordingDisclosure: string | null;
  recordingRetentionDays: number;
  transcriptRetentionDays: number;
  legalDisclaimer: string | null;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(updateComplianceSettings, {});

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" name="recordingEnabled" defaultChecked={recordingEnabled}
          className="h-4 w-4 accent-brand-700" />
        Enable call recording (off by default)
      </label>
      <div>
        <Label htmlFor="cp-disclosure">Recording disclosure</Label>
        <Textarea id="cp-disclosure" name="recordingDisclosure" rows={2} className="mt-1"
          defaultValue={recordingDisclosure ?? ""}
          placeholder="This call may be recorded for quality and training purposes." />
        <p className="mt-1 text-xs text-ink-300">
          Required when recording is enabled; spoken at the start of every call. Recording laws
          vary by state — confirm requirements with your own advisor.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="cp-rec-days">Recording retention (days)</Label>
          <Input id="cp-rec-days" name="recordingRetentionDays" type="number" min={1} max={3650}
            className="mt-1 w-32" defaultValue={recordingRetentionDays} />
        </div>
        <div>
          <Label htmlFor="cp-tr-days">Transcript retention (days)</Label>
          <Input id="cp-tr-days" name="transcriptRetentionDays" type="number" min={1} max={3650}
            className="mt-1 w-32" defaultValue={transcriptRetentionDays} />
        </div>
      </div>
      <div>
        <Label htmlFor="cp-disclaimer">Legal disclaimer</Label>
        <Textarea id="cp-disclaimer" name="legalDisclaimer" rows={2} className="mt-1"
          defaultValue={legalDisclaimer ?? ""}
          placeholder="e.g. This call does not create an attorney-client relationship." />
        <p className="mt-1 text-xs text-ink-300">
          Delivered by the receptionist when relevant — industry templates provide starting
          language for legal, medical, and emergency contexts.
        </p>
      </div>
      <div className="flex items-center gap-4">
        <SubmitButton>Save compliance settings</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function DeletionRequestForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(requestDataDeletion, {});
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3" noValidate>
      <div>
        <Label htmlFor="del-phone">Caller phone number (E.164)</Label>
        <Input id="del-phone" name="phone" type="tel" required className="mt-1 w-56"
          placeholder="+19105551234" />
      </div>
      <SubmitButton variant="outline">Request deletion</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
