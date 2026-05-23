"use server";

/**
 * Server action: toggle today's check-in for a habit.
 *
 * Looks up the habit by id, refuses ownership mismatch, and either
 * inserts a row for today or deletes the existing row (so the user can
 * undo a misclick). The 30-day check-in window on /dashboard reflects
 * the change after `revalidatePath`.
 *
 * Contract:
 *   - Input: a FormData containing `habitId` (the bigint as a string)
 *     OR a typed object `{ habitId: bigint }` from server callers.
 *   - On success: revalidates `/dashboard` and returns `{ ok: true }`.
 *   - On any auth/ownership failure: throws — the App Router surfaces
 *     a 500 which is the correct signal for an unauthorized action.
 */
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { checkIns, habits } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";

const inputSchema = z.object({
  habitId: z
    .string()
    .min(1)
    .regex(/^\d+$/, { message: "habitId must be a positive integer" }),
});

/**
 * Resolve `today` as the YYYY-MM-DD UTC string the same way `lib/streaks`
 * does. Keeping this local avoids importing client-safe code from a
 * "use server" file (which would pull in extra runtime overhead).
 */
function todayUtcString(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function toggleCheckIn(formData: FormData): Promise<void> {
  const parsed = inputSchema.safeParse({
    habitId: formData.get("habitId"),
  });
  if (!parsed.success) {
    throw new Error("toggleCheckIn: invalid habitId");
  }

  const user = await requireUser();
  const habitId = BigInt(parsed.data.habitId);

  // Ownership check — never toggle a habit the user doesn't own.
  const owned = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, user.id)))
    .limit(1);

  if (owned.length === 0) {
    throw new Error("toggleCheckIn: habit not found or not owned by user");
  }

  const today = todayUtcString();

  const existing = await db
    .select({ id: checkIns.id })
    .from(checkIns)
    .where(
      and(eq(checkIns.habitId, habitId), eq(checkIns.occurredOn, today)),
    )
    .limit(1);

  if (existing.length > 0) {
    await db.delete(checkIns).where(eq(checkIns.id, existing[0]!.id));
    revalidatePath("/dashboard");
    return;
  }

  await db.insert(checkIns).values({
    habitId,
    userId: user.id,
    occurredOn: today,
  });
  revalidatePath("/dashboard");
}
