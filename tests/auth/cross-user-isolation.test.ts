/**
 * Integration test: cross-user data isolation.
 *
 * This is the "data-leak gate" from the spec's success criteria. We
 * mock the underlying drizzle `db` with an in-memory store that holds
 * two users' habits and check-ins. Then we exercise the actual
 * production code paths used by:
 *   - the dashboard query helper (`getHabitsForUser`)
 *   - the `toggleCheckIn` server action
 *   - the `deleteHabit` server action
 *
 * For each, we assert that user_B can never read, mutate, or delete
 * data owned by user_A.
 *
 * The in-memory db mock interprets the small subset of the drizzle
 * query builder API that these code paths actually use: `select`,
 * `from`, `where`, `orderBy`, `limit`, `insert`, `values`, `delete`,
 * `transaction`. Filters are reconstructed from the schema columns
 * passed into `eq` / `and` so the mock matches by column semantically,
 * not by SQL string.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  habits as habitsTable,
  checkIns as checkInsTable,
} from "../../lib/db/schema";

/* ------------------------------------------------------------------ */
/* In-memory store                                                     */
/* ------------------------------------------------------------------ */

type HabitRow = {
  id: bigint;
  userId: string;
  name: string;
  cadence: "daily" | "weekdays";
  createdAt: Date;
};

type CheckInRow = {
  id: bigint;
  habitId: bigint;
  userId: string;
  occurredOn: string;
};

type Store = {
  habits: HabitRow[];
  checkIns: CheckInRow[];
  nextCheckInId: bigint;
};

const store: Store = {
  habits: [],
  checkIns: [],
  nextCheckInId: 1n,
};

/* ------------------------------------------------------------------ */
/* Filter representation                                               */
/* ------------------------------------------------------------------ */

type Predicate = (row: Record<string, unknown>) => boolean;

const PREDICATE = Symbol("predicate");
type FilterValue = { [PREDICATE]: Predicate };

function isFilter(v: unknown): v is FilterValue {
  return typeof v === "object" && v !== null && PREDICATE in v;
}

function matches(row: Record<string, unknown>, filter: unknown): boolean {
  if (filter === undefined || filter === null) return true;
  if (isFilter(filter)) return filter[PREDICATE](row);
  return true;
}

/* ------------------------------------------------------------------ */
/* drizzle-orm mock                                                    */
/* ------------------------------------------------------------------ */
// Reconstruct enough of `eq`, `and`, `gte`, `desc` for the production
// code's queries to be evaluable against the in-memory store.

vi.mock("drizzle-orm", () => {
  function columnKey(column: unknown): string {
    // drizzle columns expose `.name` (db column name). We map db column
    // names back to the JS property names the row objects use.
    const name = (column as { name?: string } | null)?.name;
    if (!name) throw new Error("eq: column has no name");
    const dbToJs: Record<string, string> = {
      id: "id",
      user_id: "userId",
      name: "name",
      cadence: "cadence",
      created_at: "createdAt",
      habit_id: "habitId",
      occurred_on: "occurredOn",
    };
    const jsKey = dbToJs[name];
    if (!jsKey) throw new Error(`eq: unmapped column ${name}`);
    return jsKey;
  }

  return {
    eq(column: unknown, value: unknown): FilterValue {
      const key = columnKey(column);
      return {
        [PREDICATE]: (row) => {
          const v = row[key];
          if (typeof v === "bigint" || typeof value === "bigint") {
            return BigInt(v as bigint | number | string) === BigInt(
              value as bigint | number | string,
            );
          }
          return v === value;
        },
      };
    },
    and(...filters: unknown[]): FilterValue {
      return {
        [PREDICATE]: (row) =>
          filters.every((f) => (isFilter(f) ? f[PREDICATE](row) : true)),
      };
    },
    gte(column: unknown, value: unknown): FilterValue {
      const key = columnKey(column);
      return {
        [PREDICATE]: (row) =>
          (row[key] as string | number | Date) >=
          (value as string | number | Date),
      };
    },
    desc(column: unknown) {
      return { __desc: columnKey(column) } as unknown;
    },
    sql: Object.assign(
      (strings: TemplateStringsArray) => ({ __sql: strings.join("") }),
      {
        raw: (s: string) => ({ __sql: s }),
      },
    ),
  };
});

