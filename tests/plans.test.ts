import { describe, it, expect } from "vitest";
import {
  PLAN_DEFINITIONS,
  planAllows,
  planLimit,
  planLimitReached,
  formatPrice,
} from "@/lib/plans";

describe("plan definitions", () => {
  it("prices match the published pricing", () => {
    expect(PLAN_DEFINITIONS.basic.monthlyPriceCents).toBe(14900);
    expect(PLAN_DEFINITIONS.growth.monthlyPriceCents).toBe(29900);
    expect(PLAN_DEFINITIONS.premium.monthlyPriceCents).toBe(49900);
    expect(formatPrice(14900)).toBe("$149");
  });

  it("higher tiers include all lower-tier features", () => {
    for (const feature of PLAN_DEFINITIONS.basic.features) {
      expect(PLAN_DEFINITIONS.growth.features).toContain(feature);
      expect(PLAN_DEFINITIONS.premium.features).toContain(feature);
    }
    for (const feature of PLAN_DEFINITIONS.growth.features) {
      expect(PLAN_DEFINITIONS.premium.features).toContain(feature);
    }
  });
});

describe("server-side plan enforcement", () => {
  it("a Basic-plan tenant cannot use Growth/Premium features", () => {
    expect(planAllows("basic", "appointment_booking")).toBe(false);
    expect(planAllows("basic", "calendar_integration")).toBe(false);
    expect(planAllows("basic", "detailed_analytics")).toBe(false);
    expect(planAllows("basic", "custom_scripting")).toBe(false);
    // …but can use its own features
    expect(planAllows("basic", "missed_call_text_back")).toBe(true);
    expect(planAllows("basic", "call_summaries")).toBe(true);
  });

  it("growth allows booking but not premium-only features", () => {
    expect(planAllows("growth", "appointment_booking")).toBe(true);
    expect(planAllows("growth", "multiple_call_flows")).toBe(false);
    expect(planAllows("growth", "usage_based_billing")).toBe(false);
  });

  it("enforces numeric limits", () => {
    expect(planLimit("basic", "notification_recipients")).toBe(1);
    expect(planLimit("growth", "notification_recipients")).toBe(3);
    expect(planLimit("premium", "phone_numbers")).toBeNull();

    expect(planLimitReached("basic", "notification_recipients", 1)).toBe(true);
    expect(planLimitReached("basic", "notification_recipients", 0)).toBe(false);
    expect(planLimitReached("growth", "notification_recipients", 2)).toBe(false);
    // unlimited never reaches the cap
    expect(planLimitReached("premium", "phone_numbers", 10_000)).toBe(false);
  });
});
