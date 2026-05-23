import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

import { FeatureBlurbs } from "./_components/feature-blurbs";
import { LandingHero } from "./_components/landing-hero";

/**
 * Public landing page for Streak.
 *
 * Server-rendered. Behavior:
 *   - If the visitor has a valid Better Auth session, redirect them to
 *     /dashboard so the marketing page is never shown to a signed-in user.
 *   - Otherwise render the hero (product name, value prop, single CTA to
 *     /sign-up) and the three feature blurbs.
 *
 * The redirect lives here (not inside LandingHero) so the presentational
 * component stays trivially unit-testable without mocking Better Auth or
 * Next request headers.
 */
export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-sm font-semibold tracking-tight">Streak</span>
        <ThemeToggle />
      </header>

      <LandingHero />
      <FeatureBlurbs />
    </main>
  );
}
