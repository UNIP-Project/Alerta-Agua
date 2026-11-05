export interface GeocodeSuggestion {
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  postalCode?: string;
}

function normalizePostalCode(value?: string): string | undefined {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim().replace(/\s+/g, "");
  if (!trimmed) return undefined;

  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 5)}-${trimmed.slice(5)}`;
  }

  return trimmed;
}

function normalizeCepQuery(query: string): string | null {
  const digits = query.replace(/\D/g, "");
  return digits.length === 8 ? digits : null;
}

function formatStructuredAddress(raw: any): { address: string; postalCode?: string } {
  const addr = raw?.address ?? {};
  const street = [addr.road ?? addr.pedestrian ?? addr.street, addr.house_number].filter(Boolean).join(", ");
  const neighborhood = addr.neighbourhood ?? addr.suburb ?? addr.city_district ?? addr.hamlet ?? addr.village ?? addr.township;
  const city = addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.county ?? addr.locality;
  const stateName = addr.state ?? addr.region ?? "";
  const stateCode = addr.state_code ?? "";
  const stateLabel = stateCode || stateName;
  const country = addr.country ?? "";
  const postalCode = normalizePostalCode(addr.postcode);

  const location = [street, neighborhood].filter(Boolean).join(" - ");
  const cityState = [city, stateLabel].filter(Boolean).join(" - ");
  const parts = [
    location || cityState,
    cityState && location ? cityState : undefined,
    postalCode ? `CEP ${postalCode}` : undefined,
    country,
  ].filter(Boolean);

  if (parts.length > 0) {
    return {
      address: parts.join(", "),
      postalCode,
    };
  }

  const fallback = typeof raw?.display_name === "string" ? raw.display_name.trim() : "Localização informada";
  return {
    address: fallback,
    postalCode: normalizePostalCode(raw?.address?.postcode),
  };
}

async function fetchNominatimSuggestions(query: string, limit = 5): Promise<GeocodeSuggestion[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "br");
  url.searchParams.set("q", query);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error("Não foi possível buscar sugestões de endereço.");
  }

  const data = await response.json();
  if (!Array.isArray(data)) return [];

  return data
    .map(normalizeGeocodeResult)
    .filter((item): item is GeocodeSuggestion => Boolean(item));
}

async function fetchCepSuggestion(query: string): Promise<GeocodeSuggestion | null> {
  const cep = normalizeCepQuery(query);
  if (!cep) return null;

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const address = [
      [data.street ?? data.logradouro, data.neighborhood ?? data.bairro].filter(Boolean).join(" - "),
      [data.city ?? data.localidade, data.state ?? data.uf].filter(Boolean).join(" - "),
      `CEP ${normalizePostalCode(data.cep) ?? cep}`,
      "Brasil",
    ].filter(Boolean).join(", ");

    let latitude = 0;
    let longitude = 0;

    try {
      const coordinates = await fetchNominatimSuggestions(`${data.street ?? data.logradouro}, ${data.city ?? data.localidade}, ${data.state ?? data.uf}, Brasil`, 1);
      const match = coordinates[0];
      if (match) {
        latitude = match.latitude;
        longitude = match.longitude;
      }
    } catch {
      latitude = 0;
      longitude = 0;
    }

    return {
      label: address,
      address,
      latitude,
      longitude,
      postalCode: normalizePostalCode(data.cep),
    };
  } catch {
    return null;
  }
}

export function normalizeGeocodeResult(raw: any): GeocodeSuggestion | null {
  if (!raw || typeof raw !== "object") return null;

  const latitude = Number(raw.lat ?? raw.latitude);
  const longitude = Number(raw.lon ?? raw.longitude);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

  const formatted = formatStructuredAddress(raw);

  return {
    label: formatted.address,
    address: formatted.address,
    latitude,
    longitude,
    postalCode: formatted.postalCode,
  };
}

export async function fetchAddressSuggestions(query: string): Promise<GeocodeSuggestion[]> {
  const clean = query.trim();
  if (clean.length < 3) return [];

  const cepSuggestion = await fetchCepSuggestion(clean); 
  if (cepSuggestion) return [cepSuggestion];

  return fetchNominatimSuggestions(clean, 5);
}
