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

function normalizeNominatimResult(raw: unknown): GeocodeSuggestion | null {
  if (!raw || typeof raw !== "object") return null;

  const result = raw as Record<string, unknown>;
  const label = typeof result.display_name === "string" ? result.display_name.trim() : "";
  const latitude = Number(result.lat ?? result.latitude);
  const longitude = Number(result.lon ?? result.longitude);
  if (!label || Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

  const address = result.address;
  const addressDetails =
    address && typeof address === "object" ? (address as Record<string, unknown>) : null;

  return {
    label,
    address: label,
    latitude,
    longitude,
    postalCode:
      typeof addressDetails?.postcode === "string"
        ? normalizePostalCode(addressDetails.postcode)
        : undefined,
  };
}

export function normalizeGeocodeResult(raw: unknown): GeocodeSuggestion | null {
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

  const addressQuery = [clean, city?.trim()].filter(Boolean).join(", ");
  const results = await fetchNominatimSuggestions(addressQuery);
  return prioritizeSuggestionMatches(results, clean, city);
}
