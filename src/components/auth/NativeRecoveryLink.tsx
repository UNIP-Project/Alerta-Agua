import { App } from "@capacitor/app";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";

import { completeNativeRecovery, isNativeRecoveryLink } from "@/lib/recovery-link";

export function NativeRecoveryLink() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    let listener: PluginListenerHandle | undefined;
    const handledLinks = new Set<string>();

    async function handleLink(link: string) {
      if (!isNativeRecoveryLink(link) || handledLinks.has(link)) return;
      handledLinks.add(link);

      try {
        await completeNativeRecovery(link);
        if (active) void navigate({ to: "/redefinir-senha", replace: true });
      } catch (error) {
        if (!active) return;
        toast.error((error as Error).message || "Não foi possível abrir o link de recuperação.");
        void navigate({ to: "/redefinir-senha", replace: true });
      }
    }

    void App.addListener("appUrlOpen", ({ url }) => {
      void handleLink(url);
    }).then((handle) => {
      if (active) listener = handle;
      else void handle.remove();
    });

    void App.getLaunchUrl().then((launch) => {
      if (active && launch?.url) void handleLink(launch.url);
    });

    return () => {
      active = false;
      if (listener) void listener.remove();
    };
  }, [navigate]);

  return null;
}
