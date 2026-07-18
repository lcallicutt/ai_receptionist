import { describe, it, expect } from "vitest";
import { roleAtLeast } from "@/lib/auth/guards";

describe("role hierarchy", () => {
  it("owner outranks manager, member, and read_only", () => {
    expect(roleAtLeast("owner", "manager")).toBe(true);
    expect(roleAtLeast("owner", "member")).toBe(true);
    expect(roleAtLeast("owner", "read_only")).toBe(true);
  });

  it("read_only cannot act as member or above", () => {
    expect(roleAtLeast("read_only", "member")).toBe(false);
    expect(roleAtLeast("read_only", "manager")).toBe(false);
    expect(roleAtLeast("read_only", "owner")).toBe(false);
  });

  it("super_admin outranks everyone", () => {
    expect(roleAtLeast("super_admin", "agency_admin")).toBe(true);
    expect(roleAtLeast("super_admin", "owner")).toBe(true);
  });

  it("same role satisfies itself", () => {
    expect(roleAtLeast("manager", "manager")).toBe(true);
  });
});
