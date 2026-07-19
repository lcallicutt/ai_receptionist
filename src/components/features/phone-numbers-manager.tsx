"use client";

import * as React from "react";
import { useActionState } from "react";
import { Phone } from "lucide-react";
import { addPhoneNumber, togglePhoneNumber } from "@/lib/actions/phone-numbers";
import type { ActionState } from "@/lib/actions/business";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton, FormMessage } from "@/components/ui/form-bits";

interface NumberRow {
  id: string;
  e164Formatted: string;
  label: string | null;
  provider: string;
  isActive: boolean;
  hasProviderId: boolean;
  receptionistName: string | null;
}

export function PhoneNumbersManager({
  numbers,
  twilioConfigured,
  planLimitLabel,
}: {
  numbers: NumberRow[];
  twilioConfigured: boolean;
  planLimitLabel: string;
}) {
  const [formKey, setFormKey] = React.useState(0);
  const [addState, addAction] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const result = await addPhoneNumber(prev, fd);
      if (result.success) setFormKey((k) => k + 1);
      return result;
    },
    {},
  );
  const [toggleState, toggleAction] = useActionState<ActionState, FormData>(togglePhoneNumber, {});

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-500">{planLimitLabel}</p>

      <form key={formKey} action={addAction} className="flex flex-wrap items-end gap-3 rounded-lg border border-ink-300/25 p-4" noValidate>
        <div>
          <Label htmlFor="pn-e164">Phone number (E.164)</Label>
          <Input id="pn-e164" name="e164" required className="mt-1 w-52" placeholder="+19105551234" />
        </div>
        <div>
          <Label htmlFor="pn-label">Label</Label>
          <Input id="pn-label" name="label" className="mt-1 w-40" placeholder="Main line" />
        </div>
        <div>
          <Label htmlFor="pn-mode">Mode</Label>
          <Select id="pn-mode" name="provision" className="mt-1 w-56" defaultValue="map">
            <option value="map">Map an existing number</option>
            <option value="provision" disabled={!twilioConfigured}>
              Provision via Twilio{twilioConfigured ? "" : " (not configured)"}
            </option>
          </Select>
        </div>
        <SubmitButton>Add number</SubmitButton>
        <FormMessage state={addState} />
      </form>

      <FormMessage state={toggleState} />
      {numbers.length === 0 ? (
        <p className="text-sm text-ink-500">No phone numbers yet.</p>
      ) : (
        <ul className="divide-y divide-ink-300/15 rounded-lg border border-ink-300/25">
          {numbers.map((n) => (
            <li key={n.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                  <Phone className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium text-ink-900">
                    {n.e164Formatted}
                    {n.label ? <span className="text-ink-500"> — {n.label}</span> : null}
                  </p>
                  <p className="text-xs text-ink-500">
                    {n.provider}
                    {n.hasProviderId ? " · provisioned" : " · manual mapping"}
                    {n.receptionistName ? ` · answered by ${n.receptionistName}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={n.isActive ? "success" : "neutral"}>
                  {n.isActive ? "active" : "inactive"}
                </Badge>
                <form action={toggleAction}>
                  <input type="hidden" name="id" value={n.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    {n.isActive ? "Deactivate" : "Activate"}
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
