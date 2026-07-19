import { describe, it, expect } from "vitest";
import { encryptCredentials, decryptCredentials } from "@/lib/crypto";

describe("credential encryption", () => {
  it("round-trips credentials", () => {
    const creds = { accessToken: "at-123", refreshToken: "rt-456", expiresAt: 1234567890 };
    const encrypted = encryptCredentials(creds);
    expect(encrypted).not.toContain("at-123");
    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(decryptCredentials(encrypted)).toEqual(creds);
  });

  it("produces distinct ciphertexts per call (random IV)", () => {
    const creds = { token: "same" };
    expect(encryptCredentials(creds)).not.toBe(encryptCredentials(creds));
  });

  it("rejects tampered payloads", () => {
    const encrypted = encryptCredentials({ token: "secret" });
    const parts = encrypted.split(":");
    const data = Buffer.from(parts[3]!, "base64");
    if (data[0] !== undefined) data[0] = data[0] ^ 0xff;
    const tampered = `${parts[0]}:${parts[1]}:${parts[2]}:${data.toString("base64")}`;
    expect(() => decryptCredentials(tampered)).toThrow();
  });
});
