import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Menu, Plus, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

const NAV = [
  { to: "/", label: "Mapa" },
  { to: "/meus-relatos", label: "Meus relatos" },
  { to: "/perfil", label: "Perfil" },
  { to: "/sobre", label: "Sobre" },
] as const;

type SessionState = Awaited<ReturnType<NonNullable<typeof supabase>["auth"]["getSession"]>>["data"]["session"];

export function SiteHeader() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
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

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    navigate({ to: "/login", replace: true });
  }

  const displayName = session?.user?.user_metadata?.full_name || session?.user?.email?.split("@")?.[0] || "Usuário";

  return (
    <header className="sticky top-0 z-40 bg-navy text-navy-foreground shadow-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <img src="/logo-alerta-agua.svg" alt="Logo Alerta Água" className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm" />
          <span className="truncate font-display text-base font-bold sm:text-lg">Alerta Água</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: true }} className="rounded-lg px-3 py-2 text-sm font-medium opacity-80 hover:opacity-100 data-[status=active]:bg-navy-foreground/10 data-[status=active]:opacity-100">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {session ? (
            <>
              <div className="flex items-center gap-2 rounded-full border border-navy-foreground/15 bg-navy-foreground/5 px-3 py-1.5 text-sm">
                <UserRound className="h-4 w-4" />
                <span className="max-w-[160px] truncate">{displayName}</span>
              </div>
              <Button type="button" variant="ghost" onClick={handleSignOut} className="text-navy-foreground hover:bg-navy-foreground/10 hover:text-navy-foreground">
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </>
          ) : (
            <Button asChild variant="ghost" className="text-navy-foreground hover:bg-navy-foreground/10 hover:text-navy-foreground">
              <Link to="/login"><UserRound /> Entrar</Link>
            </Button>
          )}
          <Button asChild variant="alert">
            <Link to="/registrar"><Plus /> Registrar alagamento</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Button asChild variant="alert" size="sm" className="h-9 px-3">
            <Link to="/registrar" className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="text-xs">Relato</span>
            </Link>
          </Button>
          <button className="rounded-lg p-2 hover:bg-navy-foreground/10" onClick={() => setOpen(!open)} aria-label="Abrir menu" aria-expanded={open}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-navy-foreground/10 px-4 pb-4 md:hidden" onClick={() => setOpen(false)}>
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="block rounded-lg px-3 py-3 font-medium">{n.label}</Link>
          ))}
          {session ? (
            <button type="button" onClick={handleSignOut} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-navy-foreground/10 px-3 py-3 font-medium text-left">
              <LogOut className="h-4 w-4" />
              Sair ({displayName})
            </button>
          ) : (
            <Link to="/login" className="block rounded-lg px-3 py-3 font-medium">Entrar / Cadastrar</Link>
          )}
          <Button asChild variant="alert" className="mt-2 w-full">
            <Link to="/registrar"><Plus /> Registrar alagamento</Link>
          </Button>
        </nav>
      )}
    </header>
  );
}

export const DISCLAIMER =
  "Os relatos do Alerta Água são colaborativos e podem conter informações incompletas ou desatualizadas. Consulte fontes oficiais e os serviços de emergência em situações de risco. A ausência de ocorrências no mapa não significa que uma região esteja segura.";

export function SiteFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted-foreground">
        <p>{DISCLAIMER}</p>
        <p className="mt-2">Emergências: Defesa Civil <strong>199</strong> · Bombeiros <strong>193</strong> · SAMU <strong>192</strong>. O Alerta Água não é um serviço oficial.</p>
      </div>
    </footer>
  );
}
