import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

/**
 * AES-256-GCM envelope for integration credentials stored at rest
 * (calendar_connections / crm_connections / provider_connections
 * .encrypted_credentials). Key is derived from CREDENTIALS_SECRET
 * (falling back to AUTH_SECRET). Ciphertext format: v1:iv:tag:data (base64).
 */

function getKey(): Buffer {
  const secret = process.env.CREDENTIALS_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CREDENTIALS_SECRET or AUTH_SECRET must be set in production");
    }
    return scryptSync("flownet-dev-only-credentials-key", "flownet-static-salt", 32);
  }
  return scryptSync(secret, "flownet-credentials-v1", 32);
}

export function encryptCredentials(plain: object): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${data.toString("base64")}`;
}

export function decryptCredentials<T = Record<string, unknown>>(payload: string): T {
  const [version, ivB64, tagB64, dataB64] = payload.split(":");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Unrecognized credential envelope");
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plain) as T;
}
