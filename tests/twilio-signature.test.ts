import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { validateTwilioSignature } from "@/lib/twilio-signature";

const AUTH_TOKEN = "test-auth-token";
const URL = "https://example.com/api/webhooks/twilio/voice";

function sign(url: string, params: Record<string, string>): string {
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((k) => k + params[k])
      .join("");
  return createHmac("sha1", AUTH_TOKEN).update(Buffer.from(data, "utf8")).digest("base64");
}

describe("Twilio signature validation", () => {
  const params = { CallSid: "CA123", CallStatus: "no-answer", From: "+15551112222", To: "+15553334444" };

  it("accepts a correctly signed request", () => {
    expect(validateTwilioSignature(AUTH_TOKEN, URL, params, sign(URL, params))).toBe(true);
  });

  it("rejects a tampered parameter", () => {
    const signature = sign(URL, params);
    expect(
      validateTwilioSignature(AUTH_TOKEN, URL, { ...params, To: "+19999999999" }, signature),
    ).toBe(false);
  });

  it("rejects a signature for a different URL", () => {
    const signature = sign("https://attacker.example/hook", params);
    expect(validateTwilioSignature(AUTH_TOKEN, URL, params, signature)).toBe(false);
  });

  it("rejects a signature made with the wrong token", () => {
    const bad = createHmac("sha1", "wrong-token")
      .update(URL + Object.keys(params).sort().map((k) => k + params[k as keyof typeof params]).join(""))
      .digest("base64");
    expect(validateTwilioSignature(AUTH_TOKEN, URL, params, bad)).toBe(false);
  });
});
