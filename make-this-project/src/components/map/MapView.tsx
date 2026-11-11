/**
 * Map provider wrapper (Leaflet + OpenStreetMap). Leaflet is loaded dynamically
 * so it never runs on the server. To switch to Google Maps, reimplement this
 * component keeping the same props.
 */
import { useEffect, useRef } from "react";
import type { Map as LMap, LayerGroup, CircleMarker } from "leaflet";
import type { OccurrenceView } from "@/services/occurrences";
import { SEVERITY_LABEL, STATUS_LABEL } from "@/types/occurrence";
import { severityCssVar } from "@/components/occurrence/badges";

export interface MapViewProps {
  occurrences?: OccurrenceView[];
  center?: [number, number];
  zoom?: number;
  focus?: [number, number] | null;
  picked?: [number, number] | null;
  onPick?: (lat: number, lng: number) => void;
  onOpen?: (id: string) => void;
  className?: string;
}

const DEFAULT_CENTER: [number, number] = [-23.5505, -46.6333];

function cssColor(v: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || "#1976D2";
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function MapView({ occurrences = [], center = DEFAULT_CENTER, zoom = 12, focus, picked, onPick, onOpen, className }: MapViewProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const pickMarker = useRef<CircleMarker | null>(null);
  const Lref = useRef<typeof import("leaflet") | null>(null);
  const cb = useRef({ onPick, onOpen });
  cb.current = { onPick, onOpen };

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      const L = (mod as unknown as { default?: typeof import("leaflet") }).default ?? mod;
      if (cancelled || !el.current || map.current) return;
      Lref.current = L;
      const m = L.map(el.current, { zoomControl: true }).setView(center, zoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      layer.current = L.layerGroup().addTo(m);
      m.on("click", (e) => cb.current.onPick?.(e.latlng.lat, e.latlng.lng));
      m.getContainer().addEventListener("click", (e) => {
        const t = (e.target as HTMLElement).closest("[data-open]");
        if (t) cb.current.onOpen?.(t.getAttribute("data-open")!);
      });
      map.current = m;
      setTimeout(() => m.invalidateSize(), 50);
      draw();
      drawPick();
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw() {
    const L = Lref.current;
    if (!L || !layer.current) return;
    layer.current.clearLayers();
    for (const o of occurrences) {
      if (o.status === "expirada") continue;
      const faded = o.status === "normalizada";
      const color = o.status === "normalizada" ? cssColor("--ok") : cssColor(severityCssVar(o.gravidade));
      L.circleMarker([o.latitude, o.longitude], {
        radius: 11,
        color: "#fff",
        weight: 3,
        fillColor: color,
        fillOpacity: faded ? 0.5 : 0.95,
      })
        .bindPopup(
          `<div style="min-width:180px"><strong>${esc(o.titulo)}</strong><br/>
          <small>${SEVERITY_LABEL[o.gravidade]} · ${STATUS_LABEL[o.status]}</small><br/>
          <small>${new Date(o.createdAt).toLocaleString("pt-BR")}</small><br/>
          <button data-open="${esc(o.id)}" style="margin-top:6px;color:${cssColor("--primary")};font-weight:700;cursor:pointer">Ver detalhes →</button></div>`,
        )
        .addTo(layer.current);
    }
  }

  function drawPick() {
    const L = Lref.current;
    if (!L || !map.current) return;
    pickMarker.current?.remove();
    pickMarker.current = null;
    if (picked) {
      pickMarker.current = L.circleMarker(picked, { radius: 12, color: cssColor("--navy"), weight: 3, fillColor: cssColor("--primary"), fillOpacity: 0.9 }).addTo(map.current);
    }
  }

  useEffect(draw, [occurrences]);
  useEffect(drawPick, [picked]);
  useEffect(() => {
    if (focus && map.current) map.current.setView(focus, 15);
  }, [focus]);

  return <div ref={el} className={className} role="region" aria-label="Mapa de ocorrências" />;
}
