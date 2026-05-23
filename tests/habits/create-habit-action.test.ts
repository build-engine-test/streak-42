/**
 * Tests for the createHabit server action.
 *
 * Mocks:
 *  - `next/cache`, `next/navigation` so the action's redirect() and
 *    revalidatePath() calls don't blow up in node test env.
 *  - `lib/auth-helpers` so we control which user the action sees.
 *  - `lib/db` so we can observe inserts without a live database.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const insertValuesMock = vi.fn();
const insertMock = vi.fn(() => ({ values: insertValuesMock }));

vi.mock("../../lib/db", () => ({
  db: {
    insert: insertMock,
  },
}));

const requireUserMock = vi.fn();
vi.mock("../../lib/auth-helpers", () => ({
  requireUser: () => requireUserMock(),
}));

const redirectMock = vi.fn((url: string) => {
  // Match Next's behavior of throwing on redirect.
  const err = new Error(`NEXT_REDIRECT: ${url}`);
  (err as Error & { digest?: string }).digest = `NEXT_REDIRECT;replace;${url};307;`;
  throw err;
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => revalidatePathMock(path),
}));

import { habits } from "../../lib/db/schema";

beforeEach(() => {
  insertMock.mockClear();
  insertValuesMock.mockClear();
  requireUserMock.mockReset();
  redirectMock.mockClear();
  revalidatePathMock.mockClear();
});

describe("create_habit_rejects_empty_name", () => {
  it("returns { ok: false, error: /name/i } and does not call db.insert for empty name", async () => {
    requireUserMock.mockResolvedValue({ id: "user_A" });
    const { createHabit } = await import("../../app/_actions/create-habit");

    const result = await createHabit({ name: "", cadence: "daily" });

    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/name/i),
    });
    expect(insertMock).not.toHaveBeenCalled();
    expect(insertValuesMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("create_habit_inserts_scoped_to_user", () => {
  it("inserts the habit with the authenticated user id and redirects to /dashboard", async () => {
    requireUserMock.mockResolvedValue({ id: "user_A" });
    insertValuesMock.mockResolvedValue(undefined);

    const { createHabit } = await import("../../app/_actions/create-habit");

    let thrown: unknown = null;
    try {
      await createHabit({ name: "Read", cadence: "daily" });
    } catch (err) {
      thrown = err;
    }

    // db.insert called against the habits table with the right values.
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledWith(habits);
    expect(insertValuesMock).toHaveBeenCalledTimes(1);
    expect(insertValuesMock).toHaveBeenCalledWith({
      userId: "user_A",
      name: "Read",
      cadence: "daily",
    });

    // Then a redirect to /dashboard (Next's redirect throws, that's expected).
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
    expect(thrown).not.toBeNull();
  });

  it("rejects invalid cadence values", async () => {
    requireUserMock.mockResolvedValue({ id: "user_A" });
    const { createHabit } = await import("../../app/_actions/create-habit");

    const result = await createHabit({
      name: "Walk",
      // @ts-expect-error - testing runtime validation of an out-of-enum value
      cadence: "monthly",
    });

    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/cadence/i),
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects names longer than 60 characters", async () => {
    requireUserMock.mockResolvedValue({ id: "user_A" });
    const { createHabit } = await import("../../app/_actions/create-habit");

    const result = await createHabit({
      name: "x".repeat(61),
      cadence: "daily",
    });

    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/name/i),
    });
    expect(insertMock).not.toHaveBeenCalled();
  });
});
