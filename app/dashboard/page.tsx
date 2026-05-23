/**
 * /dashboard — auth-gated overview of the signed-in user's habits.
 *
 * Server Component. Calls `requireUser()` first (redirects signed-out
 * visitors to /sign-in), then loads habits + the 30-day check-in
 * window in one helper, then computes each habit's `currentStreak` via
 * the pure helpers in `lib/streaks`. The page renders either an empty
 * state (no habits yet) or a responsive card grid (`HabitCard` per
 * habit).
 */
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth-helpers";
import { getDashboardData } from "@/lib/db/queries";
import { currentStreak, toUtcDateString } from "@/lib/streaks";

import { EmptyState } from "./_components/empty-state";
import { HabitCard, type HabitCardHabit } from "./_components/habit-card";

export const dynamic = "force-dynamic";

export default async function DashboardPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  const today = new Date();
  const data = await getDashboardData(user.id, { today });

  // Bucket check-ins by habit id once, so per-card streak math is O(n)
  // across the whole render instead of O(n*m) for the join.
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

  const todayIso = toUtcDateString(today);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Welcome back
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Your habits
          </h1>
        </div>
        {data.habits.length > 0 ? (
          <Button asChild>
            <Link href="/habits/new">Add habit</Link>
          </Button>
        ) : null}
      </header>

      {data.habits.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.habits.map((habit) => {
            const idString = habit.id.toString();
            const habitCheckIns = checkInsByHabit.get(idString) ?? [];
            const streak = currentStreak(habitCheckIns, habit.cadence, today);
            const checkedToday = habitCheckIns.some(
              (ci) => ci.occurredOn === todayIso,
            );
            const cardHabit: HabitCardHabit = {
              id: idString,
              name: habit.name,
              cadence: habit.cadence,
            };
            return (
              <HabitCard
                key={idString}
                habit={cardHabit}
                currentStreak={streak}
                checkedToday={checkedToday}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
