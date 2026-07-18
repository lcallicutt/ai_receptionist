import type { Metadata } from "next";
import { DemoExperience } from "@/components/marketing/demo-experience";

export const metadata: Metadata = { title: "Demo" };

export default function DemoPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight">Experience a call</h1>
        <p className="mt-4 text-lg text-ink-500">
          Pick a scenario and watch how the AI receptionist greets, qualifies, books, and
          reports — exactly the way it would for your business.
        </p>
        <p className="mt-2 text-sm font-medium text-amber-700">
          All conversations below are simulated demonstration data.
        </p>
      </div>
      <div className="mt-10">
        <DemoExperience />
      </div>
    </div>
  );
}
