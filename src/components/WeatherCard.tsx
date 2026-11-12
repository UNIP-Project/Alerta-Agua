import { CloudRain } from "lucide-react";

/** Weather integration placeholder: shows no data until a real API is configured. */
export function WeatherCard() {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-sm font-semibold text-navy">
        <CloudRain className="h-4 w-4 text-primary" /> Condições meteorológicas
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Recurso indisponível: nenhuma API meteorológica foi configurada. Não exibimos previsões sem fonte real.
      </p>
    </div>
  );
}
