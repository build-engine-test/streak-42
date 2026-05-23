/**
 * Browser-facing Better Auth client.
 *
 * Use this in client components (`"use client"`) for sign-in, sign-up,
 * sign-out, and session lookup hooks. Server code must keep importing
 * lib/auth.ts directly — never bundle the server-only `auth` object into
 * a client component.
 *
 * `baseURL` is read from NEXT_PUBLIC_BETTER_AUTH_URL when present (useful
 * for previews); otherwise it falls back to BETTER_AUTH_URL which Next
 * exposes on the server. Either way, the value is sourced from env, never
 * literal.
 */
import { createAuthClient } from "better-auth/react";

function resolveBaseURL(): string | undefined {
  if (typeof window === "undefined") {
    return (
      process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? process.env.BETTER_AUTH_URL
    );
  }
  // In the browser, only NEXT_PUBLIC_* env vars are inlined; if it's not
  // set the client uses same-origin which is what we want for production.
  return process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
}

export const authClient = createAuthClient({
  baseURL: resolveBaseURL(),
});

export type AuthClient = typeof authClient;
