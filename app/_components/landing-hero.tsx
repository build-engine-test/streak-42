import Link from "next/link";

import { Button } from "@/components/ui/button";
import { HeroMesh } from "@/components/ui/hero-mesh";

/**
 * Public landing hero for the Streak app.
 *
 * Renders the product name as an <h1>, a single-line value prop, and one
 * primary CTA — a shadcn Button rendered as a Next <Link> pointing at
 * Better Auth's /sign-up route. The mesh-gradient background is the
 * scaffold's brand-palette-driven HeroMesh component, so dark mode and
 * brand swap remain wired through CSS variables.
 *
 * Kept as a pure presentational Server Component — no client state, no
 * effects. The redirect-when-signed-in concern lives in app/page.tsx so
 * this component stays trivially renderable in unit tests.
 */
export function LandingHero() {
  return (
    <section className="relative isolate overflow-hidden px-6 pb-24 pt-16 sm:pt-24">
      <HeroMesh />
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-7xl">
          Streak
        </h1>
        <p className="mt-6 text-pretty text-lg text-muted-foreground sm:text-xl">
          Build daily habits. Watch your streak grow.
        </p>
        <div className="mt-10 flex items-center justify-center">
          <Button asChild size="lg">
            <Link href="/sign-up">Get started</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