/* ------------------------------------------------------------------ */
/* db mock                                                             */
/* ------------------------------------------------------------------ */

type Selectable = HabitRow | CheckInRow;

function tableRows(table: unknown): Selectable[] {
  if (table === habitsTable) return store.habits as Selectable[];
  if (table === checkInsTable) return store.checkIns as Selectable[];
  throw new Error("db mock: unknown table in select/from");
}

function projectRow<T extends Record<string, unknown>>(
  row: T,
  projection: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!projection) return { ...row };
  const out: Record<string, unknown> = {};
  for (const [alias, column] of Object.entries(projection)) {
    // drizzle column → db name → row key
    const dbName = (column as { name?: string } | null)?.name;
    if (!dbName) {
      out[alias] = row[alias];
      continue;
    }
    const dbToJs: Record<string, string> = {
      id: "id",
      user_id: "userId",
      name: "name",
      cadence: "cadence",
      created_at: "createdAt",
      habit_id: "habitId",
      occurred_on: "occurredOn",
    };
    const jsKey = dbToJs[dbName] ?? alias;
    out[alias] = row[jsKey];
  }
  return out;
}

function buildQuery(projection: Record<string, unknown> | undefined) {
  let currentTable: unknown = null;
  let filter: unknown = undefined;

  const api = {
    from(table: unknown) {
      currentTable = table;
      return api;
    },
    where(f: unknown) {
      filter = f;
      return api;
    },
    orderBy() {
      // The production code orders by createdAt desc / occurredOn desc.
      // Order is not asserted in this test suite, so we ignore it.
      return api;
    },
    limit(n: number) {
      return executeSelect(n);
    },
    then<T>(
      onFulfilled: (rows: Record<string, unknown>[]) => T,
    ): Promise<T> {
      return Promise.resolve(executeSelect()).then(onFulfilled);
    },
  };

  function executeSelect(limit?: number): Promise<Record<string, unknown>[]> {
    const rows = tableRows(currentTable).filter((r) => matches(r, filter));
    const projected = rows.map((r) => projectRow(r, projection));
    return Promise.resolve(
      typeof limit === "number" ? projected.slice(0, limit) : projected,
    );
  }

  return api;
}

function buildInsert(table: unknown) {
  return {
    async values(input: Record<string, unknown>): Promise<void> {
      if (table === checkInsTable) {
        const row: CheckInRow = {
          id: store.nextCheckInId++,
          habitId: BigInt(input.habitId as bigint | number | string),
          userId: input.userId as string,
          occurredOn: input.occurredOn as string,
        };
        store.checkIns.push(row);
        return;
      }
      throw new Error("db mock: insert into unsupported table");
    },
  };
}

function buildDelete(table: unknown) {
  let filter: unknown = undefined;
  const api = {
    where(f: unknown) {
      filter = f;
      return api;
    },
    then<T>(onFulfilled: (n: number) => T): Promise<T> {
      return Promise.resolve(executeDelete()).then(onFulfilled);
    },
  };

  function executeDelete(): number {
    if (table === habitsTable) {
      const before = store.habits.length;
      store.habits = store.habits.filter((r) => !matches(r, filter));
      return before - store.habits.length;
    }
    if (table === checkInsTable) {
      const before = store.checkIns.length;
      store.checkIns = store.checkIns.filter((r) => !matches(r, filter));
      return before - store.checkIns.length;
    }
    throw new Error("db mock: delete from unsupported table");
  }

  return api;
}

type DbMock = {
  select(projection?: Record<string, unknown>): ReturnType<typeof buildQuery>;
  insert(table: unknown): ReturnType<typeof buildInsert>;
  delete(table: unknown): ReturnType<typeof buildDelete>;
  transaction<T>(cb: (tx: DbMock) => Promise<T>): Promise<T>;
};

