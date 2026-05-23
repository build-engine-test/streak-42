/**
 * /history — auth-gated 30-day check-in history view.
 *
 * Server Component. Calls `requireUser()` first (redirects signed-out
 * visitors to /sign-in), then loads habits + the 30-day check-in
 * window in a single `getDashboardData` call. For each habit we run
 * `buildHistoryGrid` (pure helper) to derive the per-cell state and
 * pass it to <HabitRow>. The empty-habits affordance is a short copy
 * block linking to /habits/new.
 */
import Link from "next/link";

import { requireUser } from "@/lib/auth-helpers";
import { getDashboardData } from "@/lib/db/queries";
import { buildHistoryGrid } from "@/lib/streaks";

import { HabitRow, type HabitRowHabit } from "./_components/habit-row";

export const dynamic = "force-dynamic";

const HISTORY_WINDOW_DAYS = 30;

export default async function HistoryPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  const today = new Date();
  const data = await getDashboardData(user.id, {
    today,
    windowDays: HISTORY_WINDOW_DAYS,
  });

  // Bucket check-ins by habit id once; per-row grid construction stays
  // O(window) instead of re-scanning the full list for each habit.
  const checkInsByHabit = new Map<string, { occurredOn: string }[]>();
  for (const ci of data.checkIns) {
    const key = ci.habitId.toString();
    const bucket = checkInsByHabit.get(key);
    if (bucket === undefined) {
      checkInsByHabit.set(key, [{ occurredOn: ci.occurredOn }]);
    } else {
      bucket.push({ occurredOn: ci.occurredOn });
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-10">
        <p className="text-sm font-medium text-muted-foreground">
          Last {HISTORY_WINDOW_DAYS} days
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">History</h1>
      </header>

      {data.habits.length === 0 ? (
        <section className="mx-auto max-w-3xl rounded-xl border bg-card p-8 text-center shadow-sm">
          <h2 className="text-xl font-medium tracking-tight">No habits yet</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Once you add a habit, this page will show your last{" "}
            {HISTORY_WINDOW_DAYS} days at a glance.{" "}
            <Link
              href="/habits/new"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Add your first habit
            </Link>
            .
          </p>
        </section>
      ) : (
        <div className="flex flex-col gap-4">
          {data.habits.map((habit) => {
            const idString = habit.id.toString();
            const habitCheckIns = checkInsByHabit.get(idString) ?? [];
            const cells = buildHistoryGrid(
              habitCheckIns,
              habit.cadence,
              today,
              HISTORY_WINDOW_DAYS,
            );
            const rowHabit: HabitRowHabit = {
              id: idString,
              name: habit.name,
              cadence: habit.cadence,
            };
            return <HabitRow key={idString} habit={rowHabit} cells={cells} />;
          })}
        </div>
      )}
    </main>
  );
}
