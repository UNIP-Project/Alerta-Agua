import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, Mail, ShieldCheck, UserRound, Waves } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageShell, Panel } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { computeStatus, getClosureAt, getLastActivityAt } from "@/lib/lifecycle";
import { supabase } from "@/lib/supabase";
import type { Confirmation, Occurrence, OccurrenceStatus } from "@/types/occurrence";

interface UserIncident extends Occurrence {
  status: OccurrenceStatus;
  confirmacoesAtiva: number;
  confirmacoesNormalizada: number;
  history: Confirmation[];
  lastActivityAt: number;
  closesAt: number;
}

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — Alerta Água" },
      { name: "description", content: "Seus dados e relatos no Alerta Água." },
      { property: "og:title", content: "Meu perfil — Alerta Água" },
      { property: "og:description", content: "Seus dados e relatos no Alerta Água." },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null>(null);
  const [records, setRecords] = useState<UserIncident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadUserData(currentSession: typeof session) {
      if (!currentSession?.user?.id) {
        setRecords([]);
        setLoading(false);
        return;
      }

      const { data: occurrenceRows = [], error: occurrenceError } = await supabase
        .from("occurrences")
        .select("*")
        .eq("user_id", currentSession.user.id)
        .order("created_at", { ascending: false });

      if (occurrenceError) {
        setRecords([]);
        setLoading(false);
        return;
      }

      const ids = (occurrenceRows as any[]).map((row) => row.id);
      let confirmationRows: Confirmation[] = [];
      if (ids.length > 0) {
        const { data } = await supabase.from("confirmations").select("*").in("occurrence_id", ids);
        confirmationRows = (data ?? []).map((row: any) => ({
          id: row.id,
          occurrenceId: row.occurrence_id ?? row.occurrenceId,
          kind: row.kind,
          createdAt: row.created_at ?? row.createdAt,
        }));
      }

      const grouped = confirmationRows.reduce<Record<string, Confirmation[]>>((acc, c) => {
        const key = c.occurrenceId;
        acc[key] = [...(acc[key] ?? []), c];
        return acc;
      }, {});

      const mapped = (occurrenceRows as any[]).map((row) => {
        const list = grouped[row.id] ?? [];
        const occurrence: Occurrence = {
          id: row.id,
          titulo: row.titulo,
          descricao: row.descricao ?? "",
          tipo: row.tipo,
          gravidade: row.gravidade,
          endereco: row.endereco,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          createdAt: row.created_at ?? row.createdAt,
          updatedAt: row.updated_at ?? row.updatedAt,
          photos: Array.isArray(row.photos) ? row.photos : [],
          autor: row.autor ?? row.author ?? "Visitante",
          isDemo: Boolean(row.is_demo ?? row.isDemo ?? false),
        };

        return {
          ...occurrence,
          status: computeStatus(occurrence, list),
          confirmacoesAtiva: list.filter((c) => c.kind === "ativa").length,
          confirmacoesNormalizada: list.filter((c) => c.kind === "normalizada").length,
          history: list,
          lastActivityAt: getLastActivityAt(occurrence, list),
          closesAt: getClosureAt(occurrence, list),
        };
      });

      if (active) setRecords(mapped);
      if (active) setLoading(false);
    }

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      await loadUserData(data.session);
    };

    void syncSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void loadUserData(nextSession);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const profileName = session?.user?.user_metadata?.full_name ?? session?.user?.email?.split("@")?.[0] ?? "Usuário";
  const totalRegistros = records.length;
  const registrosAtivos = records.filter((item) => item.status === "ativa").length;
  const registrosNormalizados = records.filter((item) => item.status === "normalizada").length;

  const summary = useMemo(
    () => [
      { label: "Registros", value: totalRegistros, icon: Waves },
      { label: "Ativos", value: registrosAtivos, icon: ShieldCheck },
      { label: "Normalizados", value: registrosNormalizados, icon: CalendarClock },
    ],
    [totalRegistros, registrosAtivos, registrosNormalizados],
  );

  if (!supabase) {
    return (
      <PageShell title="Meu perfil" className="max-w-5xl">
        <Panel className="space-y-4">
          <p className="text-sm text-muted-foreground">Configure as variáveis do Supabase para ativar a área do perfil.</p>
          <Button asChild variant="outline"><Link to="/login">Ir para login</Link></Button>
        </Panel>
      </PageShell>
    );
  }

  if (!session) {
    return (
      <PageShell title="Meu perfil" className="max-w-5xl">
        <Panel className="space-y-4">
          <p className="text-sm text-muted-foreground">Faça login para ver seus dados pessoais, registros e evolução dos incidentes.</p>
          <div className="flex gap-2">
            <Button asChild><Link to="/login">Entrar</Link></Button>
            <Button asChild variant="outline"><Link to="/cadastro">Criar conta</Link></Button>
          </div>
        </Panel>
      </PageShell>
    );
  }

  return (
    <PageShell title="Meu perfil" className="max-w-6xl">
      <div className="space-y-6">
        <Panel className="grid gap-4 lg:grid-cols-[1.2fr_2fr]">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
              <UserRound className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.12em] text-muted-foreground">Usuário</p>
              <h2 className="text-2xl font-bold text-navy">{profileName}</h2>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {summary.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl border bg-muted/30 p-3">
                <Icon className="h-4 w-4 text-primary" />
                <p className="mt-3 text-2xl font-bold text-navy">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Panel className="space-y-4">
            <h3 className="text-lg font-bold text-navy">Dados pessoais</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                <UserRound className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Nome</p>
                  <p className="font-medium text-navy">{profileName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                <Mail className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">E-mail</p>
                  <p className="font-medium text-navy">{session.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                <CalendarClock className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Conta criada</p>
                  <p className="font-medium text-navy">{new Date(session.user.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="space-y-4">
            <h3 className="text-lg font-bold text-navy">Evolução dos meus incidentes</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando registros...</p>
            ) : records.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                Você ainda não registrou nenhum alagamento. Quando houver registros, a evolução aparecerá aqui.
              </div>
            ) : (
              <div className="space-y-4">
                {records.map((record) => (
                  <div key={record.id} className="rounded-xl border bg-muted/20 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h4 className="text-lg font-bold text-navy">{record.titulo}</h4>
                        <p className="text-sm text-muted-foreground">{record.endereco}</p>
                      </div>
                      <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{record.status}</span>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
                      <div className="rounded-lg border bg-card p-2">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Confirmações ativas</p>
                        <p className="mt-1 text-xl font-bold text-navy">{record.confirmacoesAtiva}</p>
                      </div>
                      <div className="rounded-lg border bg-card p-2">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Normalizadas</p>
                        <p className="mt-1 text-xl font-bold text-navy">{record.confirmacoesNormalizada}</p>
                      </div>
                      <div className="rounded-lg border bg-card p-2">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Registrado em</p>
                        <p className="mt-1 text-sm font-medium text-navy">{new Date(record.createdAt).toLocaleDateString("pt-BR")}</p>
                      </div>
                    </div>

                    {record.history.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Histórico de evolução</p>
                        {record.history.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg border bg-card p-2 text-sm">
                            <span className="font-medium text-navy">{item.kind === "ativa" ? "Ainda existe" : "Normalizado"}</span>
                            <span className="text-muted-foreground">{new Date(item.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-muted-foreground">Ainda não há evoluções de confirmação para este incidente.</p>
                    )}
                    <div className="mt-4 space-y-1 border-t pt-3 text-sm text-muted-foreground">
                      <p>Última atualização: {new Date(record.lastActivityAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
                      <p>Prazo de encerramento: {new Date(record.closesAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </PageShell>
  );
}
