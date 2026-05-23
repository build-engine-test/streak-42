/**
 * Smoke test: cheap import-time check that the core module wiring is
 * intact. If any of these modules fail to evaluate (missing export,
 * typo'd import, dead barrel file, broken type), this test catches it
 * before any feature test runs.
 *
 * The assertions are deliberately narrow — they check the surface we
 * actually depend on elsewhere, not the behavior (covered in dedicated
 * unit tests).
 *
 * `lib/auth-helpers` re-exports `lib/auth`, which reads
 * BETTER_AUTH_SECRET / BETTER_AUTH_URL at module-evaluation time. We
 * set obvious test placeholders before doing the dynamic imports below.
 */
import { describe, it, expect, beforeAll, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

describe("smoke_imports_resolve", () => {
  beforeAll(() => {
    process.env.BETTER_AUTH_SECRET ??= "test-secret-xyz-not-real";
    process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
    process.env.DATABASE_URL ??=
      "postgres://user:pass@localhost:5432/streak_test";
  });

  it("lib/streaks exposes its public surface", async () => {
    const streaks = await import("../lib/streaks");
    expect(typeof streaks.toUtcDateString).toBe("function");
    expect(typeof streaks.isExpectedDay).toBe("function");
    expect(typeof streaks.currentStreak).toBe("function");
    expect(typeof streaks.buildHistoryGrid).toBe("function");
  });

  it("lib/db/schema exposes the canonical tables", async () => {
    const schema = await import("../lib/db/schema");
    expect(schema.habits).toBeDefined();
    expect(schema.checkIns).toBeDefined();
    expect(schema.users).toBeDefined();
    expect(schema.sessions).toBeDefined();
  });

  it("lib/auth-helpers exposes the auth surface", async () => {
    const authHelpers = await import("../lib/auth-helpers");
    expect(typeof authHelpers.requireUser).toBe("function");
    expect(typeof authHelpers.getCurrentUser).toBe("function");
    expect(authHelpers.SIGN_IN_PATH).toBe("/sign-in");
  });
});
