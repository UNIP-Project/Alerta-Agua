/**
 * Data access layer.
 * Uses Supabase when configured; otherwise falls back to the local demo store.
 */
import { useEffect, useState } from "react";
import { computeStatus } from "@/lib/lifecycle";
import { supabase } from "@/lib/supabase";
import type { Confirmation, ConfirmationKind, Occurrence, OccurrenceStatus } from "@/types/occurrence";

const KEY = "alerta-agua:v1";

export interface OccurrenceView extends Occurrence {
  status: OccurrenceStatus;
  confirmacoesAtiva: number;
  confirmacoesNormalizada: number;
}

interface Store {
  occurrences: Occurrence[];
  confirmations: Confirmation[];
}

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

function demoSeed(): Store {
  const base = (o: Partial<Occurrence> & Pick<Occurrence, "id" | "titulo" | "latitude" | "longitude" | "gravidade" | "tipo" | "endereco">, h: number): Occurrence => ({
    descricao: "Registro fictício para demonstração da plataforma.",
    createdAt: hoursAgo(h),
    updatedAt: hoursAgo(h),
    photos: [],
    autor: "Usuário demonstração",
    isDemo: true,
    ...o,
  });
  const occurrences = [
    base({ id: "demo-1", titulo: "Via alagada próxima ao viaduto", tipo: "via_inundada", gravidade: "alto", endereco: "Região central (exemplo)", latitude: -23.5489, longitude: -46.6388 }, 1),
    base({ id: "demo-2", titulo: "Acúmulo de água na esquina", tipo: "alagamento", gravidade: "moderado", endereco: "Zona oeste (exemplo)", latitude: -23.5615, longitude: -46.6912 }, 3),
    base({ id: "demo-3", titulo: "Poças extensas na calçada", tipo: "alagamento", gravidade: "baixo", endereco: "Zona sul (exemplo)", latitude: -23.5869, longitude: -46.6577 }, 5),
    base({ id: "demo-4", titulo: "Córrego transbordando", tipo: "enchente", gravidade: "alto", endereco: "Zona leste (exemplo)", latitude: -23.5402, longitude: -46.5765 }, 2),
    base({ id: "demo-5", titulo: "Rua com água acima do meio-fio", tipo: "via_inundada", gravidade: "moderado", endereco: "Zona norte (exemplo)", latitude: -23.5003, longitude: -46.6249 }, 20),
  ];
  const confirmations: Confirmation[] = [
    { id: "c1", occurrenceId: "demo-1", kind: "ativa", createdAt: hoursAgo(0.5) },
    { id: "c2", occurrenceId: "demo-1", kind: "ativa", createdAt: hoursAgo(0.3) },
    { id: "c3", occurrenceId: "demo-2", kind: "ativa", createdAt: hoursAgo(2) },
    { id: "c4", occurrenceId: "demo-4", kind: "ativa", createdAt: hoursAgo(1) },
  ];
  return { occurrences, confirmations };
}

let cache: Store | null = null;
const listeners = new Set<() => void>();

function load(): Store {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Store) : demoSeed();
  } catch {
    cache = demoSeed();
  }
  return cache;
}

function save(s: Store) {
  cache = s;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    throw new Error("Armazenamento local cheio. Tente fotos menores.");
  }
  listeners.forEach((l) => l());
}

function toView(s: Store, o: Occurrence): OccurrenceView {
  const cs = s.confirmations.filter((c) => c.occurrenceId === o.id);
  return {
    ...o,
    status: computeStatus(o, cs),
    confirmacoesAtiva: cs.filter((c) => c.kind === "ativa").length,
    confirmacoesNormalizada: cs.filter((c) => c.kind === "normalizada").length,
  };
}

function mapOccurrenceRow(row: Record<string, any>): Occurrence {
  return {
    id: row.id,
    userId: row.userId ?? row.user_id ?? null,
    titulo: row.titulo ?? row.title ?? "",
    descricao: row.descricao ?? row.description ?? "",
    tipo: row.tipo ?? row.type ?? "outro",
    gravidade: row.gravidade ?? row.severity ?? "moderado",
    endereco: row.endereco ?? row.address ?? "",
    latitude: Number(row.latitude ?? row.lat ?? 0),
    longitude: Number(row.longitude ?? row.lng ?? 0),
    createdAt: row.createdAt ?? row.created_at ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? row.updated_at ?? row.createdAt ?? row.created_at ?? new Date().toISOString(),
    photos: Array.isArray(row.photos) ? row.photos : [],
    autor: row.autor ?? row.author ?? "Visitante",
    isDemo: Boolean(row.isDemo ?? row.is_demo ?? false),
  };
}

