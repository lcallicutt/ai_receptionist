import Link from "next/link";
import {
  PhoneIncoming,
  Bot,
  MessageSquareText,
  CalendarCheck2,
  BellRing,
  ClipboardCheck,
  Search,
  CheckCircle2,
  Building2,
  Wrench,
  Sparkles,
  Scale,
  Church,
  Scissors,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PricingSection } from "@/components/marketing/pricing-section";
import { LeadCaptureForm } from "@/components/marketing/lead-capture-form";

const WORKFLOW_STEPS = [
  { icon: PhoneIncoming, title: "Caller contacts the business", text: "Every call rings straight into your dedicated business line." },
  { icon: Bot, title: "AI receptionist answers instantly", text: "No hold music, no voicemail — your greeting, every time, 24/7." },
  { icon: Search, title: "AI identifies the caller's need", text: "It listens, answers approved FAQs, and learns why they called." },
  { icon: ClipboardCheck, title: "AI qualifies the lead", text: "Your qualification questions, asked naturally and scored automatically." },
  { icon: CalendarCheck2, title: "AI checks availability", text: "Live calendar lookup finds open slots that fit your rules." },
  { icon: CheckCircle2, title: "AI books the appointment", text: "The appointment lands on your calendar with buffers respected." },
  { icon: MessageSquareText, title: "Confirmation is sent", text: "The caller gets an SMS or email confirmation immediately." },
  { icon: BellRing, title: "Owner receives a call summary", text: "You get the who, why, and what-next — logged in your CRM." },
];

const FEATURES = [
  { title: "24/7 call answering", text: "Nights, weekends, holidays, and the middle of your busiest day." },
  { title: "Lead qualification", text: "Custom questions, scoring rules, and hot-lead alerts you control." },
  { title: "Appointment booking", text: "Real calendar availability, booking notice rules, and confirmations." },
  { title: "Missed-call text-back", text: "When a call can't connect, an instant text keeps the lead alive." },
  { title: "CRM logging", text: "Every call, lead, and appointment synced to GoHighLevel, HubSpot, or your webhook." },
  { title: "Call summaries", text: "Concise SMS recaps and detailed dashboards after every conversation." },
];

const INDUSTRIES = [
  { icon: Building2, name: "Realtors", text: "Showing requests, buyer and seller intake, valuation inquiries." },
  { icon: Wrench, name: "Home Services", text: "HVAC, plumbing, electrical, roofing — with urgent-call escalation." },
  { icon: Sparkles, name: "Med Spas", text: "Consultations and bookings, without giving medical advice." },
  { icon: Scissors, name: "Salons", text: "Appointments, reschedules, and service questions handled politely." },
  { icon: Scale, name: "Law Offices", text: "New-client intake with clear no-legal-advice disclaimers." },
  { icon: Church, name: "Churches", text: "Service times, prayer requests, and respectful pastoral-care routing." },
];

