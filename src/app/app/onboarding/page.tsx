import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { Check, FlaskConical } from "lucide-react";
import { getDb, schema } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth/guards";
import { getActivationReadiness, TOTAL_ONBOARDING_STEPS } from "@/lib/onboarding-readiness";
import { getOrgPlanTier } from "@/lib/subscription";
import { planLimit, PLAN_DEFINITIONS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BusinessProfileForm } from "@/components/features/business-profile-form";
import { BusinessHoursForm } from "@/components/features/business-hours-form";
import { ReceptionistForm } from "@/components/features/receptionist-form";
import { FaqManager } from "@/components/features/faq-manager";
import { QuestionManager } from "@/components/features/question-manager";
import { AppointmentTypesManager } from "@/components/features/appointment-types-manager";
import { TransferRulesForm } from "@/components/features/transfer-rules-form";
import { RecipientManager } from "@/components/features/recipient-manager";
import {
  StepCompleteBar,
  ConsentReviewPanel,
  ActivatePanel,
} from "@/components/features/onboarding-controls";

export const metadata = { title: "Onboarding" };

const STEPS = [
  { n: 1, title: "Business information", blurb: "Name, contact details, time zone, and service areas." },
  { n: 2, title: "Receptionist identity", blurb: "Name, voice, tone, greeting, and pronunciation." },
  { n: 3, title: "Call goals", blurb: "What your receptionist should accomplish." },
  { n: 4, title: "FAQs", blurb: "Approved questions and answers." },
  { n: 5, title: "Lead qualification", blurb: "Questions, disqualifiers, and scoring." },
  { n: 6, title: "Appointment booking", blurb: "Appointment types, durations, and policies." },
  { n: 7, title: "Escalation & transfers", blurb: "When and where to hand off to a human." },
  { n: 8, title: "Notifications", blurb: "Who gets call summaries and alerts." },
  { n: 9, title: "Test call", blurb: "Verify the experience before going live." },
  { n: 10, title: "Activation", blurb: "Readiness check and go-live." },
];

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const ctx = await requireOrgContext();
  const db = await getDb();
  const orgId = ctx.organization.id;

  const params = await searchParams;
  const requested = Number(params.step);

  const [progressRows, profiles, hours, receptionists, faqs, questions, apptTypes, transferRules, escalations, recipients, tier] =
    await Promise.all([
      db.select().from(schema.onboardingProgress).where(eq(schema.onboardingProgress.organizationId, orgId)).limit(1),
      db.select().from(schema.businessProfiles).where(eq(schema.businessProfiles.organizationId, orgId)).limit(1),
      db.select().from(schema.businessHours).where(eq(schema.businessHours.organizationId, orgId)).orderBy(asc(schema.businessHours.dayOfWeek)),
      db.select().from(schema.aiReceptionists).where(eq(schema.aiReceptionists.organizationId, orgId)).limit(1),
      db.select().from(schema.faqs).where(eq(schema.faqs.organizationId, orgId)).orderBy(asc(schema.faqs.sortOrder)),
      db.select().from(schema.qualificationQuestions).where(eq(schema.qualificationQuestions.organizationId, orgId)).orderBy(asc(schema.qualificationQuestions.sortOrder)),
      db.select().from(schema.appointmentTypes).where(eq(schema.appointmentTypes.organizationId, orgId)),
      db.select().from(schema.transferRules).where(eq(schema.transferRules.organizationId, orgId)).limit(1),
      db.select().from(schema.escalationRules).where(eq(schema.escalationRules.organizationId, orgId)).orderBy(desc(schema.escalationRules.name)).limit(1),
      db.select().from(schema.notificationSettings).where(eq(schema.notificationSettings.organizationId, orgId)),
      getOrgPlanTier(orgId),
    ]);

  const progress = progressRows[0];
  const completed = new Set(progress?.completedSteps ?? []);
  const currentStep =
    Number.isInteger(requested) && requested >= 1 && requested <= TOTAL_ONBOARDING_STEPS
      ? requested
      : (progress?.currentStep ?? 1);

  const readiness = await getActivationReadiness(ctx);
  const consentReviewed =
    readiness.checks.find((c) => c.key === "consent_reviewed")?.passed ?? false;
  const recipientCap = planLimit(tier, "notification_recipients");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Onboarding</h1>
          <p className="text-sm text-ink-500">
            {progress?.isComplete
              ? "Onboarding complete — your receptionist is live. You can revisit any step."
              : `${completed.size} of ${TOTAL_ONBOARDING_STEPS} steps complete`}
          </p>
        </div>
        {progress?.isComplete ? <Badge variant="success">activated</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <nav aria-label="Onboarding steps">
          <ol className="space-y-1">
            {STEPS.map((step) => {
              const isDone = completed.has(step.n);
              const isCurrent = currentStep === step.n;
              return (
                <li key={step.n}>
                  <Link
                    href={`/app/onboarding?step=${step.n}`}
                    aria-current={isCurrent ? "step" : undefined}
                    className={cn(
                      "flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      isCurrent
                        ? "bg-brand-100 text-brand-900"
                        : "text-ink-500 hover:bg-surface-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        isDone
                          ? "bg-emerald-600 text-white"
                          : isCurrent
                            ? "bg-brand-700 text-white"
                            : "bg-ink-300/30 text-ink-700",
                      )}
                      aria-hidden="true"
                    >
                      {isDone ? <Check className="h-3 w-3" /> : step.n}
                    </span>
                    <span>
                      <span className="block font-medium">{step.title}</span>
                      <span className="block text-xs text-ink-300">{step.blurb}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="space-y-6">
          {currentStep === 1 ? (
            <Card>
              <CardHeader>
                <CardTitle>Step 1 — Business information</CardTitle>
                <CardDescription>
                  This powers your greeting, confirmations, and notifications.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <BusinessProfileForm profile={profiles[0] ?? null} />
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-ink-900">Business hours</h3>
                  <BusinessHoursForm hours={hours} />
                </div>
                <StepCompleteBar step={1} />
              </CardContent>
            </Card>
          ) : null}

          {currentStep === 2 || currentStep === 3 ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {currentStep === 2
                    ? "Step 2 — Receptionist identity"
                    : "Step 3 — Call goals"}
                </CardTitle>
                <CardDescription>
                  {currentStep === 2
                    ? "How your receptionist sounds and introduces itself."
                    : "Choose the goals in the checklist at the bottom of the form, then save."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ReceptionistForm receptionist={receptionists[0] ?? null} />
                <StepCompleteBar step={currentStep} />
              </CardContent>
            </Card>
          ) : null}

          {currentStep === 4 ? (
            <Card>
              <CardHeader>
                <CardTitle>Step 4 — FAQs</CardTitle>
                <CardDescription>
                  Starter FAQs from your industry template are already loaded — edit freely.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FaqManager faqs={faqs} />
                <StepCompleteBar step={4} />
              </CardContent>
            </Card>
          ) : null}

          {currentStep === 5 ? (
            <Card>
              <CardHeader>
                <CardTitle>Step 5 — Lead qualification</CardTitle>
                <CardDescription>
                  What your receptionist asks to separate hot leads from tire-kickers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <QuestionManager questions={questions} />
                <StepCompleteBar step={5} />
              </CardContent>
            </Card>
          ) : null}

          {currentStep === 6 ? (
            <Card>
              <CardHeader>
                <CardTitle>Step 6 — Appointment booking</CardTitle>
                <CardDescription>
                  Define appointment types. Calendar connections (Google / Outlook) arrive in
                  Phase 4 — types configured now will be ready when they do.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <AppointmentTypesManager types={apptTypes} />
                <StepCompleteBar step={6} />
              </CardContent>
            </Card>
          ) : null}

          {currentStep === 7 ? (
            <Card>
              <CardHeader>
                <CardTitle>Step 7 — Escalation & transfers</CardTitle>
                <CardDescription>
                  When callers need a human, here&apos;s where they go.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <TransferRulesForm rule={transferRules[0] ?? null} escalation={escalations[0] ?? null} />
                <StepCompleteBar step={7} />
              </CardContent>
            </Card>
          ) : null}

          {currentStep === 8 ? (
            <Card>
              <CardHeader>
                <CardTitle>Step 8 — Notifications</CardTitle>
                <CardDescription>Who hears about calls, leads, and appointments.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <RecipientManager
                  recipients={recipients}
                  planLimitLabel={`Your ${PLAN_DEFINITIONS[tier].name} plan includes ${recipientCap === null ? "unlimited" : recipientCap} recipient${recipientCap === 1 ? "" : "s"} (${recipients.length} in use).`}
                />
                <StepCompleteBar step={8} />
              </CardContent>
            </Card>
          ) : null}

          {currentStep === 9 ? (
            <Card>
              <CardHeader>
                <CardTitle>Step 9 — Test call</CardTitle>
                <CardDescription>
                  Live test calls launch with the voice integration in Phase 5.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-surface-muted p-4 text-sm text-ink-700">
                  <p className="flex items-center gap-2 font-medium text-ink-900">
                    <FlaskConical className="h-4 w-4 text-brand-700" aria-hidden="true" />
                    What the test will verify once live:
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-6">
                    <li>Greeting plays exactly as configured</li>
                    <li>FAQs answered from approved content only</li>
                    <li>Qualification questions asked in order</li>
                    <li>Lead information extracted correctly</li>
                    <li>Booking, CRM logging, and notification delivery</li>
                  </ul>
                  <p className="mt-3 text-xs text-ink-500">
                    You can review your configuration now and mark this step complete — we&apos;ll
                    prompt you to run a real test call before Phase 5 goes live on your number.
                  </p>
                </div>
                <StepCompleteBar step={9} label="I've reviewed the test checklist — continue" />
              </CardContent>
            </Card>
          ) : null}

          {currentStep === 10 ? (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>Step 10 — Activation</CardTitle>
                    <CardDescription>Final checks before your receptionist goes live.</CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-brand-700">{readiness.score}%</p>
                    <p className="text-xs text-ink-500">readiness score</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-2">
                  {readiness.checks.map((check) => (
                    <li key={check.key}
                      className="flex items-start justify-between gap-3 rounded-lg border border-ink-300/20 px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-ink-900">{check.label}</p>
                        {check.note && !check.passed ? (
                          <p className="text-xs text-ink-500">{check.note}</p>
                        ) : null}
                      </div>
                      <Badge
                        variant={check.passed ? "success" : check.severity === "blocker" ? "danger" : "warning"}>
                        {check.passed ? "ready" : check.severity === "blocker" ? "required" : "pending"}
                      </Badge>
                    </li>
                  ))}
                </ul>
                <ConsentReviewPanel reviewed={consentReviewed} />
                <ActivatePanel canActivate={readiness.canActivate} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
