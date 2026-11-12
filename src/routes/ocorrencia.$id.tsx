import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarClock, CheckCircle2, Loader2, Waves } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { MapView } from "@/components/map/MapView";
import { Panel } from "@/components/layout/PageShell";
import { SeverityBadge, StatusBadge } from "@/components/occurrence/badges";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { confirmOccurrence, hasVoted, useOccurrence, type OccurrenceView } from "@/services/occurrences";
import { TYPE_LABEL } from "@/types/occurrence";

export const Route = createFileRoute("/ocorrencia/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes da ocorrência — Alerta Água" },
      { name: "description", content: "Detalhes, fotos e confirmações da comunidade sobre um alagamento." },
      { property: "og:title", content: "Detalhes da ocorrência — Alerta Água" },
      { property: "og:description", content: "Detalhes, fotos e confirmações da comunidade sobre um alagamento." },
    ],
  }),
  component: Detalhes,
});

type SessionState = Awaited<ReturnType<NonNullable<typeof supabase>["auth"]["getSession"]>>["data"]["session"];

function Detalhes() {
  const { id } = Route.useParams();
  const { occurrence: o, refresh } = useOccurrence(id);
  const [voted, setVoted] = useState(false);
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

  useEffect(() => setVoted(hasVoted(id)), [id]);

  if (o === undefined) return <main className="grid flex-1 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main>;
  if (o === null)
    return (
      <main className="grid flex-1 place-items-center p-8 text-center">
        <div><h1 className="text-2xl font-bold text-navy">Ocorrência não encontrada</h1>
        <Button asChild className="mt-4"><Link to="/">Voltar ao mapa</Link></Button></div>
      </main>
    );

  async function vote(kind: "ativa" | "normalizada") {
    try {
      await confirmOccurrence(id, kind);
      setVoted(true);
      refresh();
      toast.success("Obrigado! Sua confirmação foi registrada.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <Button asChild variant="ghost" className="mb-3"><Link to="/"><ArrowLeft /> Voltar ao mapa</Link></Button>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel>
          {o.isDemo && <p className="mb-3 inline-block rounded-md bg-sev-low/20 px-2 py-1 text-xs font-bold text-navy">Dado fictício — demonstração</p>}
          <h1 className="text-2xl font-bold text-navy">{o.titulo}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <SeverityBadge value={o.gravidade} /><StatusBadge value={o.status} />
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">{TYPE_LABEL[o.tipo]}</span>
          </div>
          <p className="mt-4 whitespace-pre-line">{o.descricao}</p>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <Info k="Endereço" v={o.endereco} />
            <Info k="Coordenadas" v={`${o.latitude.toFixed(5)}, ${o.longitude.toFixed(5)}`} />
            <Info k="Autor" v={o.autor} />
          </dl>
          {o.photos.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {o.photos.map((p, i) => <img key={i} src={p} alt={`Foto ${i + 1} da ocorrência`} className="aspect-square w-full rounded-lg object-cover" />)}
            </div>
          )}
          <MapView occurrences={[o]} center={[o.latitude, o.longitude]} zoom={15} className="mt-5 h-64 w-full overflow-hidden rounded-xl border" />
        </Panel>
        <aside className="space-y-4">
          <Panel>
            <h2 className="font-bold text-navy">Confirmações da comunidade</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-primary/10 p-3"><p className="font-display text-2xl font-bold text-primary">{o.confirmacoesAtiva}</p><p className="text-xs">Ainda existe</p></div>
              <div className="rounded-xl bg-ok/10 p-3"><p className="font-display text-2xl font-bold text-ok">{o.confirmacoesNormalizada}</p><p className="text-xs">Normalizado</p></div>
            </div>
            {session && o.status !== "expirada" && (
              <div className="mt-4 space-y-2">
                <Button className="w-full" disabled={voted} onClick={() => void vote("ativa")}><Waves /> Confirmar que ainda existe</Button>
                <Button variant="ok" className="w-full" disabled={voted} onClick={() => void vote("normalizada")}><CheckCircle2 /> Informar que foi normalizado</Button>
                {voted && <p className="text-center text-xs text-muted-foreground">Você já confirmou este relato.</p>}
              </div>
            )}
            {o.status === "expirada" && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                O prazo deste relato terminou. Ele não aparece mais no mapa e não aceita novas confirmações.
              </p>
            )}
          </Panel>
          <ReportTimeline occurrence={o} />
        </aside>
      </div>
    </main>
  );
}

function ReportTimeline({ occurrence }: { occurrence: OccurrenceView }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const remainingMinutes = Math.max(0, Math.ceil((occurrence.closesAt - now) / 60_000));
  const days = Math.floor(remainingMinutes / (24 * 60));
  const hours = Math.floor((remainingMinutes % (24 * 60)) / 60);
  const minutes = remainingMinutes % 60;
  const timeLeft = [
    days > 0 ? `${days}d` : null,
    hours > 0 ? `${hours}h` : null,
    `${minutes}min`,
  ].filter(Boolean).join(" ");
  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

  return (
    <Panel className="space-y-4">
      <h2 className="flex items-center gap-2 font-bold text-navy">
        <CalendarClock className="h-5 w-5 text-primary" />
        Registro e prazo
      </h2>
      <div className="space-y-3 text-sm">
        <TimelineItem label="Registrado em" value={formatDate(new Date(occurrence.createdAt).getTime())} />
        <TimelineItem label="Atualizado pela última vez" value={formatDate(occurrence.lastActivityAt)} />
        <TimelineItem
          label="Prazo de encerramento"
          value={formatDate(occurrence.closesAt)}
          emphasis
        />
        <p className="rounded-lg bg-primary/10 px-3 py-2 font-semibold text-primary">
          {remainingMinutes > 0 ? `Expira em ${timeLeft}` : "Prazo encerrado"}
        </p>
      </div>
    </Panel>
  );
}

function TimelineItem({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={emphasis ? "font-semibold text-navy" : "text-foreground"}>{value}</p>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return <div><dt className="text-xs font-semibold text-muted-foreground">{k}</dt><dd>{v}</dd></div>;
}
