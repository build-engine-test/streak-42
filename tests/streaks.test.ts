import { describe, expect, it } from "vitest";
import {
  buildHistoryGrid,
  currentStreak,
  isExpectedDay,
} from "@/lib/streaks";

// All dates constructed as UTC to avoid local-timezone drift in tests.
const utc = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

describe("isExpectedDay", () => {
  it("returns true for any day on daily cadence", () => {
    expect(isExpectedDay(utc("2025-01-11"), "daily")).toBe(true); // Sat
    expect(isExpectedDay(utc("2025-01-12"), "daily")).toBe(true); // Sun
    expect(isExpectedDay(utc("2025-01-13"), "daily")).toBe(true); // Mon
  });

  it("returns false on Sat/Sun for weekdays cadence", () => {
    expect(isExpectedDay(utc("2025-01-11"), "weekdays")).toBe(false); // Sat
    expect(isExpectedDay(utc("2025-01-12"), "weekdays")).toBe(false); // Sun
  });

  it("returns true Mon-Fri for weekdays cadence", () => {
    expect(isExpectedDay(utc("2025-01-13"), "weekdays")).toBe(true); // Mon
    expect(isExpectedDay(utc("2025-01-14"), "weekdays")).toBe(true); // Tue
    expect(isExpectedDay(utc("2025-01-15"), "weekdays")).toBe(true); // Wed
    expect(isExpectedDay(utc("2025-01-16"), "weekdays")).toBe(true); // Thu
    expect(isExpectedDay(utc("2025-01-17"), "weekdays")).toBe(true); // Fri
  });
});

describe("currentStreak - daily cadence", () => {
  it("current_streak_daily_consecutive: 3 consecutive days ending today", () => {
    const today = utc("2025-01-10"); // Friday
    const checkIns = [
      { occurredOn: "2025-01-08" },
      { occurredOn: "2025-01-09" },
      { occurredOn: "2025-01-10" },
    ];
    expect(currentStreak(checkIns, "daily", today)).toBe(3);
  });

  it("returns 0 when today is expected but missing", () => {
    const today = utc("2025-01-10");
    const checkIns = [
      { occurredOn: "2025-01-08" },
      { occurredOn: "2025-01-09" },
    ];
    expect(currentStreak(checkIns, "daily", today)).toBe(0);
  });

  it("returns 1 when only today is checked", () => {
    const today = utc("2025-01-10");
    const checkIns = [{ occurredOn: "2025-01-10" }];
    expect(currentStreak(checkIns, "daily", today)).toBe(1);
  });

  it("breaks streak at first missing day before today", () => {
    const today = utc("2025-01-10");
    const checkIns = [
      { occurredOn: "2025-01-07" },
      // 2025-01-08 missing
      { occurredOn: "2025-01-09" },
      { occurredOn: "2025-01-10" },
    ];
    expect(currentStreak(checkIns, "daily", today)).toBe(2);
  });

  it("returns 0 with empty check-ins", () => {
    const today = utc("2025-01-10");
    expect(currentStreak([], "daily", today)).toBe(0);
  });
});

describe("currentStreak - weekdays cadence", () => {
  it("current_streak_weekdays_skips_weekend: counts Thu/Fri/Mon as 3", () => {
    const today = utc("2025-01-13"); // Monday
    const checkIns = [
      { occurredOn: "2025-01-09" }, // Thu
      { occurredOn: "2025-01-10" }, // Fri
      { occurredOn: "2025-01-13" }, // Mon
    ];
    expect(currentStreak(checkIns, "weekdays", today)).toBe(3);
  });

  it("missing Fri (2025-01-10): streak = 1 (today only)", () => {
    const today = utc("2025-01-13"); // Monday
    const checkIns = [
      { occurredOn: "2025-01-09" }, // Thu
      // Fri missing
      { occurredOn: "2025-01-13" }, // Mon
    ];
    expect(currentStreak(checkIns, "weekdays", today)).toBe(1);
  });

  it("returns 0 when today (a weekday) is unchecked", () => {
    const today = utc("2025-01-13");
    const checkIns = [
      { occurredOn: "2025-01-09" },
      { occurredOn: "2025-01-10" },
    ];
    expect(currentStreak(checkIns, "weekdays", today)).toBe(0);
  });

  it("when today is a Saturday on weekdays cadence, streak counts Fri back", () => {
    const today = utc("2025-01-11"); // Sat (not expected)
    const checkIns = [
      { occurredOn: "2025-01-09" }, // Thu
      { occurredOn: "2025-01-10" }, // Fri
    ];
    expect(currentStreak(checkIns, "weekdays", today)).toBe(2);
  });
});

describe("buildHistoryGrid", () => {
  it("build_history_grid_30_cells: exactly 30 cells, last is today", () => {
    const today = utc("2025-01-13"); // Monday
    const grid = buildHistoryGrid([], "daily", today);
    expect(grid).toHaveLength(30);
    expect(grid[29]?.date).toBe("2025-01-13");
    expect(grid[0]?.date).toBe("2024-12-15");
  });

  it("weekends are 'not-expected' on weekdays cadence", () => {
    const today = utc("2025-01-13"); // Monday
    const grid = buildHistoryGrid([], "weekdays", today);
    const sat = grid.find((c) => c.date === "2025-01-11");
    const sun = grid.find((c) => c.date === "2025-01-12");
    expect(sat?.state).toBe("not-expected");
    expect(sun?.state).toBe("not-expected");
  });

  it("checked cells are 'checked', expected-but-missing are 'unchecked-expected'", () => {
    const today = utc("2025-01-13");
    const checkIns = [
      { occurredOn: "2025-01-10" }, // Fri checked
      { occurredOn: "2025-01-13" }, // Mon today checked
    ];
    const grid = buildHistoryGrid(checkIns, "weekdays", today);
    expect(grid.find((c) => c.date === "2025-01-10")?.state).toBe("checked");
    expect(grid.find((c) => c.date === "2025-01-13")?.state).toBe("checked");
    expect(grid.find((c) => c.date === "2025-01-09")?.state).toBe(
      "unchecked-expected",
    );
  });

  it("respects custom day count", () => {
    const today = utc("2025-01-13");
    const grid = buildHistoryGrid([], "daily", today, 7);
    expect(grid).toHaveLength(7);
    expect(grid[6]?.date).toBe("2025-01-13");
    expect(grid[0]?.date).toBe("2025-01-07");
  });
});
