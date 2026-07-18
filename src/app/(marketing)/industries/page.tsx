import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Wrench, Sparkles, Scissors, Scale, Church } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Industries" };

const VERTICALS = [
  {
    icon: Building2,
    name: "Realtors",
    blurb: "Never miss a showing request or a motivated seller again.",
    goals: ["Buyer inquiry", "Seller inquiry", "Showing request", "Home valuation", "Rental inquiry"],
    note: "Qualification covers budget, timeline, preapproval status, and preferred areas.",
  },
  {
    icon: Wrench,
    name: "Home Services",
    blurb: "HVAC, plumbing, electrical, roofing, cleaning, landscaping, and more.",
    goals: ["Emergency triage", "Service booking", "Existing-customer routing", "Quote requests"],
    note: "Urgent calls escalate to a human — without ever posing as an emergency service.",
  },
  {
    icon: Sparkles,
    name: "Med Spas",
    blurb: "Consultations booked, pricing questions answered, no medical advice given.",
    goals: ["New appointment", "Consultation", "Service information", "Reschedules"],
    note: "Built-in guardrails: the receptionist never provides medical diagnoses.",
  },
  {
    icon: Scissors,
    name: "Salons",
    blurb: "Keep the chair full while your stylists stay focused on clients.",
    goals: ["Appointments", "Preferred-provider booking", "Pricing questions", "Cancellations"],
    note: "Provider preferences and service durations respected on every booking.",
  },
  {
    icon: Scale,
    name: "Law Offices",
    blurb: "Structured intake for new matters, with clear professional boundaries.",
    goals: ["New client intake", "Consultation request", "Existing case inquiry", "Office information"],
    note: "Clear disclaimers: no legal advice, no attorney-client relationship created by the call.",
  },
  {
    icon: Church,
    name: "Churches",
    blurb: "Office overflow answered with warmth — every caller treated with care.",
    goals: ["Service times", "Event information", "Prayer requests", "Pastoral care routing"],
    note: "Prayer and pastoral-care requests are routed respectfully per your configured rules.",
  },
];

export default function IndustriesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight">Industries</h1>
        <p className="mt-4 text-lg text-ink-500">
          Every vertical template ships with a recommended greeting, starter FAQs, qualification
          questions, appointment types, escalation rules, and the right disclaimers — ready to
          customize in minutes.
        </p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {VERTICALS.map((v) => (
          <Card key={v.name}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                  <v.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>{v.name}</CardTitle>
                  <CardDescription>{v.blurb}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {v.goals.map((g) => (
                  <Badge key={g} variant="brand">
                    {g}
                  </Badge>
                ))}
              </div>
              <p className="mt-4 text-sm text-ink-500">{v.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-14 text-center">
        <Link href="/book-a-demo" className={buttonVariants({ variant: "primary", size: "lg" })}>
          See your industry template in action
        </Link>
      </div>
    </div>
  );
}
