"use client";

/**
 * HabitCard — single tile on the /dashboard grid.
 *
 * Renders:
 *   - The habit name as the card title
 *   - A small cadence badge ("daily" / "weekdays")
 *   - "current streak" label + the streak number in big tabular-nums
 *   - A "Check today" button (form posts to the `toggleCheckIn` action)
 *   - A trash icon button that opens a shadcn AlertDialog confirm,
 *     whose action button posts to the `deleteHabit` action.
 *
 * Marked "use client" so the AlertDialog (which relies on Radix
 * portal + open state) can manage its own visibility. The forms still
 * submit to Server Actions — no client fetch logic — keeping the
 * data-flow direction unambiguous.
 */
import * as React from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { toggleCheckInFormAction } from "@/app/_actions/toggle-check-in";
import { deleteHabitFormAction } from "@/app/_actions/delete-habit";

export type HabitCardHabit = {
  /**
   * `id` is intentionally a `string` here because Drizzle's bigint mode
   * yields native bigint at the DB layer; we stringify before crossing
   * the server/client boundary so the value is safely serializable.
   */
  readonly id: string;
  readonly name: string;
  readonly cadence: "daily" | "weekdays";
};

export interface HabitCardProps {
  readonly habit: HabitCardHabit;
  readonly currentStreak: number;
  readonly checkedToday: boolean;
}

export function HabitCard({
  habit,
  currentStreak,
  checkedToday,
}: HabitCardProps): React.ReactElement {
  return (
    <article className="group flex flex-col rounded-xl border bg-card p-6 shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-medium tracking-tight">
            {habit.name}
          </h3>
          <Badge
            variant="secondary"
            className="mt-2 capitalize text-muted-foreground"
          >
            {habit.cadence}
          </Badge>
        </div>

        <DeleteHabitButton habitId={habit.id} habitName={habit.name} />
      </header>

      <div className="mt-6 flex items-end gap-3">
        <span
          aria-label="current streak"
          className="text-sm font-medium text-muted-foreground"
        >
          current streak
        </span>
      </div>
      <div className="mt-1">
        <span
          className="font-mono text-4xl font-semibold tabular-nums text-primary"
          aria-live="polite"
        >
          {currentStreak}
        </span>
      </div>

      <form action={toggleCheckInFormAction} className="mt-6">
        <input type="hidden" name="habitId" value={habit.id} />
        <Button
          type="submit"
          className="w-full"
          variant={checkedToday ? "outline" : "default"}
        >
          {checkedToday ? "Checked today" : "Check today"}
        </Button>
      </form>
    </article>
  );
}

function DeleteHabitButton({
  habitId,
  habitName,
}: {
  readonly habitId: string;
  readonly habitName: string;
}): React.ReactElement {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="delete habit"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this habit?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove{" "}
            <span className="font-medium text-foreground">{habitName}</span>{" "}
            and every check-in attached to it. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form action={deleteHabitFormAction}>
            <input type="hidden" name="habitId" value={habitId} />
            <AlertDialogAction type="submit">
              Delete habit
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
