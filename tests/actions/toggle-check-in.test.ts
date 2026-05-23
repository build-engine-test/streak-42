/**
 * Tests for the toggleCheckIn server action.
 *
 * The action must:
 *   - Verify habit ownership before doing anything.
 *   - INSERT a check_in for (habitId, today) when none exists.
 *   - DELETE the existing check_in for (habitId, today) when present.
 *   - Refuse cross-user toggles with { ok: false, error: 'not_found' }.
 *   - Never call insert/delete when ownership fails.
 *
 * We mock the db, auth-helpers, and next/cache modules so we can observe
 * which database calls happen without a live Postgres.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

/* ----- db mock ---------------------------------------------------- */
const selectLimitMock = vi.fn();
const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock }));
const selectFromMock = vi.fn(() => ({ where: selectWhereMock }));
const selectMock = vi.fn(() => ({ from: selectFromMock }));

const insertValuesMock = vi.fn();
const insertMock = vi.fn(() => ({ values: insertValuesMock }));

const deleteWhereMock = vi.fn();
const deleteMock = vi.fn(() => ({ where: deleteWhereMock }));

const transactionMock = vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => {
  return cb({
    select: selectMock,
    insert: insertMock,
    delete: deleteMock,
  });
});

vi.mock("../../lib/db", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    delete: deleteMock,
    transaction: transactionMock,
  },
}));

const requireUserMock = vi.fn();
vi.mock("../../lib/auth-helpers", () => ({
  requireUser: () => requireUserMock(),
}));

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => revalidatePathMock(path),
}));

import { checkIns, habits } from "../../lib/db/schema";

function todayUtcString(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

beforeEach(() => {
  selectMock.mockClear();
  selectFromMock.mockClear();
  selectWhereMock.mockClear();
  selectLimitMock.mockReset();
  insertMock.mockClear();
  insertValuesMock.mockReset();
  deleteMock.mockClear();
  deleteWhereMock.mockReset();
  transactionMock.mockClear();
  requireUserMock.mockReset();
  revalidatePathMock.mockClear();
});

describe("toggle_inserts_when_absent", () => {
  it("inserts a check_in for (habitId, today) when none exists", async () => {
    requireUserMock.mockResolvedValue({ id: "user_A" });
    // First select: ownership check returns the habit.
    // Second select: existing check_in returns empty.
    selectLimitMock
      .mockResolvedValueOnce([{ id: 1n }]) // ownership
      .mockResolvedValueOnce([]); // no existing
    insertValuesMock.mockResolvedValue(undefined);

    const { toggleCheckIn } = await import(
      "../../app/_actions/toggle-check-in"
    );

    const result = await toggleCheckIn({ habitId: 1n });

    expect(result).toEqual({ ok: true });
    // Ownership query went against habits table.
    expect(selectMock).toHaveBeenCalled();
    expect(selectFromMock).toHaveBeenCalledWith(habits);

    // Insert called with userId from session and today.
    expect(insertMock).toHaveBeenCalledWith(checkIns);
    expect(insertValuesMock).toHaveBeenCalledTimes(1);
    const insertedArg = insertValuesMock.mock.calls[0]?.[0];
    expect(insertedArg).toMatchObject({
      habitId: 1n,
      userId: "user_A",
      occurredOn: todayUtcString(),
    });

    // No delete on the insert path.
    expect(deleteMock).not.toHaveBeenCalled();
  });
});

describe("toggle_deletes_when_present", () => {
  it("deletes the existing check_in for (habitId, today)", async () => {
    requireUserMock.mockResolvedValue({ id: "user_A" });
    selectLimitMock
      .mockResolvedValueOnce([{ id: 1n }]) // ownership
      .mockResolvedValueOnce([{ id: 42n }]); // existing check_in
    deleteWhereMock.mockResolvedValue(undefined);

    const { toggleCheckIn } = await import(
      "../../app/_actions/toggle-check-in"
    );

    const result = await toggleCheckIn({ habitId: 1n });

    expect(result).toEqual({ ok: true });
    expect(deleteMock).toHaveBeenCalledWith(checkIns);
    expect(deleteWhereMock).toHaveBeenCalledTimes(1);
    // The insert path must not fire.
    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe("toggle_blocks_other_user", () => {
  it("returns { ok: false, error: 'not_found' } and never inserts/deletes", async () => {
    requireUserMock.mockResolvedValue({ id: "user_B" });
    // Ownership check returns nothing — habit is owned by user_A.
    selectLimitMock.mockResolvedValueOnce([]);

    const { toggleCheckIn } = await import(
      "../../app/_actions/toggle-check-in"
    );

    const result = await toggleCheckIn({ habitId: 1n });

    expect(result).toEqual({ ok: false, error: "not_found" });
    expect(insertMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
