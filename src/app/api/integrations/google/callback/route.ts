import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { verifySessionToken } from "@/lib/auth/session";
import { getOrgContext } from "@/lib/auth/guards";
import { encryptCredentials } from "@/lib/crypto";
import { writeAuditLog } from "@/lib/audit";

/** Completes the Google Calendar OAuth flow and stores encrypted tokens. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/app/calendars?error=${reason}`, request.url));

  if (!code || !state) return fail("oauth_denied");

  const statePayload = await verifySessionToken(state);
  if (!statePayload || statePayload.purpose !== "google_oauth") return fail("invalid_state");

  // The browser session must match the user who started the flow, and that
  // user must still be a member of the org the state was bound to.
  const ctx = await getOrgContext(String(statePayload.organizationId ?? ""));
  if (!ctx || ctx.user.id !== statePayload.userId) return fail("invalid_state");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ??
    new URL("/api/integrations/google/callback", request.url).toString();
  if (!clientId || !clientSecret) return fail("google_not_configured");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return fail("token_exchange_failed");
  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  if (!tokens.refresh_token) return fail("no_refresh_token");

  const encrypted = encryptCredentials({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  });

  const db = await getDb();
  const existing = await db
    .select({ id: schema.calendarConnections.id })
    .from(schema.calendarConnections)
    .where(
      and(
        eq(schema.calendarConnections.organizationId, ctx.organization.id),
        eq(schema.calendarConnections.provider, "google"),
      ),
    )
    .limit(1);
  if (existing[0]) {
    await db
      .update(schema.calendarConnections)
      .set({
        encryptedCredentials: encrypted,
        status: "connected",
        calendarId: "primary",
        lastSyncedAt: new Date(),
      })
      .where(eq(schema.calendarConnections.id, existing[0].id));
  } else {
    await db.insert(schema.calendarConnections).values({
      id: newId("calc"),
      organizationId: ctx.organization.id,
      provider: "google",
      calendarId: "primary",
      encryptedCredentials: encrypted,
      status: "connected",
      lastSyncedAt: new Date(),
    });
  }

  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "calendar.connect",
    detail: { provider: "google" },
  });
  return NextResponse.redirect(new URL("/app/calendars?connected=google", request.url));
}
