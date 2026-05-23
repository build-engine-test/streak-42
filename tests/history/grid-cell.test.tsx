/**
 * @vitest-environment jsdom
 *
 * Test suite for GridCell — the atomic square in the 30-day history grid.
 *
 * Asserts class-name driven by the GridCell `state` so callers can rely
 * on Tailwind colors being applied deterministically without having to
 * mount a full tooltip tree.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

import { GridCell } from "../../app/history/_components/grid-cell";

afterEach(() => {
  cleanup();
});

describe("cell_state_drives_classname", () => {
  it("uses bg-primary when state is 'checked'", () => {
    const { container } = render(
      <GridCell date="2026-05-23" state="checked" />,
    );
    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    expect(button!.className).toContain("bg-primary");
  });

  it("uses bg-muted when state is 'unchecked-expected'", () => {
    const { container } = render(
      <GridCell date="2026-05-22" state="unchecked-expected" />,
    );
    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    expect(button!.className).toContain("bg-muted");
  });

  it("uses border-dashed when state is 'not-expected'", () => {
    const { container } = render(
      <GridCell date="2026-05-21" state="not-expected" />,
    );
    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    expect(button!.className).toContain("border-dashed");
  });

  it("exposes an aria-label containing the ISO date and weekday name", () => {
    const { container } = render(
      <GridCell date="2026-05-23" state="checked" />,
    );
    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    const label = button!.getAttribute("aria-label") ?? "";
    expect(label).toContain("2026-05-23");
    // 2026-05-23 is a Saturday (UTC).
    expect(label.toLowerCase()).toContain("sat");
  });
});
