import { describe, it, expect } from "vitest";
import { computeLeadScore, classifyScore, type ScoringRule } from "@/lib/lead-scoring";

const RULES: ScoringRule[] = [
  { signal: "urgent_need", points: 25, isActive: true },
  { signal: "in_service_area", points: 15, isActive: true },
  { signal: "outside_service_area", points: -40, isActive: true },
  { signal: "existing_customer", points: 10, isActive: false }, // inactive
];

describe("lead scoring", () => {
  it("sums only active, matched rules on top of the base score", () => {
    expect(computeLeadScore(RULES, ["urgent_need", "in_service_area"], 20)).toBe(60);
  });

  it("ignores inactive rules", () => {
    expect(computeLeadScore(RULES, ["existing_customer"], 0)).toBe(0);
  });

  it("clamps to 0–100", () => {
    expect(computeLeadScore(RULES, ["outside_service_area"], 10)).toBe(0);
    expect(computeLeadScore(RULES, ["urgent_need"], 90)).toBe(100);
  });

  it("ignores signals with no matching rule", () => {
    expect(computeLeadScore(RULES, ["nonexistent_signal"], 5)).toBe(5);
  });
});

describe("classification", () => {
  it("classifies by threshold", () => {
    expect(classifyScore(80)).toBe("hot");
    expect(classifyScore(75)).toBe("hot");
    expect(classifyScore(60)).toBe("warm");
    expect(classifyScore(40)).toBe("warm");
    expect(classifyScore(20)).toBe("cold");
  });

  it("disqualification overrides any score", () => {
    expect(classifyScore(95, true)).toBe("disqualified");
  });
});
