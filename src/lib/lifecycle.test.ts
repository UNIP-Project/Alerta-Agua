import { describe, expect, it } from "vitest";
import { computeStatus, getClosureAt, getLastActivityAt, getNextStatusChangeAt } from "./lifecycle";

const now = new Date("2026-10-18T12:00:00Z");
const ago = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();
const occurrence = (gravidade: "baixo" | "moderado" | "alto", createdAt = ago(30)) => ({
  createdAt,
  gravidade,
});

describe("computeStatus", () => {
  it("new report without confirmations is pending, not active", () => {
    expect(computeStatus(occurrence("moderado", ago(1)), [], now)).toBe("pendente");
  });
  it("expires an unconfirmed report after 12 hours", () => {
    expect(computeStatus(occurrence("moderado", ago(13)), [], now)).toBe("expirada");
  });

  it.each([
    ["baixo", 6],
    ["moderado", 12],
    ["alto", 24],
  ] as const)("normalizes %s severity after %i hours and expires it 12 hours later", (gravidade, duration) => {
    const active = { kind: "ativa" as const, createdAt: ago(duration - 1) };
    const occ = occurrence(gravidade);
    const normalizesAt = new Date(new Date(active.createdAt).getTime() + duration * 3600_000);

    expect(computeStatus(occ, [active], now)).toBe("ativa");
    expect(computeStatus(occ, [active], normalizesAt)).toBe("normalizada");
    expect(computeStatus(occ, [active], new Date(normalizesAt.getTime() + 11 * 3600_000))).toBe("normalizada");
    expect(computeStatus(occ, [active], new Date(normalizesAt.getTime() + 12 * 3600_000))).toBe("expirada");
  });

  it("keeps a user-normalized report visible for 12 hours, then expires it", () => {
    const n = { kind: "normalizada" as const, createdAt: ago(1) };
    expect(computeStatus(occurrence("alto"), [n], now)).toBe("normalizada");
    expect(computeStatus(occurrence("alto"), [n], new Date(new Date(n.createdAt).getTime() + 11 * 3600_000))).toBe("normalizada");
    expect(computeStatus(occurrence("alto"), [n], new Date(new Date(n.createdAt).getTime() + 12 * 3600_000))).toBe("expirada");
  });

  it("uses the most recent confirmation to determine the status", () => {
    const active = { kind: "ativa" as const, createdAt: ago(0.5) };
    const normal = { kind: "normalizada" as const, createdAt: ago(0.25) };
    expect(computeStatus(occurrence("baixo"), [active, normal], now)).toBe("normalizada");
    const laterActive = { kind: "ativa" as const, createdAt: new Date(now.getTime() + 0.1 * 3600_000).toISOString() };
    expect(computeStatus(occurrence("baixo"), [active, normal, laterActive], new Date(now.getTime() + 0.2 * 3600_000))).toBe("ativa");
  });
});

describe("getNextStatusChangeAt", () => {
  it("returns the time the active report turns normalized", () => {
    const confirmation = { kind: "ativa" as const, createdAt: ago(1) };
    expect(getNextStatusChangeAt(occurrence("baixo"), [confirmation], now)).toBe(
      new Date(confirmation.createdAt).getTime() + 6 * 3600_000,
    );
  });

  it("returns no next transition after the report expires", () => {
    const confirmation = { kind: "normalizada" as const, createdAt: ago(13) };
    expect(getNextStatusChangeAt(occurrence("alto"), [confirmation], now)).toBeNull();
  });
});

describe("report activity and closure timestamps", () => {
  it("uses the latest confirmation as the report's last update", () => {
    const active = { kind: "ativa" as const, createdAt: ago(2) };
    const normal = { kind: "normalizada" as const, createdAt: ago(1) };
    expect(getLastActivityAt(occurrence("moderado", ago(4)), [active, normal])).toBe(
      new Date(normal.createdAt).getTime(),
    );
  });

  it("calculates closure at the end of the active and normalized windows", () => {
    const active = { kind: "ativa" as const, createdAt: ago(1) };
    expect(getClosureAt(occurrence("alto"), [active])).toBe(
      new Date(active.createdAt).getTime() + 36 * 3600_000,
    );

    const normal = { kind: "normalizada" as const, createdAt: ago(1) };
    expect(getClosureAt(occurrence("alto"), [normal])).toBe(
      new Date(normal.createdAt).getTime() + 12 * 3600_000,
    );
  });

  it("uses the pending expiration time as closure when there are no confirmations", () => {
    expect(getClosureAt(occurrence("baixo", ago(1)), [])).toBe(
      new Date(ago(1)).getTime() + 12 * 3600_000,
    );
  });
});
