/**
 * /habits/new — server-rendered page that gates on the signed-in user
 * via `requireUser()` (redirects to /sign-in for signed-out visitors)
 * and renders the client `NewHabitForm`.
 *
 * The form itself is a client component because it needs to surface
 * validation errors returned from the server action without a full
 * page reload; the wrapping page stays on the server so the auth
 * check happens before any UI is sent.
 */
import type { Metadata } from "next";

import { requireUser } from "@/lib/auth-helpers";

import { NewHabitForm } from "./_components/new-habit-form";

export const metadata: Metadata = {
  title: "New Habit · Streak",
  description: "Add a new habit you want to track day-by-day.",
};

export default async function NewHabitPage(): Promise<React.ReactElement> {
  await requireUser();
  return <NewHabitForm />;
}
