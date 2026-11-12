import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  setSession: vi.fn(),
  exchangeCodeForSession: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({ supabase: { auth } }));

import {
  completeNativeRecovery,
  getRecoveryRedirectUrl,
  isNativeRecoveryLink,
  NATIVE_RECOVERY_URL,
} from "./recovery-link";

describe("native password recovery", () => {
  beforeEach(() => {
    auth.setSession.mockReset().mockResolvedValue({ error: null });
    auth.exchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
  });

  it("uses the app link on Android and the page origin on the web", () => {
    expect(getRecoveryRedirectUrl(true, "http://localhost:5173")).toBe(NATIVE_RECOVERY_URL);
    expect(getRecoveryRedirectUrl(false, "http://localhost:5173")).toBe(
      "http://localhost:5173/redefinir-senha",
    );
  });

  it("accepts only the registered recovery destination", () => {
    expect(isNativeRecoveryLink(`${NATIVE_RECOVERY_URL}#type=recovery`)).toBe(true);
    expect(isNativeRecoveryLink("alertaagua://auth/outra-tela")).toBe(false);
    expect(isNativeRecoveryLink("https://auth/redefinir-senha")).toBe(false);
  });

  it("stores the Supabase recovery session from the email callback", async () => {
    const result = await completeNativeRecovery(
      `${NATIVE_RECOVERY_URL}#access_token=abc&refresh_token=xyz&type=recovery`,
    );
    expect(result).toBe(true);
    expect(auth.setSession).toHaveBeenCalledWith({ access_token: "abc", refresh_token: "xyz" });
  });

  it("exchanges a PKCE code when the callback contains one", async () => {
    await completeNativeRecovery(`${NATIVE_RECOVERY_URL}?code=one-time-code`);
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("one-time-code");
    expect(auth.setSession).not.toHaveBeenCalled();
  });

  it("rejects expired or incomplete callbacks without enabling a session", async () => {
    await expect(
      completeNativeRecovery(
        `${NATIVE_RECOVERY_URL}#error=access_denied&error_description=Expired`,
      ),
    ).rejects.toThrow("Expired");
    await expect(
      completeNativeRecovery(`${NATIVE_RECOVERY_URL}#access_token=abc&type=recovery`),
    ).rejects.toThrow("inválido");
    expect(auth.setSession).not.toHaveBeenCalled();
  });
});
