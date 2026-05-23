/**
 * Server-side auth helpers.
 *
 * `requireUser()` is the canonical gate for any auth-protected Server
 * Component, layout, or route handler. It calls Better Auth's
 * `auth.api.getSession` with the current request headers and either
 * returns the resolved user record or short-circuits via Next's
 * `redirect('/sign-in')` (which throws a special tagged error the App
 * Router catches and turns into a 307).
 *
 * Note: `redirect` works by throwing, so this function's return type is
 * the non-null user — callers can use the result without further
 * narrowing.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "./auth";

export type AuthSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;
export type AuthUser = AuthSession["user"];

/** Where signed-out visitors get sent when they hit a gated route. */
export const SIGN_IN_PATH = "/sign-in";

export async function requireUser(): Promise<AuthUser> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session === null || session === undefined) {
    redirect(SIGN_IN_PATH);
  }
  return session.user;
}

/**
 * Like requireUser, but returns null instead of redirecting. Useful for
 * components that need to render different content for signed-in vs
 * signed-out users without forcing a redirect.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}
