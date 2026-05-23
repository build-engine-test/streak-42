import { CheckCircle2, Flame, Plus } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Three-column feature blurb section that sits beneath the landing hero.
 *
 * Each entry is a shadcn Card with a lucide icon, a short title that maps
 * directly to the product loop (add → check → streak), and a one-line
 * description that explains what the user gets. Pure server-rendered;
 * no interactivity needed.
 */

interface Blurb {
  readonly title: string;
  readonly description: string;
  readonly Icon: React.ComponentType<{ className?: string }>;
}

const BLURBS: readonly Blurb[] = [
  {
    title: "Add habits",
    description:
      "Name a habit, pick a cadence (daily or weekdays), and it shows up on your dashboard the same second.",
    Icon: Plus,
  },
  {
    title: "Check them off",
    description:
      "One tap per habit per day. No reminders, no nags — just the satisfaction of marking it done.",
    Icon: CheckCircle2,
  },
  {
    title: "Watch your streak",
    description:
      "A big tabular streak count and a 30-day grid show the work piling up. That's the whole reward.",
    Icon: Flame,
  },
];

export function FeatureBlurbs() {
  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
      {BLURBS.map(({ title, description, Icon }) => (
        <Card key={title}>
          <CardHeader>
            <Icon className="size-6 text-primary" />
            <CardTitle className="mt-4">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </section>
  );
}
