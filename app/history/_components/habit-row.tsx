"use client";

/**
 * HabitRow — one row on /history.
 *
 * Layout: habit name + cadence label on the left, a 30-cell grid on the
 * right (or stacked under the name on small screens). The cells come
 * pre-computed from `buildHistoryGrid` so this component is purely
 * presentational and trivially unit-testable.
 *
 * Marked "use client" because each cell hosts a Radix Tooltip and the
 * cells are interactive (focusable) buttons.
 */
import * as React from "react";

import type { Cadence, GridCell as GridCellData } from "@/lib/streaks";

import { GridCell } from "./grid-cell";

export type HabitRowHabit = {
  readonly id: string;
  readonly name: string;
  readonly cadence: Cadence;
};

export type HabitRowProps = {
  readonly habit: HabitRowHabit;
  /** Pre-computed cells, oldest first. Length is the grid size (30). */
  readonly cells: ReadonlyArray<GridCellData>;
};

const CADENCE_LABELS: Record<Cadence, string> = {
  daily: "Daily",
  weekdays: "Weekdays",
};

export function HabitRow({
  habit,
  cells,
}: HabitRowProps): React.ReactElement {
  const cadenceLabel = CADENCE_LABELS[habit.cadence];

  return (
    <article className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <header className="min-w-0">
          <h2 className="truncate text-lg font-medium tracking-tight">
            {habit.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{cadenceLabel}</p>
        </header>

        <div
          role="grid"
          aria-label={`${habit.name} — last ${cells.length} days`}
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))`,
          }}
        >
          {cells.map((cell) => (
            <GridCell key={cell.date} date={cell.date} state={cell.state} />
          ))}
        </div>
      </div>
    </article>
  );
}
