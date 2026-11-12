export function validateSignupInput(name: string, email: string, password: string): string {
  if (!name.trim()) return "Informe seu nome.";
  if (!email.trim()) return "Informe seu e-mail.";
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Informe um e-mail válido.";
  if (!password.trim()) return "Informe sua senha.";
  if (password.length < 6) return "A senha deve ter pelo menos 6 caracteres.";
  return "";
}

export function getRedirectUrl(path = "/login"): string | undefined {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}${path}`;
}

export function normalizeSupabaseAuthError(error: unknown): string {
  const message = typeof error === "object" && error && "message" in error ? String((error as { message?: string }).message ?? "") : String(error ?? "");
  const text = message.toLowerCase();

  if (text.includes("already registered") || text.includes("already exists") || text.includes("user already")) {
    return "Este e-mail já está cadastrado. Tente fazer login.";
  }

  if (text.includes("invalid email") || text.includes("email is invalid") || text.includes("email not valid")) {
    return "Informe um e-mail válido.";
  }

  if (text.includes("password") && text.includes("least") && text.includes("character")) {
    return "A senha deve ter pelo menos 6 caracteres.";
  }

  if (text.includes("network") || text.includes("fetch") || text.includes("failed to fetch")) {
    return "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
  }

  if (text.includes("otp") || text.includes("email confirmation") || text.includes("verify your email")) {
    return "Não foi possível criar a conta. Verifique seus dados e tente novamente.";
  }

  return "Não foi possível criar a conta. Verifique seus dados e tente novamente.";
}
