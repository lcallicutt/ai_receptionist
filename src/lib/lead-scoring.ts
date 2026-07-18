/**
 * Configurable lead scoring — pure logic.
 * Rules are tenant-defined (signal → points). A lead's score is the clamped
 * sum of matched signals plus any per-question score impacts already applied.
 */

export interface ScoringRule {
  signal: string;
  points: number;
  isActive: boolean;
}

export type LeadClassification = "hot" | "warm" | "cold" | "disqualified";

export function computeLeadScore(
  rules: ScoringRule[],
  matchedSignals: string[],
  baseScore = 0,
): number {
  const matched = new Set(matchedSignals);
  const total = rules
    .filter((r) => r.isActive && matched.has(r.signal))
    .reduce((sum, r) => sum + r.points, baseScore);
  return Math.max(0, Math.min(100, total));
}

/** Default classification thresholds; disqualification overrides score. */
export function classifyScore(score: number, disqualified = false): LeadClassification {
  if (disqualified) return "disqualified";
  if (score >= 75) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

/** Common scoring signals offered as suggestions in the rule builder. */
export const SUGGESTED_SIGNALS = [
  ["high_value_service", "Requested a high-value service"],
  ["in_service_area", "Is located inside the service area"],
  ["urgent_need", "Has an urgent need"],
  ["meets_budget", "Meets the business's budget criteria"],
  ["ready_to_schedule", "Is ready to schedule"],
  ["complete_contact_info", "Provided complete contact information"],
  ["existing_customer", "Is an existing customer"],
  ["requested_consultation", "Requested a consultation"],
  ["disqualifying_condition", "Has a disqualifying condition"],
  ["outside_service_area", "Is outside the service area"],
  ["unsupported_service", "Seeking a service the business does not provide"],
] as const;
