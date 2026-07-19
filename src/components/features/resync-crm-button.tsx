"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { resyncLead, adminRetryCrmSync } from "@/lib/actions/crm";
import type { ActionState } from "@/lib/actions/business";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-bits";

export function ResyncCrmButton({
  leadId,
  organizationId,
  admin = false,
}: {
  leadId: string;
  /** Required for the platform-admin variant. */
  organizationId?: string;
  admin?: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    admin ? adminRetryCrmSync : resyncLead,
    {},
  );

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      {admin && organizationId ? (
        <input type="hidden" name="organizationId" value={organizationId} />
      ) : null}
      <Button type="submit" variant="outline" size="sm">
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        {admin ? "Retry sync" : "Resync to CRM"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
