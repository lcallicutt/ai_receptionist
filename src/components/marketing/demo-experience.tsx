"use client";

import * as React from "react";
import { DEMO_SCENARIOS, type DemoScenario } from "@/lib/demo-scenarios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function DemoExperience() {
  const [selectedId, setSelectedId] = React.useState<string>(DEMO_SCENARIOS[0]?.id ?? "");
  const scenario = DEMO_SCENARIOS.find((s) => s.id === selectedId) ?? DEMO_SCENARIOS[0];
  if (!scenario) return null;

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      {/* Scenario picker */}
      <nav aria-label="Demo scenarios">
        <ul className="space-y-2">
          {DEMO_SCENARIOS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSelectedId(s.id)}
                aria-pressed={s.id === scenario.id}
                className={cn(
                  "w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                  s.id === scenario.id
                    ? "border-brand-500 bg-brand-50 text-brand-900"
                    : "border-ink-300/30 bg-white text-ink-700 hover:border-brand-300",
                )}
              >
                <span className="block text-xs font-medium uppercase tracking-wide text-ink-300">
                  {s.industry}
                </span>
                <span className="font-medium">{s.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Scenario detail */}
      <div className="space-y-6">
        <ScenarioTranscript scenario={scenario} />
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Qualification captured</CardTitle>
              <CardDescription>Answers extracted during the call</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                {scenario.qualification.map((qa) => (
                  <div key={qa.question}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-ink-300">
                      {qa.question}
                    </dt>
                    <dd className="text-sm text-ink-900">{qa.answer}</dd>
                  </div>
                ))}
              </dl>
              {scenario.leadScore > 0 ? (
                <div className="mt-4 flex items-center gap-2">
                  <Badge variant={statusVariant(scenario.classification)}>
                    {scenario.classification.toUpperCase()} lead
                  </Badge>
                  <span className="text-sm text-ink-500">Score: {scenario.leadScore}/100</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{scenario.booking ? "Appointment booked" : "Call routing"}</CardTitle>
              <CardDescription>
                {scenario.booking
                  ? "Live availability offered, slot confirmed"
                  : "Handled per configured escalation rules"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {scenario.booking ? (
                <>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-300">
                      Slots offered
                    </p>
                    <ul className="mt-1 space-y-1">
                      {scenario.booking.offered.map((slot) => (
                        <li key={slot} className="text-ink-700">
                          {slot}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-300">Booked</p>
                    <p className="font-medium text-ink-900">{scenario.booking.selected}</p>
                  </div>
                  <div className="rounded-lg bg-surface-muted p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-300">
                      Confirmation SMS
                    </p>
                    <p className="mt-1 text-ink-700">{scenario.booking.confirmation}</p>
                  </div>
                </>
              ) : (
                <p className="text-ink-700">
                  No booking for this scenario — the call was resolved or escalated to a human
                  according to the business&apos;s transfer and escalation rules.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Owner&apos;s call summary</CardTitle>
            <CardDescription>Delivered by SMS and email after the call ends</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="rounded-lg bg-surface-muted p-4 text-sm text-ink-700">{scenario.summary}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ScenarioTranscript({ scenario }: { scenario: DemoScenario }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{scenario.businessName}</CardTitle>
            <CardDescription>
              AI receptionist: {scenario.receptionistName}
            </CardDescription>
          </div>
          <Badge variant="warning">Simulated demonstration</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3" aria-label="Call transcript">
          {scenario.transcript.map((turn, i) => (
            <li
              key={i}
              className={cn(
                "max-w-[85%] rounded-lg p-3 text-sm",
                turn.role === "ai"
                  ? "bg-brand-50 text-brand-900"
                  : "ml-auto bg-surface-muted text-ink-700",
              )}
            >
              <span className="block text-xs font-semibold text-ink-300">
                {turn.role === "ai" ? `${scenario.receptionistName} (AI)` : "Caller"}
              </span>
              {turn.text}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
