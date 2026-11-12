import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAddressSuggestions, normalizeGeocodeResult } from "./geocode";
import { normalizeSupabaseAuthError, validateSignupInput } from "./auth";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("normalizeGeocodeResult", () => {
  it("maps Nominatim results to a consistent address model", () => {
    const raw = {
      display_name: "Avenida Paulista, Bela Vista, São Paulo, SP, Brasil",
      lat: "-23.5617",
      lon: "-46.6560",
      address: { postcode: "01310-100" },
    };

    expect(normalizeGeocodeResult(raw)).toEqual({
      label: "Avenida Paulista, Bela Vista, São Paulo, SP, Brasil",
      address: "Avenida Paulista, Bela Vista, São Paulo, SP, Brasil",
      latitude: -23.5617,
      longitude: -46.656,
      postalCode: "01310-100",
    });
  });
});

describe("signup validation", () => {
  it("returns user friendly validation for invalid signup payloads", () => {
    expect(validateSignupInput("", "joao@email.com", "123456")).toBe("Informe seu nome.");
    expect(validateSignupInput("João", "email-invalido", "123456")).toBe("Informe um e-mail válido.");
    expect(validateSignupInput("João", "joao@email.com", "123")).toBe("A senha deve ter pelo menos 6 caracteres.");
  });

  it("maps Supabase auth errors to clear messages for users", () => {
    expect(normalizeSupabaseAuthError({ message: "User already registered" })).toBe("Este e-mail já está cadastrado. Tente fazer login.");
    expect(normalizeSupabaseAuthError({ message: "Password should be at least 6 characters" })).toBe("A senha deve ter pelo menos 6 caracteres.");
    expect(normalizeSupabaseAuthError({ message: "Invalid email" })).toBe("Informe um e-mail válido.");
  });
});

describe("fetchAddressSuggestions", () => {
  it("uses Nominatim to resolve a CEP to a geocoded address", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{
        display_name: "Avenida Paulista, Bela Vista, São Paulo, SP, Brasil",
        lat: "-23.5617",
        lon: "-46.6560",
        address: { postcode: "01310-100" },
      }],
    });
    vi.stubGlobal("fetch", mockFetch);

    const results = await fetchAddressSuggestions("01310-100");

    expect(results[0]).toMatchObject({
      address: "Avenida Paulista, Bela Vista, São Paulo, SP, Brasil",
      latitude: -23.5617,
      longitude: -46.656,
      postalCode: "01310-100",
    });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("nominatim.openstreetmap.org/search"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/json",
        }),
      }),
    );
  });

  it("returns street-name suggestions from Nominatim", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          display_name: "Rua da Liberdade, São Paulo, SP, Brasil",
          lat: "-23.5630",
          lon: "-46.6500",
        },
      ],
    });
    vi.stubGlobal("fetch", mockFetch);

    const results = await fetchAddressSuggestions("rua da liberdade");

    expect(results[0]).toMatchObject({
      label: "Rua da Liberdade, São Paulo, SP, Brasil",
      address: "Rua da Liberdade, São Paulo, SP, Brasil",
      latitude: -23.563,
      longitude: -46.65,
    });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("nominatim.openstreetmap.org/search"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/json",
        }),
      }),
    );
  });
});
