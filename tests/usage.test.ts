import { describe, it, expect } from "vitest";
import { estimateOverageCents, OVERAGE_RATES_CENTS, planLimit } from "@/lib/plans";

describe("usage overage estimation", () => {
  it("charges nothing within the allowance", () => {
    const allowance = planLimit("basic", "included_voice_minutes")!;
    expect(estimateOverageCents("basic", "voice_minutes", allowance)).toBe(0);
    expect(estimateOverageCents("basic", "voice_minutes", allowance - 10)).toBe(0);
  });

  it("charges the configured per-unit rate beyond the allowance", () => {
    const allowance = planLimit("basic", "included_voice_minutes")!;
    const rate = OVERAGE_RATES_CENTS.voice_minutes!;
    expect(estimateOverageCents("basic", "voice_minutes", allowance + 40)).toBe(40 * rate);
  });

  it("scales allowances by tier", () => {
    const basic = planLimit("basic", "included_voice_minutes")!;
    const growth = planLimit("growth", "included_voice_minutes")!;
    const premium = planLimit("premium", "included_voice_minutes")!;
    expect(growth).toBeGreaterThan(basic);
    expect(premium).toBeGreaterThan(growth);
    // Same usage: cheaper (or free) on higher tiers
    const usage = basic + 100;
    expect(estimateOverageCents("growth", "voice_minutes", usage)).toBeLessThanOrEqual(
      estimateOverageCents("basic", "voice_minutes", usage),
    );
  });

  it("returns zero for usage types without a metered allowance", () => {
    expect(estimateOverageCents("basic", "crm_sync_operations", 10_000)).toBe(0);
  });
});
