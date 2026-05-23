import { BarChart3, Pencil, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeroMesh } from "@/components/ui/hero-mesh";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Scaffold landing page. The Executor pattern-matches against this when
 * building real product pages — it's both a working preview and the
 * canonical reference for the Modern-SaaS design language.
 */
export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-sm font-semibold tracking-tight">
          Build Engine
        </span>
        <ThemeToggle />
      </header>

      <section className="relative isolate overflow-hidden px-6 pb-24 pt-16 sm:pt-24">
        <HeroMesh />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Modern SaaS, generated end-to-end.
          </h1>
          <p className="mt-6 text-pretty text-lg text-muted-foreground sm:text-xl">
            This scaffold ships with the design system every Build Engine app
            inherits: Inter type, shadcn primitives, OKLCH brand palette, and a
            dark mode toggle that already works.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg">Get started</Button>
            <Button size="lg" variant="outline">
              View docs
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <BarChart3 className="size-6 text-primary" />
            <CardTitle className="mt-4">Dashboards out of the box</CardTitle>
            <CardDescription>
              Tabular-nums on every stat card. Soft shadows, comfortable
              padding, ready to render real data.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Pencil className="size-6 text-primary" />
            <CardTitle className="mt-4">Composable primitives</CardTitle>
            <CardDescription>
              Button, Card, Badge, Input, Label, Skeleton — every shadcn token
              wired, every variant typed.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Target className="size-6 text-primary" />
            <CardTitle className="mt-4">WCAG-verified palettes</CardTitle>
            <CardDescription>
              The Director picks colors. The Critic enforces 4.5:1 text and
              3:1 UI contrast before a single line of code ships.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </main>
  );
}
