import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware, config } from "../middleware";

describe("middleware_matcher_covers_protected_routes", () => {
  it("matcher includes the dashboard, habits, and history protected routes", () => {
    expect(config).toBeDefined();
    expect(Array.isArray(config.matcher)).toBe(true);
    const matcher = config.matcher as readonly string[];
    expect(matcher).toContain("/dashboard");
    expect(matcher).toContain("/dashboard/:path*");
    expect(matcher).toContain("/habits/:path*");
    expect(matcher).toContain("/history");
  });
});

describe("middleware_redirects_when_cookie_missing", () => {
  it("returns a 307 redirect to /sign-in when no auth cookie is present", async () => {
    const req = new NextRequest("http://localhost:3000/dashboard");
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).not.toBeNull();
    expect(new URL(location as string).pathname).toBe("/sign-in");
  });
});
