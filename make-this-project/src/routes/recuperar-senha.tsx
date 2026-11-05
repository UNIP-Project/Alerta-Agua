import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageShell, Panel } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — Alerta Água" },
      { name: "description", content: "Enviaremos um link para redefinir sua senha." },
      { property: "og:title", content: "Recuperar senha — Alerta Água" },
      { property: "og:description", content: "Enviaremos um link para redefinir sua senha." },
    ],
  }),
  component: Page,
});

function Page() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Informe o e-mail cadastrado.");
      return;
    }

    if (!supabase) {
      toast.error("Configure as variáveis do Supabase antes de recuperar a senha.");
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (error) throw error;

      toast.success("Se esse e-mail estiver cadastrado, enviaremos um link para redefinir a senha.");
      setEmail("");
    } catch (error) {
      toast.error((error as Error).message || "Não foi possível enviar o link de recuperação.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell title="Recuperar senha" subtitle="Enviaremos um link para redefinir sua senha." className="max-w-md">
      <Panel className="space-y-4">
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" disabled={busy} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Enviando..." : "Recuperar senha"}</Button>
        </form>
        <p className="mt-4 text-sm"><Link to="/login" className="text-primary">Voltar ao login</Link></p>
      </Panel>
    </PageShell>
  );
}
