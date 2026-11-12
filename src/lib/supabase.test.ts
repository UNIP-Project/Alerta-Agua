import { describe, expect, it } from "vitest";
import { hasSupabaseConfig, getSupabaseClient } from "./supabase";

describe("Supabase configuration", () => {
  it("returns false when the environment values are missing or still placeholder", () => {
    expect(hasSupabaseConfig({ VITE_SUPABASE_URL: "", VITE_SUPABASE_ANON_KEY: "" })).toBe(false);
    expect(hasSupabaseConfig({ VITE_SUPABASE_URL: "https://SEU_PROJETO.supabase.co", VITE_SUPABASE_ANON_KEY: "SUA_CHAVE_ANON" })).toBe(false);
  });

  it("creates a client only when the config is valid", () => {
    const configured = {
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_ANON_KEY: "public-anon-key",
    };

    expect(hasSupabaseConfig(configured)).toBe(true);
    expect(getSupabaseClient(configured)).not.toBeNull();
  });
});
