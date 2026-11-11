import type { Confirmation, Occurrence, OccurrenceStatus, Severity } from "@/types/occurrence";

const HOUR_MS = 3600_000;

export const LIFECYCLE = {
  pendingExpiryHours: 12,
  normalizedVisibilityHours: 12,
  activeExpiryHours: {
    baixo: 6,
    moderado: 12,
    alto: 24,
  } satisfies Record<Severity, number>,
};

type LifecycleOccurrence = Pick<Occurrence, "createdAt" | "gravidade">;
type LifecycleConfirmation = Pick<Confirmation, "kind" | "createdAt">;

function latestConfirmation(confirmations: LifecycleConfirmation[]): LifecycleConfirmation | undefined {
  return confirmations.reduce<LifecycleConfirmation | undefined>((latest, confirmation) => {
    if (!latest || new Date(confirmation.createdAt).getTime() >= new Date(latest.createdAt).getTime()) {
      return confirmation;
    }
    return latest;
  }, undefined);
}

export function getLastActivityAt(
  occurrence: LifecycleOccurrence,
  confirmations: LifecycleConfirmation[],
): number {
  const createdAt = new Date(occurrence.createdAt).getTime();
  const latest = latestConfirmation(confirmations);
  return latest ? Math.max(createdAt, new Date(latest.createdAt).getTime()) : createdAt;
}

export function getClosureAt(
  occurrence: LifecycleOccurrence,
  confirmations: LifecycleConfirmation[],
): number {
  const latest = latestConfirmation(confirmations);
  if (!latest) {
    return new Date(occurrence.createdAt).getTime() + LIFECYCLE.pendingExpiryHours * HOUR_MS;
  }

  const confirmationAt = new Date(latest.createdAt).getTime();
  if (latest.kind === "normalizada") {
    return confirmationAt + LIFECYCLE.normalizedVisibilityHours * HOUR_MS;
  }

  return (
    confirmationAt +
    (LIFECYCLE.activeExpiryHours[occurrence.gravidade] + LIFECYCLE.normalizedVisibilityHours) *
      HOUR_MS
  );
}

export function getNextStatusChangeAt(
  occurrence: LifecycleOccurrence,
  confirmations: LifecycleConfirmation[],
  now: Date = new Date(),
): number | null {
  const latest = latestConfirmation(confirmations);

  if (!latest) {
    const expiresAt = new Date(occurrence.createdAt).getTime() + LIFECYCLE.pendingExpiryHours * HOUR_MS;
    return expiresAt > now.getTime() ? expiresAt : null;
  }

  const confirmationAt = new Date(latest.createdAt).getTime();
  if (latest.kind === "normalizada") {
    const expiresAt = confirmationAt + LIFECYCLE.normalizedVisibilityHours * HOUR_MS;
    return expiresAt > now.getTime() ? expiresAt : null;
  }

  const normalizesAt =
    confirmationAt + LIFECYCLE.activeExpiryHours[occurrence.gravidade] * HOUR_MS;
  if (normalizesAt > now.getTime()) return normalizesAt;

  const expiresAt = normalizesAt + LIFECYCLE.normalizedVisibilityHours * HOUR_MS;
  return expiresAt > now.getTime() ? expiresAt : null;
}

export function computeStatus(
  occurrence: LifecycleOccurrence,
  confirmations: LifecycleConfirmation[],
  now: Date = new Date(),
): OccurrenceStatus {
  const nowMs = now.getTime();
  const latest = latestConfirmation(confirmations);

  if (!latest) {
    const pendingExpiresAt =
      new Date(occurrence.createdAt).getTime() + LIFECYCLE.pendingExpiryHours * HOUR_MS;
    return nowMs >= pendingExpiresAt ? "expirada" : "pendente";
  }

  const confirmationAt = new Date(latest.createdAt).getTime();
  if (latest.kind === "normalizada") {
    return nowMs >= confirmationAt + LIFECYCLE.normalizedVisibilityHours * HOUR_MS
      ? "expirada"
      : "normalizada";
  }

  const normalizesAt =
    confirmationAt + LIFECYCLE.activeExpiryHours[occurrence.gravidade] * HOUR_MS;
  if (nowMs < normalizesAt) return "ativa";

  return nowMs >= normalizesAt + LIFECYCLE.normalizedVisibilityHours * HOUR_MS
    ? "expirada"
    : "normalizada";
}
