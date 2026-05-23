/**
 * Server-side Better Auth instance.
 *
 * Wired with:
 *   - Drizzle adapter pointing at the canonical schema from epic 1
 *     (lib/db/schema.ts). Uses `provider: "pg"` so column casing/quoting
 *     matches the Postgres tables defined in the schema.
 *   - Email + password authentication (the only credential provider for v1).
 *   - Session cookies driven by Better Auth's defaults (HttpOnly, Secure
 *     under HTTPS, SameSite=lax).
 *   - BETTER_AUTH_SECRET / BETTER_AUTH_URL sourced from environment
 *     variables — never literal. We fail loudly at first import if either
 *     is missing so misconfigured deploys do not silently fall back to a
 *     dev secret.
 *
 * The exported `auth` is consumed by:
 *   - app/api/auth/[...all]/route.ts (Next App Router catch-all handler)
 *   - lib/auth-helpers.ts (requireUser server helper)
 *   - any Server Component / Route Handler that needs auth.api.getSession
 */
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db, schema } from "./db";

export class MissingAuthEnvError extends Error {
  constructor(missing: string) {
    super(
      `${missing} is not set. Better Auth requires both BETTER_AUTH_SECRET and BETTER_AUTH_URL at runtime; configure them in the deploy environment (never commit literals).`,
    );
    this.name = "MissingAuthEnvError";
  }
}

function readEnv(name: "BETTER_AUTH_SECRET" | "BETTER_AUTH_URL"): string {
  const value = process.env[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new MissingAuthEnvError(name);
  }
  return value;
}

const options = {
  // Sourced from env; never literal. readEnv throws if missing.
  secret: readEnv("BETTER_AUTH_SECRET"),
  baseURL: readEnv("BETTER_AUTH_URL"),

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),

  emailAndPassword: {
    enabled: true,
    // Phase 1 of the app keeps onboarding friction minimal. Email
    // verification can be enabled later without a schema change.
    requireEmailVerification: false,
    // After sign-up, Better Auth issues a session immediately so the user
    // lands on /dashboard without an extra sign-in step. Client-side
    // navigation (in the sign-in / sign-up forms) is what carries the
    // user to /dashboard; we keep the routing decision out of this file
    // so the redirect target can stay co-located with the UI.
    autoSignIn: true,
  },
} satisfies BetterAuthOptions;

/** Where Better Auth-driven flows (sign-in, sign-up) should land users. */
export const POST_AUTH_REDIRECT = "/dashboard";

export const auth = betterAuth(options);

export type Auth = typeof auth;
export type Session = Awaited<ReturnType<typeof auth.api.getSession>>;
