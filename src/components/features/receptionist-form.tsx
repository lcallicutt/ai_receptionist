"use client";

import { useActionState } from "react";
import { saveReceptionistDraft } from "@/lib/actions/receptionist";
import type { ActionState } from "@/lib/actions/business";
import { TONE_OPTIONS, CALL_GOAL_OPTIONS } from "@/lib/receptionist-options";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton, FormMessage } from "@/components/ui/form-bits";
import type { schema } from "@/lib/db";

type Receptionist = typeof schema.aiReceptionists.$inferSelect;

export function ReceptionistForm({ receptionist }: { receptionist: Receptionist | null }) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveReceptionistDraft, {});
  const goals = new Set(receptionist?.callGoals ?? []);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="rname">Receptionist name</Label>
          <Input id="rname" name="name" required className="mt-1"
            defaultValue={receptionist?.name ?? ""} placeholder="e.g. Ava" />
        </div>
        <div>
          <Label htmlFor="tone">Tone</Label>
          <Select id="tone" name="tone" className="mt-1"
            defaultValue={receptionist?.tone ?? "warm_friendly"}>
            {TONE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="language">Language</Label>
          <Select id="language" name="language" className="mt-1"
            defaultValue={receptionist?.language ?? "en-US"}>
            <option value="en-US">English (US)</option>
            <option value="es-US">Spanish (US)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="speakingSpeed">Speaking speed</Label>
          <Select id="speakingSpeed" name="speakingSpeed" className="mt-1"
            defaultValue={receptionist?.speakingSpeed ?? "1.00"}>
            <option value="0.85">Slower</option>
            <option value="1.00">Normal</option>
            <option value="1.15">Faster</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="formality">Formality</Label>
          <Select id="formality" name="formality" className="mt-1"
            defaultValue={receptionist?.formality ?? "professional"}>
            <option value="casual">Casual</option>
            <option value="professional">Professional</option>
            <option value="formal">Formal</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="voiceId">Voice</Label>
          <Select id="voiceId" name="voiceId" className="mt-1"
            defaultValue={receptionist?.voiceId ?? ""}>
            <option value="">Default voice (provider selection in Phase 5)</option>
            <option value="voice_female_warm">Female — warm</option>
            <option value="voice_female_professional">Female — professional</option>
            <option value="voice_male_warm">Male — warm</option>
            <option value="voice_male_professional">Male — professional</option>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="greeting">Greeting</Label>
        <Textarea id="greeting" name="greeting" rows={3} required className="mt-1"
          defaultValue={receptionist?.greeting ?? ""}
          placeholder="Thank you for calling {{business_name}}, this is {{receptionist_name}}. How can I help you today?" />
        <p className="mt-1 text-xs text-ink-300">
          This is read verbatim on every call. Placeholders like {"{{business_name}}"} are filled automatically.
        </p>
      </div>

      <div>
        <Label htmlFor="pronunciationNotes">Pronunciation notes</Label>
        <Textarea id="pronunciationNotes" name="pronunciationNotes" rows={2} className="mt-1"
          defaultValue={receptionist?.pronunciationNotes ?? ""}
          placeholder="Words or company names that need special pronunciation" />
      </div>

      <div>
        <Label htmlFor="businessKnowledge">Business knowledge</Label>
        <Textarea id="businessKnowledge" name="businessKnowledge" rows={4} className="mt-1"
          defaultValue={receptionist?.businessKnowledge ?? ""}
          placeholder="Background information the receptionist can draw on (services, policies, parking, etc.)" />
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-ink-700">Call goals</legend>
        <p className="text-xs text-ink-300">What should the receptionist accomplish on calls?</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {CALL_GOAL_OPTIONS.map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 rounded-lg border border-ink-300/25 px-3 py-2 text-sm text-ink-700">
              <input type="checkbox" name="callGoals" value={value}
                defaultChecked={goals.has(value)} className="h-4 w-4 accent-brand-700" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-4">
        <SubmitButton>Save draft</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
