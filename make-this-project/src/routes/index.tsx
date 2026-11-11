import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Clock, Loader2, MapPinned, Plus, Search, Waves } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { MapView } from "@/components/map/MapView";
import { SeverityBadge, SeverityDot, StatusBadge } from "@/components/occurrence/badges";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchAddressSuggestions } from "@/lib/geocode";
import { supabase } from "@/lib/supabase";
import { useOccurrences } from "@/services/occurrences";
import { SEVERITY_LABEL, STATUS_LABEL, type OccurrenceStatus, type Severity } from "@/types/occurrence";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alerta Água — Mapa colaborativo de alagamentos" },
      { name: "description", content: "Veja e registre alagamentos na sua cidade em um mapa colaborativo." },
      { property: "og:title", content: "Alerta Água — Mapa colaborativo de alagamentos" },
      { property: "og:description", content: "Veja e registre alagamentos na sua cidade em um mapa colaborativo." },
    ],
  }),
  component: Dashboard,
});

const PERIODS = { "24h": 24, "7d": 168, todos: Infinity } as const;
type SessionState = Awaited<ReturnType<NonNullable<typeof supabase>["auth"]["getSession"]>>["data"]["session"];

function Dashboard() {
  const data = useOccurrences();
  const navigate = useNavigate();
  const [sev, setSev] = useState<Severity | "todas">("todas");
  const [st, setSt] = useState<OccurrenceStatus | "todos">("todos");
  const [period, setPeriod] = useState<keyof typeof PERIODS>("todos");
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [searching, setSearching] = useState(false);
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }

    let active = true;

    async function sync() {
      const { data } = await supabase.auth.getSession();
      if (active) setSession(data.session);
    }

    void sync();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

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

  async function search(e: FormEvent) {
    e.preventDefault();
    const clean = q.trim();
    if (!clean) return;

    setSearching(true);
    try {
      const results = await fetchAddressSuggestions(clean);
      const firstResult = results[0];
      if (!firstResult) {
        toast.error("Não foi possível encontrar esse endereço ou região.");
        return;
      }

      setFocus([firstResult.latitude, firstResult.longitude]);
    } catch {
      toast.error("Não foi possível buscar esse endereço ou região.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={MapPinned} label="Ocorrências registradas" value={stats.total} loading={!data} />
        <Stat icon={Waves} label="Ocorrências ativas" value={stats.ativas} loading={!data} tone="text-primary" />
        <Stat icon={AlertTriangle} label="Ocorrências graves" value={stats.graves} loading={!data} tone="text-sev-high" />
        <Stat icon={Clock} label="Atualizadas (3h)" value={stats.recentes} loading={!data} tone="text-ok" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
          <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center">
            <form onSubmit={search} className="flex flex-1 gap-2" role="search">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar endereço ou região" className="pl-9" aria-label="Buscar endereço ou região" />
              </div>
              <Button type="submit" disabled={searching}>{searching ? <Loader2 className="animate-spin" /> : "Buscar"}</Button>
            </form>
          </div>
          <div className="flex flex-wrap gap-2 border-b p-3 text-sm">
            <Select label="Gravidade" value={sev} onChange={(v) => setSev(v as Severity | "todas")} options={[ ["todas", "Todas"], ...Object.entries(SEVERITY_LABEL)]} />
            <Select label="Status" value={st} onChange={(v) => setSt(v as OccurrenceStatus | "todos")} options={[ ["todos", "Todos"], ...Object.entries(STATUS_LABEL)]} />
            <Select label="Data" value={period} onChange={(v) => setPeriod(v as keyof typeof PERIODS)} options={[ ["todos", "Qualquer data"], ["24h", "Últimas 24h"], ["7d", "Últimos 7 dias"]]} />
            {session && (
              <button
                type="button"
                onClick={() => setShowOnlyMine((current) => !current)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 font-medium transition-colors",
                  showOnlyMine ? "border-primary bg-primary/10 text-primary" : "border-input bg-background text-foreground",
                )}
              >
                {showOnlyMine ? "Mostrando só meus relatos" : "Só meus relatos"}
              </button>
            )}
          </div>
          <div className="relative">
            <MapView occurrences={filtered} focus={focus} onOpen={(id) => navigate({ to: "/ocorrencia/$id", params: { id } })} className="h-[60vh] min-h-[420px] w-full" />
            {!data && (
              <div className="absolute inset-0 z-[500] grid place-items-center bg-card/70">
                <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Carregando ocorrências" />
              </div>
            )}
            {data && filtered.length === 0 && (
              <div className="absolute left-1/2 top-4 z-[500] -translate-x-1/2 rounded-xl bg-card px-4 py-2 text-sm shadow-card">
                Nenhuma ocorrência com esses filtros. Isso não significa que a região esteja segura.
              </div>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border bg-card shadow-card">
            <h2 className="border-b p-4 text-base font-bold text-navy">Relatos recentes</h2>
            <ul className="max-h-[52vh] divide-y overflow-y-auto">
              {!data && <li className="p-4 text-sm text-muted-foreground">Carregando…</li>}
              {data && filtered.length === 0 && <li className="p-4 text-sm text-muted-foreground">Nenhum relato encontrado.</li>}
              {filtered.slice(0, 20).map((o) => (
                <li key={o.id}>
                  <Link to="/ocorrencia/$id" params={{ id: o.id }} className="block p-4 hover:bg-muted" onMouseEnter={() => setFocus(null)}>
                    <p className="font-semibold text-navy">{o.titulo}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{o.endereco} · {new Date(o.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5"><SeverityBadge value={o.gravidade} /><StatusBadge value={o.status} /></div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Stat({ icon: Icon, label, value, loading, tone }: { icon: typeof Info; label: string; value: number; loading: boolean; tone?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
      <Icon className={cn("h-5 w-5 text-navy", tone)} />
      <p className="mt-2 font-display text-3xl font-bold text-navy">{loading ? "–" : value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border bg-background px-2 py-1">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent py-1 text-sm outline-none">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
