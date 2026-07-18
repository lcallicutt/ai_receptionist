import type { Metadata } from "next";
import Link from "next/link";
import {
  PhoneIncoming,
  ClipboardCheck,
  CalendarCheck2,
  MessageSquareText,
  Database,
  BellRing,
  PhoneForwarded,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Features" };

const FEATURE_GROUPS = [
  {
    icon: PhoneIncoming,
    title: "Instant 24/7 answering",
    points: [
      "Answers on the first ring, every time",
      "Your greeting, your receptionist's name and tone",
      "Business hours, holiday schedules, and after-hours behavior",
      "Approved-FAQ answers only — no made-up information",
    ],
  },
  {
    icon: ClipboardCheck,
    title: "Lead capture & qualification",
    points: [
      "Custom qualification questions by industry",
      "Conditional follow-ups and disqualifying answers",
      "Configurable lead scoring — hot, warm, cold",
      "Complete caller details captured on every call",
    ],
  },
  {
    icon: CalendarCheck2,
    title: "Appointment booking",
    points: [
      "Live Google Calendar and Outlook availability",
      "Appointment types with durations and buffers",
      "Booking notice and rescheduling policies",
      "Automatic confirmations by SMS or email",
    ],
  },
  {
    icon: MessageSquareText,
    title: "Missed-call text-back",
    points: [
      "Instant SMS when a call can't be answered",
      "Two-way conversation captured as a lead",
      "Cooldown protection — never spams a caller",
      "STOP and opt-out honored automatically",
    ],
  },
  {
    icon: Database,
    title: "CRM logging",
    points: [
      "GoHighLevel, HubSpot, or any webhook CRM",
      "Contacts, opportunities, notes, tags, and tasks",
      "Automatic retries when a sync fails",
      "Full sync status visible on every lead",
    ],
  },
  {
    icon: BellRing,
    title: "Summaries & notifications",
    points: [
      "Concise SMS summary after each call",
      "Detailed email and dashboard summaries",
      "High-priority lead and appointment alerts",
      "Daily digests and weekly performance recaps",
    ],
  },
  {
    icon: PhoneForwarded,
    title: "Transfers & escalation",
    points: [
      "Urgent-keyword and VIP caller detection",
      "Business-hours transfer rules with backup numbers",
      "Fallback to message capture when transfers fail",
      "Emergency guidance without posing as an emergency service",
    ],
  },
  {
    icon: BarChart3,
    title: "Analytics & usage",
    points: [
      "Calls, leads, bookings, and conversion funnels",
      "Missed-call recovery tracking",
      "Usage minutes with allowance and overage estimates",
      "Filters by date, outcome, campaign, and team member",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Compliance-aware controls",
    points: [
      "Recording on/off per business with disclosure settings",
      "Consent tracking and retention policies",
      "Role-based access and audit logs",
      "Industry disclaimer templates (legal, medical, church)",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight">Features</h1>
        <p className="mt-4 text-lg text-ink-500">
          Everything you need to answer every call, capture every lead, and book more
          appointments — without hiring another front desk.
        </p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {FEATURE_GROUPS.map((group) => (
          <Card key={group.title}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                  <group.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <CardTitle>{group.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-ink-500">
                {group.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="text-brand-600" aria-hidden="true">•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-14 text-center">
        <Link href="/book-a-demo" className={buttonVariants({ variant: "primary", size: "lg" })}>
          Book a Demo
        </Link>
      </div>
    </div>
  );
}
