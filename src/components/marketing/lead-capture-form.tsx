"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { submitDemoRequest } from "@/lib/actions/demo-request";

const leadSchema = z.object({
  name: z.string().min(1, "Your name is required"),
  businessName: z.string().min(1, "Business name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(7, "Enter a valid phone number"),
  industry: z.string().min(1, "Select an industry"),
});

type LeadForm = z.infer<typeof leadSchema>;

const INDUSTRIES = [
  ["realtor", "Real Estate"],
  ["home_services", "Home Services"],
  ["med_spa", "Med Spa"],
  ["salon", "Salon"],
  ["law_office", "Law Office"],
  ["church", "Church"],
  ["other", "Other"],
] as const;

export function LeadCaptureForm() {
  const [submitted, setSubmitted] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LeadForm>({ resolver: zodResolver(leadSchema) });

  if (submitted) {
    return (
      <div className="rounded-(--radius-card) bg-white p-8 text-center text-ink-900" role="status">
        <h3 className="text-xl font-semibold">Thanks — we&apos;ll be in touch!</h3>
        <p className="mt-2 text-sm text-ink-500">
          A FlowNet specialist will reach out within one business day to schedule your demo.
        </p>
      </div>
    );
  }

  const onSubmit = async (data: LeadForm) => {
    setServerError(null);
    const result = await submitDemoRequest(data);
    if (result.ok) {
      setSubmitted(true);
    } else {
      setServerError(result.error);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-(--radius-card) bg-white p-6 text-ink-900"
      noValidate
    >
      <div>
        <Label htmlFor="lead-name">Your name</Label>
        <Input id="lead-name" autoComplete="name" className="mt-1" {...register("name")}
          aria-invalid={!!errors.name} aria-describedby={errors.name ? "lead-name-error" : undefined} />
        {errors.name ? (
          <p id="lead-name-error" className="mt-1 text-xs text-red-600">{errors.name.message}</p>
        ) : null}
      </div>
      <div>
        <Label htmlFor="lead-business">Business name</Label>
        <Input id="lead-business" autoComplete="organization" className="mt-1" {...register("businessName")}
          aria-invalid={!!errors.businessName}
          aria-describedby={errors.businessName ? "lead-business-error" : undefined} />
        {errors.businessName ? (
          <p id="lead-business-error" className="mt-1 text-xs text-red-600">{errors.businessName.message}</p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="lead-email">Email</Label>
          <Input id="lead-email" type="email" autoComplete="email" className="mt-1" {...register("email")}
            aria-invalid={!!errors.email} aria-describedby={errors.email ? "lead-email-error" : undefined} />
          {errors.email ? (
            <p id="lead-email-error" className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="lead-phone">Phone</Label>
          <Input id="lead-phone" type="tel" autoComplete="tel" className="mt-1" {...register("phone")}
            aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "lead-phone-error" : undefined} />
          {errors.phone ? (
            <p id="lead-phone-error" className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
          ) : null}
        </div>
      </div>
      <div>
        <Label htmlFor="lead-industry">Industry</Label>
        <select
          id="lead-industry"
          className="mt-1 h-10 w-full rounded-lg border border-ink-300/50 bg-white px-3 text-sm"
          {...register("industry")}
          aria-invalid={!!errors.industry}
          aria-describedby={errors.industry ? "lead-industry-error" : undefined}
          defaultValue=""
        >
          <option value="" disabled>
            Select your industry
          </option>
          {INDUSTRIES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.industry ? (
          <p id="lead-industry-error" className="mt-1 text-xs text-red-600">{errors.industry.message}</p>
        ) : null}
      </div>
      {serverError ? (
        <p className="text-sm text-red-600" role="alert">
          {serverError}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Request my demo"}
      </Button>
      <p className="text-xs text-ink-300">
        We&apos;ll only use your details to contact you about FlowNet. No spam.
      </p>
    </form>
  );
}
