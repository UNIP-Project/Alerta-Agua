import { cn } from "@/lib/utils";
import { SEVERITY_LABEL, STATUS_LABEL, type OccurrenceStatus, type Severity } from "@/types/occurrence";

export function severityCssVar(s: Severity) {
  return s === "alto" ? "--sev-high" : s === "moderado" ? "--sev-mod" : "--sev-low";
}

const sevCls: Record<Severity, string> = {
  baixo: "bg-sev-low/20 text-navy border-sev-low",
  moderado: "bg-sev-mod/15 text-sev-mod border-sev-mod/60",
  alto: "bg-sev-high/10 text-sev-high border-sev-high/50",
};
const dotCls: Record<Severity, string> = { baixo: "bg-sev-low", moderado: "bg-sev-mod", alto: "bg-sev-high" };

export function SeverityBadge({ value }: { value: Severity }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", sevCls[value])}>
      <span className={cn("h-2 w-2 rounded-full", dotCls[value])} />
      {SEVERITY_LABEL[value]}
    </span>
  );
}

const stCls: Record<OccurrenceStatus, string> = {
  pendente: "bg-muted text-muted-foreground",
  ativa: "bg-primary/10 text-primary",
  normalizada: "bg-ok/10 text-ok",
  expirada: "bg-muted text-muted-foreground line-through decoration-1",
};

export function StatusBadge({ value }: { value: OccurrenceStatus }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", stCls[value])}>{STATUS_LABEL[value]}</span>;
}

export function SeverityDot({ value }: { value: Severity }) {
  return <span className={cn("h-3 w-3 shrink-0 rounded-full ring-2 ring-card", dotCls[value])} />;
}
