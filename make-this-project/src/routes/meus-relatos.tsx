import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, MapPinned, ShieldAlert, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageShell, Panel } from "@/components/layout/PageShell";
import { SeverityBadge, StatusBadge } from "@/components/occurrence/badges";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useOccurrences } from "@/services/occurrences";

type SessionState = Awaited<ReturnType<NonNullable<typeof supabase>["auth"]["getSession"]>>["data"]["session"];

export const Route = createFileRoute("/meus-relatos")({
  head: () => ({
    meta: [
      { title: "Meus relatos — Alerta Água" },
      { name: "description", content: "Veja os relatos que você enviou para o Alerta Água." },
      { property: "og:title", content: "Meus relatos — Alerta Água" },
      { property: "og:description", content: "Veja os relatos que você enviou para o Alerta Água." },
    ],
  }),
  component: MeusRelatosPage,
});

function MeusRelatosPage() {
  const [session, setSession] = useState<SessionState | null>(null);
  const all = useOccurrences();

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

  const meusRelatos = useMemo(() => {
    if (!all || !session?.user?.id) return [];
    return all.filter((item) => item.userId === session.user.id || item.autor === session.user.email);
  }, [all, session]);

  if (!supabase) {
    return (
      <PageShell title="Meus relatos" className="max-w-4xl">
        <Panel className="space-y-4">
          <p className="text-sm text-muted-foreground">Configure o Supabase para visualizar os relatos do usuário autenticado.</p>
          <Button asChild variant="outline"><Link to="/login">Ir para login</Link></Button>
        </Panel>
      </PageShell>
    );
  }

  if (!session) {
    return (
      <PageShell title="Meus relatos" className="max-w-4xl">
        <Panel className="space-y-4">
          <p className="text-sm text-muted-foreground">Faça login para ver os relatos enviados por você.</p>
          <div className="flex gap-2">
            <Button asChild><Link to="/login">Entrar</Link></Button>
            <Button asChild variant="outline"><Link to="/cadastro">Criar conta</Link></Button>
          </div>
        </Panel>
      </PageShell>
    );
  }

  return (
    <PageShell title="Meus relatos" subtitle="Acompanhe tudo o que você registrou e o estado atual de cada incidente." className="max-w-5xl">
      <div className="space-y-4">
        <Panel className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Usuário</p>
              <p className="text-lg font-bold text-navy">{session.user.user_metadata?.full_name || session.user.email?.split("@")?.[0] || "Usuário"}</p>
            </div>
          </div>
          <div className="rounded-full border bg-muted/30 px-3 py-1 text-sm font-medium text-navy">{meusRelatos.length} relato(s)</div>
        </Panel>

        {!all ? (
          <Panel>
            <p className="text-sm text-muted-foreground">Carregando relatos...</p>
          </Panel>
        ) : meusRelatos.length === 0 ? (
          <Panel className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <ShieldAlert className="h-5 w-5" />
              <h3 className="font-semibold text-navy">Nenhum relato enviado</h3>
            </div>
            <p className="text-sm text-muted-foreground">Você ainda não registrou nenhum alagamento. Quando fizer isso, ele aparecerá aqui em detalhes.</p>
            <Button asChild><Link to="/registrar">Registrar alagamento</Link></Button>
          </Panel>
        ) : (
          meusRelatos.map((item) => (
            <Panel key={item.id} className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-navy">{item.titulo}</h3>
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><MapPinned className="h-4 w-4" /> {item.endereco}</p>
                </div>
                <StatusBadge value={item.status} />
              </div>

              <div className="flex flex-wrap gap-2">
                <SeverityBadge value={item.gravidade} />
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{item.tipo}</span>
              </div>

              <p className="text-sm text-muted-foreground">{item.descricao || "Sem descrição detalhada para este relato."}</p>

              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded-xl border bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Confirmadas</p>
                  <p className="mt-1 text-xl font-bold text-navy">{item.confirmacoesAtiva}</p>
                </div>
                <div className="rounded-xl border bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Normalizadas</p>
                  <p className="mt-1 text-xl font-bold text-navy">{item.confirmacoesNormalizada}</p>
                </div>
                <div className="rounded-xl border bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Data</p>
                  <p className="mt-1 text-sm font-medium text-navy">{new Date(item.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="inline-flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Última atualização: {new Date(item.lastActivityAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
                  <p className="inline-flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Prazo de encerramento: {new Date(item.closesAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/ocorrencia/$id" params={{ id: item.id }}>Ver detalhes</Link>
                </Button>
              </div>
            </Panel>
          ))
        )}
      </div>
    </PageShell>
  );
}
