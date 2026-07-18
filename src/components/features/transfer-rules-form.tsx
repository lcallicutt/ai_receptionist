"use client";

import { useActionState } from "react";
import { saveTransferRules } from "@/lib/actions/escalation";
import type { ActionState } from "@/lib/actions/business";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton, FormMessage } from "@/components/ui/form-bits";
import type { schema } from "@/lib/db";

type TransferRule = typeof schema.transferRules.$inferSelect;
type EscalationRule = typeof schema.escalationRules.$inferSelect;

export function TransferRulesForm({
  rule,
  escalation,
}: {
  rule: TransferRule | null;
  escalation: EscalationRule | null;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveTransferRules, {});

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="transferNumber">Transfer phone number</Label>
          <Input id="transferNumber" name="transferNumber" type="tel" className="mt-1"
            defaultValue={rule?.transferNumber ?? ""} placeholder="+1 (555) 555-0100" />
        </div>
        <div>
          <Label htmlFor="backupNumber">Backup number</Label>
          <Input id="backupNumber" name="backupNumber" type="tel" className="mt-1"
            defaultValue={rule?.backupNumber ?? ""} />
        </div>
        <div>
          <Label htmlFor="afterHoursBehavior">After-hours behavior</Label>
          <Select id="afterHoursBehavior" name="afterHoursBehavior" className="mt-1"
            defaultValue={rule?.afterHoursBehavior ?? "take_message"}>
            <option value="take_message">Take a message</option>
            <option value="transfer_anyway">Transfer anyway</option>
            <option value="voicemail">Send to voicemail</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="failureFallback">If a transfer fails</Label>
          <Select id="failureFallback" name="failureFallback" className="mt-1"
            defaultValue={rule?.failureFallback ?? "take_message"}>
            <option value="take_message">Take a message</option>
            <option value="voicemail">Send to voicemail</option>
            <option value="end_call">Politely end the call</option>
          </Select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" name="duringBusinessHoursOnly"
          defaultChecked={rule?.duringBusinessHoursOnly ?? true}
          className="h-4 w-4 accent-brand-700" />
        Only transfer during business hours
      </label>
      <div>
        <Label htmlFor="urgentKeywords">Urgent keywords (comma-separated)</Label>
        <Input id="urgentKeywords" name="urgentKeywords" className="mt-1"
          defaultValue={(rule?.urgentKeywords ?? []).join(", ")}
          placeholder="emergency, flooding, no heat, urgent" />
        <p className="mt-1 text-xs text-ink-300">
          When a caller uses these words, the call is escalated per your rules.
        </p>
      </div>
      <div>
        <Label htmlFor="vipCallerNumbers">VIP caller numbers (comma-separated)</Label>
        <Input id="vipCallerNumbers" name="vipCallerNumbers" className="mt-1"
          defaultValue={(rule?.vipCallerNumbers ?? []).join(", ")} />
      </div>
      <div>
        <Label htmlFor="emergencyLanguage">Emergency language</Label>
        <Textarea id="emergencyLanguage" name="emergencyLanguage" rows={2} className="mt-1"
          defaultValue={escalation?.emergencyLanguage ?? ""}
          placeholder="For life-threatening emergencies, please hang up and dial 911." />
        <p className="mt-1 text-xs text-ink-300">
          Spoken when an emergency is detected. The receptionist never presents itself as an
          emergency service.
        </p>
      </div>
      <div className="flex items-center gap-4">
        <SubmitButton>Save escalation rules</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
