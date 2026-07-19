import { createHmac, timingSafeEqual } from "crypto";

/**
 * Twilio webhook signature validation (X-Twilio-Signature):
 * HMAC-SHA1 over the full URL + form params sorted by key, base64-encoded,
 * keyed with the account auth token. Pure and unit-tested.
 */
export function validateTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((key) => key + params[key])
      .join("");
  const expected = createHmac("sha1", authToken).update(Buffer.from(data, "utf8")).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
