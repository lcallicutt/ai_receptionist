import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "flownet_session";

/**
 * Edge gate: redirects unauthenticated visitors away from portal routes.
 * This is a fast cookie-presence check only — real authorization (token
 * verification, org membership, role checks) happens server-side in
 * src/lib/auth/guards.ts on every page and action.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = pathname.startsWith("/app") || pathname.startsWith("/admin");
  if (!isProtected) return NextResponse.next();

  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*"],
};
