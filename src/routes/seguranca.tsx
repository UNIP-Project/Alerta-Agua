import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Car, Phone, Waves, Zap, Home } from "lucide-react";
import { PageShell, Panel } from "@/components/layout/PageShell";
import { DISCLAIMER } from "@/components/layout/SiteHeader";

export const Route = createFileRoute("/seguranca")({
  head: () => ({
    meta: [
      { title: "Orientações de segurança — Alerta Água" },
      { name: "description", content: "Como agir com segurança durante alagamentos e enchentes." },
      { property: "og:title", content: "Orientações de segurança — Alerta Água" },
      { property: "og:description", content: "Como agir com segurança durante alagamentos e enchentes." },
    ],
  }),
  component: Seguranca,
});

const TIPS = [
  { icon: Car, t: "Não atravesse vias inundadas", d: "A pé ou de carro. Poucos centímetros de água em movimento podem arrastar pessoas e veículos." },
  { icon: Waves, t: "Afaste-se de correntezas", d: "Não se aproxime de rios, córregos, bueiros e áreas com água corrente." },
  { icon: Zap, t: "Cuidado com a eletricidade", d: "Evite contato com fios caídos e desligue a energia se a água entrar em casa." },
  { icon: Home, t: "Procure local alto e seguro", d: "Se a água subir, vá para pontos elevados e siga orientações da Defesa Civil." },
  { icon: AlertTriangle, t: "Evite contato com a água", d: "Ela pode estar contaminada. Lave bem as mãos e procure atendimento se tiver ferimentos." },
  { icon: Phone, t: "Ligue para emergência", d: "Defesa Civil 199 · Bombeiros 193 · SAMU 192." },
];

function Seguranca() {
  return (
    <PageShell title="Orientações de segurança" className="max-w-4xl">
      <div role="alert" className="mb-5 rounded-xl border border-sev-high/40 bg-sev-high/10 p-4 text-sm font-medium text-navy">{DISCLAIMER}</div>
      <div className="grid gap-4 sm:grid-cols-2">
        {TIPS.map(({ icon: Icon, t, d }) => (
          <Panel key={t} className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky text-primary"><Icon className="h-5 w-5" /></span>
            <div><h2 className="font-bold text-navy">{t}</h2><p className="mt-1 text-sm text-muted-foreground">{d}</p></div>
          </Panel>
        ))}
      </div>
    </PageShell>
  );
}
