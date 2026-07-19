import { NextResponse, type NextRequest } from "next/server";
import { getOrgContext } from "@/lib/auth/guards";
import { createSessionToken } from "@/lib/auth/session";

/**
 * Begins the Google Calendar OAuth flow for the authenticated tenant.
 * State is a short-lived signed token binding the flow to user + org.
 */
export async function GET(request: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.redirect(new URL("/login", request.url));

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ??
    new URL("/api/integrations/google/callback", request.url).toString();
  if (!clientId) {
    return NextResponse.redirect(new URL("/app/calendars?error=google_not_configured", request.url));
  }

  const state = await createSessionToken({
    userId: ctx.user.id,
    purpose: "google_oauth",
    organizationId: ctx.organization.id,
  });

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);
  return NextResponse.redirect(authUrl);
}
