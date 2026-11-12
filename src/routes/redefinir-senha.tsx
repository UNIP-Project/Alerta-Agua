import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageShell, Panel } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Alerta Água" },
      { name: "description", content: "Crie uma nova senha para acessar sua conta." },
      { property: "og:title", content: "Redefinir senha — Alerta Água" },
      { property: "og:description", content: "Crie uma nova senha para acessar sua conta." },
    ],
  }),
  component: Page,
});

function Page() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setSessionReady(false);
      return;
    }

    let active = true;

    async function syncSession() {
      const { data } = await supabase.auth.getSession();
      if (active) setSessionReady(Boolean(data.session));
    }

    void syncSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setSessionReady(Boolean(session));
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();

    if (!supabase) {
      toast.error("Configure as variáveis do Supabase antes de atualizar a senha.");
      return;
    }

    if (!sessionReady) {
      toast.error("Link de recuperação inválido ou expirado. Solicite outro e-mail de redefinição.");
      return;
    }

    if (!password.trim() || password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não conferem.");
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success("Senha atualizada com sucesso!");
      setTimeout(() => {
        window.location.href = "/login";
      }, 900);
    } catch (error) {
      toast.error((error as Error).message || "Não foi possível atualizar a senha.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell title="Redefinir senha" subtitle={sessionReady ? "Crie uma nova senha para continuar." : "Use o link enviado por e-mail para redefinir sua senha."} className="max-w-md">
      <Panel className="space-y-4">
        {!sessionReady && (
          <p className="text-sm text-muted-foreground">
            Ainda não foi detectado um link válido de recuperação. Verifique o e-mail e abra o link novamente.
          </p>
        )}

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="password">Nova senha</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" disabled={!sessionReady || busy} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" disabled={!sessionReady || busy} />
          </div>

          <Button type="submit" className="w-full" disabled={busy || !sessionReady}>
            {busy ? "Salvando..." : sessionReady ? "Salvar nova senha" : "Aguardando link"}
          </Button>
        </form>

        <p className="mt-4 text-sm">
          <Link to="/login" className="text-primary">
            Voltar ao login
          </Link>
        </p>
      </Panel>
    </PageShell>
  );
}
