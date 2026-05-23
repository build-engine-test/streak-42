import { describe, expect, it, beforeAll } from "vitest";

beforeAll(() => {
  // Provide deterministic env values so importing lib/auth does not throw.
  process.env.BETTER_AUTH_SECRET ??= "test-secret-xyz-not-real";
  process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
  process.env.DATABASE_URL ??= "postgres://user:pass@localhost:5432/streak_test";
});

describe("auth_handler_route_exists", () => {
  it("exports GET and POST functions matching Better Auth's Next handler shape", async () => {
    const mod = await import("../../app/api/auth/[...all]/route");

    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.POST).toBe("function");
  });
});
