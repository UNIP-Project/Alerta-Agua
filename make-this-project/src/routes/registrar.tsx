import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ImagePlus, Loader2, LocateFixed, X } from "lucide-react";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { MapView } from "@/components/map/MapView";
import { Panel, PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchAddressSuggestions, type GeocodeSuggestion } from "@/lib/geocode";
import { supabase } from "@/lib/supabase";
import { createOccurrence } from "@/services/occurrences";
import { SEVERITY_LABEL, TYPE_LABEL, type OccurrenceType, type Severity } from "@/types/occurrence";

export const Route = createFileRoute("/registrar")({
  head: () => ({
    meta: [
      { title: "Registrar alagamento — Alerta Água" },
      { name: "description", content: "Informe um alagamento com localização, gravidade e fotos." },
      { property: "og:title", content: "Registrar alagamento — Alerta Água" },
      { property: "og:description", content: "Informe um alagamento com localização, gravidade e fotos." },
    ],
  }),
  component: Registrar,
});

const MAX_PHOTOS = 4;
const MAX_MB = 3;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function Registrar() {
  const navigate = useNavigate();
  const [f, setF] = useState({ titulo: "", tipo: "alagamento" as OccurrenceType, gravidade: "moderado" as Severity, descricao: "", cidade: "", endereco: "", dataHora: nowLocal() });
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    const query = [f.endereco.trim(), f.cidade.trim()].filter(Boolean).join(", ");
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        setSuggestionLoading(true);
        const next = await fetchAddressSuggestions(f.endereco.trim(), f.cidade.trim());
        if (active) setSuggestions(next);
      } catch {
        if (active) setSuggestions([]);
      } finally {
        if (active) setSuggestionLoading(false);
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [f.endereco, f.cidade]);

  function handleSelectSuggestion(suggestion: GeocodeSuggestion) {
    setF((prev) => ({ ...prev, endereco: suggestion.address }));
    setPos([suggestion.latitude, suggestion.longitude]);
    setSuggestions([]);
    setErrors((prev) => ({ ...prev, endereco: "", pos: "" }));
  }

  function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const file of files) {
      if (photos.length >= MAX_PHOTOS) return toast.error(`Máximo de ${MAX_PHOTOS} fotos.`);
      if (!TYPES.includes(file.type)) { toast.error(`${file.name}: use JPG, PNG ou WEBP.`); continue; }
      if (file.size > MAX_MB * 1024 * 1024) { toast.error(`${file.name}: máximo ${MAX_MB} MB.`); continue; }
      const r = new FileReader();
      r.onload = () => setPhotos((p) => (p.length < MAX_PHOTOS ? [...p, r.result as string] : p));
      r.readAsDataURL(file);
    }
  }

  async function useMyLocation() {
    if (!("geolocation" in navigator)) return toast.error("Seu dispositivo não oferece localização.");
    if (!window.confirm("O Alerta Água quer usar sua localização atual para marcar o relato. Permitir?")) return;

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const lat = p.coords.latitude;
        const lon = p.coords.longitude;
        setPos([lat, lon]);

        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&addressdetails=1&accept-language=pt-BR`);
          if (!response.ok) throw new Error("reverse geocode failed");
          const data = await response.json();
          const display = typeof data?.display_name === "string" ? data.display_name : "";
          const address = data?.address ?? {};
          const city = address.city || address.town || address.municipality || address.village || address.county || "";
          const road = address.road || address.pedestrian || address.street || "";
          const formatted = road ? `${road}, ${city || "Localização atual"}` : (display || "Localização atual");

          setF((prev) => ({
            ...prev,
            cidade: city || prev.cidade,
            endereco: formatted,
          }));
        } catch {
          setF((prev) => ({ ...prev, endereco: prev.endereco || "Localização atual" }));
        } finally {
          setLocating(false);
          setErrors((prev) => ({ ...prev, pos: "" }));
        }
      },
      () => {
        toast.error("Não foi possível obter sua localização. Selecione no mapa.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const err: Record<string, string> = {};
    if (f.titulo.trim().length < 5) err.titulo = "Informe um título com pelo menos 5 caracteres.";
    if (f.descricao.trim().length < 10) err.descricao = "Descreva a situação (mínimo 10 caracteres).";
    if (!f.cidade.trim()) err.cidade = "Informe a cidade.";
    if (!f.endereco.trim()) err.endereco = "Informe o endereço ou uma referência.";
    if (!pos) err.pos = "Selecione o local no mapa ou use sua localização.";
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

  return (
    <PageShell title="Registrar alagamento" className="max-w-5xl">
      <form onSubmit={submit} noValidate className="grid gap-4 lg:grid-cols-2">
        <Panel className="space-y-4">
          <Field label="Título da ocorrência *" error={errors.titulo}>
            <Input value={f.titulo} onChange={set("titulo")} maxLength={100} placeholder="Ex.: Rua alagada em frente à escola" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo *">
              <select value={f.tipo} onChange={set("tipo")} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Gravidade *">
              <select value={f.gravidade} onChange={set("gravidade")} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                {Object.entries(SEVERITY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Descrição detalhada *" error={errors.descricao}>
            <Textarea value={f.descricao} onChange={set("descricao")} rows={4} maxLength={1000} placeholder="Altura da água, se há carros parados, correnteza…" />
          </Field>
          <Field label="Cidade *" error={errors.cidade}>
            <Input value={f.cidade} onChange={set("cidade")} maxLength={80} placeholder="Ex.: São Paulo" />
          </Field>
          <Field label="Endereço ou referência *" error={errors.endereco}>
            <div className="relative">
              <Input value={f.endereco} onChange={set("endereco")} maxLength={200} placeholder="Ex.: Rua da Liberdade, 123" />
              {suggestionLoading && (
                <div className="absolute right-3 top-2.5 text-xs text-muted-foreground">Buscando…</div>
              )}
              {suggestions.length > 0 && (
                <div className="mt-2 rounded-md border bg-background p-1 shadow-sm">
                  {suggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.address}-${suggestion.latitude}-${suggestion.longitude}`}
                      type="button"
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className="flex w-full flex-col items-start rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
                    >
                      <span className="font-medium">{suggestion.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>
          <Field label="Data e hora *" error={errors.dataHora}>
            <Input type="datetime-local" value={f.dataHora} onChange={set("dataHora")} />
          </Field>
          <div>
            <Label>Fotografias (até {MAX_PHOTOS}, JPG/PNG/WEBP, máx. {MAX_MB} MB)</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                  <img src={p} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-card p-0.5" aria-label="Remover foto"><X className="h-3 w-3" /></button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-lg border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary">
                  <ImagePlus /><input type="file" accept={TYPES.join(",")} multiple onChange={onFiles} className="sr-only" />
                </label>
              )}
            </div>
          </div>
        </Panel>
        <Panel className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Label>Localização *</Label>
            <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={locating}>
              {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />} Usar minha localização
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Clique no mapa para marcar o ponto exato.</p>
          <MapView picked={pos} focus={pos} onPick={(la, ln) => setPos([la, ln])} className="h-80 w-full overflow-hidden rounded-xl border" />
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={busy} className="flex-1">{busy && <Loader2 className="animate-spin" />} Publicar relato</Button>
            <Button type="button" variant="outline" asChild><Link to="/">Cancelar</Link></Button>
          </div>
        </Panel>
      </form>
    </PageShell>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
