import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/lib/supabase";

const PUBLIC_PATHS = new Set(["/login", "/cadastro", "/recuperar-senha", "/redefinir-senha"]);

export function AuthGate({ pathname, children }: { pathname: string; children: ReactNode }) {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const isPublic = PUBLIC_PATHS.has(pathname);

  useEffect(() => {
    if (isPublic) return;

    if (!supabase) {
      void navigate({ to: "/login", replace: true });
      return;
    }

    let active = true;
    let authEventVersion = 0;

    const handleSession = (hasSession: boolean) => {
      if (!active) return;
      setAuthenticated(hasSession);
      if (!hasSession) void navigate({ to: "/login", replace: true });
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventVersion += 1;
      handleSession(Boolean(session));
    });

    const initialVersion = authEventVersion;
    void supabase.auth.getSession().then(
      ({ data, error }) => {
        if (authEventVersion === initialVersion) handleSession(!error && Boolean(data.session));
      },
      () => {
        if (authEventVersion === initialVersion) handleSession(false);
      },
    );

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [isPublic, navigate]);

  if (isPublic) return children;
  if (!authenticated) {
    return (
      <main className="grid min-h-screen place-items-center" role="status">
        Verificando sessão...
      </main>
    );
  }

  return children;
}
