/**
 * POST /sign-out — convenience wrapper around Better Auth's signOut.
 *
 * The TopNav posts to this endpoint via a regular HTML <form>, so we can
 * invalidate the session server-side (Better Auth clears the cookie via
 * `auth.api.signOut`) and follow up with a redirect to '/'. A GET handler
 * is intentionally NOT exported: sign-out must be a POST so a stray <a>
 * tag, prefetcher, or crawler cannot accidentally terminate a user's
 * session.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(): Promise<never> {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {
    // If sign-out fails (e.g. no active session) we still want to send the
    // user back to '/'. Swallowing here keeps the UX consistent — the user
    // clicked Sign out, they expect to end up logged out either way.
  }
  redirect("/");
}