function mapConfirmationRow(row: Record<string, any>): Confirmation {
  return {
    id: row.id,
    occurrenceId: row.occurrenceId ?? row.occurrence_id,
    kind: row.kind,
    createdAt: row.createdAt ?? row.created_at ?? new Date().toISOString(),
  };
}

async function fetchFromSupabase(): Promise<OccurrenceView[]> {
  if (!supabase) return listOccurrences();

  const [occurrencesResult, confirmationsResult] = await Promise.all([
    supabase.from("occurrences").select("*"),
    supabase.from("confirmations").select("*"),
  ]);

  if (occurrencesResult.error) throw new Error(occurrencesResult.error.message);
  if (confirmationsResult.error) throw new Error(confirmationsResult.error.message);

  const confirmations = (confirmationsResult.data ?? []).map(mapConfirmationRow);
  return ((occurrencesResult.data ?? []) as Record<string, any>[])
    .map((row) => {
      const occurrence = mapOccurrenceRow(row);
      const cs = confirmations.filter((c) => c.occurrenceId === occurrence.id);
      return {
        ...occurrence,
        status: computeStatus(occurrence, cs),
        confirmacoesAtiva: cs.filter((c) => c.kind === "ativa").length,
        confirmacoesNormalizada: cs.filter((c) => c.kind === "normalizada").length,
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function listOccurrences(): OccurrenceView[] {
  if (supabase) return [];
  const s = load();
  return s.occurrences
    .map((o) => toView(s, o))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getOccurrence(id: string): OccurrenceView | null {
  const s = load();
  const o = s.occurrences.find((x) => x.id === id);
  return o ? toView(s, o) : null;
}

export type NewOccurrence = Omit<Occurrence, "id" | "updatedAt" | "isDemo" | "autor" | "userId"> & {
  userId?: string | null;
};

export function assertLoggedInUser<T extends { id: string } | null | undefined>(user: T): T {
  if (!user) {
    throw new Error("Você precisa estar logado para registrar ou confirmar um incidente.");
  }
  return user;
}

async function getAuthenticatedUser() {
  if (!supabase) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;
  return userData.user;
}

export async function createOccurrence(input: NewOccurrence): Promise<string> {
  const user = await getAuthenticatedUser();
  assertLoggedInUser(user);

  if (supabase) {
    const now = new Date().toISOString();
    const payload = {
      titulo: input.titulo,
      descricao: input.descricao,
      tipo: input.tipo,
      gravidade: input.gravidade,
      endereco: input.endereco,
      latitude: input.latitude,
      longitude: input.longitude,
      photos: input.photos ?? [],
      autor: user.email ?? user.user_metadata?.full_name ?? "Usuário",
      user_id: user.id,
      is_demo: false,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("occurrences")
      .insert([payload])
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return data.id;
  }

  throw new Error("Você precisa estar logado para registrar ou confirmar um incidente.");
}

const VOTED_KEY = "alerta-agua:voted";
export function hasVoted(id: string): boolean {
  try {
    return (JSON.parse(localStorage.getItem(VOTED_KEY) ?? "[]") as string[]).includes(id);
  } catch {
    return false;
  }
}

export async function confirmOccurrence(id: string, kind: ConfirmationKind) {
  const user = await getAuthenticatedUser();
  assertLoggedInUser(user);

  if (hasVoted(id)) throw new Error("Você já enviou uma confirmação para este relato.");

  if (supabase) {
    const { error } = await supabase.from("confirmations").insert([{ occurrence_id: id, kind, created_at: new Date().toISOString() }]);
    if (error) throw new Error(error.message);
  } else {
    throw new Error("Você precisa estar logado para registrar ou confirmar um incidente.");
  }

  const voted = JSON.parse(localStorage.getItem(VOTED_KEY) ?? "[]") as string[];
  localStorage.setItem(VOTED_KEY, JSON.stringify([...voted, id]));
}

/** Subscribes to the store; returns null until loaded in the browser. */
export function useOccurrences(): OccurrenceView[] | null {
  const [data, setData] = useState<OccurrenceView[] | null>(null);
  useEffect(() => {
    let active = true;

    async function update() {
      try {
        const next = supabase ? await fetchFromSupabase() : listOccurrences();
        if (active) setData(next);
      } catch {
        if (active) setData(listOccurrences());
      }
    }

    update();
    if (!supabase) {
      const t = setTimeout(() => {
        if (active) setData(listOccurrences());
      }, 250);
      listeners.add(update as never);
      return () => {
        active = false;
        clearTimeout(t);
        listeners.delete(update as never);
      };
    }

    return () => {
      active = false;
    };
  }, []);
  return data;
}

export function useOccurrence(id: string): OccurrenceView | null | undefined {
  const all = useOccurrences();
  if (all === null) return undefined;
  return all.find((o) => o.id === id) ?? null;
}
