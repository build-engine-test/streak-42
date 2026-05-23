"use server";

/**
 * Server action: create a habit owned by the signed-in user.
 *
 * Contract:
 *   - Input is validated with zod (name length 1..60, cadence enum).
 *   - On validation failure: returns `{ ok: false, error: <message> }`.
 *     No insert is attempted; no redirect happens.
 *   - On success: inserts into `habits` scoped to `requireUser().id`,
 *     revalidates `/dashboard`, then `redirect('/dashboard')` (Next's
 *     redirect throws — the function does not return on this path).
 *
 * This is a `"use server"` module so it is invokable as a Server Action
 * from the client form via the React `action={createHabit}` prop, and it
 * is also callable directly in tests.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { habits, type Cadence } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";

export const CADENCE_VALUES = ["daily", "weekdays"] as const satisfies readonly Cadence[];

const createHabitSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Habit name is required." })
    .max(60, { message: "Habit name must be 60 characters or fewer." }),
  cadence: z.enum(CADENCE_VALUES, {
    message: "Cadence must be either 'daily' or 'weekdays'.",
  }),
});

export type CreateHabitInput = {
  name: string;
  cadence: Cadence;
};

export type CreateHabitResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Create a habit for the signed-in user.
 *
 * Returns `{ ok: false, error }` on validation failure.
 * Throws (via Next's `redirect`) to /dashboard on success — the
 * function does not return in that path.
 */
export async function createHabit(
  input: CreateHabitInput,
): Promise<CreateHabitResult> {
  const parsed = createHabitSchema.safeParse(input);
  if (!parsed.success) {
    // Surface the first issue's message; zod orders by field path so the
    // user sees the most relevant error first.
    const first = parsed.error.issues[0];
    const message = first?.message ?? "Invalid habit input.";
    return { ok: false, error: message };
  }

  const user = await requireUser();

  await db.insert(habits).values({
    userId: user.id,
    name: parsed.data.name,
    cadence: parsed.data.cadence,
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
