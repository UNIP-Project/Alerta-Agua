import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteOccurrence } from "./occurrences";

const mock = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { getUser: mock.getUser }, from: mock.from },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mock.getUser.mockResolvedValue({ data: { user: { id: "author-1" } }, error: null });
  mock.from.mockReturnValue({ delete: mock.delete });
  mock.delete.mockReturnValue({ eq: mock.eq });
  mock.eq.mockReturnValue({ eq: mock.eq, select: mock.select });
  mock.select.mockResolvedValue({ data: [{ id: "occ-1" }], error: null });
});

describe("deleteOccurrence", () => {
  it("deletes only the authenticated author's occurrence", async () => {
    await deleteOccurrence("occ-1");

    expect(mock.from).toHaveBeenCalledWith("occurrences");
    expect(mock.eq).toHaveBeenNthCalledWith(1, "id", "occ-1");
    expect(mock.eq).toHaveBeenNthCalledWith(2, "user_id", "author-1");
    expect(mock.select).toHaveBeenCalledWith("id");
  });

  it("does not start deletion without an authenticated user", async () => {
    mock.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    await expect(deleteOccurrence("occ-1")).rejects.toThrow("Você precisa estar logado");
    expect(mock.delete).not.toHaveBeenCalled();
  });

  it("reports when no owned occurrence was deleted", async () => {
    mock.select.mockResolvedValueOnce({ data: [], error: null });

    await expect(deleteOccurrence("occ-1")).rejects.toThrow("não tem permissão");
  });
});
