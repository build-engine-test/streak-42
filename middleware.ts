import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Cheap edge-side gate for the authenticated areas of the app.
 *
 * This only checks for the *presence* of the Better Auth session cookie —
 * it does NOT validate the session against the database. That's intentional:
 * - Middleware runs on every matched request, so it must be cheap.
 * - The page-level `requireUser()` server check is the authoritative gate
 *   and will redirect unauthenticated users on its own.
 *
 * This middleware is purely a defense-in-depth fast path: signed-out users
 * with no cookie get bounced before any Server Component renders.
 */
export function middleware(request: NextRequest): NextResponse {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const signInUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/habits/:path*",
    "/history",
  ],
};
