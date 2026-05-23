import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Empty state for the dashboard when the signed-in user has no habits.
 *
 * The single visible call-to-action is "Add your first habit", rendered
 * as a Next.js <Link> styled like a shadcn primary button. Surrounding
 * copy keeps the page from looking like an error and gently primes the
 * user for what to do next.
 */
export function EmptyState(): React.ReactElement {
  return (
    <section className="mx-auto max-w-3xl rounded-xl border bg-card p-8 text-center shadow-sm sm:p-12">
      <h2 className="text-xl font-medium tracking-tight">
        No habits yet
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Start building a streak in seconds. Add a habit, check it off each
        day, and watch the number grow.
      </p>
      <div className="mt-8 flex items-center justify-center">
        <Button asChild size="lg">
          <Link href="/habits/new">Add your first habit</Link>
        </Button>
      </div>
    </section>
  );
}
