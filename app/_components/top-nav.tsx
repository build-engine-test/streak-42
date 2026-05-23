/**
 * Top navigation bar.
 *
 * Server Component. Reads the current session via `getCurrentUser()`. When
 * the visitor is signed out we render an empty fragment (zero markup) so
 * the public landing hero owns the viewport. When signed in, we render a
 * minimal three-link nav: Dashboard, History, and a Sign out form post.
 *
 * The Sign out link is a real <form> targeting `/sign-out` so the user
 * gets a proper POST round-trip (Better Auth invalidates the session on
 * the server, the route handler clears cookies and redirects home).
 */
import Link from "next/link";

import { getCurrentUser } from "../../lib/auth-helpers";

export async function TopNav() {
  const user = await getCurrentUser();
  if (!user) {
    return <></>;
  }

  return (
    <header className="border-b bg-card/60 backdrop-blur">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"
      >
        <Link
          href="/dashboard"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          Streak
        </Link>
        <ul className="flex items-center gap-6 text-sm font-medium">
          <li>
            <Link
              href="/dashboard"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              href="/history"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              History
            </Link>
          </li>
          <li>
            <form action="/sign-out" method="post">
              <button
                type="submit"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </li>
        </ul>
      </nav>
    </header>
  );
}
