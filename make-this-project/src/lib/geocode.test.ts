import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAddressSuggestions, normalizeGeocodeResult } from "./geocode";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("normalizeGeocodeResult", () => {
  it("maps Nominatim results to a consistent address model with CEP and neighborhood details", () => {
    const raw = {
      display_name: "Avenida Paulista, 1000, Bela Vista, São Paulo, SP, Brasil",
      lat: "-23.5627",
      lon: "-46.6547",
      address: {
        road: "Avenida Paulista",
        house_number: "1000",
        suburb: "Bela Vista",
        city: "São Paulo",
        state: "São Paulo",
        state_code: "SP",
        postcode: "01310-100",
        country: "Brasil",
      },
    };

    expect(normalizeGeocodeResult(raw)).toEqual({
      label: "Avenida Paulista, 1000 - Bela Vista, São Paulo - SP, CEP 01310-100, Brasil",
      address: "Avenida Paulista, 1000 - Bela Vista, São Paulo - SP, CEP 01310-100, Brasil",
      latitude: -23.5627,
      longitude: -46.6547,
      postalCode: "01310-100",
    });
  });
});

describe("fetchAddressSuggestions", () => {
  it("returns formatted suggestions from the geocoding service", async () => {
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
