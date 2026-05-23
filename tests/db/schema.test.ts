import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { habits, checkIns, users, sessions } from "../../lib/db/schema";
import type { Habit, CheckIn, NewHabit, NewCheckIn } from "../../lib/db/schema";

describe("schema_exports_compile", () => {
  it("exports habits with expected columns", () => {
    expect(habits).toBeDefined();
    // Drizzle pg tables expose column metadata under a Symbol; check via $inferSelect runtime proxy.
    const cols = Object.keys(habits as unknown as Record<string, unknown>);
    expect(cols).toEqual(expect.arrayContaining(["id", "userId", "name", "cadence", "createdAt"]));
  });

  it("exports check_ins with expected columns", () => {
    expect(checkIns).toBeDefined();
    const cols = Object.keys(checkIns as unknown as Record<string, unknown>);
    expect(cols).toEqual(expect.arrayContaining(["id", "habitId", "userId", "occurredOn"]));
  });

  it("exports better-auth tables", () => {
    expect(users).toBeDefined();
    expect(sessions).toBeDefined();
  });

  it("type contracts compile and assign", () => {
    // Compile-time check: assigning shapes to inferred types must succeed.
    const habit: Habit = {
      id: 1n as unknown as bigint,
      userId: "u",
      name: "Read",
      cadence: "daily",
      createdAt: new Date(),
    };
    const newHabit: NewHabit = { userId: "u", name: "Read", cadence: "daily" };
    const checkIn: CheckIn = {
      id: 1n as unknown as bigint,
      habitId: 1n as unknown as bigint,
      userId: "u",
      occurredOn: "2026-01-01",
    };
    const newCheckIn: NewCheckIn = { habitId: 1n as unknown as bigint, userId: "u" };
    expect(habit.name).toBe("Read");
    expect(newHabit.cadence).toBe("daily");
    expect(checkIn.userId).toBe("u");
    expect(newCheckIn.userId).toBe("u");
  });
});

describe("migration_contains_constraints", () => {
  const sqlPath = resolve(process.cwd(), "drizzle", "0000_init.sql");
  const sql = readFileSync(sqlPath, "utf8");

  it("contains CHECK constraint", () => {
    expect(sql).toContain("CHECK");
  });

  it("contains cadence CHECK", () => {
    expect(sql).toContain("cadence IN ('daily','weekdays')");
  });

  it("contains UNIQUE constraint", () => {
    expect(sql).toContain("UNIQUE");
  });

  it("references habits with ON DELETE CASCADE", () => {
    // Drizzle qualifies as REFERENCES "public"."habits"; accept either form.
    expect(sql).toMatch(/REFERENCES\s+(?:"public"\.)?"habits"/);
    expect(sql.toUpperCase()).toContain("ON DELETE CASCADE");
  });

  it("creates user_id index on habits", () => {
    expect(sql).toMatch(/CREATE\s+INDEX[^;]*habits[^;]*user_id/i);
  });

  it("creates user_id index on check_ins", () => {
    expect(sql).toMatch(/CREATE\s+INDEX[^;]*check_ins[^;]*user_id/i);
  });
});
