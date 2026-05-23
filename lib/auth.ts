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

function buildOptions(): BetterAuthOptions {
  return {
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
  };
}

/** Where Better Auth-driven flows (sign-in, sign-up) should land users. */
export const POST_AUTH_REDIRECT = "/dashboard";

type BetterAuthInstance = ReturnType<typeof betterAuth>;

/**
 * Lazy singleton so that module evaluation does NOT immediately read env
 * vars. Next.js's production build collects page data by importing server
 * modules in a worker that does not have access to the deploy-time runtime
 * env. If we eagerly call `betterAuth({ secret: readEnv(...) })` at module
 * top-level, the build itself crashes with MissingAuthEnvError even though
 * the env will exist at request time on Render. Deferring construction to
 * the first property access keeps build-time imports safe while still
 * failing loudly on the first real request when env is genuinely missing.
 */
let cachedAuth: BetterAuthInstance | null = null;
function getAuth(): BetterAuthInstance {
  if (cachedAuth === null) {
    cachedAuth = betterAuth(buildOptions());
  }
  return cachedAuth;
}

export const auth: BetterAuthInstance = new Proxy({} as BetterAuthInstance, {
  get(_target, prop, receiver) {
    const instance = getAuth();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
  has(_target, prop) {
    return Reflect.has(getAuth() as object, prop);
  },
  ownKeys(_target) {
    return Reflect.ownKeys(getAuth() as object);
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(getAuth() as object, prop);
  },
});

export type Auth = BetterAuthInstance;
export type Session = Awaited<ReturnType<BetterAuthInstance["api"]["getSession"]>>;
