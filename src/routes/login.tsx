import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageShell, Panel } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Alerta Água" },
      { name: "description", content: "Acesse sua conta do Alerta Água." },
      { property: "og:title", content: "Entrar — Alerta Água" },
      { property: "og:description", content: "Acesse sua conta do Alerta Água." },
    ],
  }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Informe e-mail e senha.");
      return;
    }
    if (!supabase) {
      toast.error("Configure as variáveis do Supabase antes de entrar.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Login realizado com sucesso!");
      navigate({ to: "/" });
    } catch (error) {
      toast.error((error as Error).message || "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell title="Entrar" subtitle="Acesse sua conta do Alerta Água." className="max-w-md">
      <Panel className="space-y-4">
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" /></div>
          <div className="space-y-1.5"><Label htmlFor="password">Senha</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></div>
          <Button className="w-full" type="submit" disabled={busy}>{busy ? "Entrando..." : "Entrar"}</Button>
        </form>
        <p className="mt-4 text-sm"><Link to="/recuperar-senha" className="text-primary">Esqueci minha senha</Link> · <Link to="/cadastro" className="text-primary">Criar conta</Link></p>
      </Panel>
    </PageShell>
  );
}
