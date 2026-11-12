export type OccurrenceType = "alagamento" | "enchente" | "via_inundada" | "outro";
export type Severity = "baixo" | "moderado" | "alto";
export type OccurrenceStatus = "pendente" | "ativa" | "normalizada" | "expirada";
export type ConfirmationKind = "ativa" | "normalizada";

export interface Confirmation {
  id: string;
  occurrenceId: string;
  kind: ConfirmationKind;
  createdAt: string;
}

export interface Occurrence {
  id: string;
  userId?: string | null;
  titulo: string;
  descricao: string;
  tipo: OccurrenceType;
  gravidade: Severity;
  endereco: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
  photos: string[];
  autor: string;
  isDemo: boolean;
}

export const TYPE_LABEL: Record<OccurrenceType, string> = {
  alagamento: "Alagamento",
  enchente: "Enchente",
  via_inundada: "Via inundada",
  outro: "Outro",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  baixo: "Atenção (baixo)",
  moderado: "Moderado",
  alto: "Grave (alto)",
};

export const STATUS_LABEL: Record<OccurrenceStatus, string> = {
  pendente: "Pendente de confirmação",
  ativa: "Ativa",
  normalizada: "Normalizada",
  expirada: "Expirada",
};