const dbMock: DbMock = {
  select(projection?: Record<string, unknown>) {
    return buildQuery(projection);
  },
  insert(table: unknown) {
    return buildInsert(table);
  },
  delete(table: unknown) {
    return buildDelete(table);
  },
  async transaction<T>(cb: (tx: DbMock) => Promise<T>): Promise<T> {
    return cb(dbMock);
  },
};

vi.mock("../../lib/db", () => ({ db: dbMock }));

/* ------------------------------------------------------------------ */
/* auth-helpers + next/cache mocks                                     */
/* ------------------------------------------------------------------ */

const session = { id: "user_A" };
vi.mock("../../lib/auth-helpers", () => ({
  requireUser: vi.fn(async () => session),
  getCurrentUser: vi.fn(async () => session),
  SIGN_IN_PATH: "/sign-in",
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

/* ------------------------------------------------------------------ */
/* Seed                                                                */
/* ------------------------------------------------------------------ */

function seed(): { userAHabitId: bigint; userBHabitId: bigint } {
  store.habits = [
    {
      id: 1n,
      userId: "user_A",
      name: "Read",
      cadence: "daily",
      createdAt: new Date("2026-05-20T00:00:00Z"),
    },
    {
      id: 2n,
      userId: "user_B",
      name: "Run",
      cadence: "weekdays",
      createdAt: new Date("2026-05-21T00:00:00Z"),
    },
  ];
  store.checkIns = [
    {
      id: 1n,
      habitId: 1n,
      userId: "user_A",
      occurredOn: "2026-05-22",
    },
    {
      id: 2n,
      habitId: 2n,
      userId: "user_B",
      occurredOn: "2026-05-22",
    },
  ];
  store.nextCheckInId = 3n;
  return { userAHabitId: 1n, userBHabitId: 2n };
}

beforeEach(() => {
  seed();
  session.id = "user_A";
});

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe("user_a_cannot_see_user_b_habits", () => {
  it("getHabitsForUser returns only the requested user's habits", async () => {
    const { getHabitsForUser } = await import("../../lib/db/queries");

    const userAHabits = await getHabitsForUser("user_A");
    expect(userAHabits).toHaveLength(1);
    expect(userAHabits[0]?.userId).toBe("user_A");
    expect(userAHabits[0]?.name).toBe("Read");

    const userBHabits = await getHabitsForUser("user_B");
    expect(userBHabits).toHaveLength(1);
    expect(userBHabits[0]?.userId).toBe("user_B");
    expect(userBHabits[0]?.name).toBe("Run");
  });
});

describe("cross_user_toggle_blocked", () => {
  it("user_B cannot toggle a check-in on user_A's habit", async () => {
    session.id = "user_B";
    const checkInCountBefore = store.checkIns.length;

    const { toggleCheckIn } = await import(
      "../../app/_actions/toggle-check-in"
    );

    const result = await toggleCheckIn({ habitId: 1n });

    expect(result).toEqual({ ok: false, error: "not_found" });
    expect(store.checkIns.length).toBe(checkInCountBefore);
    // user_A's check-in row must still exist untouched.
    const userACheckIn = store.checkIns.find(
      (c) => c.habitId === 1n && c.userId === "user_A",
    );
    expect(userACheckIn).toBeTruthy();
  });
});

describe("cross_user_delete_blocked", () => {
  it("user_B cannot delete user_A's habit row", async () => {
    session.id = "user_B";

    const { deleteHabit } = await import("../../app/_actions/delete-habit");

    const result = await deleteHabit({ habitId: 1n });

    expect(result).toEqual({ ok: false, error: "not_found" });
    const userAHabit = store.habits.find(
      (h) => h.id === 1n && h.userId === "user_A",
    );
    expect(userAHabit).toBeTruthy();
    expect(userAHabit?.name).toBe("Read");
  });
});
