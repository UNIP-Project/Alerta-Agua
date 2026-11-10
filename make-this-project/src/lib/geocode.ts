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

function normalizeBrasilApiResult(raw: any): GeocodeSuggestion | null {
  if (!raw || typeof raw !== "object") return null;

  const cep = normalizePostalCode(raw.cep ?? raw.postcode);
  const street = [raw.street ?? raw.logradouro, raw.neighborhood ?? raw.bairro].filter(Boolean).join(" - ");
  const city = raw.city ?? raw.localidade ?? "";
  const state = raw.state ?? raw.uf ?? "";

  if (!street && !city && !state && !cep) return null;

  const address = [
    street,
    [city, state].filter(Boolean).join(" - "),
    cep ? `CEP ${cep}` : undefined,
    "Brasil",
  ].filter(Boolean).join(", ");

  return {
    label: address,
    address,
    latitude: 0,
    longitude: 0,
    postalCode: cep,
  };
}

function normalizeNominatimResult(raw: any): GeocodeSuggestion | null {
  if (!raw || typeof raw !== "object") return null;

  const label = typeof raw.display_name === "string" ? raw.display_name.trim() : "";
  const latitude = Number(raw.lat ?? raw.latitude);
  const longitude = Number(raw.lon ?? raw.longitude);
  if (!label || Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

  return {
    label,
    address: label,
    latitude,
    longitude,
    postalCode: normalizePostalCode(raw.address?.postcode),
  };
}

export function normalizeGeocodeResult(raw: any): GeocodeSuggestion | null {
  if (!raw || typeof raw !== "object") return null;

  if (raw.cep || raw.postcode || raw.logradouro || raw.street || raw.localidade || raw.city) {
    return normalizeBrasilApiResult(raw);
  }

  return normalizeNominatimResult(raw);
}

async function fetchNominatimSuggestions(query: string): Promise<GeocodeSuggestion[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
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
    throw new Error("Não foi possível buscar o endereço por rua.");
  }

  const data = await response.json();
  if (!Array.isArray(data)) return [];

  return data
    .map(normalizeNominatimResult)
    .filter((item): item is GeocodeSuggestion => Boolean(item));
}

function prioritizeSuggestionMatches(suggestions: GeocodeSuggestion[], query: string, city?: string): GeocodeSuggestion[] {
  const cleanQuery = query.trim().toLowerCase();
  const cleanCity = city?.trim().toLowerCase() ?? "";

  return [...suggestions].sort((a, b) => {
    const aText = a.label.toLowerCase();
    const bText = b.label.toLowerCase();

    const aCityScore = cleanCity && aText.includes(cleanCity) ? 100 : 0;
    const bCityScore = cleanCity && bText.includes(cleanCity) ? 100 : 0;

    const aQueryScore = cleanQuery && aText.includes(cleanQuery) ? 40 : 0;
    const bQueryScore = cleanQuery && bText.includes(cleanQuery) ? 40 : 0;

    const aScore = aCityScore + aQueryScore;
    const bScore = bCityScore + bQueryScore;

    return bScore - aScore;
  });
}

export async function fetchAddressSuggestions(query: string, city?: string): Promise<GeocodeSuggestion[]> {
  const clean = query.trim();
  if (clean.length < 3) return [];

  const cep = normalizeCepQuery(clean);
  if (cep) {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error("Não foi possível buscar o endereço por CEP.");
    }

    const data = await response.json();
    const result = normalizeBrasilApiResult(data);
    return result ? prioritizeSuggestionMatches([result], clean, city) : [];
  }

  const streetQuery = [clean, city?.trim()].filter(Boolean).join(", ");
  const results = await fetchNominatimSuggestions(streetQuery);
  return prioritizeSuggestionMatches(results, clean, city);
}
