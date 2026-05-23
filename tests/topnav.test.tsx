import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Mock getCurrentUser so we can flip the signed-in state per test.
const { getCurrentUserMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
}));
vi.mock("../lib/auth-helpers", () => ({
  getCurrentUser: getCurrentUserMock,
  requireUser: vi.fn(),
  SIGN_IN_PATH: "/sign-in",
}));

import { TopNav } from "../app/_components/top-nav";

describe("topnav_hidden_when_signed_out", () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset();
  });

  it("renders nothing when getSession returns null", async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);
    const element = await TopNav();
    const html = renderToStaticMarkup(element);
    expect(html).toBe("");
  });

  it("renders Dashboard, History, Sign out when there's a user", async () => {
    getCurrentUserMock.mockResolvedValueOnce({
      id: "user_1",
      email: "a@b.com",
      name: "A",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const element = await TopNav();
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Dashboard");
    expect(html).toContain("History");
    expect(html).toContain("Sign out");
  });
});

describe("globals_css_defines_palette_vars", () => {
  it("contains primary, secondary, accent variables in oklch", () => {
    const css = readFileSync(
      join(process.cwd(), "app", "globals.css"),
      "utf8",
    );
    expect(css).toContain("--primary:");
    expect(css).toContain("--secondary:");
    expect(css).toContain("--accent:");
    expect(css).toContain("oklch(");
  });
});

describe("readme_documents_env_and_streak_rules", () => {
  it("documents env vars and the streak rules", () => {
    const readme = readFileSync(
      join(process.cwd(), "README.md"),
      "utf8",
    );
    expect(readme).toContain("BETTER_AUTH_SECRET");
    expect(readme).toContain("DATABASE_URL");
    expect(readme.toLowerCase()).toMatch(/streak/);
  });
});
