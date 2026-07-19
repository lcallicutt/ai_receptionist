"use client";

import { useActionState } from "react";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import {
  completeOnboardingStep,
  markConsentReviewed,
  activateReceptionist,
} from "@/lib/actions/onboarding";
import type { ActionState } from "@/lib/actions/business";
import { SubmitButton, FormMessage } from "@/components/ui/form-bits";
import { Button } from "@/components/ui/button";

export function StepCompleteBar({ step, label }: { step: number; label?: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(completeOnboardingStep, {});
  return (
    <form action={formAction} className="flex items-center gap-3 border-t border-ink-300/20 pt-4">
      <input type="hidden" name="step" value={step} />
      <SubmitButton>
        {label ?? "Mark step complete & continue"}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function ConsentReviewPanel({ reviewed }: { reviewed: boolean }) {
  const [state, formAction] = useActionState<ActionState, FormData>(markConsentReviewed, {});
  if (reviewed && !state.success) {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-700">
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        Consent and recording settings reviewed.
      </p>
    );
  }
  return (
    <form action={formAction} className="space-y-3">
      <p className="text-sm text-ink-500">
        Call recording is <strong>off by default</strong>. Before going live, confirm you have
        reviewed your recording disclosure, SMS consent, and retention obligations for your
        state and industry. FlowNet provides configuration controls, not legal advice — consult
        your own advisor for compliance guidance.
      </p>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary">
          I&apos;ve reviewed consent & recording settings
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function ActivatePanel({ canActivate }: { canActivate: boolean }) {
  const [state, formAction] = useActionState<ActionState, FormData>(activateReceptionist, {});
  return (
    <form action={formAction} className="space-y-3">
      <div className="flex items-center gap-3">
        <SubmitButton size="lg" disabled={!canActivate}>
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          Activate my AI receptionist
        </SubmitButton>
        <FormMessage state={state} />
      </div>
      {!canActivate ? (
        <p className="text-sm text-ink-500">
          Resolve the blockers above to enable activation.
        </p>
      ) : null}
    </form>
  );
}
