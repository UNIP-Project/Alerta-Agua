import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageShell, Panel } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRedirectUrl, normalizeSupabaseAuthError, validateSignupInput } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Criar conta — Alerta Água" },
      { name: "description", content: "Cadastre-se para registrar e confirmar relatos." },
      { property: "og:title", content: "Criar conta — Alerta Água" },
      { property: "og:description", content: "Cadastre-se para registrar e confirmar relatos." },
    ],
  }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();

    const validation = validateSignupInput(name, email, password);
    if (validation) {
      toast.error(validation);
      return;
    }

    if (!supabase) {
      toast.error("Configure as variáveis do Supabase antes de criar a conta.");
      return;
    }

    setBusy(true);
    try {
      const redirectTo = getRedirectUrl("/login");
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: redirectTo,
        },
      });

      if (error) throw error;
      toast.success("Conta criada com sucesso! Verifique seu e-mail e depois faça login.");
      navigate({ to: "/login" });
    } catch (error) {
      toast.error(normalizeSupabaseAuthError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell title="Criar conta" subtitle="Cadastre-se para registrar e confirmar relatos." className="max-w-md">
      <Panel className="space-y-4">
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5"><Label htmlFor="name">Nome</Label><Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" /></div>
          <div className="space-y-1.5"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" /></div>
          <div className="space-y-1.5"><Label htmlFor="password">Senha</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></div>
          <Button className="w-full" type="submit" disabled={busy}>{busy ? "Criando..." : "Criar conta"}</Button>
        </form>
        <p className="mt-4 text-sm">Já tem conta? <Link to="/login" className="text-primary">Entrar</Link></p>
      </Panel>
    </PageShell>
  );
}
