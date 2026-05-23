"use client";

/**
 * GridCell — a single square in the 30-day history grid.
 *
 * Three visual states are driven from the `state` prop produced by
 * `buildHistoryGrid` in lib/streaks:
 *
 *   - `checked`              → bg-primary (filled accent square)
 *   - `unchecked-expected`   → bg-muted (low-contrast empty square)
 *   - `not-expected`         → bg-transparent with a dashed muted border
 *
 * Each cell is a non-submitting `<button>` so it is keyboard-focusable
 * and exposes an aria-label with the date + weekday for screen readers.
 * Hovering / focusing the cell pops a Tooltip showing the friendly
 * "YYYY-MM-DD · Mon" label. We don't fire any action on click; the
 * grid is read-only history.
 */
import * as React from "react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { GridCellState } from "@/lib/streaks";

export type GridCellProps = {
  /** YYYY-MM-DD in UTC. */
  readonly date: string;
  readonly state: GridCellState;
};

const WEEKDAY_NAMES = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

/**
 * Map a YYYY-MM-DD UTC date string to its short weekday name (Sun..Sat).
 * Pure: no allocations beyond the returned string, no locale dependence.
 */
function weekdayFor(dateIso: string): string {
  // Parsing as UTC keeps the result stable across server timezones.
  const parsed = new Date(`${dateIso}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    // Defensive — buildHistoryGrid always produces valid strings, but if
    // a caller hand-rolls a cell we still want a useful aria-label.
    return "";
  }
  return WEEKDAY_NAMES[parsed.getUTCDay()];
}

/**
 * Tailwind class fragments per cell state. Hoisted to module scope so we
 * don't reallocate the object on every render.
 */
const STATE_CLASSES: Record<GridCellState, string> = {
  checked: "bg-primary border-transparent",
  "unchecked-expected": "bg-muted border-transparent",
  "not-expected": "bg-transparent border-dashed border-muted",
};

export function GridCell({ date, state }: GridCellProps): React.ReactElement {
  const weekday = weekdayFor(date);
  const label = weekday ? `${date} · ${weekday}` : date;
  const ariaLabel = weekday ? `${date} (${weekday})` : date;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            data-state={state}
            className={cn(
              "h-6 w-6 rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              STATE_CLASSES[state],
            )}
          />
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
