/**
 * Test suite for the dashboard empty state.
 *
 * The EmptyState renders the "no habits yet" affordance: a friendly
 * heading and a primary call-to-action linking to the new-habit page.
 * The CTA copy must be exactly "Add your first habit" and the link
 * must point at /habits/new — both are part of the acceptance
 * contract for this task.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { EmptyState } from "../../app/dashboard/_components/empty-state";

describe("empty_state_shows_cta", () => {
  it("renders an 'Add your first habit' link pointing at /habits/new", () => {
    const html = renderToStaticMarkup(<EmptyState />);

    // The CTA text must appear in an anchor whose href is /habits/new.
    // Allow optional attributes between the href and the closing > of the
    // opening tag (className, etc.) and any whitespace around the text.
    expect(html).toMatch(
      /<a\b[^>]*href="\/habits\/new"[^>]*>[\s\S]*?Add your first habit[\s\S]*?<\/a>/,
    );
  });
});
