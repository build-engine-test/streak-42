import { describe, expect, it, vi, beforeAll } from "vitest";

beforeAll(() => {
  process.env.BETTER_AUTH_SECRET ??= "test-secret-xyz-not-real";
  process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
  process.env.DATABASE_URL ??= "postgres://user:pass@localhost:5432/streak_test";
});

// Mock next/headers since auth-helpers reads headers() at runtime.
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

// Mock lib/auth so we can control what getSession returns without needing
// a live database.
vi.mock("../../lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(async () => null),
    },
  },
}));

describe("require_user_redirects_when_signed_out", () => {
  it("throws Next's redirect error pointing at /sign-in when no session is present", async () => {
    const { requireUser } = await import("../../lib/auth-helpers");
    const { isRedirectError } = await import(
      "next/dist/client/components/redirect-error"
    );

    let captured: unknown = null;
    try {
      await requireUser();
    } catch (err) {
      captured = err;
    }

    expect(captured).not.toBeNull();
    expect(isRedirectError(captured)).toBe(true);
    // Next embeds the destination URL in error.digest.
    const digest = (captured as { digest?: string }).digest ?? "";
    expect(digest).toContain("/sign-in");
  });
});
