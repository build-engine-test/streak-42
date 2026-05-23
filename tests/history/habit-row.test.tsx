/**
 * @vitest-environment jsdom
 *
 * Test suite for HabitRow — one row of the /history page.
 *
 * Verifies that HabitRow renders exactly the cells passed in: 30 buttons
 * for a 30-cell grid. Also asserts the habit name and a human-readable
 * cadence label are rendered alongside the grid.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, within } from "@testing-library/react";

import { HabitRow } from "../../app/history/_components/habit-row";
import { buildHistoryGrid } from "../../lib/streaks";

afterEach(() => {
  cleanup();
});

describe("history_row_renders_30_cells", () => {
  it("renders 30 grid cells (buttons) for a 30-day grid", () => {
    // Pin "today" so the test is deterministic; use UTC midnight.
    const today = new Date("2026-05-23T00:00:00.000Z");
    const cells = buildHistoryGrid([], "daily", today, 30);

    expect(cells.length).toBe(30);

    const { container } = render(
      <HabitRow
        habit={{ id: "1", name: "Read", cadence: "daily" }}
        cells={cells}
      />,
    );

    // The row scopes its cells inside a region with role="grid" so we
    // can count them without picking up the navigation/header buttons.
    const grid = container.querySelector("[role='grid']");
    expect(grid).not.toBeNull();
    const cellButtons = within(grid as HTMLElement).getAllByRole("button");
    expect(cellButtons.length).toBe(30);
  });

  it("renders the habit name and a cadence label", () => {
    const today = new Date("2026-05-23T00:00:00.000Z");
    const cells = buildHistoryGrid([], "weekdays", today, 30);

    const { container } = render(
      <HabitRow
        habit={{ id: "42", name: "Stretch", cadence: "weekdays" }}
        cells={cells}
      />,
    );

    expect(container.textContent).toContain("Stretch");
    // Cadence label is "Weekdays" (capitalised) per design.
    expect(container.textContent?.toLowerCase()).toContain("weekdays");
  });
});
