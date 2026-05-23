"use client";

/**
 * NewHabitForm — the client-side form for `/habits/new`.
 *
 * Holds the only piece of local state on this page: the chosen cadence
 * (so the controlled RadioGroup keeps its visual selection across
 * client renders). Form submission goes through the `createHabit`
 * Server Action via a `<form action={...}>` binding wrapped in
 * `startTransition` so we can capture the validation result without
 * a full client-side reload.
 *
 * On success the action calls `redirect('/dashboard')`, which Next
 * translates into navigation — `startTransition` swallows the
 * redirect; the user lands on the dashboard.
 * On validation failure the action returns `{ ok: false, error }` and
 * we surface it inline (no toast).
 */
import * as React from "react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import {
  createHabit,
  type CreateHabitResult,
} from "@/app/_actions/create-habit";
import type { Cadence } from "@/lib/db/schema";

const DEFAULT_CADENCE: Cadence = "daily";

export function NewHabitForm(): React.ReactElement {
  const [cadence, setCadence] = useState<Cadence>(DEFAULT_CADENCE);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData): Promise<void> {
    const name = String(formData.get("name") ?? "");
    const cadenceFromForm = (formData.get("cadence") ?? DEFAULT_CADENCE) as Cadence;
    setError(null);
    const result: CreateHabitResult | void = await createHabit({
      name,
      cadence: cadenceFromForm,
    });
    // If we get a return value back at all, it's a validation failure
    // (the success path throws via redirect()).
    if (result && result.ok === false) {
      setError(result.error);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">New Habit</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Give it a short, specific name. Pick how often you expect to
            check it off.
          </p>
        </header>

        <form
          action={(formData) => startTransition(() => void handleSubmit(formData))}
          className="space-y-6"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="habit-name">Name</Label>
            <Input
              id="habit-name"
              name="name"
              type="text"
              required
              maxLength={60}
              autoComplete="off"
              placeholder="Read for 20 minutes"
              aria-describedby={error ? "habit-form-error" : undefined}
            />
            <p className="text-xs text-muted-foreground">
              Up to 60 characters.
            </p>
          </div>

          <div className="space-y-3">
            <Label>Cadence</Label>
            <RadioGroup
              name="cadence"
              value={cadence}
              onValueChange={(value) => setCadence(value as Cadence)}
              className="grid gap-2"
            >
              <div className="flex items-center gap-3 rounded-md border bg-background p-3">
                <RadioGroupItem value="daily" id="cadence-daily" />
                <Label
                  htmlFor="cadence-daily"
                  className="flex flex-1 cursor-pointer flex-col gap-0.5"
                >
                  <span className="font-medium">Daily</span>
                  <span className="text-xs text-muted-foreground">
                    Every day, including weekends.
                  </span>
                </Label>
              </div>
              <div className="flex items-center gap-3 rounded-md border bg-background p-3">
                <RadioGroupItem value="weekdays" id="cadence-weekdays" />
                <Label
                  htmlFor="cadence-weekdays"
                  className="flex flex-1 cursor-pointer flex-col gap-0.5"
                >
                  <span className="font-medium">Weekdays</span>
                  <span className="text-xs text-muted-foreground">
                    Monday through Friday only.
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {error !== null && error.length > 0 ? (
            <div
              id="habit-form-error"
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-rose-600"
            >
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save habit"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