const HOME_FAQS = [
  {
    q: "Will callers know they're talking to an AI?",
    a: "You control the greeting and disclosure. Most clients introduce the receptionist by name and let it disclose that it's a virtual assistant — callers care most about getting helped fast.",
  },
  {
    q: "What happens with urgent or complex calls?",
    a: "You define transfer rules: urgent keywords, VIP callers, and business-hours routing send the call to a human. If a transfer fails, the AI takes a message and alerts you immediately.",
  },
  {
    q: "Does it work with my calendar and CRM?",
    a: "Yes — Google Calendar and Outlook for availability and booking, plus GoHighLevel, HubSpot, or any webhook-based CRM for logging leads and activity.",
  },
  {
    q: "How fast can I go live?",
    a: "Most businesses complete the guided onboarding in under an hour: pick your industry template, review the greeting and FAQs, connect your calendar, and run a test call.",
  },
  {
    q: "What about call recording and compliance?",
    a: "Recording is off by default and configurable per business, with disclosure settings, consent tracking, and retention controls. You should confirm requirements for your state and industry with your own advisor.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-brand-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
              FlowNet AI Receptionist
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">
              Missed Calls Equal Missed Leads
            </h1>
            <p className="mt-5 text-lg text-brand-100 sm:text-xl">
              Your AI receptionist answers customer calls, qualifies leads, checks availability,
              and books appointments—even when your team cannot answer.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/book-a-demo" className={buttonVariants({ variant: "accent", size: "lg" })}>
                Book a Demo
              </Link>
              <Link
                href="/demo"
                className={buttonVariants({ variant: "secondary", size: "lg" })}
              >
                Hear a Sample Call
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="text-center text-3xl font-bold tracking-tight">
          How it works
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-ink-500">
          From first ring to booked appointment — every step handled, logged, and reported.
        </p>
        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {WORKFLOW_STEPS.map((step, i) => (
            <li key={step.title}>
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                      <step.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="text-xs font-semibold text-ink-300">Step {i + 1}</span>
                  </div>
                  <CardTitle className="mt-2">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-ink-500">{step.text}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* Core features */}
      <section className="bg-surface-muted py-20" aria-labelledby="features-heading">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 id="features-heading" className="text-center text-3xl font-bold tracking-tight">
            Everything a great receptionist does — on every call
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title}>
                <CardHeader>
                  <CardTitle>{f.title}</CardTitle>
                  <CardDescription>{f.text}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/features" className={buttonVariants({ variant: "secondary" })}>
              See all features
            </Link>
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="industries-heading">
        <h2 id="industries-heading" className="text-center text-3xl font-bold tracking-tight">
          Built for your industry
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-ink-500">
          Start from a proven template — greeting, FAQs, qualification questions, and escalation
          rules tuned for how your callers actually talk.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((ind) => (
            <Card key={ind.name}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                    <ind.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <CardTitle>{ind.name}</CardTitle>
                </div>
                <CardDescription className="mt-2">{ind.text}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-surface-muted py-20" aria-labelledby="pricing-heading">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 id="pricing-heading" className="text-center text-3xl font-bold tracking-tight">
            Simple plans that pay for themselves
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-ink-500">
            One recovered lead usually covers the month.
          </p>
          <div className="mt-12">
            <PricingSection compact />
          </div>
        </div>
      </section>

      {/* Demo call experience */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="demo-heading">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 id="demo-heading" className="text-3xl font-bold tracking-tight">
              Hear it before you buy it
            </h2>
            <p className="mt-4 text-ink-500">
              Walk through a simulated call for your industry — the greeting, the qualification
              questions, the calendar check, the booking, and the summary that lands in the
              owner&apos;s inbox. All clearly labeled demonstration data.
            </p>
            <Link href="/demo" className={`${buttonVariants({ variant: "primary", size: "lg" })} mt-6`}>
              Try the interactive demo
            </Link>
          </div>
          <Card aria-label="Sample call transcript excerpt">
            <CardContent className="space-y-3 p-6 text-sm">
              <p className="rounded-lg bg-brand-50 p-3 text-brand-900">
                <span className="font-semibold">Ava (AI): </span>
                Thank you for calling Harbor Home Services, this is Ava. How can I help you today?
              </p>
              <p className="rounded-lg bg-surface-muted p-3">
                <span className="font-semibold">Caller: </span>
                My AC stopped working and it&apos;s 95 degrees out. Can someone come today?
              </p>
              <p className="rounded-lg bg-brand-50 p-3 text-brand-900">
                <span className="font-semibold">Ava (AI): </span>
                I&apos;m sorry to hear that — let&apos;s get you taken care of. Can I get your
                address to confirm you&apos;re in our service area?
              </p>
              <p className="text-center text-xs text-ink-300">Simulated demonstration call</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-surface-muted py-20" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 id="faq-heading" className="text-center text-3xl font-bold tracking-tight">
            Frequently asked questions
          </h2>
          <div className="mt-10 space-y-4">
            {HOME_FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-(--radius-card) border border-ink-300/25 bg-white p-5">
                <summary className="cursor-pointer list-none text-base font-semibold text-ink-900">
                  {faq.q}
                </summary>
                <p className="mt-3 text-sm text-ink-500">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Lead capture + final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="cta-heading">
        <div className="grid items-center gap-10 rounded-2xl bg-brand-950 p-8 text-white sm:p-12 lg:grid-cols-2">
          <div>
            <h2 id="cta-heading" className="text-3xl font-bold tracking-tight">
              Stop losing the calls you never hear
            </h2>
            <p className="mt-4 text-brand-100">
              Tell us about your business and we&apos;ll show you exactly what your AI
              receptionist would say — and what it would have saved you last month.
            </p>
            <Link
              href="/book-a-demo"
              className={`${buttonVariants({ variant: "accent", size: "lg" })} mt-6`}
            >
              Book a Demo
            </Link>
          </div>
          <LeadCaptureForm />
        </div>
      </section>
    </>
  );
}
