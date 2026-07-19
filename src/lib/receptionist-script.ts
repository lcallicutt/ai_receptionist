/**
 * Compiles a receptionist configuration into the guarded conversational
 * script used by voice providers and shown on the Script page. Pure and
 * provider-neutral — the Retell adapter consumes this output directly.
 */

export interface ScriptInput {
  receptionistName: string;
  greeting: string;
  tone: string;
  faqs: Array<{ question: string; answer: string }>;
  qualificationPrompts: string[];
  businessKnowledge: string | null;
  restrictedTopics: string[];
  complianceStatements: string[];
  transferRules: {
    transferNumber: string | null;
    urgentKeywords: string[];
    afterHoursBehavior: string | null;
  } | null;
  emergencyLanguage: string | null;
}

export interface ScriptSection {
  heading: string;
  body: string;
}

export function compileReceptionistScript(input: ScriptInput): ScriptSection[] {
  const sections: ScriptSection[] = [
    {
      heading: "Identity & greeting",
      body: `You are ${input.receptionistName}, an AI receptionist speaking in a ${input.tone.replaceAll("_", " ")} tone. Greet every caller with exactly:\n"${input.greeting}"`,
    },
  ];

  if (input.complianceStatements.length > 0) {
    sections.push({
      heading: "Required compliance statements",
      body: input.complianceStatements.map((s) => `• ${s}`).join("\n"),
    });
  }

  sections.push({
    heading: "Approved knowledge (never invent answers)",
    body:
      input.faqs.length > 0
        ? `Answer questions ONLY from this approved list. If the answer isn't here, offer to have a team member follow up.\n\n${input.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")}`
        : "No FAQs configured yet — the receptionist will take a message for any question.",
  });

  if (input.businessKnowledge) {
    sections.push({ heading: "Background knowledge", body: input.businessKnowledge });
  }

  if (input.qualificationPrompts.length > 0) {
    sections.push({
      heading: "Qualification flow",
      body: `When the caller is a potential customer, ask in order:\n${input.qualificationPrompts.map((q, i) => `${i + 1}. ${q}`).join("\n")}`,
    });
  }

  if (input.transferRules?.transferNumber) {
    const lines = [`Transfer qualified or urgent callers to ${input.transferRules.transferNumber}.`];
    if (input.transferRules.urgentKeywords.length > 0) {
      lines.push(`Urgent keywords: ${input.transferRules.urgentKeywords.join(", ")}.`);
    }
    if (input.transferRules.afterHoursBehavior) {
      lines.push(`After hours: ${input.transferRules.afterHoursBehavior.replaceAll("_", " ")}.`);
    }
    sections.push({ heading: "Transfers & escalation", body: lines.join("\n") });
  }

  if (input.emergencyLanguage) {
    sections.push({
      heading: "Emergency handling",
      body: `${input.emergencyLanguage}\nNever present yourself as an emergency service.`,
    });
  }

  if (input.restrictedTopics.length > 0) {
    sections.push({
      heading: "Restricted topics",
      body: `Never discuss: ${input.restrictedTopics.join(", ")}.`,
    });
  }

  sections.push({
    heading: "Wrap-up",
    body: "Confirm captured details, state the next step (booking, follow-up, or transfer), and thank the caller.",
  });

  return sections;
}
