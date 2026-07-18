import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-ink-300">Placeholder — pending review by legal counsel.</p>
      <div className="prose-sm mt-8 space-y-4 text-ink-700">
        <p>
          This page will contain the terms governing use of the FlowNet AI Receptionist platform
          operated by FlowNet Automation LLC.
        </p>
        <p>Topics to be covered in the final terms include:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Subscription plans, usage allowances, and billing</li>
          <li>Acceptable use and client responsibilities</li>
          <li>
            Compliance responsibilities — clients must obtain their own professional guidance for
            call recording laws, TCPA/SMS consent, HIPAA, attorney ethics rules, and other
            regulations applicable to their use case
          </li>
          <li>Service availability and support</li>
          <li>Limitation of liability and disclaimers</li>
          <li>Termination and data export</li>
        </ul>
        <p>
          The platform provides configuration controls for compliance-sensitive features but does
          not itself guarantee regulatory compliance for any specific industry or jurisdiction.
        </p>
      </div>
    </div>
  );
}
