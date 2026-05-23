/**
 * Typed Drizzle queries used by Server Components.
 *
 * Centralized here so route handlers can stay small and so we can unit-
 * test the query shape independently of UI concerns. Everything is
 * authorization-scoped — callers must pass `userId` because there is no
 * RLS on the DB (per the locked v1 stack).
 */
import { and, desc, eq, gte } from "drizzle-orm";

import { db } from "@/lib/db";
import { checkIns, habits, type Cadence } from "@/lib/db/schema";

export type DashboardHabit = {
  readonly id: bigint;
  readonly name: string;
  readonly cadence: Cadence;
  readonly createdAt: Date;
};

/**
 * A row returned by `getHabitsForUser`. Includes the owning `userId`
 * so callers (and the cross-user isolation test) can assert that
 * scope was honored. Production callers typically discard `userId`
 * since they already know the value they passed in.
 */
export type UserHabit = {
  readonly id: bigint;
  readonly userId: string;
  readonly name: string;
  readonly cadence: Cadence;
  readonly createdAt: Date;
};

export type DashboardCheckIn = {
  readonly habitId: bigint;
  readonly occurredOn: string;
};

export type DashboardData = {
  readonly habits: ReadonlyArray<DashboardHabit>;
  /**
   * The check-ins covering the last `windowDays` (inclusive of today) for
   * the user's habits, ordered newest first. Empty when the user has no
   * habits.
   */
  readonly checkIns: ReadonlyArray<DashboardCheckIn>;
};

/** UTC `YYYY-MM-DD` for an arbitrary Date. */
function toUtcDateString(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Fetch the dashboard payload for `userId` in a single round trip per
 * table: one query for habits, one for the bounded check-in window.
 *
 * The check-in query is scoped by `userId` (covered by the
 * `check_ins_user_occurred_idx` index) so it remains cheap regardless of
 * how many other users exist in the table.
 */
export async function getDashboardData(
  userId: string,
  options: { windowDays?: number; today?: Date } = {},
): Promise<DashboardData> {
  const windowDays = options.windowDays ?? 30;
  if (!Number.isInteger(windowDays) || windowDays <= 0) {
    throw new RangeError(
      `getDashboardData: 'windowDays' must be a positive integer, received ${windowDays}`,
    );
  }

  const today = options.today ?? new Date();
  const windowStart = new Date(
    today.getTime() - (windowDays - 1) * 86_400_000,
  );
  const windowStartIso = toUtcDateString(windowStart);

  // Habit list and check-in window run sequentially against the same
  // postgres-js client — postgres-js will pipeline them automatically
  // on a single connection, and we still want the result types separate.
  const userHabits = await db
    .select({
      id: habits.id,
      name: habits.name,
      cadence: habits.cadence,
      createdAt: habits.createdAt,
    })
    .from(habits)
    .where(eq(habits.userId, userId))
    .orderBy(desc(habits.createdAt));

  // When the user has no habits, skip the check-in query — there's
  // nothing to render and we don't want to pay for an empty scan.
  if (userHabits.length === 0) {
    return { habits: userHabits, checkIns: [] };
  }

  const recentCheckIns = await db
    .select({
      habitId: checkIns.habitId,
      occurredOn: checkIns.occurredOn,
    })
    .from(checkIns)
    .where(
      and(
        eq(checkIns.userId, userId),
        gte(checkIns.occurredOn, windowStartIso),
      ),
    )
    .orderBy(desc(checkIns.occurredOn));

  return { habits: userHabits, checkIns: recentCheckIns };
}

/**
 * Return every habit owned by `userId`, newest first.
 *
 * This is the canonical "read habits scoped to a user" helper. The
 * cross-user isolation test in `tests/auth/cross-user-isolation.test.ts`
 * asserts that calling this with one user's id never returns another
 * user's rows — there is no global "list all habits" path in app code.
 *
 * Throws on a blank `userId` so accidental empty-string scoping (which
 * Postgres would happily evaluate to "WHERE user_id = ''") surfaces
 * as a typed error at the boundary instead of a silent leak.
 */
export async function getHabitsForUser(
  userId: string,
): Promise<ReadonlyArray<UserHabit>> {
  if (typeof userId !== "string" || userId.length === 0) {
    throw new TypeError(
      "getHabitsForUser: 'userId' must be a non-empty string",
    );
  }

  const rows = await db
    .select({
      id: habits.id,
      userId: habits.userId,
      name: habits.name,
      cadence: habits.cadence,
      createdAt: habits.createdAt,
    })
    .from(habits)
    .where(eq(habits.userId, userId))
    .orderBy(desc(habits.createdAt));

  return rows;
}
