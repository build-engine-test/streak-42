/**
 * @vitest-environment jsdom
 *
 * Test suite for HabitCard.
 *
 * Two assertions:
 *   1. Rendering with concrete props surfaces every label & value the
 *      acceptance criteria spell out (name, cadence, "current streak"
 *      label, streak number, "Check today" button).
 *   2. Clicking the delete icon button opens an AlertDialog — verified
 *      by an element with role="alertdialog" or role="dialog" appearing
 *      in the document after the click.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// The HabitCard hosts a `<form action={toggleCheckIn}>`. We mock the
// server-action import so jsdom can render the form without trying to
// load Next's server runtime.
vi.mock("../../app/_actions/toggle-check-in", () => ({
  toggleCheckIn: vi.fn(),
}));
vi.mock("../../app/_actions/delete-habit", () => ({
  deleteHabit: vi.fn(),
}));

import { HabitCard } from "../../app/dashboard/_components/habit-card";

beforeEach(() => {
  // jsdom carries DOM state between tests; clean up explicitly.
});

afterEach(() => {
  cleanup();
});

describe("habit_card_shows_streak_and_label", () => {
  it("renders the habit name, cadence badge, streak label, streak number, and check-in button", () => {
    render(
      <HabitCard
        habit={{ id: "1", name: "Read", cadence: "daily" }}
        currentStreak={7}
        checkedToday={false}
      />,
    );

    expect(screen.getByText("Read")).toBeTruthy();
    expect(screen.getByText("daily")).toBeTruthy();
    expect(screen.getByText(/current streak/i)).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.getByRole("button", { name: /check today/i })).toBeTruthy();
  });
});

describe("habit_card_delete_opens_confirm", () => {
  it("clicking the delete icon button surfaces a confirmation dialog", () => {
    render(
      <HabitCard
        habit={{ id: "1", name: "Read", cadence: "daily" }}
        currentStreak={0}
        checkedToday={false}
      />,
    );

    const deleteButton = screen.getByRole("button", { name: /delete habit/i });
    fireEvent.click(deleteButton);

    // Radix UI's AlertDialog renders with role="alertdialog". Some test
    // helpers and Radix versions expose it via the generic dialog role;
    // accept either to keep this assertion future-proof.
    const dialog =
      screen.queryByRole("alertdialog") ?? screen.queryByRole("dialog");
    expect(dialog).not.toBeNull();
  });
});
