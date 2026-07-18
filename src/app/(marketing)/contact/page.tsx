import type { Metadata } from "next";
import { Mail, PhoneCall, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LeadCaptureForm } from "@/components/marketing/lead-capture-form";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Contact us</h1>
          <p className="mt-4 text-lg text-ink-500">
            Questions about plans, implementation, or whether FlowNet fits your business?
            We&apos;d love to talk.
          </p>
          <div className="mt-8 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-brand-700" aria-hidden="true" />
                  <div>
                    <CardTitle>Email</CardTitle>
                    <CardDescription>hello@flownetautomation.com</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <PhoneCall className="h-5 w-5 text-brand-700" aria-hidden="true" />
                  <div>
                    <CardTitle>Phone</CardTitle>
                    <CardDescription>
                      Call our line and talk to our own AI receptionist — it practices what it
                      preaches.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-brand-700" aria-hidden="true" />
                  <div>
                    <CardTitle>Response time</CardTitle>
                    <CardDescription>Within one business day, usually much faster.</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
        <div className="rounded-2xl bg-brand-950 p-6 sm:p-8">
          <h2 className="mb-4 text-xl font-semibold text-white">Send us a message</h2>
          <LeadCaptureForm />
        </div>
      </div>
    </div>
  );
}
