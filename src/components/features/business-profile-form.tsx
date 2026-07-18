"use client";

import { useActionState } from "react";
import { updateBusinessProfile, type ActionState } from "@/lib/actions/business";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton, FormMessage } from "@/components/ui/form-bits";
import type { schema } from "@/lib/db";

const TIME_ZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
];

type Profile = typeof schema.businessProfiles.$inferSelect;

export function BusinessProfileForm({ profile }: { profile: Profile | null }) {
  const [state, formAction] = useActionState<ActionState, FormData>(updateBusinessProfile, {});

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="businessName">Business name</Label>
          <Input id="businessName" name="businessName" required className="mt-1"
            defaultValue={profile?.businessName ?? ""} />
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" type="url" placeholder="https://…" className="mt-1"
            defaultValue={profile?.website ?? ""} />
        </div>
        <div>
          <Label htmlFor="mainPhone">Main phone number</Label>
          <Input id="mainPhone" name="mainPhone" type="tel" className="mt-1"
            defaultValue={profile?.mainPhone ?? ""} />
        </div>
        <div>
          <Label htmlFor="timeZone">Time zone</Label>
          <Select id="timeZone" name="timeZone" className="mt-1"
            defaultValue={profile?.timeZone ?? "America/New_York"}>
            {TIME_ZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="addressLine1">Street address</Label>
          <Input id="addressLine1" name="addressLine1" className="mt-1"
            defaultValue={profile?.addressLine1 ?? ""} />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" className="mt-1" defaultValue={profile?.city ?? ""} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="state">State</Label>
            <Input id="state" name="state" className="mt-1" defaultValue={profile?.state ?? ""} />
          </div>
          <div>
            <Label htmlFor="postalCode">ZIP</Label>
            <Input id="postalCode" name="postalCode" className="mt-1"
              defaultValue={profile?.postalCode ?? ""} />
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="serviceAreas">Service areas (comma-separated)</Label>
          <Input id="serviceAreas" name="serviceAreas" className="mt-1"
            placeholder="Wilmington, Leland, Hampstead"
            defaultValue={(profile?.serviceAreas ?? []).join(", ")} />
        </div>
        <div>
          <Label htmlFor="primaryContactName">Primary contact name</Label>
          <Input id="primaryContactName" name="primaryContactName" className="mt-1"
            defaultValue={profile?.primaryContactName ?? ""} />
        </div>
        <div>
          <Label htmlFor="primaryContactEmail">Primary contact email</Label>
          <Input id="primaryContactEmail" name="primaryContactEmail" type="email" className="mt-1"
            defaultValue={profile?.primaryContactEmail ?? ""} />
        </div>
        <div>
          <Label htmlFor="notificationPhone">Notification phone number</Label>
          <Input id="notificationPhone" name="notificationPhone" type="tel" className="mt-1"
            defaultValue={profile?.notificationPhone ?? ""} />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <SubmitButton>Save business profile</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
