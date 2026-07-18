import type { Metadata } from "next";
import Link from "next/link";
import { PricingSection } from "@/components/marketing/pricing-section";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Pricing" };

const PRICING_FAQS = [
  {
    q: "What counts toward my usage allowance?",
    a: "Voice minutes on answered calls and outbound SMS (confirmations, summaries, text-backs). Every plan includes a monthly allowance; you can see live usage and estimated overage in your dashboard at any time.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes — upgrades take effect immediately and downgrades apply at your next billing cycle. Your configuration is preserved either way.",
  },
  {
    q: "Is there a contract?",
    a: "Plans are month-to-month. Premium implementations may include a one-time white-glove setup engagement.",
  },
  {
    q: "Do you charge setup fees?",
    a: "Basic and Growth are self-serve with guided onboarding at no extra charge. Premium includes white-glove implementation by the FlowNet team.",
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">Pricing</h1>
        <p className="mt-4 text-lg text-ink-500">
          Every plan answers 24/7. Pick the level of automation your business needs —
          one recovered lead usually covers the month.
        </p>
      </div>
      <div className="mt-12">
        <PricingSection />
      </div>

      <section className="mx-auto mt-20 max-w-3xl" aria-labelledby="pricing-faq">
        <h2 id="pricing-faq" className="text-center text-2xl font-bold tracking-tight">
          Pricing questions
        </h2>
        <div className="mt-8 space-y-4">
          {PRICING_FAQS.map((faq) => (
            <details key={faq.q} className="rounded-(--radius-card) border border-ink-300/25 bg-white p-5">
              <summary className="cursor-pointer list-none text-base font-semibold">{faq.q}</summary>
              <p className="mt-3 text-sm text-ink-500">{faq.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/book-a-demo" className={buttonVariants({ variant: "primary", size: "lg" })}>
            Talk to us about the right plan
          </Link>
        </div>
      </section>
    </div>
  );
}
