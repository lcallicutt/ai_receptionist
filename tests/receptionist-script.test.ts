import { describe, it, expect } from "vitest";
import { compileReceptionistScript, type ScriptInput } from "@/lib/receptionist-script";

const BASE: ScriptInput = {
  receptionistName: "Grace",
  greeting: "Thank you for calling Carter Legal Group, this is Grace.",
  tone: "professional",
  faqs: [{ question: "Do you offer free consultations?", answer: "Yes, for personal injury." }],
  qualificationPrompts: ["What type of legal matter is this regarding?"],
  businessKnowledge: null,
  restrictedTopics: ["fee negotiations"],
  complianceStatements: ["This call does not create an attorney-client relationship."],
  transferRules: {
    transferNumber: "+19105550100",
    urgentKeywords: ["court date", "deadline"],
    afterHoursBehavior: "take_message",
  },
  emergencyLanguage: "For emergencies, hang up and dial 911.",
};

describe("receptionist script compiler", () => {
  it("includes the exact greeting", () => {
    const sections = compileReceptionistScript(BASE);
    const identity = sections.find((s) => s.heading === "Identity & greeting");
    expect(identity?.body).toContain('"Thank you for calling Carter Legal Group, this is Grace."');
  });

  it("delivers configured compliance statements (e.g. law-office disclaimer)", () => {
    const sections = compileReceptionistScript(BASE);
    const compliance = sections.find((s) => s.heading === "Required compliance statements");
    expect(compliance?.body).toContain("attorney-client relationship");
  });

  it("restricts answers to approved knowledge and never invents", () => {
    const sections = compileReceptionistScript(BASE);
    const knowledge = sections.find((s) => s.heading.startsWith("Approved knowledge"));
    expect(knowledge?.body).toContain("ONLY from this approved list");
    expect(knowledge?.body).toContain("Do you offer free consultations?");
  });

  it("handles the no-FAQ case with message-taking, not invention", () => {
    const sections = compileReceptionistScript({ ...BASE, faqs: [] });
    const knowledge = sections.find((s) => s.heading.startsWith("Approved knowledge"));
    expect(knowledge?.body).toContain("take a message");
  });

  it("includes transfers, emergency language, and restricted topics when configured", () => {
    const sections = compileReceptionistScript(BASE);
    const headings = sections.map((s) => s.heading);
    expect(headings).toContain("Transfers & escalation");
    expect(headings).toContain("Emergency handling");
    expect(headings).toContain("Restricted topics");
    expect(sections.find((s) => s.heading === "Emergency handling")?.body).toContain(
      "Never present yourself as an emergency service",
    );
  });

  it("omits optional sections when not configured", () => {
    const sections = compileReceptionistScript({
      ...BASE,
      transferRules: null,
      emergencyLanguage: null,
      restrictedTopics: [],
      complianceStatements: [],
    });
    const headings = sections.map((s) => s.heading);
    expect(headings).not.toContain("Transfers & escalation");
    expect(headings).not.toContain("Emergency handling");
    expect(headings).not.toContain("Restricted topics");
    expect(headings).not.toContain("Required compliance statements");
  });
});
