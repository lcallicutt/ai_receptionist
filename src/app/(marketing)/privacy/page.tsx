import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-ink-300">Placeholder — pending review by legal counsel.</p>
      <div className="prose-sm mt-8 space-y-4 text-ink-700">
        <p>
          This page will describe how FlowNet Automation LLC collects, uses, stores, and protects
          personal information across the FlowNet AI Receptionist platform, including caller
          data processed on behalf of our business clients.
        </p>
        <p>Topics to be covered in the final policy include:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Data we collect from businesses and from their callers</li>
          <li>Call recording, transcription, and consent practices</li>
          <li>Data retention and deletion request workflows</li>
          <li>Third-party processors (telephony, voice AI, calendar, CRM, email providers)</li>
          <li>Security measures and breach notification</li>
          <li>Your rights and how to exercise them</li>
        </ul>
        <p>
          Until the final policy is published, direct privacy questions to
          hello@flownetautomation.com.
        </p>
      </div>
    </div>
  );
}
