/**
 * @vitest-environment jsdom
 *
 * Test suite for the /history page shell.
 *
 * Confirms that rendering the page with zero habits still shows the
 * "History" header — the surrounding chrome must not depend on having
 * data.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../../lib/auth-helpers", () => ({
  requireUser: vi.fn(async () => ({
    id: "user-1",
    email: "test@example.com",
    name: "Test",
    image: null,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  SIGN_IN_PATH: "/sign-in",
}));

vi.mock("../../lib/db/queries", () => ({
  getDashboardData: vi.fn(async () => ({
    habits: [],
    checkIns: [],
  })),
}));

import HistoryPage from "../../app/history/page";

afterEach(() => {
  vi.clearAllMocks();
});

describe("history_header_visible", () => {
  it("renders the 'History' header even with zero habits", async () => {
    const element = await HistoryPage();
    const html = renderToStaticMarkup(element);
    expect(html).toContain("History");
    // Empty-habits affordance: a short message and a link to /habits/new.
    expect(html).toContain("No habits yet");
    expect(html).toMatch(/href="\/habits\/new"/);
  });
});
