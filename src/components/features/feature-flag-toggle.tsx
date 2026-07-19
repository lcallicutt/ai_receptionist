"use client";

import { useActionState } from "react";
import { toggleFeatureFlag } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/actions/business";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-bits";

export function FeatureFlagToggle({ flagKey, enabled }: { flagKey: string; enabled: boolean }) {
  const [state, formAction] = useActionState<ActionState, FormData>(toggleFeatureFlag, {});
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="key" value={flagKey} />
      <Button type="submit" variant={enabled ? "outline" : "primary"} size="sm">
        {enabled ? "Disable" : "Enable"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
