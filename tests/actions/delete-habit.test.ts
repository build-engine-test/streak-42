/**
 * Tests for the deleteHabit server action.
 *
 * The action must:
 *   - Verify habit ownership before deleting.
 *   - DELETE FROM habits WHERE id=$1 AND user_id=$2 (cascade handles check_ins).
 *   - Refuse cross-user deletes with { ok: false, error: 'not_found' }.
 *   - Never call db.delete when ownership check fails.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

/* ----- db mock ---------------------------------------------------- */
const selectLimitMock = vi.fn();
const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock }));
const selectFromMock = vi.fn(() => ({ where: selectWhereMock }));
const selectMock = vi.fn(() => ({ from: selectFromMock }));

const deleteWhereMock = vi.fn();
const deleteMock = vi.fn(() => ({ where: deleteWhereMock }));

vi.mock("../../lib/db", () => ({
  db: {
    select: selectMock,
    delete: deleteMock,
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

import { habits } from "../../lib/db/schema";

beforeEach(() => {
  selectMock.mockClear();
  selectFromMock.mockClear();
  selectWhereMock.mockClear();
  selectLimitMock.mockReset();
  deleteMock.mockClear();
  deleteWhereMock.mockReset();
  requireUserMock.mockReset();
  revalidatePathMock.mockClear();
});

describe("delete_blocks_other_user", () => {
  it("returns { ok: false, error: 'not_found' } and never calls db.delete when habit is owned by a different user", async () => {
    requireUserMock.mockResolvedValue({ id: "user_B" });
    // Ownership check returns nothing — habit is owned by user_A.
    selectLimitMock.mockResolvedValueOnce([]);

    const { deleteHabit } = await import("../../app/_actions/delete-habit");

    const result = await deleteHabit({ habitId: 1n });

    expect(result).toEqual({ ok: false, error: "not_found" });
    expect(selectFromMock).toHaveBeenCalledWith(habits);
    expect(deleteMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("delete_succeeds_when_owned", () => {
  it("deletes the habit and revalidates /dashboard when ownership matches", async () => {
    requireUserMock.mockResolvedValue({ id: "user_A" });
    selectLimitMock.mockResolvedValueOnce([{ id: 1n }]);
    deleteWhereMock.mockResolvedValue(undefined);

    const { deleteHabit } = await import("../../app/_actions/delete-habit");

    const result = await deleteHabit({ habitId: 1n });

    expect(result).toEqual({ ok: true });
    expect(deleteMock).toHaveBeenCalledWith(habits);
    expect(deleteWhereMock).toHaveBeenCalledTimes(1);
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
  });
});
