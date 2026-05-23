/**
 * Pure helpers for habit-streak math. No I/O, no database access — safe to
 * use from server components, server actions, and unit tests alike.
 *
 * All dates are compared as `YYYY-MM-DD` strings in UTC. Callers pass JS
 * `Date` objects for "today"; we extract the UTC year/month/day so the
 * result does not depend on the server's local timezone.
 */

export type Cadence = "daily" | "weekdays";

export type CheckInLike = { readonly occurredOn: string };

export type GridCellState = "checked" | "unchecked-expected" | "not-expected";

export type GridCell = {
  readonly date: string;
  readonly state: GridCellState;
};

const MS_PER_DAY = 86_400_000;

/**
 * Format a Date as a UTC `YYYY-MM-DD` string. Stable regardless of locale or
 * server timezone — the building block for all date comparisons here.
 */
export function toUtcDateString(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("toUtcDateString: received an invalid Date");
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse a `YYYY-MM-DD` string into a UTC Date at midnight. Throws on invalid
 * input rather than silently producing an `Invalid Date` (which would
 * propagate as NaN through downstream arithmetic).
 */
function parseUtcDate(iso: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new TypeError(
      `parseUtcDate: expected YYYY-MM-DD, received "${iso}"`,
    );
  }
  const parsed = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError(`parseUtcDate: "${iso}" is not a valid calendar date`);
  }
  return parsed;
}

/**
 * Return a new UTC Date offset by `days` from the given date. Negative
 * offsets walk backwards; this is the canonical way to step through the
 * history grid.
 */
function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/**
 * Strip a Date down to UTC midnight so subsequent arithmetic is aligned to
 * calendar-day boundaries regardless of the time-of-day passed in.
 */
function toUtcMidnight(date: Date): Date {
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("toUtcMidnight: received an invalid Date");
  }
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    ),
  );
}

/**
 * Whether `date` is a day the user is expected to check in, given the
 * habit's cadence. Saturdays and Sundays are skipped for `weekdays`.
 */
export function isExpectedDay(date: Date, cadence: Cadence): boolean {
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("isExpectedDay: received an invalid Date");
  }
  if (cadence === "daily") {
    return true;
  }
  const dow = date.getUTCDay(); // 0 = Sun, 6 = Sat
  return dow !== 0 && dow !== 6;
}

/**
 * Count consecutive *expected* days, walking backwards from `today`, on
 * which the user checked in. Weekends do not break a `weekdays` streak —
 * they're skipped over. If today is an expected day and is NOT in the
 * check-in set, the streak is 0.
 *
 * Check-ins may be passed in any order; only the `occurredOn` field is
 * consulted, and duplicates are tolerated (a Set is built internally).
 */
export function currentStreak(
  checkIns: readonly CheckInLike[],
  cadence: Cadence,
  today: Date,
): number {
  const presentDays = new Set<string>();
  for (const ci of checkIns) {
    presentDays.add(ci.occurredOn);
  }

  const start = toUtcMidnight(today);
  let cursor = start;
  let streak = 0;

  // A hard upper bound prevents an unexpected infinite loop if a future
  // cadence is introduced where no day is ever expected. Ten years is
  // plenty for any plausible streak.
  const maxDays = 365 * 10;

  for (let i = 0; i < maxDays; i++) {
    if (!isExpectedDay(cursor, cadence)) {
      cursor = addUtcDays(cursor, -1);
      continue;
    }
    const key = toUtcDateString(cursor);
    if (presentDays.has(key)) {
      streak += 1;
      cursor = addUtcDays(cursor, -1);
      continue;
    }
    // Expected day with no check-in → streak ends here.
    return streak;
  }

  return streak;
}

/**
 * Build the 30-day (or `days`-day) history grid, left-to-right oldest to
 * newest. The final cell is always today. Each cell is classified as:
 *
 *   - `checked`              — the user checked in that day
 *   - `unchecked-expected`   — expected day with no check-in
 *   - `not-expected`         — cadence doesn't expect a check-in
 */
export function buildHistoryGrid(
  checkIns: readonly CheckInLike[],
  cadence: Cadence,
  today: Date,
  days = 30,
): GridCell[] {
  if (!Number.isInteger(days) || days <= 0) {
    throw new RangeError(
      `buildHistoryGrid: 'days' must be a positive integer, received ${days}`,
    );
  }

  const presentDays = new Set<string>();
  for (const ci of checkIns) {
    presentDays.add(ci.occurredOn);
  }

  const todayMidnight = toUtcMidnight(today);
  const cells: GridCell[] = [];

  // Walk oldest → newest so the last cell is today. Index 0 is
  // (today - days + 1).
  for (let offset = days - 1; offset >= 0; offset--) {
    const cellDate = addUtcDays(todayMidnight, -offset);
    const iso = toUtcDateString(cellDate);
    let state: GridCellState;
    if (!isExpectedDay(cellDate, cadence)) {
      state = "not-expected";
    } else if (presentDays.has(iso)) {
      state = "checked";
    } else {
      state = "unchecked-expected";
    }
    cells.push({ date: iso, state });
  }

  return cells;
}

// Re-export parseUtcDate for callers that need to convert YYYY-MM-DD into
// a Date for use with these helpers (e.g. in tests or server actions).
export { parseUtcDate };
