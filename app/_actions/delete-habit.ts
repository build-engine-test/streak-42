"use server";

/**
 * Server action: delete a habit owned by the signed-in user.
 *
 * Behavior:
 *   - Requires an authenticated session via `requireUser()`.
 *   - Verifies the habit belongs to the user via SELECT before deleting.
 *   - DELETEs the habit; Postgres cascades the associated check_ins via
 *     `check_ins.habit_id ON DELETE CASCADE`.
 *   - revalidates `/dashboard` so the deleted card disappears.
 *
 * Input contract: accepts a `FormData` (when invoked from a server-action
 * <form action>) or a typed `{ habitId }` object (direct server callers).
 *
 * Return contract:
 *   - `{ ok: true }` on success.
 *   - `{ ok: false, error: 'not_found' }` when ownership check fails.
 *   - `{ ok: false, error: 'invalid_habit_id' }` when input is malformed.
 */
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { habits } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";

export type DeleteHabitInput =
  | FormData
  | { habitId: bigint | string | number };

export type DeleteHabitResult =
  | { ok: true }
  | { ok: false; error: string };

function coerceHabitId(input: DeleteHabitInput): bigint | null {
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

export async function deleteHabit(
  input: DeleteHabitInput,
): Promise<DeleteHabitResult> {
  const habitId = coerceHabitId(input);
  if (habitId === null) {
    return { ok: false, error: "invalid_habit_id" };
  }

  const user = await requireUser();

  // Ownership check first — never call delete on a habit the user
  // doesn't own. This mirrors the toggleCheckIn pattern and keeps the
  // error surface symmetric between the two actions.
  const owned = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, user.id)))
    .limit(1);

  if (owned.length === 0) {
    return { ok: false, error: "not_found" };
  }

  await db
    .delete(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, user.id)));

  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * `<form action={...}>`-compatible wrapper.
 *
 * React's form action binding requires `void | Promise<void>`. Direct
 * callers get the structured `DeleteHabitResult` via `deleteHabit`;
 * UI callers use this wrapper. Failures intentionally do not throw —
 * the dashboard re-renders via `revalidatePath` and a missing habit
 * is naturally absent from the next render.
 */
export async function deleteHabitFormAction(
  formData: FormData,
): Promise<void> {
  await deleteHabit(formData);
}
