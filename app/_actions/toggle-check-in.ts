"use server";

/**
 * Server action: toggle today's check-in for a habit.
 *
 * Behavior:
 *   - Verifies the habit belongs to the signed-in user (ownership check).
 *     Cross-user (or non-existent) habits return
 *     { ok: false, error: 'not_found' } and do not modify state.
 *   - If a check_in exists for (habitId, today) it is DELETED; otherwise
 *     a new row is INSERTED. The ownership lookup + write happen inside
 *     a single transaction to keep the toggle atomic.
 *   - On success revalidates `/dashboard` and `/history` so the streak
 *     grid and history page reflect the change immediately.
 *
 * Input contract:
 *   Accepts either:
 *     - A `FormData` containing a `habitId` field (when invoked via a
 *       React Server Action <form action={...}> from the client), or
 *     - A typed `{ habitId: bigint | string | number }` object for
 *       direct server-side callers and tests.
 *
 * Return contract:
 *   - `{ ok: true }` on success.
 *   - `{ ok: false, error: string }` on any auth, validation, or
 *     ownership failure. We never throw across the action boundary for
 *     these cases; throws are reserved for genuine server errors so
 *     Next's error boundary can surface them.
 */
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { checkIns, habits } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";

export type ToggleCheckInInput =
  | FormData
  | { habitId: bigint | string | number };

export type ToggleCheckInResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Format a Date as YYYY-MM-DD in UTC. Kept local to avoid pulling
 * client-safe helpers into the "use server" module.
 */
function todayUtcString(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Coerce any of the accepted habitId representations into a bigint.
 * Returns null for invalid values so the caller can surface a typed
 * error rather than throwing.
 */
function coerceHabitId(input: ToggleCheckInInput): bigint | null {
  let raw: unknown;
  if (typeof FormData !== "undefined" && input instanceof FormData) {
    raw = input.get("habitId");
  } else if (input && typeof input === "object" && "habitId" in input) {
    raw = (input as { habitId: unknown }).habitId;
  } else {
    return null;
  }

  if (typeof raw === "bigint") return raw;
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) {
    return BigInt(raw);
  }
  if (typeof raw === "string" && /^\d+$/.test(raw)) {
    try {
      const value = BigInt(raw);
      return value > 0n ? value : null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function toggleCheckIn(
  input: ToggleCheckInInput,
): Promise<ToggleCheckInResult> {
  const habitId = coerceHabitId(input);
  if (habitId === null) {
    return { ok: false, error: "invalid_habit_id" };
  }

  const user = await requireUser();
  const today = todayUtcString();

  try {
    await db.transaction(async (tx) => {
      const owned = await tx
        .select({ id: habits.id })
        .from(habits)
        .where(and(eq(habits.id, habitId), eq(habits.userId, user.id)))
        .limit(1);

      if (owned.length === 0) {
        // Throw a sentinel error so the transaction rolls back and the
        // outer catch can convert it to the typed not_found result.
        throw new NotFoundError();
      }

      const existing = await tx
        .select({ id: checkIns.id })
        .from(checkIns)
        .where(
          and(eq(checkIns.habitId, habitId), eq(checkIns.occurredOn, today)),
        )
        .limit(1);

      if (existing.length > 0) {
        await tx
          .delete(checkIns)
          .where(
            and(eq(checkIns.habitId, habitId), eq(checkIns.occurredOn, today)),
          );
        return;
      }

      await tx.insert(checkIns).values({
        habitId,
        userId: user.id,
        occurredOn: today,
      });
    });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return { ok: false, error: "not_found" };
    }
    throw err;
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");
  return { ok: true };
}

class NotFoundError extends Error {
  constructor() {
    super("habit not found");
    this.name = "NotFoundError";
  }
}

/**
 * `<form action={...}>`-compatible wrapper.
 *
 * React's server-action form binding requires the action to return
 * `void | Promise<void>`. This thin wrapper preserves that contract
 * while still letting direct callers see the structured result via
 * `toggleCheckIn`. Failures are intentionally swallowed here — the
 * dashboard re-renders via `revalidatePath`, so a stale UI surfaces
 * a not_found state on next interaction without an inline error.
 */
export async function toggleCheckInFormAction(
  formData: FormData,
): Promise<void> {
  await toggleCheckIn(formData);
}
