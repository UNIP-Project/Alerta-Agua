import { describe, expect, it } from "vitest";
import { computeStatus } from "./lifecycle";

const now = new Date("2026-10-18T12:00:00Z");
const ago = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();

describe("computeStatus", () => {
  it("new report without confirmations is pending, not active", () => {
    expect(computeStatus({ createdAt: ago(1) }, [], now)).toBe("pendente");
  });
  it("one 'still exists' confirmation makes it active", () => {
    expect(computeStatus({ createdAt: ago(1) }, [{ kind: "ativa", createdAt: ago(0.5) }], now)).toBe("ativa");
  });
  it("expires after 12h without activity", () => {
    expect(computeStatus({ createdAt: ago(13) }, [], now)).toBe("expirada");
  });
  it("marks the report as normalizada as soon as a normalization vote is recorded and there is no active opposition", () => {
    const n = { kind: "normalizada" as const, createdAt: ago(1) };
    expect(computeStatus({ createdAt: ago(2) }, [n], now)).toBe("normalizada");
    expect(computeStatus({ createdAt: ago(2) }, [n, n], now)).toBe("normalizada");
  });

  it("keeps the report normalizada as soon as the community confirms it was resolved, even with active confirmations", () => {
    const active = { kind: "ativa" as const, createdAt: ago(0.5) };
    const normal = { kind: "normalizada" as const, createdAt: ago(1) };
    expect(computeStatus({ createdAt: ago(2) }, [active, normal], now)).toBe("normalizada");
    expect(computeStatus({ createdAt: ago(2) }, [active, active, normal], now)).toBe("normalizada");
  });
});
