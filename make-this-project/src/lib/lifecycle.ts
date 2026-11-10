import type { Confirmation, Occurrence, OccurrenceStatus } from "@/types/occurrence";

/** Configurable lifecycle settings. */
export const LIFECYCLE = {
  /** Hours without new community confirmations before a report expires. */
  expiryHours: 12,
  /** A single normalization vote is enough to mark the report as resolved visually. */
  normalizeThreshold: 1,
};

/**
 * Computes the status from community confirmations and elapsed time.
 * A new report is never "ativa" by itself — it needs at least one confirmation.
 * "expirada" only means the data is stale, not that the area is safe.
 */
export function computeStatus(
  occ: Pick<Occurrence, "createdAt">,
  confirmations: Pick<Confirmation, "kind" | "createdAt">[],
  now: Date = new Date(),
  cfg = LIFECYCLE,
): OccurrenceStatus {
  const active = confirmations.filter((c) => c.kind === "ativa").length;
  const normal = confirmations.filter((c) => c.kind === "normalizada").length;

  // A single normalization confirmation should keep the marker green, matching the
  // user's response and avoiding the map oscillating back to the alarm state.
  if (normal >= cfg.normalizeThreshold) return "normalizada";

  const lastActivity = Math.max(
    new Date(occ.createdAt).getTime(),
    ...confirmations.map((c) => new Date(c.createdAt).getTime()),
  );
  if (now.getTime() - lastActivity > cfg.expiryHours * 3600_000) return "expirada";
  return active >= 1 ? "ativa" : "pendente";
}
