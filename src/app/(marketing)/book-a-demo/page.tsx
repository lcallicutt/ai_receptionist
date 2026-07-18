import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { LeadCaptureForm } from "@/components/marketing/lead-capture-form";

export const metadata: Metadata = { title: "Book a Demo" };

const WHAT_TO_EXPECT = [
  "A live walkthrough of the AI receptionist for your industry",
  "A simulated call using your business name and services",
  "A look at the dashboard, lead pipeline, and call summaries",
  "Straight answers on pricing, usage, and go-live timeline",
];

export default function BookADemoPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="grid items-start gap-10 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Book a demo</h1>
          <p className="mt-4 text-lg text-ink-500">
            See exactly what your callers would experience — and what lands in your inbox after
            every call. Demos take about 20 minutes.
          </p>
          <ul className="mt-8 space-y-3">
            {WHAT_TO_EXPECT.map((item) => (
              <li key={item} className="flex items-start gap-3 text-ink-700">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-brand-950 p-6 sm:p-8">
          <h2 className="mb-4 text-xl font-semibold text-white">Request your demo</h2>
          <LeadCaptureForm />
        </div>
      </div>
    </div>
  );
}
