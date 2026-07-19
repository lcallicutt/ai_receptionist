"use client";

import { useActionState } from "react";
import { UserCog } from "lucide-react";
import { impersonateOrgOwner } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/actions/business";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-bits";

export function ImpersonateButton({ organizationId, orgName }: { organizationId: string; orgName: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(impersonateOrgOwner, {});
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !confirm(
            `Impersonate the owner of ${orgName}? Your session becomes theirs (fully audit-logged). Log out to end the impersonation.`,
          )
        )
          e.preventDefault();
      }}
      className="inline-flex items-center gap-2"
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <Button type="submit" variant="outline" size="sm">
        <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
        Impersonate owner
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
