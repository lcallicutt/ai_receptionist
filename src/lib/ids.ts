import { randomBytes } from "crypto";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/**
 * Prefixed, URL-safe, collision-resistant IDs (e.g. "org_x7f2…").
 * Prefixes make IDs self-describing in logs without exposing sequence info.
 */
export function newId(prefix: string): string {
  const bytes = randomBytes(16);
  let out = "";
  for (const b of bytes) {
    out += ALPHABET[b % ALPHABET.length];
  }
  return `${prefix}_${out}`;
}
