import { supabase } from "@/lib/supabase";

export const NATIVE_RECOVERY_URL = "alertaagua://auth/redefinir-senha";

export function getRecoveryRedirectUrl(isNative: boolean, origin: string): string {
  return isNative ? NATIVE_RECOVERY_URL : `${origin}/redefinir-senha`;
}

export function isNativeRecoveryLink(link: string): boolean {
  try {
    const url = new URL(link);
    return (
      url.protocol === "alertaagua:" && url.host === "auth" && url.pathname === "/redefinir-senha"
    );
  } catch {
    return false;
  }
}

export async function completeNativeRecovery(link: string): Promise<boolean> {
  if (!isNativeRecoveryLink(link)) return false;
  if (!supabase) throw new Error("O Supabase não está configurado neste aplicativo.");

  const url = new URL(link);
  const hash = new URLSearchParams(url.hash.slice(1));
  const query = url.searchParams;
  const error =
    hash.get("error_description") ??
    query.get("error_description") ??
    hash.get("error") ??
    query.get("error");
  if (error) throw new Error(error);

  const code = query.get("code");
  if (code) {
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    if (sessionError) throw sessionError;
    return true;
  }

  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (hash.get("type") !== "recovery" || !accessToken || !refreshToken) {
    throw new Error("Link de recuperação inválido ou expirado. Solicite outro e-mail.");
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (sessionError) throw sessionError;
  return true;
}
