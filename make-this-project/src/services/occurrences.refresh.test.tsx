import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { confirmOccurrence, useOccurrence } from "./occurrences";

const state = vi.hoisted(() => ({
  confirmations: [] as { id: string; occurrence_id: string; kind: string; created_at: string }[],
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) },
    from: (table: string) => ({
      select: async () => ({
        data: table === "occurrences"
          ? [{ id: "occ-1", created_at: new Date().toISOString() }]
          : [...state.confirmations],
        error: null,
      }),
      insert: async (rows: { occurrence_id: string; kind: string; created_at: string }[]) => {
        state.confirmations.push(...rows.map((row, index) => ({ ...row, id: `vote-${index}` })));
        return { error: null };
      },
    }),
  },
}));

describe("useOccurrence refresh", () => {
  beforeEach(() => {
    localStorage.clear();
    state.confirmations.length = 0;
  });

  it.each([
    ["ativa", 1, 0],
    ["normalizada", 0, 1],
  ] as const)("updates counters after a %s confirmation", async (kind, activeCount, normalizedCount) => {
    const { result } = renderHook(() => useOccurrence("occ-1"));

    await waitFor(() => expect(result.current.occurrence?.confirmacoesAtiva).toBe(0));

    await act(async () => {
      await confirmOccurrence("occ-1", kind);
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.occurrence?.confirmacoesAtiva).toBe(activeCount);
      expect(result.current.occurrence?.confirmacoesNormalizada).toBe(normalizedCount);
    });
  });
});
