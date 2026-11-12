# Trechos importantes do código — Alerta Água

Este material reúne partes do código que explicam o fluxo principal do aplicativo: cadastro, persistência, acompanhamento e visualização de ocorrências. Os blocos foram copiados dos arquivos indicados, sem alterar o código-fonte.

> **Observação:** no código atual, registrar e confirmar relatos exige autenticação e Supabase. Os dados locais servem à visualização de demonstração.

## 1. Cadastro de uma ocorrência

**Trecho:** linhas 96–119 de [`src/routes/registrar.tsx`](src/routes/registrar.tsx#L96-L119).

```tsx
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const err: Record<string, string> = {};
    if (f.titulo.trim().length < 5) err.titulo = "Informe um título com pelo menos 5 caracteres.";
    if (f.descricao.trim().length < 10) err.descricao = "Descreva a situação (mínimo 10 caracteres).";
    if (!f.cidade.trim()) err.cidade = "Informe a cidade.";
    if (!f.endereco.trim()) err.endereco = "Informe o endereço ou uma referência.";
    if (!pos) err.pos = "Selecione o local no mapa ou escolha uma sugestão de endereço.";
    if (!f.dataHora) err.dataHora = "Informe data e hora.";
    setErrors(err);
    if (Object.keys(err).length) return toast.error("Revise os campos destacados.");
    setBusy(true);
    try {
      const created = new Date(f.dataHora).toISOString();
      const enderecoFinal = [f.cidade.trim(), f.endereco.trim()].filter(Boolean).join(" - ");
      const id = await createOccurrence({ titulo: f.titulo.trim(), tipo: f.tipo, gravidade: f.gravidade, descricao: f.descricao.trim(), endereco: enderecoFinal, latitude: pos![0], longitude: pos![1], createdAt: created, photos });
      toast.success("Relato publicado! Aguarda confirmação da comunidade.");
      navigate({ to: "/ocorrencia/$id", params: { id } });
    } catch (e2) {
      toast.error((e2 as Error).message || "Erro ao publicar.");
      setBusy(false);
    }
  }
```

**Por que importa:** O formulário verifica título, descrição, cidade, endereço, data e posição no mapa. Após a validação, chama `createOccurrence` e abre a página do relato criado.

## 2. Gravação e confirmação dos relatos

**Trecho:** linhas 187–220 de [`src/services/occurrences.ts`](src/services/occurrences.ts#L187-L220).

```ts
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
```

**Trecho:** linhas 246–275 de [`src/services/occurrences.ts`](src/services/occurrences.ts#L246-L275).

```ts
export async function confirmOccurrence(id: string, kind: ConfirmationKind) {
  const user = await getAuthenticatedUser();
  assertLoggedInUser(user);

  if (hasVoted(id)) throw new Error("Você já enviou uma confirmação para este relato.");

  if (supabase) {
    const [occurrenceResult, confirmationsResult] = await Promise.all([
      supabase.from("occurrences").select("*").eq("id", id).maybeSingle(),
      supabase.from("confirmations").select("*").eq("occurrence_id", id),
    ]);
    if (occurrenceResult.error) throw new Error(occurrenceResult.error.message);
    if (confirmationsResult.error) throw new Error(confirmationsResult.error.message);
    if (!occurrenceResult.data) throw new Error("Este relato não foi encontrado.");

    const occurrence = mapOccurrenceRow(occurrenceResult.data);
    const confirmations = (confirmationsResult.data ?? []).map(mapConfirmationRow);
    if (computeStatus(occurrence, confirmations) === "expirada") {
      throw new Error("O prazo deste relato terminou. Não é mais possível alterá-lo.");
    }

    const { error } = await supabase.from("confirmations").insert([{ occurrence_id: id, kind }]);
    if (error) throw new Error(error.message);
  } else {
    throw new Error("Você precisa estar logado para registrar ou confirmar um incidente.");
  }

  const voted = JSON.parse(localStorage.getItem(VOTED_KEY) ?? "[]") as string[];
  localStorage.setItem(VOTED_KEY, JSON.stringify([...voted, id]));
}
```

**Por que importa:** A primeira função exige um usuário autenticado e grava o relato no Supabase. A segunda confere se o relato ainda aceita confirmações antes de registrar o voto. O `localStorage` guarda apenas a indicação de que este navegador já votou; ele não substitui a gravação no banco.

## 3. Regra de situação do relato

**Trecho:** linhas 5–13 de [`src/lib/lifecycle.ts`](src/lib/lifecycle.ts#L5-L13).

```ts
export const LIFECYCLE = {
  pendingExpiryHours: 12,
  normalizedVisibilityHours: 12,
  activeExpiryHours: {
    baixo: 6,
    moderado: 12,
    alto: 24,
  } satisfies Record<Severity, number>,
};
```

**Trecho:** linhas 83–111 de [`src/lib/lifecycle.ts`](src/lib/lifecycle.ts#L83-L111).

```ts
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
```

**Por que importa:** Os prazos dependem da gravidade. A função `computeStatus` usa a confirmação mais recente para determinar quando o relato está pendente, ativo, normalizado ou expirado.

## 4. Exibição dos relatos no mapa

**Trecho:** linhas 72–95 de [`src/components/map/MapView.tsx`](src/components/map/MapView.tsx#L72-L95).

```tsx
  function draw() {
    const L = Lref.current;
    if (!L || !layer.current) return;
    layer.current.clearLayers();
    for (const o of occurrences) {
      if (o.status === "expirada") continue;
      const faded = o.status === "normalizada";
      const color = o.status === "normalizada" ? cssColor("--ok") : cssColor(severityCssVar(o.gravidade));
      L.circleMarker([o.latitude, o.longitude], {
        radius: 11,
        color: "#fff",
        weight: 3,
        fillColor: color,
        fillOpacity: faded ? 0.5 : 0.95,
      })
        .bindPopup(
          `<div style="min-width:180px"><strong>${esc(o.titulo)}</strong><br/>
          <small>${SEVERITY_LABEL[o.gravidade]} · ${STATUS_LABEL[o.status]}</small><br/>
          <small>${new Date(o.createdAt).toLocaleString("pt-BR")}</small><br/>
          <button data-open="${esc(o.id)}" style="margin-top:6px;color:${cssColor("--primary")};font-weight:700;cursor:pointer">Ver detalhes →</button></div>`,
        )
        .addTo(layer.current);
    }
  }
```

**Por que importa:** A função percorre os relatos, omite os expirados e cria marcadores por coordenada. A cor e a transparência mostram visualmente a gravidade ou a normalização.

## 5. Filtros e indicadores da página inicial

**Trecho:** linhas 66–90 de [`src/routes/index.tsx`](src/routes/index.tsx#L66-L90).

```tsx
  const filtered = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    return data.filter((o) => {
      const matchesSeverity = sev === "todas" || o.gravidade === sev;
      const matchesStatus = st === "todos" || o.status === st;
      const matchesPeriod = now - new Date(o.createdAt).getTime() <= PERIODS[period] * 3600_000;
      const matchesUser = !showOnlyMine || !userId ? true : Boolean(o.userId === userId || (userEmail && o.autor === userEmail));

      return matchesSeverity && matchesStatus && matchesPeriod && matchesUser;
    });
  }, [data, sev, st, period, showOnlyMine, session]);

  const stats = useMemo(() => {
    const d = data ?? [];
    return {
      total: d.length,
      ativas: d.filter((o) => o.status === "ativa").length,
      graves: d.filter((o) => o.gravidade === "alto" && (o.status === "ativa" || o.status === "pendente")).length,
      recentes: d.filter((o) => Date.now() - new Date(o.updatedAt).getTime() < 3 * 3600_000).length,
    };
  }, [data]);
```

**Por que importa:** O painel filtra os relatos por gravidade, situação, período e autoria. Em seguida, calcula os totais usados nos indicadores da interface.

## 6. Busca de endereços

**Trecho:** linhas 56–81 de [`src/lib/geocode.ts`](src/lib/geocode.ts#L56-L81).

```ts
async function fetchNominatimSuggestions(query: string): Promise<GeocodeSuggestion[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "br");
  url.searchParams.set("q", query);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error("Não foi possível buscar o endereço por rua.");
  }

  const data = await response.json();
  if (!Array.isArray(data)) return [];

  return data
    .map(normalizeNominatimResult)
    .filter((item): item is GeocodeSuggestion => Boolean(item));
}
```

**Trecho:** linhas 104–111 de [`src/lib/geocode.ts`](src/lib/geocode.ts#L104-L111).

```ts
export async function fetchAddressSuggestions(query: string, city?: string): Promise<GeocodeSuggestion[]> {
  const clean = query.trim();
  if (clean.length < 3) return [];

  const addressQuery = [clean, city?.trim()].filter(Boolean).join(", ");
  const results = await fetchNominatimSuggestions(addressQuery);
  return prioritizeSuggestionMatches(results, clean, city);
}
```

**Por que importa:** O código consulta o Nominatim, limita os resultados ao Brasil e transforma a resposta em sugestões com coordenadas. A busca só é iniciada quando há pelo menos três caracteres.

## 7. Estrutura dos dados

**Trecho:** linhas 1–27 de [`src/types/occurrence.ts`](src/types/occurrence.ts#L1-L27).

```ts
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
```

**Por que importa:** Esses tipos definem os campos de uma ocorrência e de uma confirmação. Eles também limitam os valores aceitos para tipo, gravidade e situação.

## 8. Tabelas e autorização no banco

**Trecho:** linhas 1–23 de [`supabase/schema.sql`](supabase/schema.sql#L1-L23).

```sql
create table if not exists occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  titulo text not null,
  descricao text,
  tipo text not null,
  gravidade text not null,
  endereco text not null,
  latitude double precision not null,
  longitude double precision not null,
  autor text,
  photos text[] default '{}',
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists confirmations (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid references occurrences(id) on delete cascade,
  kind text not null,
  created_at timestamptz default now()
);
```

**Trecho:** linhas 25–40 de [`supabase/schema.sql`](supabase/schema.sql#L25-L40).

```sql
alter table occurrences enable row level security;
alter table confirmations enable row level security;

create policy "Permitir leitura pública de ocorrências" on occurrences
for select using (true);

create policy "Permitir inserção de ocorrências" on occurrences
for insert with check (true);

grant delete on occurrences to authenticated;
drop policy if exists "Permitir exclusão de ocorrências pelo autor" on occurrences;
create policy "Permitir exclusão de ocorrências pelo autor" on occurrences
for delete to authenticated using (auth.uid() = user_id);

create policy "Permitir leitura pública de confirmações" on confirmations
for select using (true);
```

**Por que importa:** As tabelas guardam relatos e confirmações, vinculados por `occurrence_id`. As políticas ativam a segurança por linha e restringem a exclusão de relatos ao autor autenticado. O arquivo também contém, nas linhas seguintes, a política completa de inserção de confirmações.

## 9. Testes da regra de situação

**Trecho:** linhas 19–32 de [`src/lib/lifecycle.test.ts`](src/lib/lifecycle.test.ts#L19-L32).

```ts
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
```

**Trecho:** linhas 41–47 de [`src/lib/lifecycle.test.ts`](src/lib/lifecycle.test.ts#L41-L47).

```ts
  it("uses the most recent confirmation to determine the status", () => {
    const active = { kind: "ativa" as const, createdAt: ago(0.5) };
    const normal = { kind: "normalizada" as const, createdAt: ago(0.25) };
    expect(computeStatus(occurrence("baixo"), [active, normal], now)).toBe("normalizada");
    const laterActive = { kind: "ativa" as const, createdAt: new Date(now.getTime() + 0.1 * 3600_000).toISOString() };
    expect(computeStatus(occurrence("baixo"), [active, normal, laterActive], new Date(now.getTime() + 0.2 * 3600_000))).toBe("ativa");
  });
```

**Por que importa:** Os testes existentes verificam os prazos de 6, 12 e 24 horas e a expiração posterior. Também comprovam que a confirmação mais recente define a situação do relato.
