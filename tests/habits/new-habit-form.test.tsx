/**
 * Test suite for the New Habit page UI.
 *
 * Renders the server component path: app/habits/new/page.tsx exports a
 * default async component that calls requireUser() then renders the form.
 * For unit purposes we render the NewHabitForm directly since the page
 * wrapping just provides the user-gated layout.
 */
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// The form is a client component but renderToStaticMarkup can still
// serialize the JSX tree (no event handlers fire, but the markup is
// produced for assertion). We mock the server action import so the
// client form module loads in jsdom-free node.
vi.mock("../../app/_actions/create-habit", () => ({
  createHabit: vi.fn(),
}));

import { NewHabitForm } from "../../app/habits/new/_components/new-habit-form";

describe("new_habit_form_renders_required_text", () => {
  it("renders the 'New Habit' header, name input, daily/weekdays radios, and 'Save habit' submit button", () => {
    const html = renderToStaticMarkup(<NewHabitForm />);

    // Header: 'New Habit' must appear in an <h1>.
    expect(html).toMatch(/<h1[^>]*>[^<]*New Habit[^<]*<\/h1>/);

    // Name input: present, required, maxLength 60. shadcn Input renders an
    // <input>. We extract every input tag and assert the name input has the
    // required attribute and a maxLength of 60 — without depending on attr
    // order in the rendered HTML.
    const inputs = Array.from(html.matchAll(/<input\b[^>]*>/g)).map((m) => m[0]);
    const nameInput = inputs.find((tag) => /\bname="name"/.test(tag));
    expect(nameInput).toBeDefined();
    expect(nameInput).toMatch(/\brequired(=|\b)/);
    expect(nameInput).toMatch(/maxLength="?60"?/i);

    // Cadence radios: two radio inputs, values daily and weekdays.
    // Radix RadioGroup renders a hidden <input type="radio" name="cadence">
    // per option for native form participation.
    const radios = inputs.filter((tag) => /type="radio"/.test(tag));
    expect(radios.some((tag) => /value="daily"/.test(tag))).toBe(true);
    expect(radios.some((tag) => /value="weekdays"/.test(tag))).toBe(true);

    // Default cadence is 'daily': that radio is checked initially.
    const dailyRadio = radios.find((tag) => /value="daily"/.test(tag));
    expect(dailyRadio).toBeDefined();
    expect(dailyRadio).toMatch(/\bchecked(=|\b)/);

    // Submit button with text 'Save habit'.
    expect(html).toMatch(
      /<button[^>]*type="submit"[^>]*>[\s\S]*?Save habit[\s\S]*?<\/button>/,
    );
  });
});
