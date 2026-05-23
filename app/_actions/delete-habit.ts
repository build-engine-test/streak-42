"use server";

/**
 * Server action: delete a habit owned by the signed-in user.
 *
 * Postgres cascades the check_ins rows because `check_ins.habit_id`
 * has `ON DELETE CASCADE`. We still enforce ownership at the
 * application layer (`userId` match) — there is no RLS on the DB.
 */
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { habits } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";

const inputSchema = z.object({
  habitId: z
    .string()
    .min(1)
    .regex(/^\d+$/, { message: "habitId must be a positive integer" }),
});

export async function deleteHabit(formData: FormData): Promise<void> {
  const parsed = inputSchema.safeParse({
    habitId: formData.get("habitId"),
  });
  if (!parsed.success) {
    throw new Error("deleteHabit: invalid habitId");
  }

  const user = await requireUser();
  const habitId = BigInt(parsed.data.habitId);

  const result = await db
    .delete(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, user.id)))
    .returning({ id: habits.id });

  if (result.length === 0) {
    throw new Error("deleteHabit: habit not found or not owned by user");
  }

  revalidatePath("/dashboard");
}
